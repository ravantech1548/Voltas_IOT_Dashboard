-- ============================================================
-- SQL Queries to Check Sensor Status Details in Database
-- ============================================================

-- 1. Check total count of sensor data records
SELECT COUNT(*) as total_records 
FROM sensor_data;

-- 2. Check recent sensor data (last 24 hours)
SELECT 
    sd.id,
    s.name as sensor_name,
    sd.value,
    sd.timestamp,
    sd.metadata->>'device_id' as device_id,
    sd.metadata->>'channel' as channel,
    sd.metadata->>'status_timestamp' as status_timestamp
FROM sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
WHERE sd.timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY sd.timestamp DESC
LIMIT 100;

-- 3. Check sensor data for specific sensors (by name)
SELECT 
    s.name as sensor_name,
    sd.value,
    sd.timestamp,
    sd.metadata->>'device_id' as device_id,
    sd.metadata->>'channel' as channel
FROM sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
WHERE s.name IN ('CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06')
ORDER BY sd.timestamp DESC
LIMIT 50;

-- 4. Check latest record for each sensor
SELECT 
    s.name as sensor_name,
    sd.value as latest_value,
    sd.timestamp as latest_timestamp,
    sd.metadata->>'device_id' as device_id,
    sd.metadata->>'channel' as channel,
    EXTRACT(EPOCH FROM (NOW() - sd.timestamp))/60 as minutes_ago
FROM sensors s
LEFT JOIN LATERAL (
    SELECT value, timestamp, metadata
    FROM sensor_data
    WHERE sensor_id = s.id
    ORDER BY timestamp DESC
    LIMIT 1
) sd ON true
WHERE s.name IN ('CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06')
ORDER BY s.name;

-- 5. Check status changes (only records where value changed)
-- This shows each time a sensor changed from 0 to 1 or 1 to 0
WITH status_changes AS (
    SELECT 
        sd.sensor_id,
        s.name as sensor_name,
        sd.value,
        sd.timestamp,
        LAG(sd.value) OVER (PARTITION BY sd.sensor_id ORDER BY sd.timestamp) as previous_value,
        sd.metadata->>'device_id' as device_id,
        sd.metadata->>'channel' as channel
    FROM sensor_data sd
    JOIN sensors s ON sd.sensor_id = s.id
    WHERE s.name IN ('CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06')
)
SELECT 
    sensor_name,
    previous_value,
    value as new_value,
    timestamp,
    device_id,
    channel,
    CASE 
        WHEN previous_value IS NULL THEN 'First Record'
        WHEN previous_value != value THEN 'Status Changed'
        ELSE 'No Change'
    END as change_type
FROM status_changes
WHERE previous_value IS NULL OR previous_value != value
ORDER BY timestamp DESC
LIMIT 100;

-- 6. Count records per sensor
SELECT 
    s.name as sensor_name,
    COUNT(sd.id) as total_records,
    MAX(sd.timestamp) as latest_record,
    MIN(sd.timestamp) as first_record,
    COUNT(CASE WHEN sd.value = 1 THEN 1 END) as on_count,
    COUNT(CASE WHEN sd.value = 0 THEN 1 END) as off_count
FROM sensors s
LEFT JOIN sensor_data sd ON s.id = sd.sensor_id
WHERE s.name IN ('CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06')
GROUP BY s.id, s.name
ORDER BY s.name;

-- 7. Check recent records (last 5 minutes) - to verify if system is "Live"
SELECT 
    s.name as sensor_name,
    sd.value,
    sd.timestamp,
    sd.metadata->>'device_id' as device_id,
    sd.metadata->>'channel' as channel,
    EXTRACT(EPOCH FROM (NOW() - sd.timestamp))/60 as minutes_ago
FROM sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
WHERE sd.timestamp >= NOW() - INTERVAL '5 minutes'
  AND s.name IN ('CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06')
ORDER BY sd.timestamp DESC;

-- 8. Check if values are being inserted correctly (no duplicates with same value)
-- This verifies the status change logic is working
SELECT 
    s.name as sensor_name,
    sd1.value,
    sd1.timestamp as first_timestamp,
    sd2.timestamp as second_timestamp,
    EXTRACT(EPOCH FROM (sd2.timestamp - sd1.timestamp))/60 as minutes_between
FROM sensor_data sd1
JOIN sensor_data sd2 ON sd1.sensor_id = sd2.sensor_id 
    AND sd2.timestamp > sd1.timestamp
    AND sd1.value = sd2.value
JOIN sensors s ON sd1.sensor_id = s.id
WHERE s.name IN ('CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06')
ORDER BY sd1.timestamp DESC
LIMIT 20;

-- 9. Summary: Sensor activity today
SELECT 
    DATE(sd.timestamp) as date,
    s.name as sensor_name,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN sd.value = 1 THEN 1 END) as times_turned_on,
    COUNT(CASE WHEN sd.value = 0 THEN 1 END) as times_turned_off,
    MIN(sd.timestamp) as first_activity,
    MAX(sd.timestamp) as last_activity
FROM sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
WHERE sd.timestamp >= CURRENT_DATE
  AND s.name IN ('CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06')
GROUP BY DATE(sd.timestamp), s.id, s.name
ORDER BY s.name, DATE(sd.timestamp);

-- 10. Quick check: Are any records being inserted?
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT sensor_id) as sensors_with_data,
    MAX(timestamp) as latest_record_time,
    MIN(timestamp) as oldest_record_time,
    NOW() - MAX(timestamp) as time_since_last_record
FROM sensor_data;

