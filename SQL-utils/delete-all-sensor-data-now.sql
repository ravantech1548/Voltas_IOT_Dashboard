-- ============================================
-- DELETE ALL SENSOR DATA FOR CHANNELS (IMMEDIATE)
-- ============================================
-- This script IMMEDIATELY deletes all sensor_data records for:
-- ch01, ch02, ch03, ch04, ch05, ch06
-- 
-- WARNING: This cannot be undone! Make sure you want to delete all data.
-- Run this in pgAdmin Query Tool on the iot_dashboard database
-- ============================================

-- Show what will be deleted BEFORE deletion
SELECT 
    s.id as sensor_id,
    s.name,
    s.mqtt_topic,
    COUNT(sd.id) as records_to_delete
FROM sensors s
LEFT JOIN sensor_data sd ON s.id = sd.sensor_id
WHERE s.name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
GROUP BY s.id, s.name, s.mqtt_topic
ORDER BY s.name;

-- Show total count
SELECT 
    COUNT(*) as total_records_to_delete
FROM sensor_data
WHERE sensor_id IN (
    SELECT id FROM sensors 
    WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
);

-- DELETE ALL RECORDS (This executes immediately)
DELETE FROM sensor_data
WHERE sensor_id IN (
    SELECT id FROM sensors 
    WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
);

-- Verify deletion - should return 0
SELECT 
    COUNT(*) as remaining_records_after_deletion
FROM sensor_data
WHERE sensor_id IN (
    SELECT id FROM sensors 
    WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
);

-- Final verification by sensor
SELECT 
    s.name,
    s.id as sensor_id,
    COUNT(sd.id) as remaining_data_count
FROM sensors s
LEFT JOIN sensor_data sd ON s.id = sd.sensor_id
WHERE s.name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
GROUP BY s.id, s.name
ORDER BY s.name;

-- Success confirmation
SELECT 'All sensor data deleted successfully!' AS message,
       'Please refresh your browser to see the changes' AS note;

