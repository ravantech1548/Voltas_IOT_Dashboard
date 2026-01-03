# Testing MQTT Data Reception and Live Streaming

This guide explains how to test MQTT data reception and verify that live data streams to the frontend.

## Prerequisites

1. ✅ Backend server is running
2. ✅ Frontend server is running
3. ✅ Database has sensors (ch01-ch06) created
4. ✅ `.env` file is configured with MQTT settings
5. ✅ You are logged into the frontend

## Step 1: Verify Sensors Exist in Database

First, ensure your sensors are set up:

```bash
cd backend
node src/scripts/seedInitialData.js
```

Or check manually:
```sql
SELECT id, name FROM sensors WHERE name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06');
```

## Step 2: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✓ Connected to MQTT broker
Using MQTT username: iot-sense
✓ Refreshed sensor cache: 6 sensors
✓ Subscribed to MQTT topic [1/1]: voltas
```

## Step 3: Start Frontend Server

```bash
cd frontend
npm start
```

Open http://localhost:3000 and log in.

## Step 4: Test MQTT Message Publishing

### Option A: Using the Test Script (Easiest)

Run the test script to automatically publish messages:

```bash
cd backend
node src/scripts/testMqttPublish.js
```

This will:
- Connect to your MQTT broker
- Publish test messages every 5 seconds
- Rotate which sensor is ON (ch01 → ch02 → ch03 → ch04 → ch05 → ch06 → repeat)
- Show confirmation for each message sent

**Expected Output:**
```
🔌 Connecting to MQTT broker: mqtts://***@...
📡 Topic: voltas

✓ Connected to MQTT broker

📤 Starting to publish test messages...

Press Ctrl+C to stop

✓ Published message #1 - Active sensor: S1 (ch01)
  Device: 00002, Time: 12:34:56
✓ Published message #2 - Active sensor: S2 (ch02)
  Device: 00002, Time: 12:35:01
...
```

### Option B: Using mosquitto_pub (Command Line)

```bash
mosquitto_pub \
  -h 9213530428624354bfc54e44a2a16413.s1.eu.hivemq.cloud \
  -p 8883 \
  -u iot-sense \
  -P Tech2026* \
  -t voltas \
  -m '{"did":"00002","date":"2026-01-03 12:13:55","data":[{"s1":"1","st":"12:13:55"},{"s2":"0","st":"12:13:55"},{"s3":"0","st":"12:13:55"},{"s4":"0","st":"12:13:55"},{"s5":"0","st":"12:13:55"},{"s6":"0","st":"12:13:55"}]}'
```

### Option C: Using MQTT.fx or Other MQTT Clients

1. Connect to: `9213530428624354bfc54e44a2a16413.s1.eu.hivemq.cloud:8883`
2. Username: `iot-sense`
3. Password: `Tech2026*`
4. Use secure connection (TLS/SSL)
5. Publish to topic: `voltas`
6. Message format:
```json
{
  "did": "00002",
  "date": "2026-01-03 12:13:55",
  "data": [
    {"s1": "1", "st": "12:13:55"},
    {"s2": "0", "st": "12:13:55"},
    {"s3": "0", "st": "12:13:55"},
    {"s4": "0", "st": "12:13:55"},
    {"s5": "0", "st": "12:13:55"},
    {"s6": "0", "st": "12:13:55"}
  ]
}
```

## Step 5: Verify Backend Reception

Watch your backend console. When a message is received, you should see:

```
📨 MQTT message received on topic: voltas
Processing device 00002 with 6 sensor readings
✓ Processed ch01 (s1) from device 00002: 1 at 2026-01-03T12:13:55.000Z
✓ Processed ch02 (s2) from device 00002: 0 at 2026-01-03T12:13:55.000Z
✓ Processed ch03 (s3) from device 00002: 0 at 2026-01-03T12:13:55.000Z
✓ Processed ch04 (s4) from device 00002: 0 at 2026-01-03T12:13:55.000Z
✓ Processed ch05 (s5) from device 00002: 0 at 2026-01-03T12:13:55.000Z
✓ Processed ch06 (s6) from device 00002: 0 at 2026-01-03T12:13:55.000Z
```

## Step 6: Verify Database Storage

Check that data is being stored:

```sql
SELECT 
  sd.id,
  s.name as sensor_name,
  sd.value,
  sd.timestamp,
  sd.metadata->>'device_id' as device_id
FROM sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
WHERE s.name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
ORDER BY sd.timestamp DESC
LIMIT 20;
```

## Step 7: Verify Live Streaming to Frontend

### Test on Dashboard Page

1. Go to the **Dashboard** page in your browser
2. Select a sensor (e.g., ch01) from the dropdown
3. Open browser DevTools (F12) → Console tab
4. When MQTT messages are received, you should see:
   - WebSocket connection messages
   - Live data updates in the console (if logging is enabled)
   - Chart updating in real-time

### Test on Switch Sensors Page

1. Go to the **Switch Sensors** page
2. Watch the sensor cards
3. When MQTT messages arrive with different sensors ON, the cards should update

### Verify WebSocket Connection

Open browser DevTools → Network tab → WS (WebSocket):
- You should see a WebSocket connection to `ws://localhost:5000`
- Status should be "101 Switching Protocols" (connected)

## Troubleshooting

### Backend not receiving MQTT messages

**Check:**
1. ✅ MQTT broker URL is correct in `.env`
2. ✅ Username and password are correct
3. ✅ Topic matches (`voltas`)
4. ✅ Backend console shows "✓ Connected to MQTT broker"
5. ✅ Firewall/network allows connection to port 8883

**Common Issues:**
- Wrong protocol: Use `mqtts://` not `mqtt://` for HiveMQ Cloud
- Wrong port: Use `8883` not `1883` for secure MQTT
- Authentication failed: Double-check username/password

### Messages received but not stored

**Check:**
1. ✅ Sensors exist in database with names ch01-ch06
2. ✅ Backend console shows sensor cache refresh message
3. ✅ No error messages in backend console

**Common Issues:**
- Sensors don't exist: Run `seedInitialData.js`
- Sensor names don't match: Check database for exact names

### Frontend not receiving live updates

**Check:**
1. ✅ WebSocket connection is established (check Network tab)
2. ✅ You're subscribed to the correct sensor room
3. ✅ Backend is broadcasting (check console logs)
4. ✅ Browser console has no WebSocket errors

**Common Issues:**
- WebSocket connection failed: Check `REACT_APP_WS_URL` in frontend `.env`
- Authentication token missing: Make sure you're logged in
- Socket.IO not initialized: Check backend console for Socket.IO messages

### Test Script Errors

If the test script fails:
1. Check `.env` file exists and has correct values
2. Verify `mqtt` package is installed: `npm install mqtt`
3. Check network connectivity to MQTT broker
4. Verify credentials are correct

## Manual Testing Checklist

- [ ] Backend connects to MQTT broker
- [ ] Test script publishes messages successfully
- [ ] Backend receives MQTT messages
- [ ] Data is stored in database
- [ ] WebSocket connection established
- [ ] Frontend receives live updates
- [ ] Charts update in real-time
- [ ] Switch sensors page shows live status

## Next Steps

Once testing is successful:
1. Configure your actual IoT devices to publish to the `voltas` topic
2. Monitor backend logs for any errors
3. Set up monitoring/alerting for MQTT connection health
4. Consider implementing data retention policies for sensor_data table

