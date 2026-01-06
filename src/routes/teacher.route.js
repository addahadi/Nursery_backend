import express from 'express';
import {
  addActivityMediaschema,
  AttendanceSchema,
  DailyReportSchema,
  TeacherLoginSchema,
  UpdateAttenceSchema,
} from '../schemas/teacher.schema.js';

import { viewChildDetails } from '../controllers/parent.controller.js';


import { validate } from '../middlewares/validate.js';

import {
  getAttendanceByDate,
  getChildReportByDate,
  getClassroomOverview,
  getDailyReportsByDate,
  submitChildReport,
  updateAttendance,
  createChildReport
} from '../controllers/teacher.controller.js';


const router = express.Router();

// مشاهدة الأطفال
router.get('/children', viewChildDetails);

// إنشاء تقرير يومي
router.post('/daily-report', validate(DailyReportSchema), createChildReport);

router.put(
  '/attendance',
  validate(AttendanceSchema),
  updateAttendance
);

// جلب التقارير اليومية حسب التاريخ
router.get('/daily-report', getDailyReportsByDate);

// جلب تقرير طفل معيّن في تاريخ معيّن
router.get('/daily-report/child', getChildReportByDate);



// جلب الحضور حسب التاريخ
router.get('/attendance', getAttendanceByDate);

// نظرة عامة على القسم
router.get(
  '/classroom/:classroomId/overview',
  getClassroomOverview
);

export default router;
