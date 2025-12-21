import sql from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

export const Login = async (req, res, next) => {
  const body = req.body;
  try {
    const user = await sql`
            SELECT * FROM users WHERE email = ${body.email} AND role = 'parent'`;
    if (user.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }
    const isPasswordValid = await bcrypt.compare(body.password, user[0].password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        userId: user[0].id,
        role: user[0].role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const viewChildDetails = async (req, res, next) => {
  try {
    const { parent_id } = req.params;
    const childDetails = await sql`
      SELECT * FROM childs WHERE parent_id = ${parent_id}
    `;
    if(childDetails.length === 0){
      return res.status(404).json({
        message : "No child details found for the given parent ID"
      })
    }
    res.status(200).json({
      message: 'Child details retrieved successfully',
      data: childDetails,
    });
  } 
  catch (error) {
    next(error);
  }
};