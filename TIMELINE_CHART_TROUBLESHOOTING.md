# Timeline Chart Troubleshooting Guide

## Issue: "Shift 1 Sensor Activity Timeline" shows no data

### Possible Causes:

1. **No data in database for selected date**
2. **Timezone/date mismatch**
3. **Shift filtering removing all data**
4. **Sensors not configured correctly**

### Step 1: Check Database Data

Run this SQL query to check if data exists:

```sql
-- Check if data exists for today
SELECT 
    s.name AS sensor_name,
    COUNT(*) AS records_today,
    MIN(sd.timestamp) AS first_today,
    MAX(sd.timestamp) AS last_today
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
  AND DATE(sd.timestamp) = CURRENT_DATE
GROUP BY s.id, s.name
ORDER BY s.name;
```

**See `check-sensor-data-timeline.sql` for more diagnostic queries.**

### Step 2: Check Browser Console

Open browser DevTools (F12) and check Console tab for:

1. **Data fetching logs:**
   ```
   📅 Fetching timeline data for date: YYYY-MM-DD
   📊 Fetched X records for CH01
   ✅ Timeline array created with X points
   ```

2. **Chart processing logs:**
   ```
   📊 Processing X timeline points for bar chart
   📊 Timeline bar chart: X bars created
   ```

3. **Error messages:**
   - API errors
   - Data format issues
   - Missing sensors

### Step 3: Verify Date Selection

1. Check the selected date in the date picker
2. Ensure it matches the date you expect data for
3. The date should be in format: `YYYY-MM-DD` (e.g., `2026-01-03`)

### Step 4: Verify Shift Selection

1. Check which shift is selected in the dropdown
2. Verify the shift hours match your data timestamps
3. Example: If data is at 15:36:22, it should be within Shift hours

### Step 5: Check Shift Filtering

The chart filters data by shift hours. If your data timestamps don't match shift hours, they'll be filtered out.

**Check shift configuration:**
- Go to Settings → Shifts
- Verify Shift 1 hours (e.g., 08:00 - 16:00)
- Ensure your data timestamps fall within these hours

### Step 6: Verify Sensor Configuration

1. Go to Settings → Sensors
2. Verify all Switch sensors are:
   - Status: `active`
   - Sensor Type: `Switch`
   - Device ID and Channel Code configured correctly

### Step 7: Test with Different Date

1. Try selecting yesterday's date
2. Or a date where you know data exists
3. Check if the chart displays data

### Step 8: Check API Response

In browser DevTools → Network tab:

1. Look for API calls: `/api/data/sensor/{sensor_id}?start_time=...&end_time=...`
2. Check response status (should be 200)
3. Check response data - should contain array of records

### Quick Fixes:

#### Fix 1: Check if data exists for selected date
```sql
SELECT COUNT(*) 
FROM sensor_data 
WHERE DATE(timestamp) = '2026-01-03';  -- Change to your date
```

#### Fix 2: Check if shift filtering is too restrictive
- Try selecting "All Shifts (24 Hours)" instead of a specific shift
- If data appears, the shift hours might need adjustment

#### Fix 3: Verify sensors are active
```sql
SELECT name, status, sensor_type_id 
FROM sensors s
JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch';
```

#### Fix 4: Check complete snapshots
```sql
-- Verify all sensors are stored at same timestamp (complete snapshots)
SELECT 
    timestamp,
    COUNT(DISTINCT sensor_id) AS sensor_count
FROM sensor_data sd
INNER JOIN sensors s ON sd.sensor_id = s.id
INNER JOIN sensor_types st ON s.sensor_type_id = st.id
WHERE LOWER(st.name) = 'switch'
  AND DATE(timestamp) = CURRENT_DATE
GROUP BY timestamp
HAVING COUNT(DISTINCT sensor_id) >= 6
ORDER BY timestamp DESC;
```

### Recent Changes Made:

1. ✅ Fixed date parsing to use local date components (avoids timezone issues)
2. ✅ Added detailed logging for data fetching
3. ✅ Fixed chart rendering logic to show proper empty state
4. ✅ Added debug info in empty state message
5. ✅ Improved shift filtering logic

### Next Steps:

1. **Check browser console** for detailed logs
2. **Run SQL queries** from `check-sensor-data-timeline.sql` to verify data
3. **Verify date selection** matches data dates
4. **Check shift hours** match data timestamps
5. **Ensure sensors are configured** correctly in Settings

### Expected Console Output:

**When data is found:**
```
📅 Fetching timeline data for date: 2026-01-03
   Date range: 2026-01-03T00:00:00.000Z to 2026-01-03T23:59:59.999Z
📊 Fetched 15 records for CH01
📊 Fetched 15 records for CH02
...
✅ Timeline array created with 15 points
📊 Processing 15 timeline points for bar chart
📊 Timeline bar chart: 3 bars created
```

**When no data found:**
```
📅 Fetching timeline data for date: 2026-01-03
📊 Fetched 0 records for CH01
📊 Fetched 0 records for CH02
...
⚠️  No timeline data found for date 2026-01-03
📊 Timeline bar data: No data for date 2026-01-03, shift Shift 1
```

If you see "No timeline data found", the issue is that there's no data in the database for that date/shift combination.

