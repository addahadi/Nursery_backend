import express from 'express';
const router = express.Router();

import { requireAdmin } from '../middlewares/admin/requireAdmin.js';
import { authenticateJWT } from '../middlewares/requireJWT.js';
import {
  approveParentRegistration,
  CreateClassroom,
  CreateParent,
  CreateTeacher,
  getFilterdParentList,
  getFilterdTeacherList,
  getPaymentsList,
  rejectParentRegistration,
  viewClassRooms,
} from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  AdminLoginSchema,
  CreateClassRoomSchema,
  CreateParentSchema,
  CreateTeacherSchema,
  FilteredParentListSchema,
  FilteredTeacherListSchema,
  getPaymentsListSchema,
  ValidateUserIdSchema,
} from '../schemas/admin.schema.js';

router.use(authenticateJWT);

router.get(
  '/filtered-parent-list',
  requireAdmin,
  validate(FilteredParentListSchema, 'query'),
  getFilterdParentList
);

router.get(
  '/filtered-teacher-list',
  requireAdmin,
  validate(FilteredTeacherListSchema, 'query'),
  getFilterdTeacherList
);

router.put('/parent/:id/approve', requireAdmin , validate(ValidateUserIdSchema , "params"), approveParentRegistration);
router.put('/parent/:id/reject', requireAdmin , validate(ValidateUserIdSchema , "params"), rejectParentRegistration);
router.post('/parent/create', requireAdmin, validate(CreateParentSchema), CreateParent);
router.post('/teacher/create', requireAdmin, validate(CreateTeacherSchema), CreateTeacher);
router.post('/classroom/create', requireAdmin, validate(CreateClassRoomSchema), CreateClassroom);

router.get('/classroom', requireAdmin, viewClassRooms);
router.get('/payments', requireAdmin, validate(getPaymentsListSchema, 'query'), getPaymentsList);

export default router;
