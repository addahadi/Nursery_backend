import express from 'express';
const router = express.Router();

import { getMe, Login } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { AdminLoginSchema } from '../schemas/admin.schema.js';
import { authenticateJWT } from '../middlewares/requireJWT.js';

router.post('/login', validate(AdminLoginSchema), Login);


router.use(authenticateJWT);
router.get("/me" , getMe)

export default router;
