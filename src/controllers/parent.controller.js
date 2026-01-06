import sql from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import stripe from '../config/stripe.js';

export const SignUp = async (req, res, next) => {
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
      console.log('Child ID:', child_id);
      console.log('Documents:', Documents);
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
        message: 'Parent and Child registered successfully',
      });
    });
  } catch (error) {
    next(error);
  }
};

export const viewChildDetails = async (req, res, next) => {
  try {
    const parent_id = req.user.id;

    // Get child details with classroom and teacher info
    const childDetails = await sql`
      SELECT 
        ch.child_id as id,
        ch.full_name,
        ch.age,
        ch.gender,
        ch.date_of_birth,
        ch.classroom_id,
        c.name as classroom_name,
        c.teacher_id,
        u.full_name as teacher_name,
        u.email as teacher_email,
        u.phone as teacher_phone
      FROM childs ch
      LEFT JOIN classrooms c ON ch.classroom_id = c.id
      LEFT JOIN teachers t ON c.teacher_id = t.teacher_id
      LEFT JOIN users u ON t.teacher_id = u.user_id
      WHERE ch.parent_id = ${parent_id}
    `;

    if (childDetails.length === 0) {
      return res.status(404).json({
        message: 'No child details found for the given parent ID',
      });
    }

    const child = childDetails[0];

    // Get documents for this child
    const documents = await sql`
      SELECT 
        id,
        child_id,
        file_url,
        document_type,
        created_at
      FROM documents
      WHERE child_id = ${child.id}
      ORDER BY created_at DESC
    `;

    // Get admin contact info for emergency contacts
    const adminContact = await sql`
      SELECT 
        u.full_name,
        u.email,
        u.phone
      FROM users u
      WHERE u.role = 'admin'
      LIMIT 1
    `;

    // Build emergency contacts array
    const emergencyContacts = [];

    // Add teacher as emergency contact
    if (child.teacher_name) {
      emergencyContacts.push({
        name: child.teacher_name,
        relationship: 'المعلمة الرئيسية',
        phone: child.teacher_phone || 'غير متوفر',
        email: child.teacher_email || 'غير متوفر',
        is_primary: true,
      });
    }

    // Add admin as emergency contact
    if (adminContact.length > 0) {
      emergencyContacts.push({
        name: adminContact[0].full_name,
        relationship: 'إدارة الروضة',
        phone: adminContact[0].phone || 'غير متوفر',
        email: adminContact[0].email || 'غير متوفر',
        is_primary: false,
      });
    }

    res.status(200).json({
      message: 'Child details retrieved successfully',
      data: [
        {
          ...child,
          documents: documents,
          emergency_contacts: emergencyContacts,
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

export const viewLatestDailyReport = async (req, res, next) => {
  try {
    const parent_id = req.user.id;

    const [report] = await sql`
     SELECT dr.* FROM daily_reports dr
     JOIN childs c ON dr.child_id = c.child_id
     WHERE c.parent_id = ${parent_id}
     ORDER BY dr.report_date DESC
     LIMIT 1
    `;

    if (!report) {
      return res.status(404).json({
        message: 'No daily report found for the given parent ID',
      });
    }

    res.status(200).json({
      message: 'Latest daily report retrieved successfully',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const viewLatestAttendanceReport = async (req, res, next) => {
  try {
    const { parent_id } = req.params;

    const [attendance] = await sql`
      SELECT a.* FROM attendance_record a
      JOIN childs c ON a.child_id = c.child_id
      WHERE c.parent_id = ${parent_id}
      ORDER BY a.attendance_date DESC
      LIMIT 1
    `;

    if (!attendance) {
      return res.status(404).json({
        message: 'No attendance report found for the given parent ID',
      });
    }
    res.status(200).json({
      message: 'Latest attendance report retrieved successfully',
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

export const requestChildProfileChange = async (req, res, next) => {
  const parentId = req.user.id;
  const childId = req.verified_child_id;
  const { field, newValue } = req.body;

  try {
    const [child] = await sql`
      SELECT ${field} FROM children
      WHERE child_id = ${childId}
    `;

    await sql`
      INSERT INTO child_profile_change_requests
      (child_id, field_name, old_value, new_value, requested_by)
      VALUES (${childId}, ${field}, ${child[field]}, ${newValue}, ${parentId})
    `;

    res.status(200).json({ message: 'Change request submitted for admin approval' });
  } catch (error) {
    next(error);
  }
};

export const viewAttendanceReports = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const attendanceReports = await sql`
      SELECT 
        DATE_TRUNC('month', a.created_at) AS month,
        json_agg(a ORDER BY a.created_at DESC) AS reports
      FROM attendance_record a
      JOIN childs c ON a.child_id = c.child_id
      WHERE c.parent_id = ${parent_id}
      GROUP BY month
      ORDER BY month DESC
    `;

    if (attendanceReports.length === 0) {
      return res.status(404).json({
        message: 'No attendance reports found for the given parent ID',
      });
    }

    return res.status(200).json(attendanceReports);
  } catch (error) {
    next(error);
  }
};

export const viewDailyReports = async (req, res, next) => {
  try {
    const parent_id = req.user.id;
    const page = parseInt(req.query.page) || 1;

    const limit = 10;
    const offset = (page - 1) * limit;

    // Get daily reports for the parent's child
    const reports = await sql`
      SELECT 
        dr.report_id as id,
        dr.child_id,
        dr.date,
        dr.food_intake,
        dr.activity_level,
        dr.sleep_quality,
        dr.behavior,
        dr.general_notes,
        dr.created_at,
        c.full_name as child_name
      FROM daily_report dr
      JOIN childs c ON dr.child_id = c.child_id
      WHERE c.parent_id = ${parent_id}
      ORDER BY dr.date DESC, dr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (reports.length === 0 && page === 1) {
      return res.status(404).json({
        message: 'No daily reports found for the given parent ID',
        data: [],
      });
    }

    res.status(200).json({
      message: 'Daily reports retrieved successfully',
      data: reports,
      pagination: {
        page,
        limit,
        hasMore: reports.length === limit,
      },
    });
  } catch (error) {
    next(error);
  }
};



export const createCheckoutSession = async (req, res, next) => {
  const parentId = req.user.id;
  try {
    const [parent] = await sql`
      SELECT stripe_customer_id, status
      FROM parents
      WHERE parent_id = ${parentId}
    `;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: parent.stripe_customer_id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: 'http://localhost:5173/payment/success',
      cancel_url: 'http://localhost:5173/payment/cancel',
    });

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
};

export const getMyInformation = async (req, res, next) => {
  const parentId = req.user.id;

  try {
    const [parent] = await sql`
      SELECT 
        p.*,
        u.full_name,
        u.email,
        u.phone,
        u.created_at,
        s.id AS subscription_id,
        s.stripe_subscription_id,
        s.stripe_customer_id,
        s.status AS subscription_status,
        s.current_period_start,
        s.current_period_end
      FROM parents p
      JOIN users u ON p.parent_id = u.user_id
      LEFT JOIN subscriptions s ON p.parent_id = s.parent_id
      WHERE p.parent_id = ${parentId}
    `;

    if (!parent) {
      return res.status(404).json({
        message: 'Parent not found',
      });
    }
    res.status(200).json({
      message: '',
      data: parent,
    });
  } catch (error) {
    next(error);
  }
};

export const viewProgressReports = async (req, res, next) => {
  try {
    const parent_id = req.user.id;

    const reports = await sql`
      SELECT 
        pr.report_id,
        pr.child_id,
        pr.period_start,
        pr.period_end,
        pr.levels,
        pr.created_at,
        c.full_name
      FROM progress_report pr
      JOIN childs c ON pr.child_id = c.child_id
      WHERE c.parent_id = ${parent_id}
      ORDER BY pr.period_start DESC
    `;

    if (reports.length === 0) {
      return res.status(404).json({
        message: 'No progress reports found for the given parent ID',
      });
    }

    return res.status(200).json(reports);
  } catch (error) {
    next(error);
  }
};