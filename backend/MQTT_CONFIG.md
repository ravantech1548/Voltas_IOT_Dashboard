# MQTT Configuration Guide

This guide explains how to configure MQTT for your IoT Dashboard application.

## Quick Setup for HiveMQ Cloud

### Step 1: Create .env file

Create a `.env` file in the `backend` directory with the following content:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# MQTT Configuration for HiveMQ Cloud
MQTT_BROKER_URL=mqtts://9213530428624354bfc54e44a2a16413.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=iot-sense
MQTT_PASSWORD=Tech2026*
MQTT_TOPIC=voltas

# Set to 'true' to disable MQTT entirely
MQTT_DISABLED=false
```

### Step 2: Restart the backend server

After creating/updating the `.env` file, restart your backend server:

```bash
cd backend
npm run dev
```

You should see:
```
✓ Connected to MQTT broker
✓ Subscribed to MQTT topic: voltas
```

## Configuration Options

### MQTT_BROKER_URL

The MQTT broker connection URL.

**For HiveMQ Cloud:**
```
mqtts://your-cluster-id.s1.eu.hivemq.cloud:8883
```

**For local Mosquitto:**
```
mqtt://localhost:1883
```

**Note:** 
- Use `mqtts://` for secure connections (HiveMQ Cloud)
- Use `mqtt://` for unencrypted connections (local development)

### MQTT_USERNAME

Your MQTT broker username.

**For HiveMQ Cloud:** Required
```
MQTT_USERNAME=iot-sense
```

**For local Mosquitto:** Usually empty (unless configured)
```
MQTT_USERNAME=
```

### MQTT_PASSWORD

Your MQTT broker password.

**For HiveMQ Cloud:** Required
```
MQTT_PASSWORD=Tech2026*
```

**For local Mosquitto:** Usually empty (unless configured)
```
MQTT_PASSWORD=
```

### MQTT_TOPIC

The MQTT topic to subscribe to. The application will listen for messages on this topic.

**Options:**
- Single topic: `voltas`
- Topic with wildcards: `voltas/#` (subscribes to all subtopics under `voltas`)
- Multiple topics: `voltas/sensors,voltas/actuators` (comma-separated)

**Default:** `client/+/dept/+/location/+/sensor/+` (wildcard pattern for hierarchical topics)

**Example for HiveMQ Cloud:**
```
MQTT_TOPIC=voltas
```

### MQTT_DISABLED

Set to `true` to disable MQTT entirely. Useful for development without MQTT broker.

```
MQTT_DISABLED=false
```

### MQTT_REJECT_UNAUTHORIZED

For self-signed certificates, set to `false`. **Not recommended for production.**

```
MQTT_REJECT_UNAUTHORIZED=true
```

## Topic Structure and Message Format

The application supports multiple MQTT message formats. Here are the supported formats:

### Format 1: Voltas Device Format (Recommended)

This is the primary format for Voltas switch sensors:

```json
{
  "did": "00002",
  "date": "2026-01-03 12:13:55",
  "data": [
    {
      "s1": "1",
      "st": "12:13:55"
    },
    {
      "s2": "0",
      "st": "12:13:55"
    },
    {
      "s3": "0",
      "st": "12:13:55"
    },
    {
      "s4": "0",
      "st": "12:13:55"
    },
    {
      "s5": "0",
      "st": "12:13:55"
    },
    {
      "s6": "0",
      "st": "12:13:55"
    }
  ]
}
```

**Field Descriptions:**
- `did`: Device ID (e.g., "00002")
- `date`: Date string in format "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
- `data`: Array of sensor readings
  - Each object contains:
    - `s1` to `s6`: Sensor channel values ("0" for OFF, "1" for ON)
    - `st`: Status timestamp (time when status changed) in format "HH:MM:SS"

**Sensor Channel Mapping:**
- `s1` → `ch01` (sensor name in database)
- `s2` → `ch02`
- `s3` → `ch03`
- `s4` → `ch04`
- `s5` → `ch05`
- `s6` → `ch06`

The application automatically maps these channels to the corresponding sensors in the database.

### Format 2: Legacy Single Sensor Format

For backward compatibility:

### Format 1: Single Sensor Data
```json
{
  "sensor_id": 1,
  "value": 25.5,
  "timestamp": "2026-01-03T10:30:00Z",
  "metadata": {
    "unit": "°C",
    "quality": "good"
  }
}
```

### Format 2: Alternative Field Names
```json
{
  "sensorId": 1,
  "value": 25.5,
  "timestamp": "2026-01-03T10:30:00Z"
}
```

### Format 3: Multiple Sensors (Array)
```json
[
  {
    "sensor_id": 1,
    "value": 25.5,
    "timestamp": "2026-01-03T10:30:00Z"
  },
  {
    "sensor_id": 2,
    "value": 60.0,
    "timestamp": "2026-01-03T10:30:00Z"
  }
]
```

## Troubleshooting

### Connection Issues

1. **Check if MQTT broker URL is correct**
   - For HiveMQ Cloud, ensure you use `mqtts://` (secure)
   - Port should be `8883` for HiveMQ Cloud
   - Verify cluster ID is correct

2. **Check credentials**
   - Ensure `MQTT_USERNAME` and `MQTT_PASSWORD` are correct
   - For HiveMQ Cloud, both are required

3. **Check firewall/network**
   - Ensure port 8883 is not blocked
   - Check if you're behind a corporate firewall

4. **Enable debug logging**
   - Check backend console for connection messages
   - Look for error messages in the logs

### Message Not Being Processed

1. **Check topic subscription**
   - Verify `MQTT_TOPIC` matches the topic you're publishing to
   - Check console logs for subscription confirmation

2. **Check message format**
   - Messages must be valid JSON
   - Must include `sensor_id` (or `sensorId`) and `value` fields

3. **Check database**
   - Ensure `sensor_id` exists in the `sensors` table
   - Check database connection is working

## Testing MQTT Connection

You can test your MQTT connection using a tool like:

1. **MQTT.fx** - Desktop MQTT client
2. **HiveMQ WebSocket Client** - Browser-based client
3. **mosquitto_pub** - Command line tool

### Example using mosquitto_pub:

```bash
# For HiveMQ Cloud
mosquitto_pub -h 9213530428624354bfc54e44a2a16413.s1.eu.hivemq.cloud \
  -p 8883 \
  -u iot-sense \
  -P Tech2026* \
  -t voltas \
  -m '{"sensor_id": 1, "value": 25.5, "timestamp": "2026-01-03T10:30:00Z"}'
```

## Security Notes

1. **Never commit `.env` file to version control**
   - The `.env` file contains sensitive credentials
   - Add `.env` to `.gitignore`

2. **Use secure MQTT (mqtts://) for production**
   - HiveMQ Cloud uses secure connections by default
   - Local development can use unencrypted connections

3. **Rotate credentials regularly**
   - Change passwords periodically
   - Use strong passwords

4. **Limit topic access**
   - Use specific topics instead of wildcards when possible
   - Implement proper access control on MQTT broker

