import sql from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const Login = async (req, res, next) => {
  const body = req.body;
  try {
    const user = await sql`
      SELECT * FROM 
      users WHERE email = ${body.email}`;

    if (user.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    let Status;
    switch (user[0].role) {
      case 'parent':
        const parent = await sql`SELECT status FROM parents WHERE parent_id = ${user[0].user_id}`;
        console.log(parent);
        Status = parent[0].status;
        break;

      case 'teacher':
        const teacher =
          await sql`SELECT status FROM teachers WHERE teacher_id = ${user[0].user_id}`;
        Status = teacher[0].status;
        break;

      default:
        break;
    }

    let isPasswordValid;
    if (user[0].role === 'admin') {
      isPasswordValid = body.password === user[0].password_hash;
    } else {
      isPasswordValid = await bcrypt.compare(body.password, user[0].password_hash);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        id: user[0].user_id,
        role: user[0].role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      }
    );

    console.log(user[0])
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user[0].user_id,
        full_name: user[0].full_name,
        email: user[0].email,
        role: user[0].role,
        status: Status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const result = await sql`
      SELECT
        u.*,
        p.status
      FROM users u
      LEFT JOIN parents p ON p.parent_id = u.user_id
      WHERE u.user_id = ${req.user.id}
      LIMIT 1
    `;

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      user: {
        id: result[0].id,
        name : result[0].full_name,
        email: result[0].email,
        role: result[0].role,
        status: result[0].status,
      },
    });
  } catch (error) {
    next(error);
  }
};
