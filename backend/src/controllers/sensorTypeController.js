const pool = require('../config/database');

const getAllSensorTypes = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM sensor_types ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getSensorTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM sensor_types WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const createSensorType = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, unit, description, min_value, max_value } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Sensor type name is required' });
    }

    const result = await pool.query(
      'INSERT INTO sensor_types (name, unit, description, min_value, max_value) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, unit || null, description || null, min_value || null, max_value || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateSensorType = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;
    const { name, unit, description, min_value, max_value } = req.body;

    const result = await pool.query(
      'UPDATE sensor_types SET name = $1, unit = $2, description = $3, min_value = $4, max_value = $5 WHERE id = $6 RETURNING *',
      [name, unit || null, description || null, min_value || null, max_value || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteSensorType = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete sensor types' });
    }

    const { id } = req.params;

    const result = await pool.query('DELETE FROM sensor_types WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor type not found' });
    }

    res.json({ message: 'Sensor type deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSensorTypes,
  getSensorTypeById,
  createSensorType,
  updateSensorType,
  deleteSensorType
};

