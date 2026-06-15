const cron = require('node-cron');
const db = require('../config/database');
const { sendAppointmentExpiredEmail } = require('../services/email.service');

/**
 * Expiry job: cancels appointments that were confirmed but not paid within
 * their 24-hour window (payment_due_at in the past, still 'confirmed').
 * Sends the "appointment released" email once per appointment.
 */
async function expireUnpaidAppointments() {
  const now = new Date();
  const expired = await db('appointments as a')
    .join('imaging_centers as ic', 'ic.id', 'a.center_id')
    .join('protocols as p', 'p.id', 'a.protocol_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('a.status', 'confirmed')
    .whereNotNull('a.payment_due_at')
    .where('a.payment_due_at', '<', now)
    .select('a.*', 'ic.name as center_name', 'ic.city', 'ic.state',
            'p.name as protocol_name', 'm.name as modality_name');

  if (expired.length === 0) return;

  for (const appt of expired) {
    await db('appointments').where({ id: appt.id }).update({
      status: 'cancelled',
      cancelled_at: db.fn.now(),
      cancellation_reason: 'Payment window expired',
      updated_at: db.fn.now(),
    });
    if (!appt.expired_email_sent_at) {
      const r = await sendAppointmentExpiredEmail(appt);
      if (r?.sent) await db('appointments').where({ id: appt.id }).update({ expired_email_sent_at: db.fn.now() });
    }
    console.log(`⏰ Expired & cancelled appointment ${appt.confirmation_number} (payment window passed)`);
  }
  console.log(`⏰ Expiry sweep: cancelled ${expired.length} unpaid appointment(s).`);
}

function startAppointmentExpiryJob() {
  // Every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    expireUnpaidAppointments().catch((err) => console.error('Expiry job error:', err.message));
  });
  console.log('⏰ Appointment expiry job scheduled (every 15 min).');
  // Run once shortly after startup to catch anything already overdue
  setTimeout(() => expireUnpaidAppointments().catch(() => {}), 10000);
}

module.exports = { startAppointmentExpiryJob, expireUnpaidAppointments };
