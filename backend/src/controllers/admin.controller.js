const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middleware/error.middleware');
const { sendCenterWelcomeEmail, sendPricingLiveEmail } = require('../services/email.service');

// ── IMAGING CENTERS ───────────────────────────────────────────────────────────

const getCenters = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, state, is_active } = req.query;
  const offset = (page - 1) * limit;
  let query = db('imaging_centers');
  if (search) query = query.where((q) => q.whereILike('name', `%${search}%`).orWhereILike('city', `%${search}%`).orWhere('zip_code', search));
  if (state) query = query.where({ state });
  if (is_active !== undefined) query = query.where({ is_active: is_active === 'true' });
  const [{ count }] = await query.clone().count('* as count');
  const centers = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);
  res.json({ centers, pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
});

const getCenter = asyncHandler(async (req, res) => {
  const center = await db('imaging_centers').where({ id: req.params.id }).first();
  if (!center) return res.status(404).json({ error: 'Center not found' });
  // Get pricing summary
  const pricingCount = await db('center_pricing').where({ center_id: req.params.id, is_available: true }).count('* as count').first();
  res.json({ center: { ...center, pricing_count: parseInt(pricingCount.count) } });
});

const createCenter = asyncHandler(async (req, res) => {
  const { name, address_line1, address_line2, city, state, zip_code, phone, fax, email, website,
          latitude, longitude, is_active, same_day_appointments, accreditation, npi_number,
          typical_wait_days, hours_of_operation, description } = req.body;
  if (!name || !address_line1 || !city || !state || !zip_code) {
    return res.status(400).json({ error: 'Name, address, city, state, and ZIP are required' });
  }
  // Newly required business fields (mirrors the form validation; protects
  // against direct API calls that bypass the UI)
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ error: 'A valid phone number is required.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!accreditation) {
    return res.status(400).json({ error: 'Accreditation is required.' });
  }
  // NPI is required and must be exactly 10 digits
  if (!npi_number || !/^\d{10}$/.test(String(npi_number).trim())) {
    return res.status(400).json({ error: 'A valid 10-digit NPI number is required.' });
  }

  // Email + phone combination must be unique. Normalize phone to digits only
  // so formatting differences don't defeat the constraint.
  const phoneNormalized = String(phone).replace(/\D/g, '');
  const comboTaken = await db('imaging_centers')
    .whereRaw('LOWER(email) = ?', [email.trim().toLowerCase()])
    .where({ phone_normalized: phoneNormalized })
    .first('id', 'name');
  if (comboTaken) {
    return res.status(409).json({ error: `A center with this email and phone already exists ("${comboTaken.name}").` });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
  const id = uuidv4();
  await db('imaging_centers').insert({
    id, name, slug, description, phone, fax, email, website,
    phone_normalized: phoneNormalized,
    address_line1, address_line2, city, state, zip_code,
    latitude: latitude || null, longitude: longitude || null,
    is_active: is_active !== false, same_day_appointments: same_day_appointments !== false,
    accreditation, npi_number: npi_number ? String(npi_number).trim() : null, typical_wait_days: typical_wait_days || 1,
    hours_of_operation: hours_of_operation ? JSON.stringify(hours_of_operation) : null,
    created_by: req.user.id,
  });
  const center = await db('imaging_centers').where({ id }).first();

  // Fire-and-forget welcome email (only if the center has an email on file).
  // Never blocks or fails the creation response.
  if (center.email) {
    sendCenterWelcomeEmail(center)
      .then((r) => { if (r?.sent) db('imaging_centers').where({ id }).update({ welcome_email_sent_at: db.fn.now() }).catch(() => {}); })
      .catch(() => {});
  }

  // Notify search engines that the sitemap changed so the new center page
  // (/centers/:slug, server-rendered) gets discovered and crawled promptly.
  // Fire-and-forget; never blocks or fails creation.
  const publicUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL;
  if (publicUrl && process.env.NODE_ENV === 'production') {
    const sitemapUrl = encodeURIComponent(`${publicUrl}/sitemap.xml`);
    // Google deprecated its ping endpoint in 2023; Bing still supports it.
    fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`).catch(() => {});
  }

  res.status(201).json({ message: 'Imaging center created', center });
});

const updateCenter = asyncHandler(async (req, res) => {
  const center = await db('imaging_centers').where({ id: req.params.id }).first();
  if (!center) return res.status(404).json({ error: 'Center not found' });
  const allowed = ['name','description','phone','fax','email','website','address_line1','address_line2',
    'city','state','zip_code','latitude','longitude','is_active','same_day_appointments',
    'accreditation','npi_number','typical_wait_days','hours_of_operation'];
  const updates = {};
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }

  // NPI required — if it's being set, it must be exactly 10 digits (and not blank)
  if (updates.npi_number !== undefined) {
    const npiTrimmed = String(updates.npi_number || '').trim();
    if (!/^\d{10}$/.test(npiTrimmed)) {
      return res.status(400).json({ error: 'A valid 10-digit NPI number is required.' });
    }
    updates.npi_number = npiTrimmed;
  }

  // If email or phone is changing, re-check the unique combination (excluding self).
  if (updates.email !== undefined || updates.phone !== undefined) {
    const newEmail = (updates.email !== undefined ? updates.email : center.email) || '';
    const newPhone = (updates.phone !== undefined ? updates.phone : center.phone) || '';
    const phoneNormalized = String(newPhone).replace(/\D/g, '');
    // keep phone_normalized in sync whenever phone changes
    if (updates.phone !== undefined) updates.phone_normalized = phoneNormalized;

    if (newEmail && phoneNormalized) {
      const comboTaken = await db('imaging_centers')
        .whereRaw('LOWER(email) = ?', [newEmail.trim().toLowerCase()])
        .where({ phone_normalized: phoneNormalized })
        .whereNot({ id: req.params.id })
        .first('id', 'name');
      if (comboTaken) {
        return res.status(409).json({ error: `A center with this email and phone already exists ("${comboTaken.name}").` });
      }
    }
  }

  updates.updated_at = db.fn.now();
  await db('imaging_centers').where({ id: req.params.id }).update(updates);
  res.json({ message: 'Center updated', center: await db('imaging_centers').where({ id: req.params.id }).first() });
});

const deleteCenter = asyncHandler(async (req, res) => {
  const center = await db('imaging_centers').where({ id: req.params.id }).first();
  if (!center) return res.status(404).json({ error: 'Center not found' });
  // Soft delete
  await db('imaging_centers').where({ id: req.params.id }).update({ is_active: false, updated_at: db.fn.now() });
  res.json({ message: 'Center deactivated' });
});

// ── CENTER PRICING ─────────────────────────────────────────────────────────────

const getCenterPricing = asyncHandler(async (req, res) => {
  const pricing = await db('center_pricing as cp')
    .join('protocols as p', 'p.id', 'cp.protocol_id')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('cp.center_id', req.params.id)
    .select('cp.*', 'p.name as protocol_name', 'bp.name as body_part_name', 'm.name as modality_name')
    .orderBy(['m.name', 'bp.name', 'p.name']);
  res.json({ pricing });
});

const upsertPricing = asyncHandler(async (req, res) => {
  const { protocol_id, price, price_source, is_available, notes } = req.body;
  if (!protocol_id || price === undefined) return res.status(400).json({ error: 'protocol_id and price required' });
  const existing = await db('center_pricing').where({ center_id: req.params.id, protocol_id }).first();
  if (existing) {
    await db('center_pricing').where({ id: existing.id }).update({ price, price_source, is_available, notes, updated_at: db.fn.now() });
    return res.json({ message: 'Pricing updated' });
  }
  await db('center_pricing').insert({ id: uuidv4(), center_id: req.params.id, protocol_id, price, price_source: price_source || 'program', is_available: is_available !== false, notes });
  res.status(201).json({ message: 'Pricing created' });
});

const bulkUpdatePricing = asyncHandler(async (req, res) => {
  const { updates } = req.body; // [{ protocol_id, price, is_available }]
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array' });
  for (const u of updates) {
    await db('center_pricing').where({ center_id: req.params.id, protocol_id: u.protocol_id })
      .update({ price: u.price, is_available: u.is_available !== false, updated_at: db.fn.now() });
  }
  res.json({ message: `Updated ${updates.length} pricing records` });
});

// POST /admin/centers/:id/publish-pricing
// Sends the "pricing is live" email ONCE. Re-calling is a no-op unless ?resend=true.
// This is the deliberate trigger so we never email per-protocol-save.
const publishPricing = asyncHandler(async (req, res) => {
  const center = await db('imaging_centers').where({ id: req.params.id }).first();
  if (!center) return res.status(404).json({ error: 'Center not found' });

  // Count published prices for this center
  const stats = await db('center_pricing')
    .where({ center_id: center.id, is_available: true })
    .count('* as count')
    .min('price as lowest')
    .first();
  const protocolCount = parseInt(stats.count) || 0;
  const lowestPrice = stats.lowest != null ? parseFloat(stats.lowest) : null;

  if (protocolCount === 0) {
    return res.status(400).json({ error: 'Set at least one price before publishing.' });
  }

  // Full list of priced procedures, grouped-friendly (ordered by modality → protocol)
  const pricedList = await db('center_pricing as cp')
    .join('protocols as p', 'p.id', 'cp.protocol_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('cp.center_id', center.id)
    .where('cp.is_available', true)
    .orderBy(['m.sort_order', 'm.name', 'p.name'])
    .select('m.name as modality_name', 'p.name as protocol_name', 'cp.price');

  const resend = req.query.resend === 'true';
  const alreadyNotified = !!center.pricing_notified_at;

  if (alreadyNotified && !resend) {
    return res.json({
      message: 'Pricing already published — center is live. No duplicate email sent.',
      already_notified: true,
      protocolCount,
      notified_at: center.pricing_notified_at,
    });
  }

  if (!center.email) {
    // Still mark as published so the listing logic can rely on it
    await db('imaging_centers').where({ id: center.id }).update({ pricing_notified_at: db.fn.now() });
    return res.json({ message: 'Pricing published. (No email — center has no email on file.)', protocolCount });
  }

  const result = await sendPricingLiveEmail(center, { protocolCount, lowestPrice, pricedList });
  await db('imaging_centers').where({ id: center.id }).update({ pricing_notified_at: db.fn.now() });

  const wasResend = alreadyNotified && resend;
  res.json({
    message: result?.sent
      ? (wasResend
          ? `Updated pricing email sent to ${center.email}.`
          : `Pricing published — notification sent to ${center.email}.`)
      : 'Pricing published. (Email skipped — SMTP not configured.)',
    protocolCount,
    lowestPrice,
    resent: wasResend,
    email: result,
  });
});

// ── APPOINTMENTS (admin view) ─────────────────────────────────────────────────

const getAppointments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;

  // Base query with only joins + filters (no select/orderBy) — safe to count
  const base = () => {
    let q = db('appointments as a')
      .join('imaging_centers as ic', 'ic.id', 'a.center_id')
      .join('protocols as p', 'p.id', 'a.protocol_id')
      .join('modalities as m', 'm.id', 'p.modality_id')
      .leftJoin('payments as pay', 'pay.appointment_id', 'a.id');
    if (status) q = q.where('a.status', status);
    if (search) q = q.where((qq) => qq.whereILike('a.patient_email', `%${search}%`).orWhereILike('a.patient_last_name', `%${search}%`).orWhere('a.confirmation_number', search));
    return q;
  };

  const [{ count }] = await base().count('a.id as count');
  const appointments = await base()
    .select('a.*', 'ic.name as center_name', 'p.name as protocol_name', 'm.name as modality_name', 'pay.status as payment_status', 'pay.stripe_payment_intent_id')
    .orderBy('a.created_at', 'desc')
    .limit(limit).offset(offset);
  res.json({ appointments, pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['pending_confirmation', 'confirmed', 'paid', 'completed', 'cancelled', 'refunded'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db('appointments').where({ id: req.params.id }).update({ status, updated_at: db.fn.now() });
  res.json({ message: 'Appointment status updated' });
});

// ── ADMIN USERS ───────────────────────────────────────────────────────────────

const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const offset = (page - 1) * limit;
  let query = db('users');
  if (role) query = query.where({ role });
  if (search) query = query.where((q) => q.whereILike('email', `%${search}%`).orWhereILike('last_name', `%${search}%`));
  const [{ count }] = await query.clone().count('* as count');
  const users = await query
    .select('id','email','first_name','last_name','role','is_active','created_at')
    .orderBy('created_at', 'desc')
    .limit(limit).offset(offset);
  res.json({ users, pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } });
});

const promoteUser = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['patient','admin'].includes(role)) return res.status(400).json({ error: 'Can only set patient or admin role' });
  await db('users').where({ id: req.params.id }).update({ role, updated_at: db.fn.now() });
  res.json({ message: 'User role updated' });
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    centersTotal, centersActive,
    appointmentsTotal, appointmentsPaid, appointmentsToday,
    revenueResult, usersTotal,
  ] = await Promise.all([
    db('imaging_centers').count('* as c').first(),
    db('imaging_centers').where({ is_active: true }).count('* as c').first(),
    db('appointments').count('* as c').first(),
    db('appointments').where({ status: 'paid' }).count('* as c').first(),
    db('appointments').whereRaw("DATE(created_at) = CURRENT_DATE").count('* as c').first(),
    db('appointments').whereIn('status', ['paid', 'completed']).sum('amount_charged as total').first(),
    db('users').where({ role: 'patient' }).count('* as c').first(),
  ]);
  res.json({
    centers: { total: parseInt(centersTotal.c), active: parseInt(centersActive.c) },
    appointments: { total: parseInt(appointmentsTotal.c), paid: parseInt(appointmentsPaid.c), today: parseInt(appointmentsToday.c) },
    revenue: { total: parseFloat(revenueResult.total || 0).toFixed(2) },
    users: { total: parseInt(usersTotal.c) },
  });
});

module.exports = {
  getCenters, getCenter, createCenter, updateCenter, deleteCenter,
  getCenterPricing, upsertPricing, bulkUpdatePricing, publishPricing,
  getAppointments, updateAppointmentStatus,
  getUsers, promoteUser, getDashboardStats,
};
