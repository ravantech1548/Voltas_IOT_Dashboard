-- Migration: Add data_status field to sensor_data table
-- This field tracks whether the data is 'live' (received from payload) or 'offline' (no payload received)

-- Add the data_status column with default value 'live' for existing records
ALTER TABLE sensor_data 
ADD COLUMN IF NOT EXISTS data_status VARCHAR(20) DEFAULT 'live';

-- Add comment to describe the field
COMMENT ON COLUMN sensor_data.data_status IS 'Status of the data: live = received from MQTT payload, offline = no payload received, all sensors set to zero';

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_sensor_data_status ON sensor_data(data_status);

-- Update existing records to have 'live' status (they were all from payloads)
UPDATE sensor_data SET data_status = 'live' WHERE data_status IS NULL;

