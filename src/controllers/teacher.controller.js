import sql from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * 🔐 Teacher Login
 */
export const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await sql`
      SELECT * FROM users
      WHERE email = ${email} AND role = 'teacher'
    `;

    if (user.length === 0) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validPassword = await bcrypt.compare(
      password,
      user[0].password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user[0].id, role: user[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user[0].id,
        full_name: user[0].full_name,
        email: user[0].email,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 👶 مشاهدة الأطفال
 */
export const viewChildrenList = async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    const children = await sql`
      SELECT id, full_name, age, classroom_id
      FROM child
      WHERE teacher_id = ${teacherId}
    `;

    res.json(
