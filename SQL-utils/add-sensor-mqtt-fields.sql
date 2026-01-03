-- ============================================
-- Add MQTT Mapping Fields to Sensors Table
-- ============================================
-- This adds fields to map sensors to MQTT payload format:
-- - device_id: Maps to "did" field in payload (e.g., "00002")
-- - channel_code: Maps sensor name to channel in payload (e.g., "CH01" -> "s1")
-- - mqtt_payload_topic: The MQTT topic name for payload subscription (e.g., "voltas")
-- ============================================

-- Add new columns to sensors table
ALTER TABLE sensors 
ADD COLUMN IF NOT EXISTS device_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS channel_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS mqtt_payload_topic VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN sensors.device_id IS 'Device ID (did) from MQTT payload, e.g., "00002"';
COMMENT ON COLUMN sensors.channel_code IS 'Channel code in payload data array, e.g., "s1", "s2", "s3"';
COMMENT ON COLUMN sensors.mqtt_payload_topic IS 'MQTT topic name for payload subscription, e.g., "voltas"';

-- Create index on device_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sensors_device_id ON sensors(device_id);

-- Create index on mqtt_payload_topic
CREATE INDEX IF NOT EXISTS idx_sensors_mqtt_payload_topic ON sensors(mqtt_payload_topic);

-- Example: Update existing sensors (ch01-ch06) with default mappings
-- Uncomment and modify as needed:
/*
UPDATE sensors SET 
  device_id = '00002',
  mqtt_payload_topic = 'voltas',
  channel_code = CASE 
    WHEN name = 'ch01' THEN 's1'
    WHEN name = 'ch02' THEN 's2'
    WHEN name = 'ch03' THEN 's3'
    WHEN name = 'ch04' THEN 's4'
    WHEN name = 'ch05' THEN 's5'
    WHEN name = 'ch06' THEN 's6'
    ELSE NULL
  END
WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06');
*/

SELECT '✓ Successfully added MQTT mapping fields to sensors table' AS status;

