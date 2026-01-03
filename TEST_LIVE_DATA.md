# Quick Test: Live Data Not Showing

## Current Status (from your console):
✅ WebSocket connected
✅ All 6 sensor rooms joined (sensor_7 through sensor_12)
❌ Latest sensor data: [] (empty)
❌ No active sensor found

## Step 1: Test WebSocket Broadcasting (Verify Frontend Works)

Test if the frontend can receive WebSocket messages:

```bash
cd backend
node src/scripts/testWebSocketBroadcast.js 7 1 ch01
```

**Expected Result:**
- Backend console: `📡📡📡 BROADCASTING to room "sensor_7" (1 clients)`
- Frontend console: `🔴🔴🔴 LIVE UPDATE RECEIVED`
- Frontend: CH01 card should turn green/ON

If this works → Frontend is fine, issue is with MQTT
If this doesn't work → WebSocket broadcasting issue

## Step 2: Check MQTT Connection

**Backend console should show:**
```
✓ Connected to MQTT broker
Using MQTT username: iot-sense
✓ Refreshed sensor cache: 6 sensors
✓ Subscribed to MQTT topic: voltas
```

If you DON'T see this → MQTT not connected

## Step 3: Test MQTT Message Publishing

```bash
cd backend
npm run test-mqtt
```

**Watch backend console for:**
```
📨 MQTT message received on topic: voltas
Processing device 00002 with 6 sensor readings
✓ Processed ch01 (s1) from device 00002: 1 at ...
📡📡📡 BROADCASTING to room "sensor_7" (1 clients)
```

**Watch frontend console for:**
```
🔴🔴🔴 LIVE UPDATE RECEIVED: {...}
🔴 Setting sensor ch01 to ACTIVE
```

## Step 4: Check Sensor Name Matching

The issue might be case sensitivity:
- Database has: `CH01` (uppercase)
- Code expects: `ch01` (lowercase)

**Check database:**
```sql
SELECT id, name FROM sensors WHERE name LIKE 'ch%' OR name LIKE 'CH%';
```

**If names are uppercase (CH01), update the mapping:**
The code should handle this, but verify the sensor names match.

## Step 5: Verify Data is Being Stored

```sql
SELECT 
  sd.id,
  s.name as sensor_name,
  sd.value,
  sd.timestamp
FROM sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
WHERE s.name IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
ORDER BY sd.timestamp DESC
LIMIT 10;
```

If this returns no rows → MQTT messages aren't being stored
If this returns rows → Data is stored but not being broadcast/displayed

## Common Issues:

### Issue: MQTT Connected but No Messages Received
**Check:**
1. Is test script actually publishing? (check test script console)
2. Is topic correct? (`voltas` in .env matches published topic)
3. Check MQTT broker logs (if available)

### Issue: Messages Received but Not Broadcast
**Check backend console for:**
- `📡📡📡 BROADCASTING` messages
- Client count in room (should be > 0)
- Any error messages

### Issue: Messages Broadcast but Frontend Not Receiving
**Check:**
1. Frontend console for `LIVE UPDATE RECEIVED`
2. Room names match: `sensor_7` in backend = `sensor_7` in frontend
3. WebSocket connection status (should show "Live")

## Quick Fixes:

1. **Restart backend** - Sometimes fixes connection issues
2. **Check .env file** - Verify MQTT settings
3. **Clear browser cache** - Sometimes fixes WebSocket issues
4. **Check sensor names** - Make sure they're lowercase in database or code handles both

## Next Steps:

Run the WebSocket test script first to verify frontend works:
```bash
node src/scripts/testWebSocketBroadcast.js 7 1 ch01
```

Then check if MQTT messages are being received by watching backend console when running `npm run test-mqtt`.

