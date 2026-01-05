import sql from '../db.js';
import jwt from 'jsonwebtoken'; // ← ADD THIS LINE!
import bcrypt from 'bcrypt';
import stripe from '../config/stripe.js';
import { sendParentApprovalEmail } from '../config/createEmail.js';

export const approveParentRegistration = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [parent] = await sql`
        SELECT users.* , p.status 
        FROM users  
        JOIN parents p ON p.parent_id = users.user_id
        WHERE users.user_id = ${id}
        `;
    if (!parent) {
      return res.status(404).json({
        message: 'Parent not found',
      });
    }

    if (parent.status !== 'PENDING_REVIEW') {
      return res.status(400).json({
        message: `Cannot approve parent with status ${parent.status}`,
      });
    }

    const customer = await stripe.customers.create({
      email: parent.email,
      name: parent.full_name,
    });

    await sql`
        UPDATE parents SET status = 'APPROVED_AWAITING_PAYMENT', stripe_customer_id = ${customer.id} WHERE parent_id = ${id}
        `;

    await sendParentApprovalEmail({
      email: parent.email,
      fullName: parent.full_name,
    });

    res.status(200).json({
      message: 'Parent registration approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const rejectParentRegistration = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [parent] = await sql`
        SELECT * FROM parents WHERE parent_id = ${id}
        `;

    if (!parent) {
      return res.status(404).json({
        message: 'Parent not found',
      });
    }

    if (parent.status !== 'PENDING_REVIEW') {
      return res.status(400).json({
        message: `Cannot reject parent with status ${parent.status}`,
      });
    }

    await sql`
        UPDATE parents SET status = 'SUSPENDED' WHERE parent_id = ${id}`;

    res.status(200).json({
      message: 'Parent registration rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getFilterdParentList = async (req, res, next) => {
  const { status, page } = req.query;
  const pageNum = parseInt(page) || 1;
  const limit = 10;
  const offset = (pageNum - 1) * limit;

  try {
    await sql.begin(async (client) => {
      const results = await client`
        SELECT 
          parents.*,
          users.full_name,
          users.email,
          users.phone,
          users.created_at,
          COUNT(*) OVER() AS total_count
        FROM parents
        JOIN users ON parents.parent_id = users.user_id
        WHERE ${status ? client`parents.status = ${status}` : client`TRUE`}
        ORDER BY users.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      if (results.length === 0) {
        return res.status(404).json({
          message: 'No parents found with the given criteria.',
        });
      }

      const totalCount = results[0].total_count;
      const parentIds = results.map((r) => r.parent_id);

      const children =
        parentIds.length > 0
          ? await client`SELECT * FROM childs WHERE parent_id = ANY(${parentIds})`
          : [];

      const childIds = children.map((c) => c.child_id);
      const docs =
        childIds.length > 0
          ? await client`SELECT * FROM documents WHERE child_id = ANY(${childIds})`
          : [];

      const parents = results.map((parent) => ({
        ...parent,
        children: children
          .filter((child) => child.parent_id === parent.parent_id)
          .map((child) => ({
            ...child,
            documents: docs.filter((doc) => doc.child_id === child.child_id),
          })),
      }));

      res.status(200).json({
        data: parents,
        totalCount,
        message: 'Filtered parent list with children and documents fetched successfully',
      });
    });
  } catch (error) {
    next(error);
  }
};

export const CreateParent = async (req, res, next) => {
  try {
    const body = req.body;

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const ParentInfo = {
      full_name: body.full_name,
      email: body.email,
      password: hashedPassword,
      phone: body.phone,
    };

    const ChildInfo = body.child;
    const Documents = body.documents;

    await sql.begin(async (client) => {
      const userInsertQuery = await client`
                INSERT INTO users (full_name, email, password_hash, phone, role)
                VALUES (
                    ${ParentInfo.full_name},
                    ${ParentInfo.email},
                    ${ParentInfo.password},
                    ${ParentInfo.phone},
                    'parent'
                )
                RETURNING user_id
            `;

      const parent_id = userInsertQuery[0].user_id;

      await client`
                INSERT INTO parents (parent_id, status)
                VALUES (${parent_id}, 'PENDING_REVIEW')
            `;

      const childInsertQuery = await client`
                INSERT INTO childs (parent_id, full_name, age, gender, date_of_birth)
                VALUES (
                    ${parent_id},
                    ${ChildInfo.full_name},
                    ${ChildInfo.age},
                    ${ChildInfo.gender},
                    ${ChildInfo.date_of_birth}
                )
                RETURNING child_id
            `;

      const child_id = childInsertQuery[0].child_id;

      for (const doc of Documents) {
        await client`
                    INSERT INTO documents (child_id, document_type, file_url)
                    VALUES (
                        ${child_id},
                        ${doc.document_type},
                        ${doc.file_url}
                    )
                `;
      }

      res.status(201).json({
        message: 'Parent and Child created successfully',
      });
    });
  } catch (error) {
    next(error);
  }
};

export const CreateTeacher = async (req, res, next) => {
  const body = req.body;
  try {
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const TeacherInfo = {
      full_name: body.full_name,
      email: body.email,
      password: hashedPassword,
      phone: body.phone,
      status: body.status,
    };

    await sql.begin(async (client) => {
      const userInsertQuery = await client`
          INSERT INTO users (full_name, email, password_hash, phone, role)
          VALUES (
            ${TeacherInfo.full_name},
            ${TeacherInfo.email},
            ${TeacherInfo.password},
            ${TeacherInfo.phone},
            'teacher'
          )
          RETURNING user_id
        `;

      const teacher_id = userInsertQuery[0].user_id;

      await client`
          INSERT INTO teachers (teacher_id, status)
          VALUES (${teacher_id}, ${TeacherInfo.status})
        `;

      res.status(201).json({
        message: 'Teacher created successfully',
        teacher_id: teacher_id,
      });
    });
  } catch (error) {
    next(error);
  }
};

export const getFilterdTeacherList = async (req, res, next) => {
  const { status, classroom } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const results = await sql`
          SELECT 
            teachers.*,
            users.full_name,
            users.email,
            users.phone,
            users.created_at,
            c.name as classroom_name,
            c.id as classroom_id,
            COUNT(*) OVER() AS total_count
          FROM teachers
          JOIN users ON teachers.teacher_id = users.user_id
          LEFT JOIN classrooms c ON c.teacher_id = teachers.teacher_id
          WHERE ${status ? sql`teachers.status = ${status}` : sql`TRUE`}
          ${classroom ? sql`AND c.name = ${classroom}` : sql``}
          ORDER BY users.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

    if (results.length === 0) {
      return res.status(404).json({
        message: 'No teachers found with the given criteria',
        data: [],
        totalCount: 0,
      });
    }

    const totalCount = results[0].total_count;

    res.status(200).json({
      message: 'Teachers retrieved successfully',
      data: results,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const editTeacher = async (req, res, next) => {
  const { id } = req.params;
  const { full_name, email, phone, status } = req.body;

  try {
    await sql.begin(async (client) => {
      // Check if teacher exists
      const [teacher] = await client`SELECT * FROM teachers WHERE teacher_id = ${id}`;
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const userUpdates = [];
      const userValues = [];
      if (full_name !== undefined) {
        userUpdates.push('full_name = $' + (userUpdates.length + 1));
        userValues.push(full_name);
      }
      if (email !== undefined) {
        userUpdates.push('email = $' + (userUpdates.length + 1));
        userValues.push(email);
      }
      if (phone !== undefined) {
        userUpdates.push('phone = $' + (userUpdates.length + 1));
        userValues.push(phone);
      }
      if (userUpdates.length > 0) {
        userValues.push(id);
        const userQuery = `UPDATE users SET ${userUpdates.join(', ')} WHERE user_id = $${userUpdates.length + 1}`;
        await client.unsafe(userQuery, userValues);
      }

      // Update teachers table
      if (status !== undefined) {
        await client`UPDATE teachers SET status = ${status} WHERE teacher_id = ${id}`;
      }
    });

    res.status(200).json({ message: 'Teacher updated successfully' });
  } catch (error) {
    next(error);
  }
};



export const EditClassRoom = async (req, res, next) => {
  const { id } = req.params;
  const { name, teacherId, capacity, age_group } = req.body;

  try {
    await sql.begin(async (client) => {
      // Fixed: classroom_id -> id
      const [classroom] = await client`SELECT * FROM classrooms WHERE id = ${id}`;

      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }

      const ClassroomUpdates = [];
      const ClassroomValues = [];

      if (name !== undefined) {
        ClassroomUpdates.push('name = $' + (ClassroomUpdates.length + 1));
        ClassroomValues.push(name);
      }

      if (capacity !== undefined) {
        ClassroomUpdates.push('capacity = $' + (ClassroomUpdates.length + 1));
        ClassroomValues.push(capacity);
      }

      if (teacherId !== undefined) {
        ClassroomUpdates.push('teacher_id = $' + (ClassroomUpdates.length + 1));
        ClassroomValues.push(teacherId);
      }

      if (ClassroomUpdates.length > 0) {
        ClassroomValues.push(id);
        // Fixed: classroom_id -> id
        const classroomQuery = `UPDATE classrooms SET ${ClassroomUpdates.join(', ')} WHERE id = $${ClassroomUpdates.length + 1}`;
        await client.unsafe(classroomQuery, ClassroomValues);
      }

      if (age_group !== undefined) {
        const ages = age_group.match(/\d+/g)?.map(Number);

        if (!ages || ages.length !== 2) {
          return res.status(400).json({
            message: 'Invalid age_group format',
          });
        }

        const [minAge, maxAge] = ages;

        await client`
          WITH eligible_children AS (
            SELECT child_id
            FROM childs
            WHERE
              classroom_id IS NULL
              AND age >= ${minAge}
              AND age <= ${maxAge}
            ORDER BY age ASC
            LIMIT ${capacity || classroom.capacity}
          )
          UPDATE childs
          SET classroom_id = ${id}
          WHERE child_id IN (SELECT child_id FROM eligible_children)
        `;
      }

      return res.status(200).json({
        message: 'Classroom updated successfully',
      });
    });
  } catch (error) {
    next(error);
  }
};



export const createClassRoom = async (req, res, next) => {
  const { name, teacherId, capacity, age_group } = req.body;

  try {
    // Validate required fields
    if (!name || !teacherId || !capacity) {
      return res.status(400).json({
        message: 'Missing required fields: name, teacherId, and capacity are required',
      });
    }

    await sql.begin(async (client) => {
      // Check if teacher exists
      const [teacher] = await client`
        SELECT teacher_id FROM teachers WHERE teacher_id = ${teacherId}
      `;

      if (!teacher) {
        return res.status(404).json({
          message: 'Teacher not found',
        });
      }

      // Check if teacher is already assigned to a classroom
      const [existingAssignment] = await client`
        SELECT id FROM classrooms WHERE teacher_id = ${teacherId}
      `;

      if (existingAssignment) {
        return res.status(400).json({
          message: 'Teacher is already assigned to another classroom',
        });
      }

      // Create the classroom
      // Fixed: RETURNING classroom_id -> id
      const [newClassroom] = await client`
        INSERT INTO classrooms (name, teacher_id, capacity)
        VALUES (${name}, ${teacherId}, ${capacity})
        RETURNING id, name, teacher_id, capacity, created_at
      `;

      // If age_group is provided, assign eligible children
      if (age_group) {
        const ages = age_group.match(/\d+/g)?.map(Number);

        if (!ages || ages.length !== 2) {
          return res.status(400).json({
            message: 'Invalid age_group format. Expected format: "3-5" or "3 to 5"',
          });
        }

        const [minAge, maxAge] = ages;

        // Fixed: newClassroom.classroom_id -> newClassroom.id
        await client`
          WITH eligible_children AS (
            SELECT child_id
            FROM childs
            WHERE
              classroom_id IS NULL
              AND age >= ${minAge}
              AND age <= ${maxAge}
            ORDER BY age ASC
            LIMIT ${capacity}
          )
          UPDATE childs
          SET classroom_id = ${newClassroom.id}
          WHERE child_id IN (SELECT child_id FROM eligible_children)
        `;
      }

      return res.status(201).json({
        message: 'Classroom created successfully',
        data: {
          id: newClassroom.id,
          name: newClassroom.name,
          teacherId: newClassroom.teacher_id,
          capacity: newClassroom.capacity,
          createdAt: newClassroom.created_at,
        },
      });
    });
  } catch (error) {
    next(error);
  }
};



export const viewClassRooms = async (req, res, next) => {
  try {
    await sql.begin(async (client) => {
      const classrooms = await client`
              SELECT 
                c.id,
                c.name,
                c.capacity,
                c.teacher_id,
                c.created_at,
                u.full_name AS teacher_name,
                u.email AS teacher_email
              FROM classrooms c
              JOIN teachers t ON t.teacher_id = c.teacher_id
              JOIN users u ON u.user_id = t.teacher_id
              ORDER BY c.created_at DESC
            `;

      console.log(classrooms);
      if (classrooms.length === 0) {
        return res.status(404).json({
          message: 'No classrooms found',
          data: [],
        });
      }

      const classroomIds = classrooms.map((c) => c.id);

      const children = await client`
              SELECT 
                child_id,
                full_name,
                age,
                gender,
                classroom_id
              FROM childs
              WHERE classroom_id = ANY(${classroomIds})
              ORDER BY classroom_id, age DESC
            `;

      const classRoomsWithChildren = classrooms.map((classroom) => {
        const classroomChildren = children.filter((child) => child.classroom_id === classroom.id);

        return {
          id: classroom.id,
          name: classroom.name,
          capacity: classroom.capacity,
          teacher: {
            id: classroom.teacher_id,
            name: classroom.teacher_name,
            email: classroom.teacher_email,
          },
          children: classroomChildren,
          current_enrollment: classroomChildren.length,
          available_spots: classroom.capacity - classroomChildren.length,
          created_at: classroom.created_at,
        };
      });
      console.log(classRoomsWithChildren);
      res.status(200).json({
        message: 'Classrooms retrieved successfully',
        data: classRoomsWithChildren,
        totalCount: classRoomsWithChildren.length,
      });
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentsList = async (req, res, next) => {
  const { status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const statusCondition = status && status !== 'all' ? sql`AND i.status = ${status}` : sql``;

    const results = await sql`
      SELECT 
        i.id,
        i.stripe_invoice_id AS invoice_number,
        u.full_name AS parent_name,
        i.amount_paid AS amount,
        i.currency,
        i.period_end AS due_date,
        i.paid_at AS payment_date,
        i.period_start AS subscription_start,
        i.status,
        CASE 
          WHEN i.stripe_charge_id IS NOT NULL THEN 'credit_card'
          ELSE 'bank_transfer'
        END AS payment_method,
        COUNT(*) OVER() AS total_count
      FROM invoices i
      JOIN subscriptions s ON i.subscription_id = s.id
      JOIN parents pr ON s.parent_id = pr.parent_id
      JOIN users u ON pr.parent_id = u.user_id
      WHERE TRUE
      ${statusCondition}
      ORDER BY i.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (results.length === 0) {
      return res.status(404).json({
        message: 'No payments found',
        data: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
      });
    }

    const totalCount = parseInt(results[0].total_count);
    const totalPages = Math.ceil(totalCount / limit);

    // Format the data for frontend
    const formattedData = results.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number || `INV-${String(row.id).padStart(3, '0')}`,
      parentName: row.parent_name, // Changed from familyName
      amount: row.amount,
      currency: row.currency,
      dueDate: row.due_date,
      paymentDate: row.payment_date,
      status: row.status,
      paymentMethod: row.payment_method === 'credit_card' ? 'بطاقة ائتمان' : 'تحويل بنكي',
    }));

    res.status(200).json({
      message: 'Payments retrieved successfully',
      data: formattedData,
      totalCount,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};
