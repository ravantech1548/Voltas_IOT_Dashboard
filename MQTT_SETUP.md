# MQTT Setup Guide

## The Problem

You're seeing MQTT connection errors because the Mosquitto MQTT broker is not running. The server will continue to work without MQTT, but real-time sensor data ingestion will not function.

## Quick Solutions

### Option 1: Start Mosquitto (Recommended if you need MQTT)

#### Windows

**Using Services (if installed as service):**
1. Press `Win + R`, type `services.msc`, press Enter
2. Find "Mosquitto Broker" service
3. Right-click → Start

**Using Command Line:**
```bash
# If installed in default location
"C:\Program Files\mosquitto\mosquitto.exe" -c "C:\Program Files\mosquitto\mosquitto.conf"
```

**Or if it's in your PATH:**
```bash
mosquitto -c mosquitto.conf
```

#### Linux

```bash
sudo systemctl start mosquitto
# Or
sudo service mosquitto start
```

#### macOS

```bash
brew services start mosquitto
```

### Option 2: Disable MQTT (If you don't need it now)

If you don't need MQTT functionality right now, you can disable it:

1. Edit `backend/.env` file
2. Add this line:
   ```env
   MQTT_DISABLED=true
   ```
3. Restart your backend server

The server will start without trying to connect to MQTT, and you won't see the connection errors.

### Option 3: Install Mosquitto (If not installed)

#### Windows

1. Download from: https://mosquitto.org/download/
2. Run the installer
3. Mosquitto will be installed as a Windows service
4. Start the service from Services panel or use the command above

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto  # Start on boot
```

#### macOS

```bash
brew install mosquitto
brew services start mosquitto
```

## Verify MQTT is Running

**Test connection:**
```bash
# Subscribe to a test topic
mosquitto_sub -h localhost -t test

# In another terminal, publish a message
mosquitto_pub -h localhost -t test -m "Hello MQTT"
```

If you see "Hello MQTT" in the first terminal, MQTT is working!

## What Happens Without MQTT?

- ✅ The REST API will work normally
- ✅ The frontend dashboard will work
- ✅ You can manually add sensor data through the API
- ✅ Historical data queries will work
- ❌ Real-time sensor data ingestion from MQTT devices won't work
- ❌ Automatic sensor data updates via MQTT won't work

## After Starting Mosquitto

Once Mosquitto is running, restart your backend server. You should see:
```
✓ Connected to MQTT broker
Subscribed to MQTT topic pattern: client/+/dept/+/location/+/sensor/+
```

## Configuration

The MQTT broker URL is configured in `backend/.env`:

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=          # Optional
MQTT_PASSWORD=          # Optional
```

If your Mosquitto broker is running on a different host/port, update these values accordingly.


