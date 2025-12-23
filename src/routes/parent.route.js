import express from 'express';
import { validate } from '../middlewares/validate.js';
import {
  Login,
  requestChildProfileChange,
  SignUp,
  viewChildDetails,
} from '../controllers/parent.controller.js';
import {
  ParentLoginSchema,
  ParentSignUpSchema,
  requestChildProfileChangeSchema,
} from '../schemas/parent.schema.js';
import { requireParent } from '../middlewares/parent/requireParent.js';

const router = express.Router();

router.post('/signup', validate(ParentSignUpSchema), SignUp);
router.post('/login', validate(ParentLoginSchema), Login);

router.get('/child', requireParent({ status: 'approved' }), viewChildDetails);

router.post(
  '/request-child-profile-change',
  requireParent({ status: 'approved' }),
  validate(requestChildProfileChangeSchema),
  requestChildProfileChange
);

export default router;
