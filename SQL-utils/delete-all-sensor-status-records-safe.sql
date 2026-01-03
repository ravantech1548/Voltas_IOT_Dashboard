-- ============================================================
-- Safe Delete All Sensor Status Records from sensor_data Table
-- ============================================================
-- This script deletes all records within a transaction
-- Review the counts before and after, then commit or rollback
-- ============================================================

BEGIN;

-- Show current statistics before deletion
SELECT 
    'BEFORE DELETION' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT sensor_id) as unique_sensors,
    MIN(timestamp) as earliest_record,
    MAX(timestamp) as latest_record
FROM sensor_data;

-- Delete all records from sensor_data table
DELETE FROM sensor_data;

-- Show statistics after deletion
SELECT 
    'AFTER DELETION' as status,
    COUNT(*) as total_records
FROM sensor_data;

-- Reset sequence to start from 1
ALTER SEQUENCE sensor_data_id_seq RESTART WITH 1;

-- Verify sequence reset
SELECT 
    'SEQUENCE STATUS' as status,
    last_value as current_sequence_value,
    is_called as sequence_used
FROM sensor_data_id_seq;

-- IMPORTANT: Review the results above
-- If satisfied, uncomment COMMIT below to save changes
-- If not, use ROLLBACK to undo

-- COMMIT;
-- ROLLBACK;  -- Uncomment this if you want to undo the deletion

-- Note: Transaction will remain open until you COMMIT or ROLLBACK

