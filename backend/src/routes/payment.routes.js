// payment.routes.js
const router = require('express').Router();
const { createCheckoutSession, handleWebhook, getSessionStatus } = require('../controllers/payment.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

// Webhook must be BEFORE json body parser — handled in server.js with raw body
router.post('/webhook', handleWebhook);

// Create checkout for a CONFIRMED appointment (reached from the email pay link)
router.post('/checkout/:appointmentId', optionalAuth, createCheckoutSession);

router.get('/session/:sessionId', getSessionStatus);
module.exports = router;
