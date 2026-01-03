-- ============================================================
-- Detailed List View Query for sensor_data Table
-- ============================================================
-- This query retrieves all columns from sensor_data with 
-- related sensor information for a complete view
-- ============================================================

-- Basic query: All columns from sensor_data
SELECT 
    sd.id,
    sd.sensor_id,
    sd.timestamp,
    sd.value,
    sd.quality,
    sd.metadata
FROM sensor_data sd
ORDER BY sd.timestamp DESC
LIMIT 1000;

-- ============================================================
-- Detailed query with sensor information
-- ============================================================
-- Includes sensor name, type, location, department, and client info
-- ============================================================

SELECT 
    -- Sensor Data columns
    sd.id AS data_id,
    sd.sensor_id,
    sd.timestamp,
    sd.value,
    sd.quality,
    sd.metadata AS data_metadata,
    
    -- Sensor information
    s.name AS sensor_name,
    s.status AS sensor_status,
    s.device_id,
    s.channel_code,
    s.mqtt_payload_topic,
    
    -- Sensor Type
    st.name AS sensor_type,
    st.unit AS sensor_unit,
    
    -- Location information
    l.name AS location_name,
    l.floor_level,
    
    -- Department information
    d.name AS department_name,
    d.description AS department_description,
    
    -- Client information
    c.id AS client_id,
    c.name AS client_name,
    c.site_address,
    c.contact_email,
    
    -- Formatted timestamp columns for easier reading
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD') AS date,
    TO_CHAR(sd.timestamp, 'HH24:MI:SS') AS time,
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS datetime
    
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
INNER JOIN locations l ON s.location_id = l.id
INNER JOIN departments d ON l.department_id = d.id
INNER JOIN clients c ON d.client_id = c.id
ORDER BY sd.timestamp DESC
LIMIT 1000;

-- ============================================================
-- Query with date/time filters
-- ============================================================

SELECT 
    sd.id AS data_id,
    sd.sensor_id,
    s.name AS sensor_name,
    s.device_id,
    s.channel_code,
    sd.timestamp,
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD') AS date,
    TO_CHAR(sd.timestamp, 'HH24:MI:SS') AS time,
    sd.value,
    sd.quality,
    st.name AS sensor_type,
    l.name AS location_name,
    d.name AS department_name,
    c.name AS client_name
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
INNER JOIN locations l ON s.location_id = l.id
INNER JOIN departments d ON l.department_id = d.id
INNER JOIN clients c ON d.client_id = c.id
WHERE sd.timestamp >= CURRENT_DATE  -- Today's data
  AND sd.timestamp < CURRENT_DATE + INTERVAL '1 day'
ORDER BY sd.timestamp DESC;

-- ============================================================
-- Query for specific date range
-- ============================================================

SELECT 
    sd.id AS data_id,
    sd.sensor_id,
    s.name AS sensor_name,
    s.device_id,
    s.channel_code,
    sd.timestamp,
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD') AS date,
    TO_CHAR(sd.timestamp, 'HH24:MI:SS') AS time,
    sd.value,
    sd.quality,
    st.name AS sensor_type,
    l.name AS location_name,
    d.name AS department_name,
    c.name AS client_name,
    sd.metadata
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
INNER JOIN locations l ON s.location_id = l.id
INNER JOIN departments d ON l.department_id = d.id
INNER JOIN clients c ON d.client_id = c.id
WHERE sd.timestamp >= '2026-01-01 00:00:00'  -- Start date
  AND sd.timestamp <= '2026-01-31 23:59:59'  -- End date
ORDER BY sd.timestamp DESC;

-- ============================================================
-- Query for specific sensor(s)
-- ============================================================

SELECT 
    sd.id AS data_id,
    sd.sensor_id,
    s.name AS sensor_name,
    s.device_id,
    s.channel_code,
    sd.timestamp,
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS datetime,
    sd.value,
    sd.quality,
    sd.metadata
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
WHERE s.name IN ('CH01', 'CH02', 'CH03')  -- Specific sensor names
ORDER BY sd.timestamp DESC;

-- ============================================================
-- Query with switch status interpretation (for Switch sensors)
-- ============================================================

SELECT 
    sd.id AS data_id,
    sd.sensor_id,
    s.name AS sensor_name,
    s.device_id,
    s.channel_code,
    sd.timestamp,
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD') AS date,
    TO_CHAR(sd.timestamp, 'HH24:MI:SS') AS time,
    sd.value,
    CASE 
        WHEN sd.value = 1 THEN 'ON'
        WHEN sd.value = 0 THEN 'OFF'
        ELSE 'UNKNOWN'
    END AS status,
    sd.quality,
    st.name AS sensor_type,
    l.name AS location_name,
    d.name AS department_name,
    c.name AS client_name
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
INNER JOIN locations l ON s.location_id = l.id
INNER JOIN departments d ON l.department_id = d.id
INNER JOIN clients c ON d.client_id = c.id
WHERE LOWER(st.name) = 'switch'  -- Only Switch type sensors
ORDER BY sd.timestamp DESC
LIMIT 1000;

-- ============================================================
-- Count records grouped by sensor
-- ============================================================

SELECT 
    s.name AS sensor_name,
    COUNT(*) AS record_count,
    MIN(sd.timestamp) AS first_record,
    MAX(sd.timestamp) AS last_record,
    MIN(sd.value) AS min_value,
    MAX(sd.value) AS max_value,
    AVG(sd.value) AS avg_value
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
GROUP BY s.id, s.name
ORDER BY s.name;

-- ============================================================
-- Export-friendly query (for CSV/Excel export)
-- ============================================================

SELECT 
    sd.id AS "ID",
    sd.sensor_id AS "Sensor ID",
    s.name AS "Sensor Name",
    s.device_id AS "Device ID",
    s.channel_code AS "Channel Code",
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD') AS "Date",
    TO_CHAR(sd.timestamp, 'HH24:MI:SS') AS "Time",
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS "DateTime",
    sd.value AS "Value",
    CASE 
        WHEN sd.value = 1 AND LOWER(st.name) = 'switch' THEN 'ON'
        WHEN sd.value = 0 AND LOWER(st.name) = 'switch' THEN 'OFF'
        ELSE sd.value::TEXT
    END AS "Status",
    sd.quality AS "Quality",
    st.name AS "Sensor Type",
    st.unit AS "Unit",
    l.name AS "Location",
    d.name AS "Department",
    c.name AS "Client"
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
INNER JOIN locations l ON s.location_id = l.id
INNER JOIN departments d ON l.department_id = d.id
INNER JOIN clients c ON d.client_id = c.id
ORDER BY sd.timestamp DESC;

