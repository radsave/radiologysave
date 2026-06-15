// auth.routes.js
const router = require('express').Router();
const { register, login, me, updateProfile, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.put('/me', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
module.exports = router;
