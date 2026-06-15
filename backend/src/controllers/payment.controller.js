const stripe = require('../config/stripe');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middleware/error.middleware');
const { getEnrichedAppointment } = require('./appointment.controller');
const { sendAppointmentPaidEmail } = require('../services/email.service');

/**
 * Create a Stripe Checkout Session for a CONFIRMED appointment.
 * Reached from the payment link in the confirmation email.
 * Enforces the 24h payment window.
 * POST /api/payments/checkout/:appointmentId
 */
const createCheckoutSession = asyncHandler(async (req, res) => {
  const appt = await getEnrichedAppointment(req.params.appointmentId);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  // Must be confirmed and within the payment window
  if (appt.status === 'paid') {
    return res.status(409).json({ error: 'This appointment is already paid.' });
  }
  if (appt.status === 'cancelled') {
    return res.status(409).json({ error: 'This appointment was cancelled (payment window expired).' });
  }
  if (appt.status !== 'confirmed') {
    return res.status(409).json({ error: 'This appointment is not yet confirmed for payment.' });
  }
  if (appt.payment_due_at && new Date() > new Date(appt.payment_due_at)) {
    // Window lapsed — cancel lazily (the cron also handles this)
    await db('appointments').where({ id: appt.id }).update({
      status: 'cancelled', cancelled_at: db.fn.now(),
      cancellation_reason: 'Payment window expired', updated_at: db.fn.now(),
    });
    return res.status(409).json({ error: 'The 24-hour payment window has expired. Please book again.' });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(appt.amount_charged * 100),
        product_data: {
          name: `${appt.modality_name} – ${appt.protocol_name}`,
          description: `${appt.center_name} · ${appt.city}, ${appt.state} · All-inclusive price`,
        },
      },
      quantity: 1,
    }],
    customer_email: appt.patient_email,
    metadata: {
      appointment_id: appt.id,
      confirmation_number: appt.confirmation_number,
      patient_name: `${appt.patient_first_name} ${appt.patient_last_name}`,
    },
    success_url: `${process.env.FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&confirmation=${appt.confirmation_number}`,
    cancel_url: `${process.env.FRONTEND_URL}/pay/${appt.id}`,
    // Don't let the Stripe session outlive the payment window
    expires_at: Math.min(
      Math.floor(new Date(appt.payment_due_at).getTime() / 1000),
      Math.floor(Date.now() / 1000) + 24 * 60 * 60
    ),
  });

  // Upsert a payment row for this session
  await db('payments').insert({
    id: uuidv4(),
    appointment_id: appt.id,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent,
    amount: appt.amount_charged,
    currency: 'usd',
    status: 'pending',
  });

  res.json({ checkout_url: session.url, session_id: session.id });
});

// POST /api/payments/webhook (raw body)
const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const appointmentId = session.metadata.appointment_id;
      if (session.payment_status === 'paid') {
        await db('appointments').where({ id: appointmentId }).update({
          status: 'paid',
          paid_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
        await db('payments')
          .where({ stripe_checkout_session_id: session.id })
          .update({
            status: 'succeeded',
            stripe_charge_id: session.payment_intent,
            stripe_metadata: JSON.stringify(session),
            updated_at: db.fn.now(),
          });
        console.log(`✅ Payment confirmed for appointment ${appointmentId}`);

        // Send the "you're all set" email (idempotent)
        const appt = await getEnrichedAppointment(appointmentId);
        if (appt && !appt.paid_email_sent_at) {
          const r = await sendAppointmentPaidEmail(appt);
          if (r?.sent) await db('appointments').where({ id: appointmentId }).update({ paid_email_sent_at: db.fn.now() });
        }
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await db('payments').where({ stripe_payment_intent_id: pi.id }).update({
        status: 'failed',
        failure_code: pi.last_payment_error?.code,
        failure_message: pi.last_payment_error?.message,
        updated_at: db.fn.now(),
      });
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object;
      const refundedAmount = charge.amount_refunded / 100;
      const isFullRefund = charge.refunded;
      await db('payments').where({ stripe_charge_id: charge.payment_intent }).update({
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        amount_refunded: refundedAmount,
        updated_at: db.fn.now(),
      });
      if (isFullRefund) {
        await db('appointments')
          .where({ status: 'paid' })
          .whereExists(
            db('payments').where({ stripe_charge_id: charge.payment_intent }).whereRaw('appointment_id = appointments.id').select(1)
          )
          .update({ status: 'refunded', updated_at: db.fn.now() });
      }
      break;
    }
  }

  res.json({ received: true });
});

// GET /api/payments/session/:sessionId — confirm payment after redirect
const getSessionStatus = asyncHandler(async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
  const appointmentId = session.metadata?.appointment_id;
  const appointment = appointmentId
    ? await db('appointments').where({ id: appointmentId }).first()
    : null;
  res.json({ status: session.payment_status, appointment });
});

module.exports = { createCheckoutSession, handleWebhook, getSessionStatus };
