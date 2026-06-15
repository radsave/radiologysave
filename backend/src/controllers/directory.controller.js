const db = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Public, crawlable directory endpoints (no auth).
 * Power the static SEO pages: /centers, /centers/:slug, /procedures, /procedures/:slug
 */

// GET /api/directory/centers — all active centers with a starting price
const listCenters = asyncHandler(async (req, res) => {
  const centers = await db('imaging_centers as ic')
    .where('ic.is_active', true)
    .leftJoin('center_pricing as cp', function () {
      this.on('cp.center_id', 'ic.id').andOn('cp.is_available', db.raw('true'));
    })
    .groupBy('ic.id')
    .select(
      'ic.id', 'ic.name', 'ic.slug', 'ic.city', 'ic.state', 'ic.zip_code',
      'ic.address_line1', 'ic.accreditation', 'ic.same_day_appointments',
      db.raw('MIN(cp.price) as starting_price'),
      db.raw('COUNT(cp.id) as procedure_count')
    )
    .orderBy(['ic.state', 'ic.city', 'ic.name']);
  res.json({ centers });
});

// GET /api/directory/centers/:slug — one center + procedures it offers (grouped)
const getCenter = asyncHandler(async (req, res) => {
  const center = await db('imaging_centers')
    .where({ slug: req.params.slug, is_active: true })
    .first();
  if (!center) return res.status(404).json({ error: 'Center not found' });

  const pricing = await db('center_pricing as cp')
    .join('protocols as p', 'p.id', 'cp.protocol_id')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('cp.center_id', center.id)
    .where('cp.is_available', true)
    .orderBy(['m.sort_order', 'p.name'])
    .select('cp.id as pricing_id', 'cp.protocol_id', 'cp.center_id', 'cp.price',
            'p.name as protocol_name', 'p.slug as protocol_slug',
            'bp.name as body_part_name', 'm.name as modality_name', 'm.slug as modality_slug');

  // Group by modality for display + compute starting price
  const byModality = {};
  let startingPrice = null;
  for (const row of pricing) {
    if (startingPrice === null || row.price < startingPrice) startingPrice = row.price;
    (byModality[row.modality_name] = byModality[row.modality_name] || []).push(row);
  }
  const modalities = Object.entries(byModality).map(([name, procedures]) => ({
    modality_name: name,
    procedures,
    starting_price: Math.min(...procedures.map(p => Number(p.price))),
  }));

  res.json({ center, modalities, starting_price: startingPrice, procedure_count: pricing.length });
});

// GET /api/directory/procedures — all protocols offered by at least one center
const listProcedures = asyncHandler(async (req, res) => {
  const procedures = await db('protocols as p')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .join('center_pricing as cp', function () {
      this.on('cp.protocol_id', 'p.id').andOn('cp.is_available', db.raw('true'));
    })
    .where('p.is_active', true)
    .groupBy('p.id', 'bp.name', 'm.name', 'm.slug', 'm.sort_order')
    .select(
      'p.name as protocol_name', 'p.slug as protocol_slug',
      'bp.name as body_part_name',
      'm.name as modality_name', 'm.slug as modality_slug',
      db.raw('MIN(cp.price) as starting_price'),
      db.raw('COUNT(DISTINCT cp.center_id) as center_count')
    )
    .orderBy(['m.sort_order', 'p.name']);
  res.json({ procedures });
});

// GET /api/directory/procedures/:slug — one procedure + centers offering it
const getProcedure = asyncHandler(async (req, res) => {
  const protocol = await db('protocols as p')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('p.slug', req.params.slug)
    .where('p.is_active', true)
    .select('p.id', 'p.name as protocol_name', 'p.slug', 'p.description',
            'p.patient_prep_instructions', 'p.duration_minutes',
            'bp.name as body_part_name', 'm.name as modality_name', 'm.slug as modality_slug')
    .first();
  if (!protocol) return res.status(404).json({ error: 'Procedure not found' });

  const centers = await db('center_pricing as cp')
    .join('imaging_centers as ic', 'ic.id', 'cp.center_id')
    .where('cp.protocol_id', protocol.id)
    .where('cp.is_available', true)
    .where('ic.is_active', true)
    .orderBy('cp.price')
    .select('cp.id as pricing_id', 'cp.protocol_id', 'cp.center_id',
            'ic.name', 'ic.slug', 'ic.address_line1', 'ic.city', 'ic.state', 'ic.zip_code',
            'ic.accreditation', 'ic.same_day_appointments', 'cp.price');

  const startingPrice = centers.length ? Math.min(...centers.map(c => Number(c.price))) : null;
  res.json({ protocol, centers, starting_price: startingPrice, center_count: centers.length });
});

// GET /sitemap.xml — all public URLs for crawlers
const sitemap = asyncHandler(async (req, res) => {
  const base = process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const [centers, procedures] = await Promise.all([
    db('imaging_centers').where({ is_active: true }).select('slug', 'updated_at'),
    db('protocols as p')
      .join('center_pricing as cp', function () {
        this.on('cp.protocol_id', 'p.id').andOn('cp.is_available', db.raw('true'));
      })
      .where('p.is_active', true)
      .distinct('p.slug', 'p.updated_at'),
  ]);

  const urls = [
    { loc: `${base}/`, priority: '1.0' },
    { loc: `${base}/centers`, priority: '0.9' },
    { loc: `${base}/procedures`, priority: '0.9' },
    ...centers.map(c => ({ loc: `${base}/centers/${c.slug}`, priority: '0.8', lastmod: c.updated_at })),
    ...procedures.map(p => ({ loc: `${base}/procedures/${p.slug}`, priority: '0.7', lastmod: p.updated_at })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `
    <lastmod>${new Date(u.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.header('Content-Type', 'application/xml').send(xml);
});

module.exports = { listCenters, getCenter, listProcedures, getProcedure, sitemap };
