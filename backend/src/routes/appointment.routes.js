const router = require('express').Router();
const db = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { bookAppointment, getAppointmentByUploadToken, uploadReferralByToken } = require('../controllers/appointment.controller');

// POST /api/appointments/book — Step 1: request an appointment (no payment)
router.post('/book', optionalAuth, bookAppointment);

// Secure referral upload via tokenized email link (no auth)
router.get('/upload/:token', getAppointmentByUploadToken);
router.post('/upload/:token', uploadReferralByToken);

// Lazy-expire helper: if a confirmed appointment is past its payment window,
// cancel it on read so stale pay links resolve correctly.
async function lazyExpire(apt) {
  if (apt && apt.status === 'confirmed' && apt.payment_due_at && new Date() > new Date(apt.payment_due_at)) {
    await db('appointments').where({ id: apt.id }).update({
      status: 'cancelled', cancelled_at: db.fn.now(),
      cancellation_reason: 'Payment window expired', updated_at: db.fn.now(),
    });
    apt.status = 'cancelled';
  }
  return apt;
}

// GET /api/appointments/my — user's own appointments
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  const appointments = await db('appointments as a')
    .join('imaging_centers as ic', 'ic.id', 'a.center_id')
    .join('protocols as p', 'p.id', 'a.protocol_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .leftJoin('payments as pay', 'pay.appointment_id', 'a.id')
    .where('a.user_id', req.user.id)
    .select('a.*', 'ic.name as center_name', 'ic.city', 'ic.state', 'p.name as protocol_name', 'm.name as modality_name', 'pay.status as payment_status')
    .orderBy('a.created_at', 'desc');
  res.json({ appointments });
}));

// GET /api/appointments/:id — single appointment detail
router.get('/:id', asyncHandler(async (req, res) => {
  const apt = await db('appointments as a')
    .join('imaging_centers as ic', 'ic.id', 'a.center_id')
    .join('protocols as p', 'p.id', 'a.protocol_id')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .leftJoin('payments as pay', 'pay.appointment_id', 'a.id')
    .where('a.id', req.params.id)
    .select('a.*', 'ic.*', 'p.name as protocol_name', 'p.duration_minutes', 'p.patient_prep_instructions',
      'bp.name as body_part_name', 'm.name as modality_name', 'pay.status as payment_status', 'pay.stripe_payment_intent_id')
    .first();
  if (!apt) return res.status(404).json({ error: 'Appointment not found' });
  await lazyExpire(apt);
  res.json({ appointment: apt });
}));

// GET /api/appointments/confirm/:confirmationNumber
router.get('/confirm/:confirmationNumber', asyncHandler(async (req, res) => {
  const apt = await db('appointments').where({ confirmation_number: req.params.confirmationNumber }).first();
  if (!apt) return res.status(404).json({ error: 'Appointment not found' });
  await lazyExpire(apt);
  res.json({ appointment: apt });
}));

module.exports = router;
