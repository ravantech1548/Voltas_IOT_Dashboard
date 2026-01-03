-- ============================================
-- DELETE ONLY SENSOR DATA (Keep Structure)
-- ============================================
-- This will delete:
-- 1. All sensor_data records (historical readings)
-- 2. All sensors (but keep sensor_types, locations, departments, clients)
-- 
-- This preserves the structure so you can re-seed data
-- ============================================

BEGIN;

-- 1. Delete all sensor_data (historical readings)
DELETE FROM sensor_data;
SELECT '✓ Deleted all sensor_data records' AS status;

-- 2. Delete all sensors (keeps sensor_types, locations, etc.)
DELETE FROM sensors;
SELECT '✓ Deleted all sensors' AS status;

-- 3. Reset sensor ID sequence to start from 1
ALTER SEQUENCE sensors_id_seq RESTART WITH 1;
SELECT '✓ Reset sensors_id_seq to start from 1' AS status;

-- Verify deletion
SELECT 
    (SELECT COUNT(*) FROM sensor_data) AS sensor_data_count,
    (SELECT COUNT(*) FROM sensors) AS sensors_count,
    (SELECT COUNT(*) FROM sensor_types) AS sensor_types_count,
    (SELECT COUNT(*) FROM locations) AS locations_count,
    (SELECT COUNT(*) FROM departments) AS departments_count,
    (SELECT COUNT(*) FROM clients) AS clients_count;

-- Review what will be deleted before committing
-- ROLLBACK; -- Uncomment this line to cancel the deletion

-- If everything looks correct, commit the transaction
COMMIT;

SELECT '✓ All sensor data and sensors deleted. Structure preserved.' AS message;
SELECT 'You can now run: npm run seed-initial (in backend folder) to recreate sensors' AS next_step;

