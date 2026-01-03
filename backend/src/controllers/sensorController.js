const pool = require('../config/database');

const getAllSensors = async (req, res, next) => {
  try {
    const { location_id, client_id } = req.query;
    let query = `
      SELECT 
        s.id, s.name, s.mqtt_topic, s.sensor_count, s.status, s.metadata, s.created_at, s.updated_at,
        s.device_id, s.channel_code, s.mqtt_payload_topic,
        st.id as sensor_type_id, st.name as sensor_type, st.unit,
        l.id as location_id, l.name as location_name,
        d.id as department_id, d.name as department_name,
        c.id as client_id, c.name as client_name
      FROM sensors s
      JOIN sensor_types st ON s.sensor_type_id = st.id
      JOIN locations l ON s.location_id = l.id
      JOIN departments d ON l.department_id = d.id
      JOIN clients c ON d.client_id = c.id
    `;
    let params = [];
    let conditions = [];

    if (location_id) {
      conditions.push(`s.location_id = $${params.length + 1}`);
      params.push(location_id);
    }

    if (client_id) {
      conditions.push(`c.id = $${params.length + 1}`);
      params.push(client_id);
    } else if (req.user.role !== 'admin' && req.user.client_id) {
      conditions.push(`c.id = $${params.length + 1}`);
      params.push(req.user.client_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getSensorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        s.*, st.name as sensor_type, st.unit,
        l.name as location_name, d.client_id, c.name as client_name
       FROM sensors s
       JOIN sensor_types st ON s.sensor_type_id = st.id
       JOIN locations l ON s.location_id = l.id
       JOIN departments d ON l.department_id = d.id
       JOIN clients c ON d.client_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const sensor = result.rows[0];
    if (req.user.role !== 'admin' && req.user.client_id !== sensor.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(sensor);
  } catch (error) {
    next(error);
  }
};

const createSensor = async (req, res, next) => {
  try {
    const { location_id, sensor_type_id, name, mqtt_topic, sensor_count = 1, status = 'active', metadata, device_id, channel_code, mqtt_payload_topic } = req.body;

    if (!location_id || !sensor_type_id || !name) {
      return res.status(400).json({ error: 'Location ID, sensor type ID, and name are required' });
    }

    // Check authorization
    const locResult = await pool.query(
      'SELECT d.client_id FROM locations l JOIN departments d ON l.department_id = d.id WHERE l.id = $1',
      [location_id]
    );

    if (locResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== locResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate MQTT topic if not provided
    const topic = mqtt_topic || `client/${locResult.rows[0].client_id}/location/${location_id}/sensor/`;

    const result = await pool.query(
      'INSERT INTO sensors (location_id, sensor_type_id, name, mqtt_topic, sensor_count, status, metadata, device_id, channel_code, mqtt_payload_topic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [location_id, sensor_type_id, name, topic, sensor_count, status, metadata ? JSON.stringify(metadata) : null, device_id || null, channel_code || null, mqtt_payload_topic || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const updateSensor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location_id, sensor_type_id, name, mqtt_topic, sensor_count, status, metadata, device_id, channel_code, mqtt_payload_topic } = req.body;

    const sensorResult = await pool.query(
      'SELECT s.location_id, s.sensor_type_id, d.client_id FROM sensors s JOIN locations l ON s.location_id = l.id JOIN departments d ON l.department_id = d.id WHERE s.id = $1',
      [id]
    );

    if (sensorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const currentSensor = sensorResult.rows[0];
    if (req.user.role !== 'admin' && req.user.client_id !== currentSensor.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If location_id is being updated, verify the new location exists and check authorization
    if (location_id !== undefined && location_id !== currentSensor.location_id) {
      const locResult = await pool.query(
        'SELECT d.client_id FROM locations l JOIN departments d ON l.department_id = d.id WHERE l.id = $1',
        [location_id]
      );

      if (locResult.rows.length === 0) {
        return res.status(404).json({ error: 'Location not found' });
      }

      if (req.user.role !== 'admin' && req.user.client_id !== locResult.rows[0].client_id) {
        return res.status(403).json({ error: 'Access denied for new location' });
      }
    }

    // If sensor_type_id is being updated, verify it exists
    if (sensor_type_id !== undefined && sensor_type_id !== currentSensor.sensor_type_id) {
      const typeResult = await pool.query('SELECT id FROM sensor_types WHERE id = $1', [sensor_type_id]);
      if (typeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sensor type not found' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (location_id !== undefined) {
      updates.push(`location_id = $${paramCount++}`);
      values.push(location_id);
    }
    if (sensor_type_id !== undefined) {
      updates.push(`sensor_type_id = $${paramCount++}`);
      values.push(sensor_type_id);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (mqtt_topic !== undefined) {
      updates.push(`mqtt_topic = $${paramCount++}`);
      values.push(mqtt_topic);
    }
    if (sensor_count !== undefined) {
      updates.push(`sensor_count = $${paramCount++}`);
      values.push(sensor_count);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(metadata ? JSON.stringify(metadata) : null);
    }
    if (device_id !== undefined) {
      updates.push(`device_id = $${paramCount++}`);
      values.push(device_id || null);
    }
    if (channel_code !== undefined) {
      updates.push(`channel_code = $${paramCount++}`);
      values.push(channel_code || null);
    }
    if (mqtt_payload_topic !== undefined) {
      updates.push(`mqtt_payload_topic = $${paramCount++}`);
      values.push(mqtt_payload_topic || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE sensors SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteSensor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sensorResult = await pool.query(
      'SELECT d.client_id FROM sensors s JOIN locations l ON s.location_id = l.id JOIN departments d ON l.department_id = d.id WHERE s.id = $1',
      [id]
    );

    if (sensorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== sensorResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the sensor
    await pool.query('DELETE FROM sensors WHERE id = $1', [id]);

    // Check if table is now empty and reset sequence if needed
    const countResult = await pool.query('SELECT COUNT(*) as count FROM sensors');
    const remainingCount = parseInt(countResult.rows[0].count);
    
    if (remainingCount === 0) {
      // Reset sequence to start from 1 when table is empty
      await pool.query("SELECT setval('sensors_id_seq', 1, false)");
    }

    res.json({ message: 'Sensor deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor
};

