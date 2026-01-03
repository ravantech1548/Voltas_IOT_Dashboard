# Verify MQTT Setup for Real Device

## ✅ Pre-Flight Checklist

Before sending data from your actual MQTT device, verify:

### 1. Backend Configuration (`.env` file)

Check `backend/.env` has:
```env
MQTT_BROKER_URL=mqtts://your-broker-url:8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
MQTT_TOPIC=voltas
```

**Important:** Make sure `MQTT_TOPIC` matches the topic your device is publishing to!

### 2. Backend Server Running

Start backend:
```bash
cd backend
npm run dev
```

**Look for these logs:**
```
✓ Connected to MQTT broker
Using MQTT username: your-username
✓ Refreshed sensor cache: 6 sensors mapped
  ch01 (ID: 7)
  ch02 (ID: 8)
  ...
✓ Subscribed to MQTT topic: voltas
```

### 3. Frontend Connected

Open Switch Sensors page and check browser console:
```
✅✅✅ WebSocket CONNECTED for Switch Sensors
✅ Joined room: sensor_7 (ch01)
✅ Joined room: sensor_8 (ch02)
...
```

### 4. Expected Payload Format

Your device should send exactly this format:
```json
{
  "did": "00002",
  "date": "2026-01-03 12:13:55",
  "data": [
    { "s1": "1", "st": "12:13:55" },
    { "s2": "0", "st": "12:13:55" },
    { "s3": "0", "st": "12:13:55" },
    { "s4": "0", "st": "12:13:55" },
    { "s5": "0", "st": "12:13:55" },
    { "s6": "0", "st": "12:13:55" }
  ]
}
```

## 📊 What You'll See When Data Arrives

### Backend Console:
```
📨 ===== MQTT MESSAGE RECEIVED =====
   Topic: voltas
   Parsed payload structure: { hasDid: true, hasDate: true, ... }
📦 Processing device 00002 with 6 sensor readings
   Date: 2026-01-03 12:13:55
   Data array preview: s1=1, s2=0, s3=0, s4=0, s5=0, s6=0
   🔄 Processing ch01 (s1): value=1, sensorId=7
   🔄 Processing ch02 (s2): value=0, sensorId=8
   ...
📡 Broadcasted ch01 (s1): value=1 to room "sensor_7" (1 clients)
📡 Broadcasted ch02 (s2): value=0 to room "sensor_8" (1 clients)
...
📊 Summary: Processed 6 out of 6 sensor readings from device 00002
📨 ===== END MQTT MESSAGE PROCESSING =====
```

### Frontend Console:
```
🔴🔴🔴 LIVE UPDATE RECEIVED: {...}
  - Sensor ID: 7
  - Sensor Name: ch01
  - Value: 1
🔴 ✅ Updating ch01 (ID: 7) to ACTIVE
🔴 Final state - Active sensors: ch01
🔴 All sensors: ch01=ON, ch02=OFF, ch03=OFF, ...
```

### Visual Result:
- CH01 card should turn **green/ON**
- Other cards (CH02-CH06) should be **gray/OFF**
- Header should show: **"Active: CH01"**
- Update count should increment
- Last update time should update

## 🔍 Troubleshooting

### Issue: No messages received

**Check:**
1. Backend console - is MQTT connected?
2. Topic name - does `MQTT_TOPIC` in `.env` match what your device publishes?
3. Credentials - are username/password correct?
4. Network - can backend reach MQTT broker?

**Test:**
```bash
# Manually test MQTT subscription
cd backend
npm run test-mqtt
```

### Issue: Messages received but sensors don't update

**Check:**
1. Backend console - are all 6 sensors being processed?
2. Frontend console - are `LIVE UPDATE RECEIVED` messages appearing?
3. Sensor names - are they `ch01`-`ch06` (case-sensitive)?

**Verify sensor IDs:**
```sql
SELECT id, name FROM sensors WHERE name LIKE 'ch%' ORDER BY name;
```

### Issue: Only one sensor updates

**Check:**
1. Backend console - should show all 6 sensors being processed
2. All sensors should broadcast, even with value=0
3. Frontend should receive all 6 updates

If only ch01 updates, check:
- Are all 6 sensors in the `data` array?
- Are all sensor IDs correct (7-12)?
- Are all rooms joined in frontend?

## 📝 Quick Test

Before sending from real device, test with script:
```bash
cd backend
npm run test-mqtt
```

This publishes test messages in the same format. If this works, your real device should work too!

## ✅ Success Criteria

When working correctly:
- ✅ All 6 sensors process every message
- ✅ All 6 sensors broadcast to WebSocket (even with value=0)
- ✅ Frontend receives all 6 updates
- ✅ Only sensor with value=1 shows as active (green)
- ✅ Other sensors show as inactive (gray)
- ✅ Timeline updates if date matches selected date

