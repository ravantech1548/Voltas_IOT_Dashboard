-- Reset Sensor ID Sequence
-- Run this in pgAdmin Query Tool on the iot_dashboard database
-- This will reset the sensor ID sequence to start from 1

-- First, check current sequence value
SELECT currval('sensors_id_seq') as current_sequence_value;

-- Reset sequence to start from 1 (or 0 if you want next to be 1)
SELECT setval('sensors_id_seq', 1, false);

-- Verify it's reset
SELECT currval('sensors_id_seq') as new_sequence_value;

-- Note: After running this, the next inserted sensor will have ID = 1
-- Only run this when the sensors table is empty or you want to restart numbering


