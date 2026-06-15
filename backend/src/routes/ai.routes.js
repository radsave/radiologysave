const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { findScan, extractReferralHandler } = require('../controllers/ai.controller');

// AI calls cost money — rate limit more aggressively than general API
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                   // 30 AI requests per window per IP
  message: { error: 'Too many AI requests. Please wait a few minutes and try again.' },
});

router.use(aiLimiter);

// POST /api/ai/scan-finder       { text }
router.post('/scan-finder', findScan);

// POST /api/ai/extract-referral  { file_base64, media_type }
router.post('/extract-referral', extractReferralHandler);

module.exports = router;
