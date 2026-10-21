const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'proofbox-secret-key-2024';

function authMiddleware(req, res, next) {
  let token = null;

  // 1. Authorization header: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.token) {
    // 2. Query param ?token=... (for downloads, exports, file streaming)
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload.'
      });
    }

    const user = db.prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or session expired.'
      });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.'
    });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
