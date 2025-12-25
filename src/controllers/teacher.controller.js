import sql from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { useReducer } from 'react';
import { ca, es } from 'zod/locales';

export const Login = async (req, res, next) => {
  const body = req.body;
  try {
    const user = await sql`
        SELECT * FROM users WHERE email = ${body.email} AND role = 'teacher'`;
    if (user.length === 0) {
      return res.status(401).json({
        message: ' you dont have a compte in oure web site',
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
  } catch (err) {
    next(error);
  }
};

// teacher.controller.js

// 1️⃣ مشاهدة قائمة الأطفال
export const viewChildrenList = async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    const children = await sql`
      SELECT
        id,
        full_name,
        age,
        classrom_id
      FROM child
      WHERE teacher_id = ${teacherId}
    `;

    res.json(children);
  } catch (error) {
    next(error);
  }
};

// 3️⃣ رفع تقرير
export const createChildReport = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { child_id, date, foodIntake, activitylevel, sleepQuality, behavoir, generalNotes } =
      req.body;

    // 1️⃣ تأكد أن الطفل تابع للأستاذ
    const child = await sql`
      SELECT id
      FROM child
      WHERE id = ${child_id}
      AND teacher_id = ${teacherId}
    `;

    if (child.length === 0) {
      throw new Error('FORBIDDEN');
    }

    // 2️⃣ إنشاء التقرير
    await sql`
      INSERT INTO report (
        child_id,
        report_date,
        food_intake,
        activity_level,
        sleep_quality,
        behaviour,
        general_notes
      ) VALUES (
        ${child_id},
        ${date},
        ${foodIntake},
        ${activitylevel},
        ${sleepQuality},
        ${behavoir},
        ${generalNotes}
      )
    `;

    res.status(201).json({ message: 'Report created' });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller لإضافة media
 */
export const addActivityMedia = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { activityid, name, file_path, description, date, classroomId } = req.body;

    // 1️⃣ تحقق أن النشاط تابع للأستاذ
    const activity = await sql`
      SELECT id
      FROM activity
      WHERE id = ${activityid}
      AND teacherid = ${teacherId}
    `;

    if (activity.length === 0) {
      throw new Error('FORBIDDEN');
    }

    // 2️⃣ إدخال media في DB
    await sql`
      INSERT INTO activity_media (
        name,
        file_path,
        description,
        date,
        classroomId
      ) VALUES (
        ${name},
        ${file_path},
        ${description},
        ${date},
        ${classroomId}
      )
    `;

    res.status(201).json({ message: 'Activity media added successfully' });
  } catch (error) {
    next(error);
  }
};
/**
 * updateAttendance
 * الأستاذ يحدّث حضور طفل باستعمال الاسم
 */
export const updateAttendance = async (req, res, next) => {
  try {
    const teacher_id = req.user.id;
    const { childName, date, status, checkInTime, checkOutTime } = req.body;

    /**
     *  نبحث عن الطفل بالاسم
     * ونتأكد أنه تابع للأستاذ
     */

    const child = await sql`
SELECT childId
FROM Child c
JOIN Classroom cl on c.classroomId = cl.classroomId
WHERE c.name = ${childName}
AND cl.name = ${teacherId};`;

    // إذا الاسم غير موجود أو الطفل ليس تابعًا للأستاذ
    if (child.length === 0) {
      throw new Error('CHILD_NOT__FOUND_OR_FORBIDDEN');
    }
    //  نستخرج childId (استعمال داخلي فقط)**
    const childId = child[0].childId;
    /**
     *  نحدّث سجل الحضور
     */
    await sql`
UPDATE AttendanceRecord
SET 
status ={status},
checkInTime=${checkInTime},
checkOutTime=${checkOutTime},
WHERE childId = ${childId}
AND data = ${date};`;

    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    next(error);
  }
};
