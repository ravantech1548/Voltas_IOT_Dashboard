# Update Sensor MQTT Mapping Fields

## Summary

Added three new fields to the sensors table to map sensors to MQTT payload format:
1. **device_id** - Maps to "did" field in payload (e.g., "00002")
2. **channel_code** - Maps sensor name to channel in payload (e.g., "s1", "s2", "s3")
3. **mqtt_payload_topic** - MQTT topic name for payload subscription (e.g., "voltas")

## Steps to Apply Changes

### 1. Run Database Migration

Execute the SQL script to add the new columns:

```bash
# In pgAdmin or psql:
\i add-sensor-mqtt-fields.sql
```

Or open `add-sensor-mqtt-fields.sql` in pgAdmin Query Tool and execute it.

### 2. Restart Backend

```bash
cd backend
npm run dev
```

The backend now supports:
- Creating sensors with device_id, channel_code, mqtt_payload_topic
- Updating sensors with these fields
- Querying sensors including these fields

### 3. Update Existing Sensors (Optional)

If you want to set these fields for existing sensors (ch01-ch06), uncomment the UPDATE statement in `add-sensor-mqtt-fields.sql`:

```sql
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
```

### 4. Frontend Changes

The Settings page now includes a new "MQTT Payload Configuration" section with:
- **Device ID (did)** - Text input for device ID
- **Channel Code** - Dropdown to select s1-s6
- **MQTT Payload Topic** - Text input for topic name

## Usage in Settings Page

1. Navigate to **Settings** → **Sensors**
2. Click **Create Sensor** or edit an existing sensor
3. Fill in the standard fields (Location, Sensor Type, Name, etc.)
4. Scroll down to **MQTT Payload Configuration** section
5. Enter:
   - **Device ID**: e.g., "00002"
   - **Channel Code**: Select from s1-s6 (e.g., s1 for CH01)
   - **MQTT Payload Topic**: e.g., "voltas"

## Example Configuration

For a sensor named "CH01":
- **Name**: CH01
- **Device ID**: 00002
- **Channel Code**: s1
- **MQTT Payload Topic**: voltas

This will map the sensor to process payloads like:
```json
{
  "did": "00002",
  "date": "2026-01-03 12:13:55",
  "data": [
    { "s1": "1", "st": "12:13:55" },
    ...
  ]
}
```

## Next Steps

The MQTT handler can now be updated to use these database mappings instead of hardcoded values. This makes the system more flexible and allows different sensors to use different device IDs and topics.

