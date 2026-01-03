const pool = require('../config/database');

const getAllClients = async (req, res, next) => {
  try {
    let query = 'SELECT * FROM clients ORDER BY id ASC';
    let params = [];

    // If user is not super admin, filter by client_id
    if (req.user.role !== 'admin' && req.user.client_id) {
      query = 'SELECT * FROM clients WHERE id = $1 ORDER BY id ASC';
      params = [req.user.client_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user.client_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create clients' });
    }

    const { name, site_address, contact_email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const result = await pool.query(
      'INSERT INTO clients (name, site_address, contact_email) VALUES ($1, $2, $3) RETURNING *',
      [name, site_address || null, contact_email || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, site_address, contact_email } = req.body;

    if (req.user.role !== 'admin' && req.user.client_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE clients SET name = $1, site_address = $2, contact_email = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, site_address || null, contact_email || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete clients' });
    }

    const { id } = req.params;

    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};

