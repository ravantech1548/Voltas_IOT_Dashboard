-- ============================================
-- FORCE DELETE ALL SENSOR DATA (No Transaction)
-- ============================================
-- WARNING: This will immediately delete ALL data
-- No rollback possible - use with extreme caution!
-- ============================================

-- Delete all sensor_data
TRUNCATE TABLE sensor_data CASCADE;
SELECT '✓ Deleted all sensor_data records' AS status;

-- Delete all sensors
TRUNCATE TABLE sensors CASCADE;
SELECT '✓ Deleted all sensors' AS status;

-- Delete all sensor_types
TRUNCATE TABLE sensor_types CASCADE;
SELECT '✓ Deleted all sensor_types' AS status;

-- Delete all locations
TRUNCATE TABLE locations CASCADE;
SELECT '✓ Deleted all locations' AS status;

-- Delete all departments
TRUNCATE TABLE departments CASCADE;
SELECT '✓ Deleted all departments' AS status;

-- Delete all clients
TRUNCATE TABLE clients CASCADE;
SELECT '✓ Deleted all clients' AS status;

-- Reset all sequences to start from 1
ALTER SEQUENCE sensors_id_seq RESTART WITH 1;
ALTER SEQUENCE sensor_types_id_seq RESTART WITH 1;
ALTER SEQUENCE locations_id_seq RESTART WITH 1;
ALTER SEQUENCE departments_id_seq RESTART WITH 1;
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
SELECT '✓ Reset all ID sequences to start from 1' AS status;

-- Verify deletion
SELECT 
    (SELECT COUNT(*) FROM sensor_data) AS sensor_data_count,
    (SELECT COUNT(*) FROM sensors) AS sensors_count,
    (SELECT COUNT(*) FROM sensor_types) AS sensor_types_count,
    (SELECT COUNT(*) FROM locations) AS locations_count,
    (SELECT COUNT(*) FROM departments) AS departments_count,
    (SELECT COUNT(*) FROM clients) AS clients_count;

SELECT '✓ All data deleted (cannot be undone)' AS message;
