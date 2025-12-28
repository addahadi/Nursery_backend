import sql from '../db.js';
import stripe from './stripe.js';

export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // 1️⃣ Verify Stripe signature
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Stripe signature',
    });
  }

  try {
    switch (event.type) {
      // =====================================
      // INITIAL PAYMENT SUCCESS
      // =====================================
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (!session.subscription || !session.customer) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);

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

        break;
      }

      // =====================================
      // MONTHLY PAYMENT SUCCESS
      // =====================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;

        await sql`
          UPDATE subscriptions
          SET
            status = 'paid',
            current_period_start = to_timestamp(${invoice.period_start}),
            current_period_end = to_timestamp(${invoice.period_end}),
            updated_at = NOW()
          WHERE stripe_subscription_id = ${invoice.subscription}
        `;

        break;
      }

      // =====================================
      // PAYMENT FAILED
      // =====================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        await sql`
          UPDATE subscriptions
          SET
            status = 'past_due',
            updated_at = NOW()
          WHERE stripe_subscription_id = ${invoice.subscription}
        `;

        break;
      }

      // =====================================
      // SUBSCRIPTION CANCELED
      // =====================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        await sql`
          UPDATE subscriptions
          SET
            status = 'canceled',
            current_period_end = NOW(),
            updated_at = NOW()
          WHERE stripe_subscription_id = ${subscription.id}
        `;

        break;
      }

      default:
        // Ignore other events
        break;
    }

    return res.status(200).json({
      success: true,
      message: `Handled Stripe event: ${event.type}`,
    });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};
