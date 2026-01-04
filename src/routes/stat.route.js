import express from 'express';
import { requireAdmin } from '../middlewares/admin/requireAdmin.js';
import { getClassroomStats, getDashboardStats, getMyChildrenAttendanceStats, getPaymentStats, getPendingActions, getRecentActivities, getTeacherStats } from '../controllers/stat.controller.js';
import { requireParent } from '../middlewares/parent/requireParent.js';


const router = express.Router();


router.get("/admin/classroom" , requireAdmin , getClassroomStats)
router.get("/admin/teacher" , requireAdmin , getTeacherStats)
router.get("/admin/payment" , requireAdmin , getPaymentStats)
router.get('/parent/attendance', requireParent, getMyChildrenAttendanceStats);
router.get("/admin/recent-activities" , getRecentActivities)
router.get("/admin/pending-actions" , getPendingActions)
router.get("/admin/dashboard" , getDashboardStats)

export default router