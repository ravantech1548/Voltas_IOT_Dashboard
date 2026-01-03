const pool = require('../config/database');

const getAllLocations = async (req, res, next) => {
  try {
    const { department_id } = req.query;
    let query = `
      SELECT l.*, d.name as department_name, d.client_id, c.name as client_name
      FROM locations l
      JOIN departments d ON l.department_id = d.id
      JOIN clients c ON d.client_id = c.id
    `;
    let params = [];

    if (department_id) {
      query += ' WHERE l.department_id = $1';
      params.push(department_id);
    } else if (req.user.role !== 'admin' && req.user.client_id) {
      query += ' WHERE d.client_id = $1';
      params.push(req.user.client_id);
    }

    query += ' ORDER BY l.id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT l.*, d.name as department_name, d.client_id, c.name as client_name
       FROM locations l
       JOIN departments d ON l.department_id = d.id
       JOIN clients c ON d.client_id = c.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const location = result.rows[0];
    if (req.user.role !== 'admin' && req.user.client_id !== location.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(location);
  } catch (error) {
    next(error);
  }
};

const createLocation = async (req, res, next) => {
  try {
    const { department_id, name, floor_level, geo_coordinates } = req.body;

    if (!department_id || !name) {
      return res.status(400).json({ error: 'Department ID and name are required' });
    }

    // Check authorization by verifying department's client_id
    const deptResult = await pool.query('SELECT client_id FROM departments WHERE id = $1', [department_id]);
    
    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== deptResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'INSERT INTO locations (department_id, name, floor_level, geo_coordinates) VALUES ($1, $2, $3, $4) RETURNING *',
      [department_id, name, floor_level || null, geo_coordinates || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, floor_level, geo_coordinates } = req.body;

    const locResult = await pool.query(
      'SELECT d.client_id FROM locations l JOIN departments d ON l.department_id = d.id WHERE l.id = $1',
      [id]
    );
    
    if (locResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== locResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE locations SET name = $1, floor_level = $2, geo_coordinates = $3 WHERE id = $4 RETURNING *',
      [name, floor_level || null, geo_coordinates || null, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const locResult = await pool.query(
      'SELECT d.client_id FROM locations l JOIN departments d ON l.department_id = d.id WHERE l.id = $1',
      [id]
    );
    
    if (locResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== locResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM locations WHERE id = $1', [id]);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
};

