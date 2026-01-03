# WebSocket Disconnection Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Frequent Disconnections

**Symptoms:**
- WebSocket connects but disconnects immediately
- Frequent reconnect attempts
- Connection drops after a few seconds

**Possible Causes:**
1. **Network Issues**
   - Unstable internet connection
   - Firewall blocking WebSocket connections
   - Proxy interfering with WebSocket upgrade

2. **Server Issues**
   - Server restarting
   - Server overload
   - Timeout settings too short

3. **Client Issues**
   - Page navigation causing cleanup
   - Browser tab going to sleep
   - Browser restrictions

**Solutions:**

1. **Check Network Connectivity:**
   ```bash
   # Test if backend is accessible
   curl http://localhost:5000/health
   
   # Check WebSocket endpoint
   # Open browser console and check for connection errors
   ```

2. **Increase Timeout Settings:**
   - Backend: `pingTimeout` and `pingInterval` are set in `socketHandler.js`
   - Frontend: `timeout` is set in socket.io client configuration

3. **Check Browser Console:**
   - Look for WebSocket connection errors
   - Check for CORS errors
   - Verify authentication token is valid

### Issue 2: Connection Refused

**Symptoms:**
- `ECONNREFUSED` error
- Cannot connect to WebSocket server
- Connection error in console

**Possible Causes:**
1. Backend server not running
2. Wrong WebSocket URL
3. Port blocked by firewall
4. CORS configuration issue

**Solutions:**

1. **Verify Backend is Running:**
   ```bash
   cd backend
   npm run dev
   # Check for "Server running on port 5000"
   ```

2. **Check Environment Variables:**
   ```env
   # Frontend .env
   REACT_APP_WS_URL=http://localhost:5000
   
   # Backend .env
   FRONTEND_URL=http://localhost:3000
   PORT=5000
   ```

3. **Test Connection:**
   ```bash
   # Test HTTP endpoint first
   curl http://localhost:5000/health
   
   # Should return: {"status":"ok","timestamp":"..."}
   ```

### Issue 3: Authentication Errors

**Symptoms:**
- Connection established but immediately disconnected
- 401 Unauthorized errors
- Token expired messages

**Solutions:**

1. **Check Token:**
   ```javascript
   // In browser console
   console.log(localStorage.getItem('token'));
   ```

2. **Refresh Token:**
   - Logout and login again
   - Token may have expired (default: 7 days)

3. **Verify Backend Authentication:**
   - Check `socketHandler.js` authentication middleware
   - Ensure token is being passed in socket connection

### Issue 4: Room Join Failures

**Symptoms:**
- Connected but not receiving updates
- Messages not being broadcast to correct rooms
- Multiple clients not seeing each other's updates

**Solutions:**

1. **Check Room Names:**
   ```javascript
   // Room format should be: sensor_{sensor_id}
   // Example: sensor_1, sensor_2, etc.
   ```

2. **Verify Sensor IDs:**
   - Check that sensors exist in database
   - Ensure sensor IDs match between frontend and backend

3. **Check Backend Logs:**
   ```bash
   # Backend should log:
   # ✅ Client {socket_id} joined room: sensor_{id} ({count} total clients in room)
   ```

### Issue 5: Reconnection Loops

**Symptoms:**
- Continuous reconnection attempts
- High CPU usage
- Console spam with reconnect messages

**Solutions:**

1. **Check Reconnection Settings:**
   - Default: Infinite reconnection attempts
   - Delay: 1-5 seconds (exponential backoff)

2. **Limit Reconnection:**
   ```javascript
   // In socket.io client config
   reconnectionAttempts: 5, // Limit to 5 attempts
   ```

3. **Add Exponential Backoff:**
   - Already configured: `reconnectionDelay: 1000, reconnectionDelayMax: 5000`

## Debugging Steps

### Step 1: Enable Detailed Logging

**Frontend Console:**
- Check browser console for WebSocket events
- Look for connect, disconnect, reconnect messages
- Check for error messages

**Backend Console:**
- Check server logs for connection/disconnection events
- Verify room joins/leaves
- Check for authentication errors

### Step 2: Test Connection Manually

```javascript
// In browser console (on frontend page)
const io = require('socket.io-client'); // If available
// OR use browser's existing socket.io
const token = localStorage.getItem('token');
const socket = io('http://localhost:5000', {
  auth: { token },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
socket.on('connect_error', (error) => console.error('Error:', error));
```

### Step 3: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for WebSocket connection
4. Check for errors in the connection

### Step 4: Verify Server Configuration

```javascript
// Backend socketHandler.js should have:
pingTimeout: 60000,  // 60 seconds
pingInterval: 25000, // 25 seconds
```

### Step 5: Test with Different Transports

```javascript
// Try WebSocket only
transports: ['websocket']

// Try polling only
transports: ['polling']

// Try both (default - recommended)
transports: ['websocket', 'polling']
```

## Configuration Checklist

### Backend Configuration

- [ ] `socketHandler.js` has proper CORS configuration
- [ ] `pingTimeout` and `pingInterval` are set
- [ ] Authentication middleware is working
- [ ] Server is handling reconnections properly

### Frontend Configuration

- [ ] `REACT_APP_WS_URL` is set correctly
- [ ] Token is being passed in `auth` object
- [ ] Reconnection is enabled
- [ ] Room names are correct format

### Network Configuration

- [ ] Port 5000 is open (backend)
- [ ] Port 3000 is open (frontend)
- [ ] Firewall allows WebSocket connections
- [ ] No proxy interfering with connections

## Common Error Messages

### "WebSocket connection closed before the connection is established"

**Cause:** Server closed connection immediately  
**Solution:** Check authentication, CORS, or server logs

### "xhr poll error"

**Cause:** HTTP polling transport failed  
**Solution:** Check network connectivity or try WebSocket-only transport

### "timeout"

**Cause:** Connection timeout  
**Solution:** Increase timeout value or check network

### "transport unknown"

**Cause:** Transport type not supported  
**Solution:** Check transports array: `['websocket', 'polling']`

## Best Practices

1. **Always use reconnection:**
   ```javascript
   reconnection: true,
   reconnectionAttempts: Infinity
   ```

2. **Handle disconnect gracefully:**
   ```javascript
   socket.on('disconnect', (reason) => {
     if (reason === 'io server disconnect') {
       // Server disconnected, don't reconnect
     } else {
       // Client-side disconnect, will auto-reconnect
     }
   });
   ```

3. **Rejoin rooms on reconnect:**
   ```javascript
   socket.on('reconnect', () => {
     socket.emit('join_room', 'sensor_1');
   });
   ```

4. **Monitor connection status:**
   ```javascript
   socket.on('connect', () => setConnected(true));
   socket.on('disconnect', () => setConnected(false));
   ```

## Getting Help

If issues persist:

1. Check browser console for specific error messages
2. Check backend server logs
3. Verify environment variables
4. Test with curl/Postman for HTTP endpoints
5. Review recent code changes that might affect WebSocket

## Recent Improvements Made

The following improvements have been made to fix WebSocket disconnection issues:

1. **Backend (`socketHandler.js`):**
   - Added `pingTimeout: 60000` (60 seconds)
   - Added `pingInterval: 25000` (25 seconds)
   - Added error handling for connection errors
   - Added reconnection attempt logging

2. **Frontend (all socket connections):**
   - Added reconnection configuration
   - Added reconnection delay (1-5 seconds with exponential backoff)
   - Added infinite reconnection attempts
   - Added proper cleanup on component unmount
   - Added room rejoin on reconnection
   - Added detailed error logging

3. **Error Handling:**
   - Better error messages
   - Disconnect reason logging
   - Reconnection status tracking

