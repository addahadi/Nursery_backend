import express from 'express';
import { TeacherLoginSchema } from '../schemas/teacher.schema.js';
import { validate } from '../middlewares/validate.js';
import { Login } from '../controllers/teacher.controller.js';

const router = express.Router();

router.post('/login', validate(TeacherLoginSchema), Login);

export default router;
