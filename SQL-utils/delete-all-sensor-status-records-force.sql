-- ============================================================
-- Force Delete All Sensor Status Records (No Transaction)
-- ============================================================
-- WARNING: This script immediately deletes all records
-- No rollback possible - use with extreme caution!
-- ============================================================

-- Show count before deletion
SELECT COUNT(*) as records_before_deletion FROM sensor_data;

-- Delete all records
TRUNCATE TABLE sensor_data RESTART IDENTITY;

-- Verify deletion and sequence reset
SELECT COUNT(*) as records_after_deletion FROM sensor_data;

-- Check sequence value (should be 1)
SELECT last_value as next_id_will_be FROM sensor_data_id_seq;

SELECT 'All sensor status records deleted. Table truncated and sequence reset.' AS status;

