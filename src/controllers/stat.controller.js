import stripe from '../config/stripe';
import sql from '../db';

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

export const getPaymentStats = async (req, res, next) => {
  try {
    const subscriptions = await sql`
      SELECT 
        stripe_subscription_id,
        stripe_customer_id,
        stripe_price_id,
        status,
        current_period_start,
        current_period_end
      FROM subscriptions
      WHERE stripe_subscription_id IS NOT NULL
    `;

    let monthlyRevenue = 0;
    let collectedAmount = 0;
    let canceledCount = 0;

    for (const sub of subscriptions) {
      try {
        // Get the subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

        // Get the price amount
        const priceAmount = stripeSubscription.items.data[0]?.price?.unit_amount || 0;
        const amountInDollars = priceAmount / 100;

        if (sub.status === 'active' || stripeSubscription.status === 'active') {
          monthlyRevenue += amountInDollars;
        }

        const invoices = await stripe.invoices.list({
          subscription: sub.stripe_subscription_id,
          status: 'paid',
          limit: 100,
        });

        // Sum up all paid invoices
        const totalPaid = invoices.data.reduce((sum, invoice) => {
          return sum + invoice.amount_paid / 100;
        }, 0);

        collectedAmount += totalPaid;

        // Count canceled subscriptions
        if (sub.status === 'canceled' || stripeSubscription.status === 'canceled') {
          canceledCount++;
        }
      } catch (stripeError) {
        console.error(
          `Error fetching Stripe data for subscription ${sub.stripe_subscription_id}:`,
          stripeError
        );
      }
    }

    res.status(200).json({
      message: 'Payment statistics retrieved successfully',
      data: {
        monthly_revenue: parseFloat(monthlyRevenue.toFixed(2)),
        collected: parseFloat(collectedAmount.toFixed(2)),
        canceled_count: canceledCount,
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