-- ============================================
-- Reset Sensor ID Sequence Only
-- ============================================
-- This script resets the sensor ID sequence to start from 1
-- Use this if you've deleted sensors and want new sensors to start from ID 1
-- ============================================

-- Get current sequence value
SELECT 
    last_value AS current_sequence_value,
    is_called AS sequence_used
FROM sensors_id_seq;

-- Reset sequence to start from 1
ALTER SEQUENCE sensors_id_seq RESTART WITH 1;

-- Verify reset
SELECT 
    last_value AS new_sequence_value,
    is_called AS sequence_used
FROM sensors_id_seq;

SELECT '✓ Sensor ID sequence reset to start from 1' AS status;
SELECT 'Next sensor created will have ID = 1' AS next_id;

