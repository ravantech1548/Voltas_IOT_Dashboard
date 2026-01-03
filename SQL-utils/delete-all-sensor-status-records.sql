-- ============================================================
-- Delete All Sensor Status Records from sensor_data Table
-- ============================================================
-- WARNING: This will delete ALL records from sensor_data table
-- Use with caution - this action cannot be undone!
-- ============================================================

-- Start transaction for safety (can rollback if needed)
BEGIN;

-- Check current record count
SELECT COUNT(*) as current_record_count FROM sensor_data;

-- Delete all records from sensor_data table
DELETE FROM sensor_data;

-- Reset the sequence for sensor_data id (optional - only if you want to reset auto-increment)
-- Note: sensor_data table uses id SERIAL, so sequence name is sensor_data_id_seq
ALTER SEQUENCE sensor_data_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) as remaining_records FROM sensor_data;

-- Uncomment the line below to ROLLBACK if you want to undo the deletion
-- ROLLBACK;

-- Commit the transaction
COMMIT;

-- Final verification
SELECT 
    COUNT(*) as total_records,
    MIN(id) as min_id,
    MAX(id) as max_id
FROM sensor_data;

SELECT 'All sensor status records deleted successfully. Sequence reset to start from 1.' AS status;

