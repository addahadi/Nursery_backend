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
// getDailyReportsByDate
export const getDailyReportsByDate = async (req, res, next) => {
  try {
    // 🧑‍🏫 ID تاع الأستاذ (جاي من auth middleware)
    const teacherId = req.user.id;

    // 📅 التاريخ المختار (YYYY-MM-DD)
    const { date } = req.query;

    // 📄 جلب التقارير اليومية الخاصة بأطفال هذا الأستاذ فقط
    const reports = await sql`
      SELECT
        r.id,                 -- ID التقرير
        r.child_id,           -- ID الطفل
        r.report_date,        -- تاريخ التقرير
        r.status,             -- حالة التقرير (PENDING / COMPLETED)
        c.full_name AS child_name -- اسم الطفل
      FROM report r
      JOIN child c ON c.id = r.child_id
      WHERE r.report_date = ${date}        -- نفس التاريخ
      AND c.teacher_id = ${teacherId}      -- تأكيد ملكية الأستاذ
      ORDER BY c.full_name ASC             -- ترتيب أبجدي
    `;

    // ✅ إرجاع النتائج
    res.status(200).json(reports);
  } catch (error) {
    // ❌ تمرير الخطأ للـ error handler
    next(error);
  }
};
// getChildReportByDate
export const getChildReportByDate = async (req, res, next) => {
  try {
    // 🧑‍🏫 ID تاع الأستاذ (من auth middleware)
    const teacherId = req.user.id;

    // 👶 ID الطفل + 📅 التاريخ
    const { child_id, date } = req.query;

    // 1️⃣ التأكد أن الطفل تابع لهذا الأستاذ
    const child = await sql`
      SELECT id
      FROM child
      WHERE id = ${child_id}
      AND teacher_id = ${teacherId}
    `;

    if (child.length === 0) {
      throw new Error('FORBIDDEN');
    }

    // 2️⃣ جلب تقرير الطفل في هذا التاريخ
    const report = await sql`
      SELECT
        id,
        child_id,
        report_date,
        food_intake,
        activity_level,
        sleep_quality,
        behaviour,
        general_notes,
        status
      FROM report
      WHERE child_id = ${child_id}
      AND report_date = ${date}
    `;

    // 3️⃣ إذا ما كانش تقرير
    if (report.length === 0) {
      return res.status(404).json({
        message: 'Report not found',
      });
    }

    // ✅ إرجاع التقرير
    res.status(200).json(report[0]);
  } catch (error) {
    // ❌ تمرير الخطأ للـ error handler
    next(error);
  }
};
//controller for submitChildReport
export const submitChildReport = async (req, res, next) => {
  try {
    // 🧑‍🏫 ID تاع الأستاذ
    const teacherId = req.user.id;

    // 🆔 ID التقرير
    const { report_id } = req.params;

    // 📦 البيانات الجاية من الفرونت (validated)
    const {
      food_intake,
      activity_level,
      sleep_quality,
      behaviour,
      general_notes,
    } = req.body;

    // 1️⃣ التأكد أن التقرير تابع لطفل هذا الأستاذ
    const report = await sql`
      SELECT r.id
      FROM report r
      JOIN child c ON c.id = r.child_id
      WHERE r.id = ${report_id}
      AND c.teacher_id = ${teacherId}
    `;

    if (report.length === 0) {
      throw new Error('FORBIDDEN');
    }

    // 2️⃣ تحديث التقرير + تغيير الحالة
    await sql`
      UPDATE report
      SET
        food_intake = ${food_intake},
        activity_level = ${activity_level},
        sleep_quality = ${sleep_quality},
        behaviour = ${behaviour},
        general_notes = ${general_notes},
        status = 'COMPLETED'
      WHERE id = ${report_id}
    `;

    // ✅ ردّ النجاح
    res.status(200).json({
      message: 'Daily report submitted successfully',
    });
  } catch (error) {
    // ❌ تمرير الخطأ
    next(error);
  }
}; 
//controller for getAttendanceByDate 
export const getAttendanceByDate = async (req, res, next) => {
  try {
    // 🧑‍🏫 ID تاع الأستاذ (من auth middleware)
    const teacherId = req.user.id;

    // 📅 التاريخ المختار
    const { date } = req.query;

    // 📋 جلب قائمة الأطفال + حالة الحضور
    const attendance = await sql`
      SELECT
        c.id AS child_id,              -- ID الطفل
        c.full_name AS child_name,     -- اسم الطفل
        a.status,                      -- present | absent
        a.check_in_time                -- وقت الدخول (إلا كان حاضر)
      FROM child c
      LEFT JOIN attendance a
        ON a.child_id = c.id
        AND a.attendance_date = ${date}
      WHERE c.teacher_id = ${teacherId}
      ORDER BY c.full_name ASC
    `;

    // ✅ إرجاع النتائج
    res.status(200).json(attendance);
  } catch (error) {
    // ❌ تمرير الخطأ للـ error handler
    next(error);
  }
};

// controllers/classroom.controller.js

export const getClassroomOverview = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { classroomId } = req.params;

    // 📌 تاريخ اليوم
    const today = new Date().toISOString().split('T')[0];

    // 1️⃣ تأكد أن القسم تابع للأستاذ
    const classroom = await sql`
      SELECT id
      FROM classrooms
      WHERE id = ${classroomId}
      AND teacher_id = ${teacherId}
    `;

    if (classroom.length === 0) {
      throw new Error('FORBIDDEN');
    }

    // 2️⃣ جلب بيانات الأطفال + overview
    const children = await sql`
      SELECT
        c.child_id,
        c.full_name,
        c.age,

        -- 🍽️ آخر وجبة اليوم
        dr.food_intake,

        -- ✅❌ حالة الحضور اليوم
        ar_today.status AS today_attendance,

        -- 📊 عدد أيام الحضور
        COUNT(ar_present.record_id) FILTER (WHERE ar_present.status = 'present') AS present_count,

        -- 📊 عدد أيام الغياب
        COUNT(ar_absent.record_id) FILTER (WHERE ar_absent.status = 'absent') AS absent_count

      FROM children c

      -- تقرير اليوم
      LEFT JOIN daily_report dr
        ON dr.child_id = c.child_id
        AND dr.date = ${today}

      -- حضور اليوم
      LEFT JOIN attendance_record ar_today
        ON ar_today.child_id = c.child_id
        AND ar_today.date = ${today}

      -- كل سجلات الحضور (للحساب)
      LEFT JOIN attendance_record ar_present
        ON ar_present.child_id = c.child_id

      LEFT JOIN attendance_record ar_absent
        ON ar_absent.child_id = c.child_id

      WHERE c.classroom_id = ${classroomId}

      GROUP BY
        c.child_id,
        c.full_name,
        c.age,
        dr.food_intake,
        ar_today.status
    `;

    // 3️⃣ رجوع النتيجة
    res.json(children);
  } catch (error) {
    next(error);
  }
};
// its okay very nice very good 