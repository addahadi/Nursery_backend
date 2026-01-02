import express from 'express';
import {
  addActivityMediaschema,
  DailyReportSchema,
  TeacherLoginSchema,
  UpdateAttenceSchema,
} from '../schemas/teacher.schema.js';
import { validate } from '../middlewares/validate.js';
import { addActivityMedia, getAttendanceByDate, getChildReportByDate, getClassroomOverview, getDailyReportsByDate, Login, submitChildReport, updateAttendance } from '../controllers/teacher.controller.js';
import { viewChildDetails } from '../controllers/parent.controller.js';

import { createChildReport } from '../controllers/teacher.controller.js';

const router = express.Router();

router.post('/login', validate(TeacherLoginSchema), Login);

// مشاهدة الأطفال
router.get('/children', viewChildDetails);

//creat raport from teacher
router.post('/daily-report', validate(DailyReportSchema), createChildReport);

// إضافة media لنشاط
router.post('/activities/:activityId/media', validate(addActivityMediaschema), addActivityMedia);
// نحدّث سجل الحضور
router.put('attendance', validate(UpdateAttenceSchema), updateAttendance);

// جلب التقارير اليومية حسب التاريخ
router.get('/daily-report',getDailyReportsByDate);

// جلب تقرير طفل معيّن في تاريخ معيّن
router.get('/daily-report/child', getChildReportByDate);
// إكمال / إرسال التقرير اليومي
router.put(
  '/daily-report/:report_id',
  validate(submitChildReport),
  submitChildReport
);
// جلب الحضور حسب التاريخ
router.get('/attendance', getAttendanceByDate);
// routes/classroom.routes.js

router.get(
  '/classroom/:classroomId/overview',
  getClassroomOverview
);


export default router;
