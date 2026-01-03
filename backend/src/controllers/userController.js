const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res, next) => {
  try {
    // Only admins can view all users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }

    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.email, u.role, u.client_id, u.shift_id, u.created_at, u.last_login,
        c.name as client_name,
        s.name as shift_name, s.start_time, s.end_time
      FROM users u
      LEFT JOIN clients c ON u.client_id = c.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      ORDER BY u.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    // Only admins can view user details
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }

    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        u.id, u.username, u.email, u.role, u.client_id, u.shift_id, u.created_at, u.last_login,
        c.name as client_name,
        s.name as shift_name, s.start_time, s.end_time
      FROM users u
      LEFT JOIN clients c ON u.client_id = c.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    // Only admins can create users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }

    const { username, email, password, role = 'viewer', client_id = null, shift_id = null } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'operator', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this username or email already exists' });
    }

    // Validate client_id if provided
    if (client_id) {
      const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [client_id]);
      if (clientCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }
    }

    // Validate shift_id if operator role
    if (role === 'operator') {
      if (!shift_id) {
        return res.status(400).json({ error: 'Shift ID is required for operator role' });
      }
      const shiftCheck = await pool.query('SELECT id, is_active FROM shifts WHERE id = $1', [shift_id]);
      if (shiftCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid shift ID' });
      }
      if (!shiftCheck.rows[0].is_active) {
        return res.status(400).json({ error: 'Cannot assign inactive shift to operator' });
      }
    } else {
      // Non-operators shouldn't have shift_id
      if (shift_id) {
        return res.status(400).json({ error: 'Shift ID can only be assigned to operators' });
      }
    }

    // Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    let result;
    try {
      result = await pool.query(
        'INSERT INTO users (username, email, password_hash, role, client_id, shift_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, client_id, shift_id, created_at',
        [username, email, passwordHash, role, client_id || null, role === 'operator' ? shift_id : null]
      );
    } catch (error) {
      // If shift_id column doesn't exist, insert without it
      if (error.code === '42703') { // column does not exist
        result = await pool.query(
          'INSERT INTO users (username, email, password_hash, role, client_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, client_id, created_at',
          [username, email, passwordHash, role, client_id || null]
        );
        result.rows[0].shift_id = null;
      } else {
        throw error;
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    // Only admins can update users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }

    const { id } = req.params;
    const { username, email, password, role, client_id, shift_id } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = existingUser.rows[0];

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'operator', 'viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      // Check if username is already taken by another user
      const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already taken' });
      }
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (password !== undefined) {
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (client_id !== undefined) {
      if (client_id) {
        const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [client_id]);
        if (clientCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid client ID' });
        }
      }
      updates.push(`client_id = $${paramCount++}`);
      values.push(client_id);
    }

    // Handle shift_id based on role
    const finalRole = role !== undefined ? role : currentUser.role;
    if (shift_id !== undefined) {
      if (finalRole === 'operator') {
        if (!shift_id) {
          return res.status(400).json({ error: 'Shift ID is required for operator role' });
        }
        const shiftCheck = await pool.query('SELECT id, is_active FROM shifts WHERE id = $1', [shift_id]);
        if (shiftCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid shift ID' });
        }
        if (!shiftCheck.rows[0].is_active) {
          return res.status(400).json({ error: 'Cannot assign inactive shift to operator' });
        }
        try {
          updates.push(`shift_id = $${paramCount++}`);
          values.push(shift_id);
        } catch (error) {
          // shift_id column might not exist, skip it
          if (error.code !== '42703') throw error;
        }
      } else {
        // Non-operators shouldn't have shift_id
        try {
          updates.push(`shift_id = $${paramCount++}`);
          values.push(null);
        } catch (error) {
          // shift_id column might not exist, skip it
          if (error.code !== '42703') throw error;
        }
      }
    } else if (finalRole === 'operator' && currentUser.role !== 'operator') {
      // Role changed to operator but shift_id not provided
      return res.status(400).json({ error: 'Shift ID is required when changing role to operator' });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    let result;
    try {
      result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, role, client_id, shift_id, created_at`,
        values
      );
    } catch (error) {
      // If shift_id column doesn't exist, try update without shift_id references
      if (error.code === '42703') {
        // Remove shift_id from updates
        const updatesWithoutShift = updates.filter(u => !u.includes('shift_id'));
        const valuesWithoutShift = values.slice(0, -1).filter((v, i) => !updates[i].includes('shift_id'));
        valuesWithoutShift.push(id);
        result = await pool.query(
          `UPDATE users SET ${updatesWithoutShift.join(', ')} WHERE id = $${valuesWithoutShift.length} RETURNING id, username, email, role, client_id, created_at`,
          valuesWithoutShift
        );
        result.rows[0].shift_id = null;
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

const deleteUser = async (req, res, next) => {
  try {
    // Only admins can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }

    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};

