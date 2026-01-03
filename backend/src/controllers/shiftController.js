const pool = require('../config/database');

const getAllShifts = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM shifts ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getShiftById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const createShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, start_time, end_time, description, is_active = true } = req.body;

    if (!name || !start_time || !end_time) {
      return res.status(400).json({ error: 'Name, start_time, and end_time are required' });
    }

    // Validate time format (HH:mm or HH:mm:ss)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:mm or HH:mm:ss' });
    }

    // Ensure times are in HH:mm:ss format
    const formatTime = (time) => {
      const parts = time.split(':');
      if (parts.length === 2) {
        return `${time}:00`;
      }
      return time;
    };

    const formattedStartTime = formatTime(start_time);
    const formattedEndTime = formatTime(end_time);

    const result = await pool.query(
      'INSERT INTO shifts (name, start_time, end_time, description, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, formattedStartTime, formattedEndTime, description || null, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Shift with this name already exists' });
    }
    next(error);
  }
};

const updateShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { name, start_time, end_time, description, is_active } = req.body;

    // Check if shift exists
    const existingShift = await pool.query('SELECT id FROM shifts WHERE id = $1', [id]);
    if (existingShift.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Validate time format if provided
    if (start_time || end_time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (start_time && !timeRegex.test(start_time)) {
        return res.status(400).json({ error: 'Invalid start_time format. Use HH:mm or HH:mm:ss' });
      }
      if (end_time && !timeRegex.test(end_time)) {
        return res.status(400).json({ error: 'Invalid end_time format. Use HH:mm or HH:mm:ss' });
      }
    }

    // Format times if provided
    const formatTime = (time) => {
      if (!time) return null;
      const parts = time.split(':');
      if (parts.length === 2) {
        return `${time}:00`;
      }
      return time;
    };

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(formatTime(start_time));
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramCount++}`);
      values.push(formatTime(end_time));
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE shifts SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Shift with this name already exists' });
    }
    next(error);
  }
};

const deleteShift = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;

    // Check if shift is assigned to any users
    const usersWithShift = await pool.query('SELECT COUNT(*) as count FROM users WHERE shift_id = $1', [id]);
    if (parseInt(usersWithShift.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete shift. It is assigned to one or more users. Please reassign users first.' 
      });
    }

    const result = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift
};


