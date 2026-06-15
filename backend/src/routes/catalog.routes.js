const router = require('express').Router();
const db = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');

// GET /api/catalog/modalities — full nested catalog
router.get('/modalities', asyncHandler(async (req, res) => {
  const modalities = await db('modalities').where({ is_active: true }).orderBy('sort_order');
  res.json({ modalities });
}));

router.get('/full', asyncHandler(async (req, res) => {
  const modalities = await db('modalities').where({ is_active: true }).orderBy('sort_order');
  const bodyParts = await db('body_parts').where({ is_active: true });
  const protocols = await db('protocols').where({ is_active: true }).orderBy('sort_order');
  // Nest the data
  const catalog = modalities.map(m => ({
    ...m,
    body_parts: bodyParts
      .filter(bp => bp.modality_id === m.id)
      .map(bp => ({
        ...bp,
        protocols: protocols.filter(p => p.body_part_id === bp.id),
      })),
  }));
  res.json({ catalog });
}));

module.exports = router;
