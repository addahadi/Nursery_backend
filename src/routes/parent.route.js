import express from 'express';
import { validate } from '../middlewares/validate.js';
import { Login, SignUp } from '../controllers/parent.controller.js';
import { ParentLoginSchema, ParentSignUpSchema } from '../schemas/parent.schema.js';

const router = express.Router();

router.post('/signup', validate(ParentSignUpSchema), SignUp);
router.post('/login', validate(ParentLoginSchema), Login);

export default router;
