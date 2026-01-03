import sql from '../db.js';
import stripe from './stripe.js';

export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // ====================================================
  // 1️⃣ VERIFY STRIPE SIGNATURE
  // ====================================================
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid Stripe signature',
    });
  }

  // ====================================================
  // 2️⃣ HANDLE EVENTS
  // ====================================================
  try {
    switch (event.type) {
      // ====================================================
      // FIRST PAYMENT SUCCESS → ACTIVATE PARENT
      // ====================================================
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (!session.subscription || !session.customer) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        await sql.begin(async (sql) => {
          // 🔐 UPSERT SUBSCRIPTION
          await sql`
            INSERT INTO subscriptions (
              parent_id,
              stripe_customer_id,
              stripe_subscription_id,
              stripe_price_id,
              status,
              current_period_start,
              current_period_end
            )
            VALUES (
              (SELECT parent_id FROM parents WHERE stripe_customer_id = ${session.customer}),
              ${session.customer},
              ${subscription.id},
              ${subscription.items.data[0].price.id},
              'paid',
              to_timestamp(${subscription.current_period_start}),
              to_timestamp(${subscription.current_period_end})
            )
            ON CONFLICT (stripe_subscription_id)
            DO UPDATE SET
              status = 'paid',
              current_period_start = EXCLUDED.current_period_start,
              current_period_end = EXCLUDED.current_period_end,
              updated_at = NOW()
          `;

          // 🔥 ACTIVATE PARENT
          await sql`
            UPDATE parents
            SET
              status = 'ACTIVE',
              updated_at = NOW()
            WHERE stripe_customer_id = ${session.customer}
          `;
        });

        break;
      }

      // ====================================================
      // MONTHLY PAYMENT SUCCESS → KEEP ACTIVE
      // ====================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;

        await sql.begin(async (sql) => {
          const [subscriptionRow] = await sql`
            SELECT id, parent_id
            FROM subscriptions
            WHERE stripe_subscription_id = ${invoice.subscription}
          `;

          // ✅ STORE REVENUE
          await sql`
            INSERT INTO invoices (
              parent_id,
              subscription_id,
              stripe_invoice_id,
              stripe_charge_id,
              amount_paid,
              currency,
              status,
              period_start,
              period_end,
              paid_at
            )
            VALUES (
              ${subscriptionRow.parent_id},
              ${subscriptionRow.id},
              ${invoice.id},
              ${invoice.charge},
              ${invoice.amount_paid},
              ${invoice.currency},
              'paid',
              to_timestamp(${invoice.period_start}),
              to_timestamp(${invoice.period_end}),
              to_timestamp(${invoice.status_transitions.paid_at})
            )
            ON CONFLICT (stripe_invoice_id) DO NOTHING
          `;

          // ✅ KEEP SUBSCRIPTION ACTIVE
          await sql`
            UPDATE subscriptions
            SET
              status = 'paid',
              current_period_start = to_timestamp(${invoice.period_start}),
              current_period_end = to_timestamp(${invoice.period_end}),
              updated_at = NOW()
            WHERE stripe_subscription_id = ${invoice.subscription}
          `;

          await sql`
            UPDATE parents
            SET status = 'ACTIVE', updated_at = NOW()
            WHERE parent_id = ${subscriptionRow.parent_id}
          `;
        });

        break;


      }

      // ====================================================
      // PAYMENT FAILED → SUSPEND ACCESS
      // ====================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        await sql.begin(async (sql) => {
          await sql`
            UPDATE subscriptions
            SET
              status = 'past_due',
              updated_at = NOW()
            WHERE stripe_subscription_id = ${invoice.subscription}
          `;

          await sql`
            UPDATE parents
            SET
              status = 'SUSPENDED',
              updated_at = NOW()
            WHERE parent_id = (
              SELECT parent_id
              FROM subscriptions
              WHERE stripe_subscription_id = ${invoice.subscription}
            )
          `;
        });

        break;
      }

      // ====================================================
      // SUBSCRIPTION CANCELED → SUSPEND
      // ====================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        await sql.begin(async (sql) => {
          await sql`
            UPDATE subscriptions
            SET
              status = 'canceled',
              current_period_end = NOW(),
              updated_at = NOW()
            WHERE stripe_subscription_id = ${subscription.id}
          `;

          await sql`
            UPDATE parents
            SET
              status = 'SUSPENDED',
              updated_at = NOW()
            WHERE parent_id = (
              SELECT parent_id
              FROM subscriptions
              WHERE stripe_subscription_id = ${subscription.id}
            )
          `;
        });

        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    // ====================================================
    // 3️⃣ ACKNOWLEDGE STRIPE
    // ====================================================
    return res.status(200).json({
      success: true,
      handled: event.type,
    });
  } catch (error) {
    console.error('🔥 Stripe webhook processing error:', error);

    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};
