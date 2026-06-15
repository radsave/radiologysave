const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middleware/error.middleware');
const {
  sendBookingReceivedEmail, sendAppointmentConfirmedEmail,
} = require('../services/email.service');

function generateConfirmationNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'RS-';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// Enriches an appointment row with center + protocol fields for emails
async function getEnrichedAppointment(id) {
  return db('appointments as a')
    .join('imaging_centers as ic', 'ic.id', 'a.center_id')
    .join('protocols as p', 'p.id', 'a.protocol_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('a.id', id)
    .select(
      'a.*',
      'ic.name as center_name', 'ic.address_line1', 'ic.city', 'ic.state', 'ic.zip_code',
      'p.name as protocol_name', 'm.name as modality_name'
    )
    .first();
}

/**
 * STEP 1 — Patient books a request. Creates appointment in
 * 'pending_confirmation'. NO payment is taken here.
 * POST /api/appointments/book
 */
const bookAppointment = asyncHandler(async (req, res) => {
  const {
    pricing_id, patient_first_name, patient_last_name, patient_email, patient_phone,
    patient_dob, referring_physician, preferred_date, preferred_window,
    special_notes, has_referral,
  } = req.body;

  if (!pricing_id || !patient_first_name || !patient_last_name || !patient_email || !patient_phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!preferred_date) {
    return res.status(400).json({ error: 'A preferred date is required.' });
  }

  // Resolve pricing → center, protocol, amount
  const pricing = await db('center_pricing as cp')
    .where('cp.id', pricing_id)
    .where('cp.is_available', true)
    .select('cp.price', 'cp.center_id', 'cp.protocol_id')
    .first();
  if (!pricing) return res.status(404).json({ error: 'Pricing option not found or unavailable' });

  const appointmentId = uuidv4();
  const confirmationNumber = generateConfirmationNumber();
  await db('appointments').insert({
    id: appointmentId,
    confirmation_number: confirmationNumber,
    user_id: req.user?.id || null,
    patient_first_name,
    patient_last_name,
    patient_email: patient_email.toLowerCase(),
    patient_phone,
    patient_dob: patient_dob || null,
    center_id: pricing.center_id,
    protocol_id: pricing.protocol_id,
    pricing_id,
    amount_charged: pricing.price,
    referring_physician: referring_physician || null,
    has_referral: has_referral || false,
    preferred_date,
    preferred_window: preferred_window || null,
    special_notes: special_notes || null,
    status: 'pending_confirmation',
    voucher_code: uuidv4().split('-')[0].toUpperCase(),
  });

  // Booking-received email (fire-and-forget; never blocks the response)
  const enriched = await getEnrichedAppointment(appointmentId);
  sendBookingReceivedEmail(enriched)
    .then((r) => { if (r?.sent) db('appointments').where({ id: appointmentId }).update({ booking_email_sent_at: db.fn.now() }).catch(() => {}); })
    .catch(() => {});

  res.status(201).json({
    message: 'Appointment requested',
    appointment_id: appointmentId,
    confirmation_number: confirmationNumber,
    status: 'pending_confirmation',
  });
});

/**
 * STEP 2 — RS admin confirms with an exact date/time. Moves to 'confirmed',
 * starts the 24h payment window, and sends the pay-now email.
 * POST /api/admin/appointments/:id/confirm   body: { appointment_datetime }
 */
const confirmAppointment = asyncHandler(async (req, res) => {
  const { appointment_datetime } = req.body;
  if (!appointment_datetime) {
    return res.status(400).json({ error: 'appointment_datetime is required.' });
  }
  const when = new Date(appointment_datetime);
  if (isNaN(when.getTime())) {
    return res.status(400).json({ error: 'Invalid appointment_datetime.' });
  }

  const appt = await db('appointments').where({ id: req.params.id }).first();
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.status !== 'pending_confirmation') {
    return res.status(409).json({ error: `Cannot confirm an appointment in '${appt.status}' status.` });
  }

  const paymentDue = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

  await db('appointments').where({ id: appt.id }).update({
    status: 'confirmed',
    appointment_datetime: when,
    confirmed_at: db.fn.now(),
    confirmed_by: req.user.id,
    payment_due_at: paymentDue,
    updated_at: db.fn.now(),
  });

  const enriched = await getEnrichedAppointment(appt.id);
  const payUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${appt.id}`;

  const result = await sendAppointmentConfirmedEmail(enriched, payUrl);
  if (result?.sent) {
    await db('appointments').where({ id: appt.id }).update({ confirm_email_sent_at: db.fn.now() });
  }

  res.json({
    message: result?.sent
      ? `Appointment confirmed — payment email sent to ${enriched.patient_email}.`
      : 'Appointment confirmed. (Email skipped — SMTP not configured.)',
    appointment_datetime: when,
    payment_due_at: paymentDue,
  });
});

module.exports = { bookAppointment, confirmAppointment, getEnrichedAppointment, generateConfirmationNumber };
