# Debug Guide: Switch Sensors Not Showing Live Data

## Quick Diagnostic Checklist

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab. You should see:

**On Page Load:**
- `✅ Loaded X sensors: ch01, ch02, ...`
- `🔌 Initializing WebSocket connection...`
- `✅✅✅ WebSocket CONNECTED for Switch Sensors`
- `✅ Joining X sensor rooms...`
- `✅ Joined room: sensor_X (chXX)`

**When MQTT Data Arrives:**
- `🔴🔴🔴 LIVE UPDATE RECEIVED: {...}`
- `🔴 Updating sensors - Value: X, Is Active: true/false`
- `🔴 Setting sensor chXX to ACTIVE/INACTIVE`

### 2. Check Backend Console
You should see:
- `✓ Connected to MQTT broker`
- `✓ Subscribed to MQTT topic: voltas`
- `📨 MQTT message received on topic: voltas`
- `✓ Processed ch01 (s1) from device 00002: 1 at ...`

### 3. Verify WebSocket Connection
In browser DevTools → Network tab → WS filter:
- Should see a WebSocket connection to `ws://localhost:5000`
- Status should be "101 Switching Protocols"

### 4. Verify MQTT Messages Are Being Published
Run the test script:
```bash
cd backend
npm run test-mqtt
```

You should see messages like:
```
✓ Published message #1 - Active sensor: S1 (ch01)
```

## Common Issues & Solutions

### Issue 1: No WebSocket Connection
**Symptoms:** No "WebSocket CONNECTED" message in console

**Solutions:**
1. Check if you're logged in (token in localStorage)
2. Verify `REACT_APP_WS_URL` in frontend `.env` (or defaults to http://localhost:5000)
3. Check backend is running on port 5000
4. Check browser console for connection errors

### Issue 2: WebSocket Connected But No Messages
**Symptoms:** See "CONNECTED" but no "LIVE UPDATE RECEIVED"

**Solutions:**
1. Check backend console - are MQTT messages being received?
2. Verify sensors exist in database with correct IDs
3. Check backend is broadcasting: `io.to(\`sensor_${sensorId}\`).emit(...)`
4. Verify room names match: `sensor_${sensor.id}` in frontend matches backend

### Issue 3: Messages Received But Cards Not Updating
**Symptoms:** See "LIVE UPDATE RECEIVED" in console but cards don't change

**Solutions:**
1. Check console logs show "Setting sensor X to ACTIVE/INACTIVE"
2. Verify sensor IDs match: Check `data.sensor_id` matches sensor IDs
3. Check if `data.value === 1` for ON state
4. Verify React state is updating (check React DevTools)

### Issue 4: Date Mismatch
**Symptoms:** Timeline empty but cards might update

**Solutions:**
1. Make sure selected date matches today's date
2. Check console for "Date mismatch - not adding to timeline"
3. Timeline data is filtered by date, but cards should update regardless

### Issue 5: Sensors Not Found
**Symptoms:** Backend shows "Sensor chXX not found in database"

**Solutions:**
1. Run: `cd backend && npm run seed-initial`
2. Or check database: `SELECT id, name FROM sensors WHERE name LIKE 'ch%';`

## Step-by-Step Debug Process

1. **Open Browser Console** (F12)
2. **Navigate to Switch Sensors page**
3. **Check for these messages:**
   - [ ] "Loaded 6 sensors"
   - [ ] "WebSocket CONNECTED"
   - [ ] "Joined room" messages for all sensors
4. **Start MQTT test script** (`npm run test-mqtt`)
5. **Watch for:**
   - [ ] "LIVE UPDATE RECEIVED" messages
   - [ ] "Setting sensor X to ACTIVE" messages
   - [ ] Sensor cards visually updating

## Manual Test

In browser console, try:
```javascript
// Check sensors
console.log('Sensors:', window.__sensors || 'Not exposed');

// Check WebSocket
// Open Network tab → WS filter to see connection
```

## Expected Flow

1. Page loads → Sensors fetched from API
2. WebSocket connects → Joins sensor rooms
3. MQTT message arrives → Backend processes → Broadcasts via WebSocket
4. Frontend receives → Updates sensor state → Cards update visually
5. Timeline updates if date matches

If any step fails, check the corresponding logs above.

