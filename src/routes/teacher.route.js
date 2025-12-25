import express from 'express';
import {
  addActivityMediaschema,
  DailyReportSchema,
  TeacherLoginSchema,
  UpdateAttenceSchema,
} from '../schemas/teacher.schema.js';
import { validate } from '../middlewares/validate.js';
import { addActivityMedia, Login, updateAttendance } from '../controllers/teacher.controller.js';
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

export default router;
