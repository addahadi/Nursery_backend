import express from 'express';
import { requireAdmin } from '../middlewares/admin/requireAdmin';
import { getClassroomStats, getMyChildrenAttendanceStats, getPaymentStats, getTeacherStats } from '../controllers/stat.controller';
import { requireParent } from '../middlewares/parent/requireParent';


const router = express.Router();


router.get("/stats/admin/classroom" , requireAdmin , getClassroomStats)
router.get("/stats/admin/teacher" , requireAdmin , getTeacherStats)
router.get("/stats/admin/payment" , requireAdmin , getPaymentStats)
router.get('/stats/parent/attendance', requireParent, getMyChildrenAttendanceStats);


export default router