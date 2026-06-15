const db = require('../config/database');
const { scanFinder, extractReferral } = require('../services/ai.service');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Load the flat catalog used as grounding context for AI matching.
 * Cached in-memory for 5 minutes since the catalog rarely changes.
 */
let catalogCache = null;
let catalogCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getFlatCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogCacheTime < CACHE_TTL_MS) return catalogCache;

  catalogCache = await db('protocols as p')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .where('p.is_active', true)
    .select(
      'p.id as protocol_id',
      'p.name as protocol_name',
      'bp.name as body_part_name',
      'm.name as modality_name'
    );
  catalogCacheTime = now;
  return catalogCache;
}

/**
 * Hydrate protocol IDs returned by the AI into full protocol records
 * with body part, modality, and the lowest available price.
 */
async function hydrateProtocols(protocolIds) {
  if (!protocolIds.length) return [];
  const rows = await db('protocols as p')
    .join('body_parts as bp', 'bp.id', 'p.body_part_id')
    .join('modalities as m', 'm.id', 'p.modality_id')
    .leftJoin('center_pricing as cp', function () {
      this.on('cp.protocol_id', 'p.id').andOn('cp.is_available', db.raw('true'));
    })
    .whereIn('p.id', protocolIds)
    .groupBy('p.id', 'p.name', 'p.requires_contrast', 'bp.id', 'bp.name', 'm.id', 'm.name', 'm.color_hex')
    .select(
      'p.id as protocol_id',
      'p.name as protocol_name',
      'p.requires_contrast',
      'bp.id as body_part_id',
      'bp.name as body_part_name',
      'm.id as modality_id',
      'm.name as modality_name',
      'm.color_hex',
      db.raw('MIN(cp.price) as price_from')
    );
  // Preserve the AI's relevance ordering
  const order = new Map(protocolIds.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.protocol_id) ?? 99) - (order.get(b.protocol_id) ?? 99));
}

// POST /api/ai/scan-finder
// Body: { text: "MRI lumbar spine without contrast" }
const findScan = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    return res.status(400).json({ error: 'Please describe the scan you need (at least a few words).' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Input too long. Please keep it under 2000 characters.' });
  }

  const catalog = await getFlatCatalog();
  const result = await scanFinder(text.trim(), catalog);

  // Hydrate matched protocols with full details + starting price
  const ids = (result.matches || []).map((m) => m.protocol_id).filter(Boolean);
  const protocols = await hydrateProtocols(ids);

  // Merge AI metadata (confidence, reason) into hydrated records
  const enriched = protocols.map((p) => {
    const aiMatch = result.matches.find((m) => m.protocol_id === p.protocol_id);
    return { ...p, confidence: aiMatch?.confidence, reason: aiMatch?.reason };
  });

  res.json({
    match_type: result.match_type,
    needs_physician_order: result.needs_physician_order ?? result.match_type === 'symptom',
    clarifying_note: result.clarifying_note || null,
    matches: enriched,
    disclaimer:
      result.match_type === 'symptom'
        ? 'These are scans physicians commonly order for this concern — not a recommendation. A physician\'s order is required to book any imaging study.'
        : null,
  });
});

// POST /api/ai/extract-referral
// Body: { file_base64: "...", media_type: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" }
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_BASE64_LENGTH = 14 * 1024 * 1024; // ~10MB file

const extractReferralHandler = asyncHandler(async (req, res) => {
  const { file_base64, media_type } = req.body;

  if (!file_base64 || !media_type) {
    return res.status(400).json({ error: 'file_base64 and media_type are required' });
  }
  if (!ALLOWED_TYPES.includes(media_type)) {
    return res.status(400).json({ error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}` });
  }
  if (file_base64.length > MAX_BASE64_LENGTH) {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }

  // Strip data URL prefix if present (data:image/jpeg;base64,...)
  const cleanBase64 = file_base64.replace(/^data:[^;]+;base64,/, '');

  const catalog = await getFlatCatalog();
  const extraction = await extractReferral(cleanBase64, media_type, catalog);

  // Hydrate the matched protocol if one was found
  let matchedProtocol = null;
  if (extraction.matched_protocol_id) {
    const hydrated = await hydrateProtocols([extraction.matched_protocol_id]);
    matchedProtocol = hydrated[0] || null;
  }

  res.json({
    extraction,
    matched_protocol: matchedProtocol,
  });
});

module.exports = { findScan, extractReferralHandler };
