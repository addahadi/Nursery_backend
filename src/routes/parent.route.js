import express from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticateJWT } from '../middlewares/requireJWT.js'; // Import this
import {
  Login,
  requestChildProfileChange,
  SignUp,
  viewAttendanceReports,
  viewChildDetails,
  viewDailyReports,
  viewLatestAttendanceReport,
  viewLatestDailyReport,
  viewProgressReports,
  createCheckoutSession,
} from '../controllers/parent.controller.js';
import {
  ParentLoginSchema,
  ParentSignUpSchema,
  requestChildProfileChangeSchema,
} from '../schemas/parent.schema.js';
import { requireParent } from '../middlewares/parent/requireParent.js';
import { verifyChildOwnership } from '../middlewares/parent/verifyChildOwnerShip.js';

const router = express.Router();

router.post('/signup', validate(ParentSignUpSchema), SignUp);
router.post('/login', validate(ParentLoginSchema), Login);

router.use(authenticateJWT);

router.get('/child-details', requireParent({ status: 'ACTIVE' }), viewChildDetails);

router.get('/daily-reports', requireParent({ status: 'ACTIVE' }), viewDailyReports);
router.get('/daily-report', requireParent({ status: 'ACTIVE' }), viewLatestDailyReport);
router.get('/attendance-reports', requireParent({ status: 'ACTIVE' }), viewAttendanceReports);
router.get('/attendance-report', requireParent({ status: 'ACTIVE' }), viewLatestAttendanceReport);

router.get('/progress-reports', requireParent({ status: 'ACTIVE' }), viewProgressReports);

router.get(
  '/checkout-session',
  requireParent({ status: 'APPROVED_AWAITING_PAYMENT' }),
  createCheckoutSession
);

router.post(
  ':childId/request-child-profile-change',
  requireParent({ status: 'ACTIVE' }),
  validate(requestChildProfileChangeSchema),
  verifyChildOwnership,
  requestChildProfileChange
);

export default router;
