import express from 'express';
import { DailyReportSchema, TeacherLoginSchema } from '../schemas/teacher.schema.js';
import { validate } from '../middlewares/validate.js';
import { Login } from '../controllers/teacher.controller.js';
import { viewChildDetails } from '../controllers/parent.controller.js';

import { createChildReport } from '../controllers/teacher.controller.js';

const router = express.Router();

router.post('/login', validate(TeacherLoginSchema), Login);

// مشاهدة الأطفال
router.get('/children', viewChildDetails);

//creat raport from teacher
router.post('/daily-report', validate(DailyReportSchema), createChildReport);
export default router;
