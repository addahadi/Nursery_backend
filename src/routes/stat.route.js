import express from 'express';
import { requireAdmin } from '../middlewares/admin/requireAdmin.js';
import { getAdminRevenueStats, getClassroomStats, getDashboardStats, getMyChildrenAttendanceStats, getPaymentStats, getPendingActions, getRecentActivities, getTeacherStats } from '../controllers/stat.controller.js';
import { requireParent } from '../middlewares/parent/requireParent.js';


const router = express.Router();


router.get("/admin/classroom" , requireAdmin , getClassroomStats)
router.get("/admin/teacher" , requireAdmin , getTeacherStats)
router.get('/parent/attendance', requireParent, getMyChildrenAttendanceStats);
router.get("/admin/recent-activities" , getRecentActivities)
router.get("/admin/pending-actions" , getPendingActions)
router.get("/admin/dashboard" , getDashboardStats)
router.get("/admin/revenue" , getAdminRevenueStats)

export default router