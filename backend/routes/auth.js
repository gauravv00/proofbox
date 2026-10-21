const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = (name && name.trim()) || trimmedEmail.split('@')[0];

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, plan, created_at)
      VALUES (?, ?, ?, ?, 'free', ?)
    `).run(id, trimmedEmail, trimmedName, passwordHash, createdAt);

    const user = {
      id,
      email: trimmedEmail,
      name: trimmedName,
      plan: 'free',
      created_at: createdAt
    };

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during registration: ' + err.message
    });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(trimmedEmail);

    if (!userRow) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      plan: userRow.plan,
      created_at: userRow.created_at
    };

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      data: {
        token,
        user
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'An error occurred during login: ' + err.message
    });
  }
});

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    return res.json({
      success: true,
      data: req.user
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
