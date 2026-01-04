# Timeout Settings Configuration Guide

## Overview
The application now supports configurable timeout settings for MQTT payload monitoring. These settings control when devices are marked as "Online" or "Offline" based on payload reception.

## Database Setup

First, run the migration to create the `system_settings` table:

```bash
# On Windows (PowerShell)
psql -U postgres -d your_database_name -f backend/migrations/add_system_settings_table.sql

# On Linux/Mac
psql -U postgres -d your_database_name -f backend/migrations/add_system_settings_table.sql
```

## Settings Available

### 1. Payload Timeout (minutes)
- **Default**: 5 minutes
- **Description**: Time in minutes without receiving a payload before a device is marked as offline
- **Recommendation**: Should be 2-3x your payload sending interval
  - If payloads send every 2 minutes → Set to 4-6 minutes
  - If payloads send every 1 minute → Set to 3-5 minutes
  - If payloads send every 30 seconds → Set to 2-3 minutes

### 2. Offline Check Interval (minutes)
- **Default**: 1 minute
- **Description**: How often the system checks for offline devices
- **Recommendation**: 
  - Lower values (0.5-1 minute) provide faster offline detection
  - Higher values (2-5 minutes) reduce server load
  - Should be less than Payload Timeout

### 3. Heartbeat Interval (minutes)
- **Default**: 1 minute
- **Description**: How often to insert heartbeat records when sensor values haven't changed (to maintain "Live" status)
- **Recommendation**: 
  - Should match or be less than Payload Timeout
  - Lower values ensure faster "Live" status detection
  - Higher values reduce database writes

## Configuring via Settings Page

1. Navigate to **Settings** page in the application
2. Click on the **System Settings** tab
3. The form will automatically open for editing
4. Update the values as needed:
   - **Payload Timeout**: Set based on your payload frequency
   - **Offline Check Interval**: How often to check (default 1 minute is fine)
   - **Heartbeat Interval**: How often to insert heartbeats (default 1 minute is fine)
5. Click **Update** to save

**Important**: Changes take effect immediately after saving!

## Example Configuration

### Scenario: Payload sends every 2 minutes

**Recommended Settings**:
- Payload Timeout: **3 minutes** (1.5x the payload interval for safety margin)
- Offline Check Interval: **1 minute** (checks once per minute)
- Heartbeat Interval: **2 minutes** (inserts heartbeat if no value change for 2 minutes)

This ensures:
- Device stays "Live" as long as payloads arrive every 2 minutes
- Device is marked "Offline" if no payload received for 3+ minutes
- System checks every minute for offline devices
- Heartbeat records are inserted every 2 minutes to maintain "Live" status

## Backend API

### Get All Settings
```
GET /api/settings
```

### Get Specific Setting
```
GET /api/settings/:key
```

### Update Single Setting
```
PUT /api/settings/:key
Body: { "setting_value": "3", "description": "..." }
```

### Update Multiple Settings (Recommended)
```
PUT /api/settings
Body: {
  "settings": {
    "payload_timeout_minutes": "3",
    "offline_check_interval_minutes": "1",
    "heartbeat_interval_minutes": "2"
  }
}
```

## Notes

- All timeout values are in **minutes** (can use decimals like `2.5` for 2 minutes 30 seconds)
- Minimum value: **0.5 minutes** (30 seconds)
- Maximum value: **60 minutes** (1 hour)
- Settings are reloaded automatically when updated via the API
- The MQTT handler will restart the offline check interval with new settings

## Troubleshooting

### Issue: Device shows offline immediately after payload
- **Solution**: Increase "Payload Timeout" to be greater than your payload sending interval

### Issue: Device stays online too long after payload stops
- **Solution**: Decrease "Payload Timeout" to detect offline faster

### Issue: Too many database writes
- **Solution**: Increase "Heartbeat Interval" to reduce frequency of heartbeat records

### Issue: Offline detection is slow
- **Solution**: Decrease "Offline Check Interval" (but this increases server load)

