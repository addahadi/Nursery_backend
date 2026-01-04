import sql from '../db.js';
import stripe from './stripe.js';

export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // ====================================================
  // 1️⃣ VERIFY STRIPE SIGNATURE
  // ====================================================
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).json({ success: false });
  }

  try {
    switch (event.type) {

      // ====================================================
      // CHECKOUT COMPLETED (FIRST PAYMENT)
      // ====================================================
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (!session.subscription || !session.customer) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        await sql.begin(async (sql) => {
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
              ${subscription.status},
              to_timestamp(${subscription.current_period_start}),
              to_timestamp(${subscription.current_period_end})
            )
            ON CONFLICT (stripe_subscription_id)
            DO UPDATE SET
              stripe_price_id = EXCLUDED.stripe_price_id,
              status = EXCLUDED.status,
              current_period_start = EXCLUDED.current_period_start,
              current_period_end = EXCLUDED.current_period_end,
              updated_at = NOW()
          `;

          // Activate access ONLY if subscription is active
          if (subscription.status === 'active') {
            await sql`
              UPDATE parents
              SET status = 'ACTIVE', updated_at = NOW()
              WHERE stripe_customer_id = ${session.customer}
            `;
          }
        });

        break;
      }

      // ====================================================
      // SUBSCRIPTION UPDATED (RENEWAL / PLAN CHANGE / STATUS)
      // ====================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object;

        await sql.begin(async (sql) => {
          await sql`
            UPDATE subscriptions
            SET
              stripe_price_id = ${subscription.items.data[0].price.id},
              status = ${subscription.status},
              current_period_start = to_timestamp(${subscription.current_period_start}),
              current_period_end = to_timestamp(${subscription.current_period_end}),
              updated_at = NOW()
            WHERE stripe_subscription_id = ${subscription.id}
          `;

          // Access control
          if (subscription.status === 'active') {
            await sql`
              UPDATE parents
              SET status = 'ACTIVE', updated_at = NOW()
              WHERE parent_id = (
                SELECT parent_id FROM subscriptions
                WHERE stripe_subscription_id = ${subscription.id}
              )
            `;
          } else if (
            subscription.status === 'past_due' ||
            subscription.status === 'unpaid'
          ) {
            await sql`
              UPDATE parents
              SET status = 'SUSPENDED', updated_at = NOW()
              WHERE parent_id = (
                SELECT parent_id FROM subscriptions
                WHERE stripe_subscription_id = ${subscription.id}
              )
            `;
          }
        });

        break;
      }

      // ====================================================
      // INVOICE PAID (REVENUE ONLY)
      // ====================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        await sql.begin(async (sql) => {
          const [sub] = await sql`
            SELECT id, parent_id
            FROM subscriptions
            WHERE stripe_subscription_id = ${invoice.subscription}
          `;

          if (!sub) return;

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
              ${sub.parent_id},
              ${sub.id},
              ${invoice.id},
              ${invoice.charge},
              ${invoice.amount_paid},
              ${invoice.currency},
              'paid',
              to_timestamp(${invoice.lines.data[0].period.start}),
              to_timestamp(${invoice.lines.data[0].period.end}),
              to_timestamp(${invoice.status_transitions.paid_at})
            )
            ON CONFLICT (stripe_invoice_id) DO NOTHING
          `;
        });

        break;
      }

      // ====================================================
      // PAYMENT FAILED (NO IMMEDIATE SUSPENSION)
      // ====================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        await sql`
          UPDATE subscriptions
          SET status = 'past_due', updated_at = NOW()
          WHERE stripe_subscription_id = ${invoice.subscription}
        `;

        break;
      }

      // ====================================================
      // SUBSCRIPTION CANCELED
      // ====================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        await sql.begin(async (sql) => {
          await sql`
            UPDATE subscriptions
            SET
              status = 'canceled',
              current_period_end = to_timestamp(${subscription.current_period_end}),
              updated_at = NOW()
            WHERE stripe_subscription_id = ${subscription.id}
          `;

          await sql`
            UPDATE parents
            SET status = 'SUSPENDED', updated_at = NOW()
            WHERE parent_id = (
              SELECT parent_id FROM subscriptions
              WHERE stripe_subscription_id = ${subscription.id}
            )
          `;
        });

        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('🔥 Stripe webhook error:', err);
    return res.status(500).json({ success: false });
  }
};
