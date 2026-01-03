-- ============================================
-- Create All Database Tables
-- ============================================
-- Run this in pgAdmin Query Tool on the iot_dashboard database
-- 
-- IMPORTANT: First run fix-database-permissions.sql to grant permissions to iotuser
-- ============================================

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_address TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor_level VARCHAR(50),
    geo_coordinates POINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sensor_types table
CREATE TABLE IF NOT EXISTS sensor_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20),
    description TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sensors table
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
);

-- Create index on sensors.mqtt_topic
CREATE INDEX IF NOT EXISTS idx_sensors_mqtt_topic ON sensors(mqtt_topic);

-- Create sensor_data table
CREATE TABLE IF NOT EXISTS sensor_data (
    id BIGSERIAL,
    sensor_id INT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value NUMERIC NOT NULL,
    quality VARCHAR(20) DEFAULT 'good',
    metadata JSONB,
    PRIMARY KEY (sensor_id, timestamp)
);

-- Create indexes on sensor_data
CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_time ON sensor_data(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp DESC);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    client_id INT REFERENCES clients(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create index on users.email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Verify all tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Success message
SELECT 'All tables created successfully! You can now create an admin user.' AS message;


