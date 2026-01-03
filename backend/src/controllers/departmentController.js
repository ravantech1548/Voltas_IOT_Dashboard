const pool = require('../config/database');

const getAllDepartments = async (req, res, next) => {
  try {
    const { client_id } = req.query;
    let query = 'SELECT d.*, c.name as client_name FROM departments d JOIN clients c ON d.client_id = c.id';
    let params = [];

    if (client_id) {
      query += ' WHERE d.client_id = $1';
      params.push(client_id);
    } else if (req.user.role !== 'admin' && req.user.client_id) {
      query += ' WHERE d.client_id = $1';
      params.push(req.user.client_id);
    }

    query += ' ORDER BY d.id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT d.*, c.name as client_name FROM departments d JOIN clients c ON d.client_id = c.id WHERE d.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const department = result.rows[0];
    if (req.user.role !== 'admin' && req.user.client_id !== department.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(department);
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { client_id, name, description } = req.body;

    if (!client_id || !name) {
      return res.status(400).json({ error: 'Client ID and name are required' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user.client_id !== parseInt(client_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'INSERT INTO departments (client_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [client_id, name, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // First check if department exists and get client_id
    const deptResult = await pool.query('SELECT client_id FROM departments WHERE id = $1', [id]);
    
    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== deptResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE departments SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || null, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deptResult = await pool.query('SELECT client_id FROM departments WHERE id = $1', [id]);
    
    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== deptResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};

