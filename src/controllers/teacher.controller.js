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

    res.json(children);
  } catch (error) {
    next(error);
  }
};

/**
 * 📝 إنشاء تقرير
 */
export const createChildReport = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const {
      child_id,
      date,
      food_intake,
      activity_level,
      sleep_quality,
      behaviour,
      general_notes,
    } = req.body;

    const child = await sql`
      SELECT id FROM child
      WHERE id = ${child_id}
      AND teacher_id = ${teacherId}
    `;

    if (child.length === 0) {
      throw new Error('FORBIDDEN');
    }

    await sql`
      INSERT INTO report (
        child_id,
        report_date,
        food_intake,
        activity_level,
        sleep_quality,
        behaviour,
        general_notes,
        status
      ) VALUES (
        ${child_id},
        ${date},
        ${food_intake},
        ${activity_level},
        ${sleep_quality},
        ${behaviour},
        ${general_notes},
        'PENDING'
      )
    `;

    res.status(201).json({ message: 'Report created' });
  } catch (error) {
    next(error);
  }
};

/**
 * 📸 إضافة media
 */
export const addActivityMedia = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { activityId, name, file_path, description, date, classroomId } =
      req.body;

    const activity = await sql`
      SELECT id FROM activity
      WHERE id = ${activityId}
      AND teacher_id = ${teacherId}
    `;

    if (activity.length === 0) {
      throw new Error('FORBIDDEN');
    }

    await sql`
      INSERT INTO activity_media
      (name, file_path, description, date, classroom_id)
      VALUES
      (${name}, ${file_path}, ${description}, ${date}, ${classroomId})
    `;

    res.status(201).json({ message: 'Media added' });
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ تحديث الحضور
 */
export const updateAttendance = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { childName, date, status, checkInTime, checkOutTime } = req.body;

    const child = await sql`
      SELECT c.id
      FROM child c
      WHERE c.full_name = ${childName}
      AND c.teacher_id = ${teacherId}
    `;

    if (child.length === 0) {
      throw new Error('CHILD_NOT_FOUND');
    }

    await sql`
      UPDATE attendance
      SET
        status = ${status},
        check_in_time = ${checkInTime},
        check_out_time = ${checkOutTime}
      WHERE child_id = ${child[0].id}
      AND attendance_date = ${date}
    `;

    res.json({ message: 'Attendance updated' });
  } catch (error) {
    next(error);
  }
};
