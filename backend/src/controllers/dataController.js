const pool = require('../config/database');

const getSensorData = async (req, res, next) => {
  try {
    // Get sensor_id from URL params, other params from query string
    const sensor_id = req.params.sensor_id || req.query.sensor_id;
    const { start_time, end_time, limit = 1000 } = req.query;

    if (!sensor_id) {
      return res.status(400).json({ error: 'Sensor ID is required' });
    }

    // Check authorization
    const sensorResult = await pool.query(
      'SELECT d.client_id FROM sensors s JOIN locations l ON s.location_id = l.id JOIN departments d ON l.department_id = d.id WHERE s.id = $1',
      [sensor_id]
    );

    if (sensorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== sensorResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Parse sensor_id to integer
    const sensorIdInt = parseInt(sensor_id);
    if (isNaN(sensorIdInt)) {
      return res.status(400).json({ error: 'Invalid sensor ID format' });
    }

    let query = 'SELECT * FROM sensor_data WHERE sensor_id = $1';
    const params = [sensorIdInt];
    let paramCount = 2;

    if (start_time) {
      query += ` AND timestamp >= $${paramCount++}`;
      params.push(start_time);
    }

    if (end_time) {
      query += ` AND timestamp <= $${paramCount++}`;
      params.push(end_time);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    console.log(`📊 Fetching sensor data for sensor_id=${sensorIdInt}, start=${start_time}, end=${end_time}, limit=${limit}`);
    
    const result = await pool.query(query, params);
    console.log(`📊 Retrieved ${result.rows.length} records for sensor ${sensorIdInt}`);
    
    res.json(result.rows.reverse()); // Reverse to get chronological order
  } catch (error) {
    console.error('❌ Error in getSensorData:', error);
    next(error);
  }
};

const getLatestSensorData = async (req, res, next) => {
  try {
    const { sensor_ids } = req.query;

    if (!sensor_ids) {
      return res.status(400).json({ error: 'Sensor IDs are required (comma-separated)' });
    }

    const sensorIdArray = sensor_ids.split(',').map(id => parseInt(id.trim()));

    // Check authorization for all sensors
    const sensorResult = await pool.query(
      `SELECT DISTINCT d.client_id FROM sensors s 
       JOIN locations l ON s.location_id = l.id 
       JOIN departments d ON l.department_id = d.id 
       WHERE s.id = ANY($1)`,
      [sensorIdArray]
    );

    const clientIds = sensorResult.rows.map(r => r.client_id);
    if (req.user.role !== 'admin' && (!req.user.client_id || !clientIds.includes(req.user.client_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get latest data for each sensor (include data_status)
    const result = await pool.query(
      `SELECT DISTINCT ON (sensor_id) 
       sensor_id, value, timestamp, quality, metadata, data_status
       FROM sensor_data
       WHERE sensor_id = ANY($1)
       ORDER BY sensor_id, timestamp DESC`,
      [sensorIdArray]
    );

    console.log(`📊 Latest sensor data query: Found ${result.rows.length} records for ${sensorIdArray.length} sensors`);
    result.rows.forEach(row => {
      console.log(`   Sensor ID ${row.sensor_id}: value=${row.value} (${typeof row.value}), timestamp=${row.timestamp}, data_status=${row.data_status || 'null'}`);
    });

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getAggregatedData = async (req, res, next) => {
  try {
    const { sensor_id, start_time, end_time, interval = '1 hour' } = req.query;

    if (!sensor_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Sensor ID, start_time, and end_time are required' });
    }

    // Check authorization
    const sensorResult = await pool.query(
      'SELECT d.client_id FROM sensors s JOIN locations l ON s.location_id = l.id JOIN departments d ON l.department_id = d.id WHERE s.id = $1',
      [sensor_id]
    );

    if (sensorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    if (req.user.role !== 'admin' && req.user.client_id !== sensorResult.rows[0].client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Try to use time_bucket for aggregation (TimescaleDB function), fallback to date_trunc if not available
    let result;
    try {
      result = await pool.query(
        `SELECT 
          time_bucket($1::interval, timestamp) as bucket,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as count
         FROM sensor_data
         WHERE sensor_id = $2 AND timestamp >= $3 AND timestamp <= $4
         GROUP BY bucket
         ORDER BY bucket`,
        [interval, sensor_id, start_time, end_time]
      );
    } catch (err) {
      // Fallback to date_trunc if TimescaleDB is not available
      result = await pool.query(
        `SELECT 
          date_trunc('hour', timestamp) as bucket,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as count
         FROM sensor_data
         WHERE sensor_id = $1 AND timestamp >= $2 AND timestamp <= $3
         GROUP BY bucket
         ORDER BY bucket`,
        [sensor_id, start_time, end_time]
      );
    }

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSensorData,
  getLatestSensorData,
  getAggregatedData
};

