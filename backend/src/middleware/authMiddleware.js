const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const pool = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    // Get user from database (include shift_id for operators, admins have NULL shift_id)
    // Check if shift_id column exists first, if not, select without it
    let result;
    try {
      result = await pool.query(
        'SELECT id, username, email, role, client_id, shift_id FROM users WHERE id = $1',
        [decoded.userId]
      );
    } catch (error) {
      // If shift_id column doesn't exist, select without it
      if (error.code === '42703') { // column does not exist
        result = await pool.query(
          'SELECT id, username, email, role, client_id, NULL as shift_id FROM users WHERE id = $1',
          [decoded.userId]
        );
      } else {
        throw error;
      }
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Server error in authentication' });
  }
};

module.exports = authMiddleware;

