-- ============================================
-- Delete Dummy Sensor Data for Channels (SAFE VERSION WITH TRANSACTION)
-- ============================================
-- This script deletes all sensor_data records for sensors:
-- ch01, ch02, ch03, ch04, ch05, ch06
-- 
-- This version uses a transaction so you can rollback if needed
-- Run this in pgAdmin Query Tool on the iot_dashboard database
-- ============================================

BEGIN;

-- First, let's see what sensors exist with these names
SELECT 
    id,
    name,
    mqtt_topic,
    status,
    (SELECT COUNT(*) FROM sensor_data WHERE sensor_id = s.id) as data_count
FROM sensors s
WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
ORDER BY name;

-- Show total count of records to be deleted
SELECT 
    COUNT(*) as total_records_to_delete
FROM sensor_data
WHERE sensor_id IN (
    SELECT id FROM sensors 
    WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
);

-- Delete all sensor_data records for these channels
DELETE FROM sensor_data
WHERE sensor_id IN (
    SELECT id FROM sensors 
    WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
);

-- Verify deletion - show remaining records (should be 0)
SELECT 
    COUNT(*) as remaining_records
FROM sensor_data
WHERE sensor_id IN (
    SELECT id FROM sensors 
    WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
);

-- Show summary by sensor name (should show all zeros)
SELECT 
    s.name,
    s.id as sensor_id,
    COUNT(sd.id) as remaining_data_count
FROM sensors s
LEFT JOIN sensor_data sd ON s.id = sd.sensor_id
WHERE s.name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
GROUP BY s.id, s.name
ORDER BY s.name;

-- IMPORTANT: Review the results above
-- If everything looks correct, run: COMMIT;
-- If something is wrong, run: ROLLBACK;

-- Uncomment the line below to commit the changes:
COMMIT;

-- Or uncomment the line below to rollback the changes:
-- ROLLBACK;

