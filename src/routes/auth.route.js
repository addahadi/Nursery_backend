import express from 'express';
const router = express.Router();

import { getMe, Login, Logout } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { AdminLoginSchema } from '../schemas/admin.schema.js';
import { authenticateJWT } from '../middlewares/requireJWT.js';

router.post('/login', validate(AdminLoginSchema), Login);


router.use(authenticateJWT);


router.post("/logout" , Logout)
router.get("/me" , getMe)

export default router;
