const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { asyncHandler } = require('../middleware/error.middleware');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const existing = await db('users').where({ email: email.toLowerCase() }).first();
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);
  await db('users').insert({
    id, email: email.toLowerCase(), password_hash,
    first_name, last_name, phone, role: 'patient',
    is_active: true, email_verified: true, // skip email verification for simplicity
  });
  const token = generateToken(id);
  res.status(201).json({
    message: 'Account created successfully',
    token,
    user: { id, email: email.toLowerCase(), first_name, last_name, role: 'patient' },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await db('users').where({ email: email.toLowerCase(), is_active: true }).first();
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = await db('users').where({ id: req.user.id }).first('id', 'email', 'first_name', 'last_name', 'phone', 'role', 'created_at');
  res.json({ user });
});

// PUT /api/auth/me
const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, phone } = req.body;
  await db('users').where({ id: req.user.id }).update({ first_name, last_name, phone, updated_at: db.fn.now() });
  res.json({ message: 'Profile updated' });
});

// POST /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both fields required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const user = await db('users').where({ id: req.user.id }).first();
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  const password_hash = await bcrypt.hash(new_password, 12);
  await db('users').where({ id: req.user.id }).update({ password_hash, updated_at: db.fn.now() });
  res.json({ message: 'Password changed successfully' });
});

module.exports = { register, login, me, updateProfile, changePassword };
