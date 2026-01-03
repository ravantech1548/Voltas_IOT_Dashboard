# MQTT Payload Matching with Sensor Configuration

## Overview

The system now matches incoming MQTT payloads with sensor configurations from the database. This allows flexible configuration where each sensor can specify its own device_id, channel_code, and mqtt_payload_topic.

## How It Works

### 1. Sensor Configuration (Settings Page)

Each sensor in Settings → Sensors can be configured with:
- **Device ID (did)**: Maps to "did" field in MQTT payload (e.g., "00002")
- **Channel Code**: Maps sensor to channel in payload data array (e.g., "s1", "s2", "s3")
- **MQTT Payload Topic**: The MQTT topic name for this sensor (e.g., "voltas")

### 2. Sensor Cache

The backend maintains a cache of sensor configurations:
- `sensorConfigCache`: Maps sensor_id → {name, device_id, channel_code, mqtt_payload_topic, status}
- `channelCodeToSensorCache`: Maps channel_code (e.g., "s1") → {sensor_id, sensor_name, device_id}
- `deviceIdToSensorsCache`: Maps device_id (e.g., "00002") → array of sensors

### 3. MQTT Topic Subscription

The system subscribes to:
1. **Environment Variable Topic**: `MQTT_TOPIC` from `.env` file
2. **Sensor Configuration Topics**: All `mqtt_payload_topic` values from active sensors

Example: If sensors have `mqtt_payload_topic="voltas"`, the system subscribes to "voltas" even if `MQTT_TOPIC` in `.env` is different.

### 4. Payload Processing

When an MQTT message arrives with this format:
```json
{
  "did": "00002",
  "date": "2026-01-03 12:13:55",
  "data": [
    {"s1": "1", "st": "12:13:55"},
    {"s2": "0", "st": "12:13:55"},
    ...
  ]
}
```

The system processes it in this order:

#### Step 1: Match by device_id + channel_code (Primary Method)
- Looks up sensors configured with `device_id = "00002"`
- For each channel (s1, s2, etc.), finds sensor with matching `channel_code`
- **Most accurate**: Ensures correct sensor mapping when multiple devices exist

#### Step 2: Match by channel_code only (Fallback)
- If device_id match fails, tries matching by `channel_code` only
- Still verifies `device_id` matches if configured (prevents wrong device)
- Useful when device_id is not configured but channel_code is

#### Step 3: Fallback to hardcoded mapping (Backward Compatibility)
- Uses hardcoded mapping: s1→ch01, s2→ch02, etc.
- Only if previous methods fail
- Verifies device_id matches if sensor has device_id configured

### 5. Data Storage and Broadcasting

Once matched:
1. **Stores** sensor data in `sensor_data` table
2. **Broadcasts** to WebSocket room: `sensor_{sensor_id}`
3. **Frontend** receives update and displays live status

## Configuration Example

### Sensor Configuration in Settings:

| Sensor Name | Device ID | Channel Code | MQTT Payload Topic | Status |
|-------------|-----------|--------------|-------------------|--------|
| CH01 | 00002 | s1 | voltas | Active |
| CH02 | 00002 | s2 | voltas | Active |
| CH03 | 00002 | s3 | voltas | Active |

### MQTT Payload:
```json
{
  "did": "00002",
  "date": "2026-01-03 12:13:55",
  "data": [
    {"s1": "1", "st": "12:13:55"},  → Matches CH01 (device_id=00002, channel_code=s1)
    {"s2": "0", "st": "12:13:55"},  → Matches CH02 (device_id=00002, channel_code=s2)
    {"s3": "0", "st": "12:13:55"}   → Matches CH03 (device_id=00002, channel_code=s3)
  ]
}
```

### Result:
- CH01 receives value=1 → Dashboard shows CH01 as ON (green)
- CH02 receives value=0 → Dashboard shows CH02 as OFF (gray)
- CH03 receives value=0 → Dashboard shows CH03 as OFF (gray)

## Dashboard Live Updates

### How Dashboard Receives Updates:

1. **WebSocket Connection**: Dashboard connects to WebSocket server
2. **Room Joining**: Joins rooms for all active Switch sensors: `sensor_{sensor_id}`
3. **Message Reception**: Receives `sensor_update` events with:
   - `sensor_id`: Database sensor ID
   - `sensor_name`: Original database name (CH01, CH02, etc.)
   - `value`: 0 or 1
   - `timestamp`: When the data was received
4. **Status Update**: Updates sensor card `isActive` based on `value === 1`
5. **Mutual Exclusivity**: When one sensor turns ON, others turn OFF

### Visual Result:

When CH01 receives value=1:
- CH01 card turns **green** with "ON" indicator
- Other sensor cards remain **gray** with "OFF" indicator
- Summary shows: "Active Sensor: CH01"
- Status persists until next payload updates it

## Benefits

1. **Flexible Configuration**: Each sensor can have different device_id and topic
2. **Multiple Devices**: Support multiple devices sending to different topics
3. **Dynamic Updates**: Sensor cache refreshes every 5 minutes to pick up config changes
4. **Backward Compatible**: Falls back to hardcoded mapping if config not set
5. **Accurate Matching**: Verifies device_id to prevent cross-device data mixing

## Troubleshooting

### Issue: Messages received but sensors don't update

**Check:**
1. Sensor configuration in Settings:
   - Device ID matches payload "did"
   - Channel Code matches payload channel (s1, s2, etc.)
   - Sensor status is "active"

2. Backend console logs:
   - Look for "✅ Matched by device_id" or "✅ Matched by channel_code"
   - Check for "⚠️ device_id mismatch" warnings

3. WebSocket connection:
   - Dashboard should show "Live" indicator (green)
   - Check browser console for "sensor_update" events

### Issue: Wrong sensor receiving data

**Solution:**
- Verify `device_id` and `channel_code` match exactly in Settings
- Check backend console for matching logs
- Ensure sensor is set to "active" status

### Issue: Sensors not appearing on Dashboard

**Solution:**
- Verify sensor type is "Switch" in Settings
- Verify sensor status is "active"
- Check that sensor name starts with 'ch' (case-insensitive) or is Switch type
- Restart backend to refresh sensor cache

## Testing

1. **Configure sensors** in Settings with device_id, channel_code, mqtt_payload_topic
2. **Send MQTT payload** with matching did and channels
3. **Check backend console** for matching logs
4. **Check Dashboard** for live status updates
5. **Verify** sensor cards update immediately when payload arrives

