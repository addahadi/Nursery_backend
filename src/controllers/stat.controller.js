import stripe from '../config/stripe.js';
import sql from '../db.js';

export const getClassroomStats = async (req, res, next) => {
  try {
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM classrooms) AS total_rooms,
        (SELECT COUNT(*) FROM childs WHERE classroom_id IS NOT NULL) AS total_enrolled,
        (SELECT COUNT(*) FROM teachers WHERE status = 'ACTIVE') AS total_teachers,
        (SELECT SUM(capacity) - COUNT(childs.child_id) 
         FROM classrooms 
         LEFT JOIN childs ON classrooms.id = childs.classroom_id
        ) AS spots_available
    `;

    res.status(200).json({
      message: 'Dashboard statistics retrieved successfully',
      data: {
        total_rooms: parseInt(stats[0].total_rooms) || 0,
        total_enrolled: parseInt(stats[0].total_enrolled) || 0,
        total_teachers: parseInt(stats[0].total_teachers) || 0,
        spots_available: parseInt(stats[0].spots_available) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};



export const getTeacherStats = async (req, res, next) => {
  try {
    const stats = await sql`
      SELECT 
        COUNT(*) AS total_teachers,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_teachers,
        COUNT(*) FILTER (WHERE status = 'INACTIVE') AS on_leave_teachers
      FROM teachers
    `;

    res.status(200).json({
      message: 'Teacher statistics retrieved successfully',
      data: {
        total_teachers: parseInt(stats[0].total_teachers) || 0,
        active: parseInt(stats[0].active_teachers) || 0,
        on_leave: parseInt(stats[0].on_leave_teachers) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const getMyChildrenAttendanceStats = async (req, res, next) => {
  const parentId = req.user.id; // From JWT token

  try {
    const children = await sql`
      SELECT child_id FROM childs WHERE parent_id = ${parentId}
    `;

    if (children.length === 0) {
      return res.status(200).json({
        message: 'No children found',
        data: {
          present: 0,
          absent: 0,
          sick_days: 0,
        },
      });
    }

    const childIds = children.map((c) => c.child_id);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'present') AS present_count,
        COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
        COUNT(*) FILTER (WHERE status = 'sick') AS sick_days_count
      FROM attendance_record
      WHERE date = ${today}
      AND child_id = ANY(${childIds})
    `;

    res.status(200).json({
      message: 'Attendance statistics retrieved successfully',
      data: {
        present: parseInt(stats[0].present_count) || 0,
        absent: parseInt(stats[0].absent_count) || 0,
        sick_days: parseInt(stats[0].sick_days_count) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};



export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM parents WHERE status = 'APPROVED_AWAITING_PAYMENT' OR status = 'ACTIVE') AS total_parents,
        (SELECT COUNT(*) FROM classrooms) AS total_classrooms,
        (SELECT COUNT(*) FROM childs WHERE classroom_id IS NOT NULL) AS enrolled_children,
        (SELECT COALESCE(SUM(capacity::integer), 0) FROM classrooms) AS total_capacity
    `;

    // Calculate monthly revenue from active subscriptions
    const activeSubscriptions = await sql`
      SELECT stripe_price_id
      FROM subscriptions
      WHERE status = 'active'
    `;

    // You'll need to fetch price details from Stripe or store them in DB
    // For now, we'll return a placeholder or sum if you have amount stored
    let monthlyRevenue = 0;

    // If you want actual revenue, you'd need to query Stripe API
    // or store price amounts in your database
    for (const sub of activeSubscriptions) {
      try {
        if (sub.stripe_price_id) {
          const price = await stripe.prices.retrieve(sub.stripe_price_id);
          monthlyRevenue += price.unit_amount / 100;
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    }

    const totalParents = parseInt(stats[0].total_parents) || 0;
    const totalClassrooms = parseInt(stats[0].total_classrooms) || 0;
    const enrolledChildren = parseInt(stats[0].enrolled_children) || 0;
    const totalCapacity = parseInt(stats[0].total_capacity) || 0;

    res.status(200).json({
      message: 'Dashboard statistics retrieved successfully',
      data: {
        total_parents: totalParents,
        total_classrooms: totalClassrooms,
        enrolled_children: enrolledChildren,
        available_capacity: totalCapacity - enrolledChildren,
        monthly_revenue: parseFloat(monthlyRevenue.toFixed(2)),
        percentage_changes: {
          parents: '+12%', // You'd need historical data to calculate this
          classrooms: '+2%',
          revenue: '+8.5%',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivities = async (req, res, next) => {
  try {
    // Get recent parent registrations
    const recentParents = await sql`
      SELECT 
        'parent_registration' as activity_type,
        u.full_name,
        u.created_at,
        p.status
      FROM users u
      JOIN parents p ON u.user_id = p.parent_id
      ORDER BY u.created_at DESC
      LIMIT 3
    `;

    // Get recent teacher additions (if you track this)
    const recentTeachers = await sql`
      SELECT 
        'teacher_addition' as activity_type,
        u.full_name,
        u.created_at,
        t.status
      FROM users u
      JOIN teachers t ON u.user_id = t.teacher_id
      ORDER BY u.created_at DESC
      LIMIT 2
    `;

    // Get recent classroom additions
    const recentClassrooms = await sql`
      SELECT 
        'classroom_addition' as activity_type,
        c.name as classroom_name,
        u.full_name as teacher_name,
        c.created_at
      FROM classrooms c
      JOIN users u ON c.teacher_id = u.user_id
      ORDER BY c.created_at DESC
      LIMIT 2
    `;

    // Combine and sort all activities
    const allActivities = [
      ...recentParents.map((p) => ({
        title: 'تسجيل  اب',
        description: p.full_name,
        timestamp: p.created_at,
        status: p.status,
      })),
      ...recentTeachers.map((t) => ({
        title: 'إضافة ولي أمر',
        description: t.full_name,
        timestamp: t.created_at,
        status: t.status,
      })),
      ...recentClassrooms.map((c) => ({
        title: 'إضافة فصل',
        description: c.classroom_name + ' - ' + c.teacher_name,
        timestamp: c.created_at,
        status: 'active',
      })),
    ];

    // Sort by timestamp and take top 5
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivities = allActivities.slice(0, 5);

    res.status(200).json({
      message: 'Recent activities retrieved successfully',
      data: recentActivities,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingActions = async (req, res, next) => {
  try {
    // Pending parent registrations
    const [pendingParents] = await sql`
      SELECT COUNT(*) as count
      FROM parents
      WHERE status = 'PENDING_REVIEW'
    `;

    // Overdue payments (if you track payment due dates)
    const [overduePayments] = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'past_due' OR status = 'unpaid'
    `;

    const pendingProfileChanges = 0;

    const [classroomsNeedingAttention] = await sql`
      SELECT COUNT(*) as count
      FROM classrooms c
      LEFT JOIN (
        SELECT classroom_id, COUNT(*) as enrolled
        FROM childs
        WHERE classroom_id IS NOT NULL
        GROUP BY classroom_id
      ) ch ON c.id = ch.classroom_id
      WHERE COALESCE(ch.enrolled, 0) < (c.capacity::integer * 0.5)
    `;

    // Health record updates needed (placeholder - depends on your requirements)
    const healthRecordsNeeded = 0;

    const actions = [];

    if (parseInt(pendingParents.count) > 0) {
      actions.push({
        type: 'pending_registration',
        title: 'طلبات تسجيل قيد الانتظار',
        count: parseInt(pendingParents.count),
        priority: 'high',
      });
    }

    if (parseInt(overduePayments.count) > 0) {
      actions.push({
        type: 'overdue_payment',
        title: 'مدفوعات متأخرة',
        count: parseInt(overduePayments.count),
        priority: 'medium',
      });
    }

    if (pendingProfileChanges > 0) {
      actions.push({
        type: 'profile_changes',
        title: 'تعارض في قبول المعلمات',
        count: pendingProfileChanges,
        priority: 'low',
      });
    }

    if (parseInt(classroomsNeedingAttention.count) > 0) {
      actions.push({
        type: 'classroom_attention',
        title: 'تحديث السجلات الصحية (طالباً)',
        count: parseInt(classroomsNeedingAttention.count),
        priority: 'low',
      });
    }

    res.status(200).json({
      message: 'Pending actions retrieved successfully',
      data: actions,
    });
  } catch (error) {
    next(error);
  }
};



export const getAdminRevenueStats = async (req, res, next) => {
  try {
    const [monthly] = await sql`
      SELECT COALESCE(SUM(amount_paid), 0) AS value
      FROM invoices
      WHERE status = 'paid'
      AND paid_at >= date_trunc('month', NOW())
    `;

    const [outstanding] = await sql`
      SELECT COALESCE(SUM(amount_paid), 0) AS value
      FROM invoices
      WHERE status IN ('open', 'unpaid')
      AND period_end < NOW()
    `;

    res.status(200).json({
      monthlyRevenue: monthly.value,
      outstandingAmount: outstanding.value,
    });
  } catch (error) {
    next(error);
  }
};
