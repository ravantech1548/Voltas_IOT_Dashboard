const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');

// Helper function to check if time is within shift
function isTimeInShift(currentTime, startTime, endTime) {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  if (end < start) {
    return current >= start || current <= end;
  } else {
    return current >= start && current <= end;
  }
}

function timeToMinutes(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

const register = async (req, res, next) => {
  try {
    const { username, email, password, role = 'viewer', client_id = null, shift_id = null } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Validate shift_id if operator role
    if (role === 'operator' && shift_id) {
      const shiftCheck = await pool.query('SELECT id, is_active FROM shifts WHERE id = $1', [shift_id]);
      if (shiftCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid shift ID' });
      }
      if (!shiftCheck.rows[0].is_active) {
        return res.status(400).json({ error: 'Cannot assign inactive shift to operator' });
      }
    }

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, client_id, shift_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, client_id, shift_id, created_at',
      [username, email, passwordHash, role, client_id, shift_id]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        client_id: user.client_id,
        shift_id: user.shift_id
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username (include shift_id, handle missing column gracefully)
    let result;
    try {
      result = await pool.query(
        'SELECT id, username, email, password_hash, role, client_id, shift_id FROM users WHERE username = $1',
        [username]
      );
    } catch (error) {
      // If shift_id column doesn't exist, select without it (for backwards compatibility)
      if (error.code === '42703') { // column does not exist
        result = await pool.query(
          'SELECT id, username, email, password_hash, role, client_id, NULL as shift_id FROM users WHERE username = $1',
          [username]
        );
      } else {
        throw error;
      }
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check shift access for operators (admins bypass shift restrictions)
    // Admins have full access regardless of shift_id
    if (user.role === 'operator' && user.shift_id) {
      const shiftResult = await pool.query(
        'SELECT id, name, start_time, end_time, is_active FROM shifts WHERE id = $1',
        [user.shift_id]
      );

      if (shiftResult.rows.length === 0 || !shiftResult.rows[0].is_active) {
        return res.status(403).json({ 
          error: 'Access denied. Your assigned shift is not available. Please contact administrator.' 
        });
      }

      const shift = shiftResult.rows[0];
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8); // HH:mm:ss format
      
      const isWithinShift = isTimeInShift(currentTime, shift.start_time, shift.end_time);

      if (!isWithinShift) {
        return res.status(403).json({ 
          error: `Access denied. You can only login during your shift (${shift.start_time} - ${shift.end_time}). Current time: ${currentTime}` 
        });
      }
    } else if (user.role === 'operator' && !user.shift_id) {
      return res.status(403).json({ 
        error: 'Access denied. No shift assigned to your account. Please contact administrator.' 
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        client_id: user.client_id,
        shift_id: user.shift_id
      }
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    // Get user info (include shift_id if column exists, admins have NULL shift_id)
    let result;
    try {
      result = await pool.query(
        'SELECT id, username, email, role, client_id, shift_id, created_at, last_login FROM users WHERE id = $1',
        [req.user.id]
      );
    } catch (error) {
      // If shift_id column doesn't exist, select without it
      if (error.code === '42703') { // column does not exist
        result = await pool.query(
          'SELECT id, username, email, role, client_id, NULL as shift_id, created_at, last_login FROM users WHERE id = $1',
          [req.user.id]
        );
      } else {
        throw error;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};

