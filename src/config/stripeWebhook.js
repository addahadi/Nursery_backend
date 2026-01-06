import sql from '../db.js';
import stripe from './stripe.js';

export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // ============================
  // 1️⃣ VERIFY STRIPE SIGNATURE
  // ============================
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // must be raw body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  try {
    switch (event.type) {

      // ============================
      // CHECKOUT COMPLETED
      // ============================
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (!session.subscription || !session.customer) {
          console.warn('Session missing subscription or customer:', session);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        // Get parent
        const [parent] = await sql`
          SELECT parent_id FROM parents WHERE stripe_customer_id = ${session.customer}
        `;
        if (!parent) {
          console.error('Parent not found for customer:', session.customer);
          break;
        }

        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

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
            ${parent.parent_id},
            ${subscription.customer},
            ${subscription.id},
            ${priceId},
            ${subscription.status},
            ${subscription.current_period_start ? to_timestamp(subscription.current_period_start) : null},
            ${subscription.current_period_end ? to_timestamp(subscription.current_period_end) : null}
          )
          ON CONFLICT (stripe_subscription_id)
          DO UPDATE SET
            stripe_price_id = EXCLUDED.stripe_price_id,
            status = EXCLUDED.status,
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            updated_at = NOW()
        `;

        // Update parent status if subscription is active
        if (subscription.status === 'active') {
          await sql`
            UPDATE parents
            SET status = 'ACTIVE'
            WHERE parent_id = ${parent.parent_id}
          `;
        }

        break;
      }

      // ============================
      // SUBSCRIPTION CREATED
      // ============================
      case 'customer.subscription.created': {
        const subscription = event.data.object;

        const [parent] = await sql`
          SELECT parent_id FROM parents WHERE stripe_customer_id = ${subscription.customer}
        `;
        if (!parent) {
          console.error('Parent not found for subscription:', subscription.id);
          break;
        }

        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

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
            ${parent.parent_id},
            ${subscription.customer},
            ${subscription.id},
            ${priceId},
            ${subscription.status},
            ${subscription.current_period_start ? to_timestamp(subscription.current_period_start) : null},
            ${subscription.current_period_end ? to_timestamp(subscription.current_period_end) : null}
          )
          ON CONFLICT (stripe_subscription_id)
          DO UPDATE SET
            stripe_price_id = EXCLUDED.stripe_price_id,
            status = EXCLUDED.status,
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            updated_at = NOW()
        `;

        // Activate parent only if subscription is active
        if (subscription.status === 'active') {
          await sql`
            UPDATE parents
            SET status = 'ACTIVE'
            WHERE parent_id = ${parent.parent_id}
          `;
        }

        break;
      }

      // ============================
      // SUBSCRIPTION UPDATED
      // ============================
      case 'customer.subscription.updated': {
        const subscription = event.data.object;

        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
        const startTs = subscription.current_period_start ?? null;
        const endTs = subscription.current_period_end ?? null;

        await sql.begin(async (sql) => {
          await sql`
            UPDATE subscriptions
            SET
              stripe_price_id = ${priceId},
              status = ${subscription.status},
              current_period_start = ${startTs ? to_timestamp(startTs) : null},
              current_period_end = ${endTs ? to_timestamp(endTs) : null},
              updated_at = NOW()
            WHERE stripe_subscription_id = ${subscription.id}
          `;

          // Update parent status
          let newStatus = null;
          if (subscription.status === 'active') newStatus = 'ACTIVE';
          if (subscription.status === 'past_due' || subscription.status === 'unpaid') newStatus = 'SUSPENDED';

          if (newStatus) {
            await sql`
              UPDATE parents
              SET status = ${newStatus}, updated_at = NOW()
              WHERE parent_id = (
                SELECT parent_id FROM subscriptions WHERE stripe_subscription_id = ${subscription.id}
              )
            `;
          }
        });

        break;
      }

      // ============================
      // SUBSCRIPTION DELETED
      // ============================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        await sql.begin(async (sql) => {
          await sql`
            UPDATE subscriptions
            SET
              status = 'canceled',
              current_period_end = ${subscription.current_period_end ? to_timestamp(subscription.current_period_end) : null},
              updated_at = NOW()
            WHERE stripe_subscription_id = ${subscription.id}
          `;

          await sql`
            UPDATE parents
            SET status = 'SUSPENDED', updated_at = NOW()
            WHERE parent_id = (
              SELECT parent_id FROM subscriptions WHERE stripe_subscription_id = ${subscription.id}
            )
          `;
        });

        break;
      }

      // ============================
      // INVOICE PAID
      // ============================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        const [sub] = await sql`
          SELECT id, parent_id
          FROM subscriptions
          WHERE stripe_subscription_id = ${invoice.subscription}
        `;
        if (!sub) {
          console.warn('Subscription not found for invoice:', invoice.id);
          break;
        }

        const line = invoice.lines?.data?.[0];
        if (!line || !line.period) {
          console.warn('Invoice line missing period:', invoice.id);
          break;
        }

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
            ${invoice.charge ?? null},
            ${invoice.amount_paid ?? 0},
            ${invoice.currency ?? 'usd'},
            'paid',
            ${line.period.start ? to_timestamp(line.period.start) : null},
            ${line.period.end ? to_timestamp(line.period.end) : null},
            ${invoice.status_transitions?.paid_at ? to_timestamp(invoice.status_transitions.paid_at) : to_timestamp(Math.floor(Date.now()/1000))}
          )
          ON CONFLICT (stripe_invoice_id) DO NOTHING
        `;

        break;
      }

      // ============================
      // PAYMENT FAILED
      // ============================
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

      default:
        console.log('Unhandled Stripe event type:', event.type);
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('🔥 Stripe webhook error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
