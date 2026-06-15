/**
 * Email Service — nodemailer + branded RadiologySave HTML templates.
 *
 * Configured via SMTP_* env vars. If SMTP isn't configured, sends are
 * skipped gracefully (logged, never throws) so center creation never fails
 * just because email isn't set up.
 *
 * Two transactional emails:
 *   sendCenterWelcomeEmail(center)        — on center creation
 *   sendPricingLiveEmail(center, stats)   — when pricing is published
 */
const nodemailer = require('nodemailer');

// ── Brand tokens (HANDOFF.md §3) ──────────────────────────────────────────────
const BRAND = {
  blue: '#155EAB',
  green: '#1E9E62',
  ink: '#1C2B3A',
  body: '#52606D',
  mist: '#F2F7FC',
  border: '#E4E8EE',
};

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || process.env.SMTP_USER === 'your@gmail.com') {
    return null; // not configured
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Shared branded HTML shell. `bodyHtml` is the inner content.
 * Inline styles only — email clients ignore <style> blocks and external CSS.
 */
function wrapTemplate({ preheader, bodyHtml }) {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
</head>
<body style="margin:0;padding:0;background:${BRAND.mist};font-family:'Inter',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.mist};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">

        <!-- Header / logo lockup (quadrant: 3 blue + 1 green squares) -->
        <tr><td style="padding:28px 36px 20px;border-bottom:1px solid ${BRAND.border};">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-spacing:3px;">
                  <tr>
                    <td style="width:11px;height:11px;background:${BRAND.blue};border-radius:3px;"></td>
                    <td style="width:11px;height:11px;background:${BRAND.blue};border-radius:3px;"></td>
                  </tr>
                  <tr>
                    <td style="width:11px;height:11px;background:${BRAND.blue};border-radius:3px;"></td>
                    <td style="width:11px;height:11px;background:${BRAND.green};border-radius:3px;"></td>
                  </tr>
                </table>
              </td>
              <td style="vertical-align:middle;font-size:20px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">
                Radiology<span style="color:${BRAND.blue};">Save</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px;">${bodyHtml}</td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 36px;border-top:1px solid ${BRAND.border};background:${BRAND.mist};">
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${BRAND.body};">
            Radiology Save connects self-pay patients with accredited imaging centers offering transparent cash prices.
          </p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8E9AA6;">
            Questions? Reply to this email or reach us at
            <a href="mailto:contact@radiologysave.com" style="color:${BRAND.blue};text-decoration:none;">contact@radiologysave.com</a>.<br/>
            &copy; ${new Date().getFullYear()} Radiology Save. <a href="${appUrl}" style="color:${BRAND.blue};text-decoration:none;">radiologysave.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Core send helper ──────────────────────────────────────────────────────────
async function send({ to, subject, html, preheader }) {
  const t = getTransporter();
  if (!t) {
    console.log(`✉  [email skipped — SMTP not configured] would send "${subject}" to ${to}`);
    return { skipped: true };
  }
  if (!to) {
    console.log(`✉  [email skipped — no recipient] "${subject}"`);
    return { skipped: true };
  }
  try {
    const info = await t.sendMail({
      from: process.env.FROM_EMAIL || `"Radiology Save" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: wrapTemplate({ preheader, bodyHtml: html }),
    });
    console.log(`✉  Sent "${subject}" to ${to} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    // Never let an email failure break the request that triggered it
    console.error(`✉  [email FAILED] "${subject}" to ${to}: ${err.message}`);
    return { error: err.message };
  }
}

// ── 1. Center welcome email (on creation) ─────────────────────────────────────
async function sendCenterWelcomeEmail(center) {
  const name = center.name;
  const html = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">
      Welcome to Radiology Save
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Hi ${name},
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Your center has been added to the Radiology Save marketplace. You're one step away
      from reaching self-pay patients actively searching for imaging in your area.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.mist};border-radius:12px;margin:0 0 24px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.blue};">Your listing</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${name}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${BRAND.body};">
          ${center.address_line1 || ''}${center.city ? ', ' + center.city : ''}${center.state ? ', ' + center.state : ''} ${center.zip_code || ''}
        </p>
      </td></tr>
    </table>
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${BRAND.ink};">What happens next</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Our team will set up your cash prices for each procedure. Once your pricing is
      published, your center will appear in patient search results — and we'll email you
      to confirm you're live.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
      If any of your listing details above look incorrect, just reply to this email and
      we'll update them for you.
    </p>
  `;
  return send({
    to: center.email,
    subject: 'Your center has been added to Radiology Save',
    preheader: 'Welcome aboard — we\'ll set up your pricing and let you know when you\'re live.',
    html,
  });
}

// ── 2. Pricing live email (on publish) ────────────────────────────────────────
async function sendPricingLiveEmail(center, stats = {}) {
  const { protocolCount = 0, lowestPrice = null, pricedList = [] } = stats;

  // Build a grouped procedure table (by modality) for the email body.
  // Email clients need inline-styled tables, not CSS grids.
  let procedureTableHtml = '';
  if (pricedList.length) {
    // Group rows by modality, preserving the controller's ordering
    const groups = [];
    const indexByModality = {};
    for (const row of pricedList) {
      if (!(row.modality_name in indexByModality)) {
        indexByModality[row.modality_name] = groups.length;
        groups.push({ modality: row.modality_name, rows: [] });
      }
      groups[indexByModality[row.modality_name]].rows.push(row);
    }

    const rowsHtml = groups.map((g) => {
      const header = `
        <tr><td colspan="2" style="padding:14px 16px 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.blue};">
          ${g.modality}
        </td></tr>`;
      const items = g.rows.map((r, i) => `
        <tr>
          <td style="padding:8px 16px;font-size:14px;color:${BRAND.ink};border-top:1px solid ${BRAND.border};">${r.protocol_name}</td>
          <td style="padding:8px 16px;font-size:14px;font-weight:600;color:${BRAND.green};text-align:right;white-space:nowrap;border-top:1px solid ${BRAND.border};">$${Number(r.price).toFixed(2)}</td>
        </tr>`).join('');
      return header + items;
    }).join('');

    procedureTableHtml = `
      <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:${BRAND.ink};">Your published prices</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;margin:0 0 24px;">
        ${rowsHtml}
      </table>`;
  }

  const html = `
    <div style="display:inline-block;background:#EEF8F3;color:${BRAND.green};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:6px 14px;border-radius:999px;margin:0 0 16px;">
      ● You're live
    </div>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">
      Your pricing is now live
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Hi ${center.name},
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Your prices are published and your center is now visible to patients searching
      Radiology Save in your area. Here's a snapshot of what went live:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;">
      <tr>
        <td style="width:50%;padding:0 6px 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.mist};border-radius:12px;">
            <tr><td style="padding:18px 22px;text-align:center;">
              <p style="margin:0;font-size:30px;font-weight:700;color:${BRAND.blue};line-height:1;">${protocolCount}</p>
              <p style="margin:6px 0 0;font-size:12px;color:${BRAND.body};">procedures priced</p>
            </td></tr>
          </table>
        </td>
        <td style="width:50%;padding:0 0 0 6px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#EEF8F3;border-radius:12px;">
            <tr><td style="padding:18px 22px;text-align:center;">
              <p style="margin:0;font-size:30px;font-weight:700;color:${BRAND.green};line-height:1;">${lowestPrice != null ? '$' + Math.round(lowestPrice) : '—'}</p>
              <p style="margin:6px 0 0;font-size:12px;color:${BRAND.body};">starting price</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
    ${procedureTableHtml}
    <p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Patients can now find and book imaging at your center through Radiology Save.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Need to update a price or your availability? Just reply to this email and our
      team will take care of it.
    </p>
  `;
  return send({
    to: center.email,
    subject: `${center.name} is now live on Radiology Save`,
    preheader: 'Your pricing is published and visible to patients.',
    html,
  });
}

// ── Appointment lifecycle emails (patient-facing) ─────────────────────────────

function patientButton(label, href) {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.green};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:9px;">${label}</a>`;
}

function apptSummaryCard(appt) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.mist};border-radius:12px;margin:0 0 24px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.blue};">Confirmation ${appt.confirmation_number}</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${appt.modality_name || ''}${appt.protocol_name ? ' — ' + appt.protocol_name : ''}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${BRAND.body};">
          ${appt.center_name || ''}${appt.city ? ' · ' + appt.city + ', ' + appt.state : ''}
        </p>
      </td></tr>
    </table>`;
}

const WINDOW_LABEL = { morning: 'Morning (8am–12pm)', afternoon: 'Afternoon (12pm–5pm)' };

// Renders a "upload your physician referral" callout — only when one isn't on file.
function referralUploadBlock(appt) {
  if (appt.has_referral) return '';
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = `${base}/upload-referral/${appt.referral_upload_token}`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#FFF7ED;border:1px solid #FCD9B6;border-radius:12px;margin:24px 0 0;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#9A5B1E;">Action needed: physician's order required</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#9A5B1E;">
          All imaging studies require a physician's order/referral. Please upload yours soon
          using the secure link below so your appointment can proceed.
        </p>
        <a href="${url}" style="display:inline-block;background:${BRAND.blue};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:9px;">Upload physician referral</a>
        <p style="margin:12px 0 0;font-size:12px;color:#9A5B1E;word-break:break-all;">Or paste this link: ${url}</p>
      </td></tr>
    </table>`;
}

// 1. Booking received — appointment is now pending_confirmation
async function sendBookingReceivedEmail(appt) {
  const prettyDate = appt.preferred_date
    ? new Date(appt.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'your selected date';
  const windowTxt = WINDOW_LABEL[appt.preferred_window] || appt.preferred_window || '';
  const html = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">We've received your request</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">Hi ${appt.patient_first_name},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Thanks for booking through Radiology Save. Your request has been received and our team
      will confirm an exact appointment time <b>within 1 business day</b>.
    </p>
    ${apptSummaryCard(appt)}
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.blue};">Your preference</p>
    <p style="margin:0 0 20px;font-size:15px;color:${BRAND.ink};">${prettyDate}${windowTxt ? ' · ' + windowTxt : ''}</p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">
      You'll receive a confirmation email with your exact time and a secure payment link.
      No payment is needed yet.
    </p>
    ${referralUploadBlock(appt)}
  `;
  return send({
    to: appt.patient_email,
    subject: `Request received — ${appt.confirmation_number}`,
    preheader: 'We\'ll confirm your exact appointment time within 1 business day.',
    html,
  });
}

// 2. Confirmed + pay — RS set the exact time; 24h payment window starts
async function sendAppointmentConfirmedEmail(appt, payUrl) {
  const dt = appt.appointment_datetime ? new Date(appt.appointment_datetime) : null;
  const whenDate = dt ? dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD';
  const whenTime = dt ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const dueTxt = appt.payment_due_at
    ? new Date(appt.payment_due_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'within 24 hours';
  const html = `
    <div style="display:inline-block;background:#EEF8F3;color:${BRAND.green};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:6px 14px;border-radius:999px;margin:0 0 16px;">● Appointment confirmed</div>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">Your appointment time is set</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">Hi ${appt.patient_first_name},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Good news — your appointment has been confirmed for the time below. To secure it,
      please complete payment within 24 hours.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.mist};border-radius:12px;margin:0 0 20px;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.blue};">Confirmation ${appt.confirmation_number}</p>
        <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:${BRAND.ink};">${whenDate}${whenTime ? ' at ' + whenTime : ''}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.body};">${appt.modality_name || ''}${appt.protocol_name ? ' — ' + appt.protocol_name : ''}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${BRAND.body};">${appt.center_name || ''}${appt.address_line1 ? ' · ' + appt.address_line1 : ''}${appt.city ? ', ' + appt.city + ', ' + appt.state + ' ' + (appt.zip_code||'') : ''}</p>
      </td></tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#FFF7ED;border:1px solid #FCD9B6;border-radius:10px;margin:0 0 24px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;font-size:14px;color:#9A5B1E;"><b>Payment due by ${dueTxt}.</b> If payment isn't completed in time, this appointment will be released.</p>
      </td></tr>
    </table>
    <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:${BRAND.ink};">Amount due: $${Number(appt.amount_charged).toFixed(2)}</p>
    ${patientButton('Pay now & secure appointment', payUrl)}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${BRAND.body};">
      Or paste this link into your browser:<br/>
      <a href="${payUrl}" style="color:${BRAND.blue};word-break:break-all;">${payUrl}</a>
    </p>
    ${referralUploadBlock(appt)}
  `;
  return send({
    to: appt.patient_email,
    subject: `Action needed — confirm & pay for ${appt.confirmation_number}`,
    preheader: `Your appointment is confirmed. Pay within 24 hours to secure it.`,
    html,
  });
}

// 3. Payment received — appointment fully booked
async function sendAppointmentPaidEmail(appt) {
  const dt = appt.appointment_datetime ? new Date(appt.appointment_datetime) : null;
  const whenDate = dt ? dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  const whenTime = dt ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const html = `
    <div style="display:inline-block;background:#EEF8F3;color:${BRAND.green};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:6px 14px;border-radius:999px;margin:0 0 16px;">● Payment received</div>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">You're all set</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">Hi ${appt.patient_first_name},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Your payment of <b>$${Number(appt.amount_charged).toFixed(2)}</b> has been received and your
      appointment is fully booked. Please bring a photo ID and your physician's referral.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.mist};border-radius:12px;margin:0 0 24px;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.blue};">Confirmation ${appt.confirmation_number}</p>
        <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:${BRAND.ink};">${whenDate}${whenTime ? ' at ' + whenTime : ''}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.body};">${appt.modality_name || ''}${appt.protocol_name ? ' — ' + appt.protocol_name : ''}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${BRAND.body};">${appt.center_name || ''}${appt.address_line1 ? ' · ' + appt.address_line1 : ''}${appt.city ? ', ' + appt.city + ', ' + appt.state + ' ' + (appt.zip_code||'') : ''}</p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.body};">Need to reschedule or cancel? Just reply to this email.</p>
  `;
  return send({
    to: appt.patient_email,
    subject: `Payment confirmed — ${appt.confirmation_number}`,
    preheader: 'Your appointment is fully booked. See you soon.',
    html,
  });
}

// 4. Expired — payment window lapsed, appointment cancelled
async function sendAppointmentExpiredEmail(appt) {
  const html = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">Your appointment was released</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">Hi ${appt.patient_first_name},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      The 24-hour payment window for your appointment (${appt.confirmation_number}) has passed,
      so the time slot has been released and the booking cancelled. No charge was made.
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${BRAND.body};">
      Still need this scan? You're welcome to book again anytime.
    </p>
    ${patientButton('Book again', (process.env.FRONTEND_URL || 'http://localhost:5173') + '/search')}
  `;
  return send({
    to: appt.patient_email,
    subject: `Appointment released — ${appt.confirmation_number}`,
    preheader: 'The payment window passed and your booking was cancelled.',
    html,
  });
}

module.exports = {
  sendCenterWelcomeEmail, sendPricingLiveEmail,
  sendBookingReceivedEmail, sendAppointmentConfirmedEmail,
  sendAppointmentPaidEmail, sendAppointmentExpiredEmail,
};
