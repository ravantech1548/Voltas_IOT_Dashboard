# Quick Setup: HiveMQ Cloud Configuration

## Step-by-Step Setup

### 1. Create .env file in the `backend` directory

Create a file named `.env` in the `backend` directory with the following content:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# HiveMQ Cloud Configuration
MQTT_BROKER_URL=mqtts://9213530428624354bfc54e44a2a16413.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=iot-sense
MQTT_PASSWORD=Tech2026*
MQTT_TOPIC=voltas

MQTT_DISABLED=false
```

### 2. Copy from template (Alternative method)

You can also copy the template file:

**Windows:**
```powershell
cd backend
Copy-Item env.template .env
# Then edit .env and uncomment/update the HiveMQ Cloud section
```

**Linux/Mac:**
```bash
cd backend
cp env.template .env
# Then edit .env and uncomment/update the HiveMQ Cloud section
```

### 3. Verify Configuration

Make sure your `.env` file has:
- ✅ `MQTT_BROKER_URL` set to `mqtts://9213530428624354bfc54e44a2a16413.s1.eu.hivemq.cloud:8883`
- ✅ `MQTT_USERNAME` set to `iot-sense`
- ✅ `MQTT_PASSWORD` set to `Tech2026*`
- ✅ `MQTT_TOPIC` set to `voltas`
- ✅ `MQTT_DISABLED` set to `false`

### 4. Install Dependencies (if not already done)

```bash
cd backend
npm install
```

### 5. Start the Backend Server

```bash
npm run dev
```

### 6. Verify Connection

You should see these messages in the console:

```
✓ Connected to MQTT broker
✓ Subscribed to MQTT topic [1/1]: voltas
```

## Testing MQTT Message Reception

Once connected, when a message is published to the `voltas` topic, you should see:

```
📨 MQTT message received on topic: voltas
✓ Processed MQTT message for sensor 1: 25.5 (topic: voltas)
```

## Message Format

Publish messages to the `voltas` topic using the Voltas device format:

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
- `date`: Date string ("YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD")
- `data`: Array of sensor readings
  - `s1` to `s6`: Sensor channel values ("0" for OFF, "1" for ON)
  - `st`: Status timestamp ("HH:MM:SS")

**Sensor Channel Mapping:**
- `s1` → `ch01` (database sensor name)
- `s2` → `ch02`
- `s3` → `ch03`
- `s4` → `ch04`
- `s5` → `ch05`
- `s6` → `ch06`

The application automatically maps these channels to sensors in your database.

## Troubleshooting

### Connection fails
- Check if the broker URL is correct (mqtts:// not mqtt://)
- Verify username and password are correct
- Ensure port 8883 is not blocked by firewall

### Messages not being received
- Verify the topic you're publishing to matches `voltas` exactly
- Check that the message is valid JSON
- Ensure `sensor_id` exists in your database `sensors` table

### SSL/TLS errors
- HiveMQ Cloud requires secure connections (mqtts://)
- If you get certificate errors, check your network/firewall settings

## Next Steps

See `MQTT_CONFIG.md` for more detailed configuration options and advanced settings.

