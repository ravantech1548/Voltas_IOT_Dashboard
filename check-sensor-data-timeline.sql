-- ============================================================
-- Check Sensor Data for Timeline Chart
-- ============================================================
-- Use this to verify if data exists for the timeline chart
-- ============================================================

-- 1. Check total records in sensor_data
SELECT COUNT(*) as total_records FROM sensor_data;

-- 2. Check records by sensor (Switch type only)
SELECT 
    s.name AS sensor_name,
    COUNT(sd.id) AS record_count,
    MIN(sd.timestamp) AS first_record,
    MAX(sd.timestamp) AS last_record
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
GROUP BY s.id, s.name
ORDER BY s.name;

-- 3. Check records for today's date
SELECT 
    s.name AS sensor_name,
    COUNT(*) AS records_today,
    TO_CHAR(MIN(sd.timestamp), 'YYYY-MM-DD HH24:MI:SS') AS first_today,
    TO_CHAR(MAX(sd.timestamp), 'YYYY-MM-DD HH24:MI:SS') AS last_today
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
  AND DATE(sd.timestamp) = CURRENT_DATE
GROUP BY s.id, s.name
ORDER BY s.name;

-- 4. Check records for a specific date (change date as needed)
SELECT 
    s.name AS sensor_name,
    COUNT(*) AS record_count,
    TO_CHAR(sd.timestamp, 'HH24:MI:SS') AS time,
    sd.value,
    CASE WHEN sd.value = 1 THEN 'ON' WHEN sd.value = 0 THEN 'OFF' ELSE 'UNKNOWN' END AS status
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
  AND DATE(sd.timestamp) = '2026-01-03'  -- Change this date
GROUP BY s.id, s.name, sd.timestamp, sd.value
ORDER BY sd.timestamp, s.name;

-- 5. Check records grouped by timestamp (to see complete snapshots)
SELECT 
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
    COUNT(DISTINCT sd.sensor_id) AS sensors_at_timestamp,
    STRING_AGG(s.name || ':' || sd.value::TEXT, ', ' ORDER BY s.name) AS sensor_statuses
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
  AND DATE(sd.timestamp) = '2026-01-03'  -- Change this date
GROUP BY sd.timestamp
ORDER BY sd.timestamp DESC
LIMIT 50;

-- 6. Check if data exists within shift hours (example: Shift 1 = 08:00-16:00)
SELECT 
    s.name AS sensor_name,
    COUNT(*) AS records_in_shift,
    MIN(sd.timestamp) AS first_in_shift,
    MAX(sd.timestamp) AS last_in_shift
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
  AND DATE(sd.timestamp) = CURRENT_DATE  -- Today
  AND EXTRACT(HOUR FROM sd.timestamp) * 60 + EXTRACT(MINUTE FROM sd.timestamp) >= 8 * 60  -- Shift start: 08:00
  AND EXTRACT(HOUR FROM sd.timestamp) * 60 + EXTRACT(MINUTE FROM sd.timestamp) < 16 * 60   -- Shift end: 16:00
GROUP BY s.id, s.name
ORDER BY s.name;

-- 7. Check recent records (last 1 hour)
SELECT 
    s.name AS sensor_name,
    TO_CHAR(sd.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
    sd.value,
    CASE WHEN sd.value = 1 THEN 'ON' ELSE 'OFF' END AS status
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
  AND sd.timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY sd.timestamp DESC, s.name;

-- 8. Verify complete snapshots exist (all sensors at same timestamp)
WITH timestamp_counts AS (
    SELECT 
        sd.timestamp,
        COUNT(DISTINCT sd.sensor_id) AS sensor_count
    FROM sensor_data sd
    INNER JOIN sensors s ON sd.sensor_id = s.id
    INNER JOIN sensor_types st ON s.sensor_type_id = st.id
    WHERE LOWER(st.name) = 'switch'
      AND DATE(sd.timestamp) = CURRENT_DATE
    GROUP BY sd.timestamp
)
SELECT 
    timestamp,
    sensor_count,
    CASE 
        WHEN sensor_count >= 6 THEN 'Complete snapshot'
        ELSE 'Incomplete snapshot'
    END AS snapshot_status
FROM timestamp_counts
ORDER BY timestamp DESC
LIMIT 20;

