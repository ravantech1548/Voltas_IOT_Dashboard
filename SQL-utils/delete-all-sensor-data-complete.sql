-- ============================================
-- DELETE ALL SENSOR DATA AND RELATED RECORDS
-- ============================================
-- WARNING: This will permanently delete ALL sensor-related data
-- 
-- What will be deleted:
-- 1. All sensor_data records (all historical readings)
-- 2. All sensors (ch01-ch06 and any other sensors)
-- 3. All sensor_types (Temperature, Humidity, Pressure, Switch)
-- 4. All locations
-- 5. All departments
-- 6. All clients
-- 
-- USE WITH EXTREME CAUTION - THIS CANNOT BE UNDONE!
-- ============================================

BEGIN;

-- Disable foreign key checks temporarily (PostgreSQL doesn't need this, but for safety)
-- We'll delete in the correct order to respect foreign keys

-- 1. Delete all sensor_data (historical readings)
DELETE FROM sensor_data;
SELECT 'Deleted all sensor_data records' AS status;

-- 2. Delete all sensors
DELETE FROM sensors;
SELECT 'Deleted all sensors' AS status;

-- 3. Delete all sensor_types
DELETE FROM sensor_types;
SELECT 'Deleted all sensor_types' AS status;

-- 4. Delete all locations (will cascade delete any remaining sensor references)
DELETE FROM locations;
SELECT 'Deleted all locations' AS status;

-- 5. Delete all departments
DELETE FROM departments;
SELECT 'Deleted all departments' AS status;

-- 6. Delete all clients
DELETE FROM clients;
SELECT 'Deleted all clients' AS status;

-- 7. Reset all sequences to start from 1
ALTER SEQUENCE sensors_id_seq RESTART WITH 1;
ALTER SEQUENCE sensor_types_id_seq RESTART WITH 1;
ALTER SEQUENCE locations_id_seq RESTART WITH 1;
ALTER SEQUENCE departments_id_seq RESTART WITH 1;
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
SELECT 'Reset all ID sequences to start from 1' AS status;

-- 8. Delete all users (optional - uncomment if you want to delete users too)
-- DELETE FROM users;
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- SELECT 'Deleted all users' AS status;

-- 9. Delete all shifts (optional - uncomment if you want to delete shifts too)
-- DELETE FROM shifts;
-- ALTER SEQUENCE shifts_id_seq RESTART WITH 1;
-- SELECT 'Deleted all shifts' AS status;

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
-- COMMIT; -- Uncomment this line to permanently delete everything

-- By default, this script will ROLLBACK for safety
-- Review the counts above, then manually run COMMIT; if you're sure
ROLLBACK;

SELECT 'Transaction rolled back for safety. Review the counts above, then run COMMIT; manually if you want to delete everything.' AS message;

