# Quick MQTT & Live Streaming Test

## 🚀 Quick Start (5 minutes)

### 1. Ensure Everything is Running

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Look for: `✓ Connected to MQTT broker` and `✓ Subscribed to MQTT topic`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
Open: http://localhost:3000 (login required)

**Terminal 3 - Test Publisher:**
```bash
cd backend
node src/scripts/testMqttPublish.js
```

### 2. Verify Reception

**Backend Console should show:**
```
📨 MQTT message received on topic: voltas
Processing device 00002 with 6 sensor readings
✓ Processed ch01 (s1) from device 00002: 1 at ...
✓ Processed ch02 (s2) from device 00002: 0 at ...
...
```

**Frontend - Dashboard:**
1. Go to Dashboard
2. Select sensor "ch01" from dropdown
3. Watch the chart - it should update in real-time every 5 seconds
4. Check browser DevTools Console for WebSocket messages

**Frontend - Switch Sensors:**
1. Go to Switch Sensors page
2. Watch sensor cards
3. Active sensor (green card) should rotate every 5 seconds

### 3. Test Checklist

- [ ] Backend shows "Connected to MQTT broker"
- [ ] Test script shows "Published message #X"
- [ ] Backend console shows "Processed ch01/ch02/etc"
- [ ] Frontend Dashboard chart updates live
- [ ] Frontend Switch Sensors cards update
- [ ] WebSocket connection in browser DevTools Network tab

## 🔍 Troubleshooting

**No MQTT messages received?**
- Check `.env` file has correct MQTT settings
- Verify broker URL uses `mqtts://` (not `mqtt://`)
- Check username/password are correct

**No WebSocket connection?**
- Ensure you're logged into frontend
- Check browser console for errors
- Verify `REACT_APP_WS_URL=http://localhost:5000` in frontend `.env`

**Sensors not found?**
```bash
cd backend
node src/scripts/seedInitialData.js
```

## 📊 Expected Behavior

1. **Test script publishes every 5 seconds**
2. **Each message rotates active sensor:** ch01 → ch02 → ch03 → ch04 → ch05 → ch06 → repeat
3. **Backend processes all 6 sensors** per message
4. **Frontend receives updates** via WebSocket
5. **Charts/cards update** in real-time

See `TEST_MQTT.md` for detailed testing instructions.

