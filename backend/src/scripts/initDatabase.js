const pool = require('../config/database');
require('dotenv').config();

const initDatabase = async () => {
  try {
    console.log('Initializing database schema...');

    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        site_address TEXT,
        contact_email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create departments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        department_id INT REFERENCES departments(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        floor_level VARCHAR(50),
        geo_coordinates POINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create sensor_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensor_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        unit VARCHAR(20),
        description TEXT,
        min_value NUMERIC,
        max_value NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create sensors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensors (
        id SERIAL PRIMARY KEY,
        location_id INT REFERENCES locations(id) ON DELETE CASCADE,
        sensor_type_id INT REFERENCES sensor_types(id),
        name VARCHAR(255) NOT NULL,
        mqtt_topic VARCHAR(500) NOT NULL,
        sensor_count INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sensors_mqtt_topic ON sensors(mqtt_topic)
    `);

    // Create sensor_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id BIGSERIAL,
        sensor_id INT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        value NUMERIC NOT NULL,
        quality VARCHAR(20) DEFAULT 'good',
        metadata JSONB,
        PRIMARY KEY (sensor_id, timestamp)
      )
    `);

    // Try to enable TimescaleDB extension
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS timescaledb');
      console.log('TimescaleDB extension enabled');
      
      // Convert to hypertable
      await pool.query(`
        SELECT create_hypertable('sensor_data', 'timestamp', if_not_exists => TRUE)
      `);
      console.log('sensor_data table converted to hypertable');
    } catch (err) {
      console.warn('TimescaleDB not available, continuing with regular PostgreSQL:', err.message);
    }

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_time ON sensor_data(sensor_id, timestamp DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp DESC)
    `);

    // Create shifts table first (if it doesn't exist) for shift_id foreign key
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create users table with shift_id column (nullable - admins don't need shifts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        client_id INT REFERENCES clients(id),
        shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    // Create index on shift_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_shift_id ON users(shift_id)
    `);

    console.log('Database schema initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;

