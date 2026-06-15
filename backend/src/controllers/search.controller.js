const db = require('../config/database');
const { geocodeZip, distanceMiles } = require('../services/geo.service');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/search?zip=75035&modality=MRI&body_part=Brain&protocol_id=xxx&radius=25
const searchCenters = asyncHandler(async (req, res) => {
  const { zip, modality, body_part, protocol_id, radius = 50, sort = 'distance' } = req.query;

  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'A valid 5-digit US ZIP code is required' });
  }

  // 1. Geocode the zip
  const location = await geocodeZip(zip);

  // 2. Build the pricing query
  let query = db('center_pricing as cp')
    .join('imaging_centers as ic', 'ic.id', 'cp.center_id')
    .join('protocols as p', 'p.id', 'cp.protocol_id')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('ic.is_active', true)
    .where('cp.is_available', true)
    .where('p.is_active', true)
    .select(
      'cp.id as pricing_id',
      'cp.price',
      'cp.price_source',
      'ic.id as center_id',
      'ic.name as center_name',
      'ic.address_line1',
      'ic.address_line2',
      'ic.city',
      'ic.state',
      'ic.zip_code',
      'ic.phone',
      'ic.latitude',
      'ic.longitude',
      'ic.same_day_appointments',
      'ic.accreditation',
      'ic.typical_wait_days',
      'p.id as protocol_id',
      'p.name as protocol_name',
      'p.requires_contrast',
      'p.duration_minutes',
      'bp.id as body_part_id',
      'bp.name as body_part_name',
      'm.id as modality_id',
      'm.name as modality_name',
      'm.color_hex',
    );

  // Apply filters
  if (modality) query = query.where('m.name', modality);
  if (body_part) query = query.where('bp.name', body_part);
  if (protocol_id) query = query.where('p.id', protocol_id);

  const results = await query;

  // 3. Calculate distances and filter by radius
  const enriched = results
    .map((row) => {
      const dist = (row.latitude && row.longitude)
        ? distanceMiles(location.lat, location.lng, parseFloat(row.latitude), parseFloat(row.longitude))
        : 999;
      return { ...row, distance_miles: Math.round(dist * 10) / 10 };
    })
    .filter((r) => r.distance_miles <= parseFloat(radius));

  // 4. Sort
  enriched.sort((a, b) => {
    if (sort === 'price') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    return a.distance_miles - b.distance_miles; // default: distance
  });

  res.json({
    zip,
    location,
    radius_miles: parseFloat(radius),
    total: enriched.length,
    results: enriched,
  });
});

// GET /api/search/modalities — all active modalities
const getModalities = asyncHandler(async (req, res) => {
  const modalities = await db('modalities').where({ is_active: true }).orderBy('sort_order');
  res.json({ modalities });
});

// GET /api/search/body-parts?modality_id=xxx
const getBodyParts = asyncHandler(async (req, res) => {
  const { modality_id } = req.query;
  if (!modality_id) return res.status(400).json({ error: 'modality_id required' });
  const bodyParts = await db('body_parts')
    .where({ modality_id, is_active: true })
    .orderBy('sort_order');
  res.json({ body_parts: bodyParts });
});

// GET /api/search/protocols?body_part_id=xxx
const getProtocols = asyncHandler(async (req, res) => {
  const { body_part_id } = req.query;
  if (!body_part_id) return res.status(400).json({ error: 'body_part_id required' });
  const protocols = await db('protocols')
    .where({ body_part_id, is_active: true })
    .orderBy('sort_order');
  res.json({ protocols });
});

module.exports = { searchCenters, getModalities, getBodyParts, getProtocols };
