# Shift Timing Controls for Switch Sensors and Dashboard

## Overview

Shift timing controls have been added to both the **Switch Sensors** page and the **Dashboard** page, allowing data to be filtered and displayed based on shift operating hours.

## Features Implemented

### 1. Switch Sensors Page (`/switch-sensors`)

**New Features:**
- ✅ Shift selector dropdown
- ✅ Automatic shift assignment for operators (locked to their assigned shift)
- ✅ Admin can select any shift or view all data (24 hours)
- ✅ Timeline data filtered by selected shift hours
- ✅ Summary metrics (durations, switch count) calculated based on filtered data
- ✅ Charts and visualizations update based on shift selection

**Behavior:**
- **Operators**: Automatically see data filtered by their assigned shift (dropdown is disabled/locked)
- **Admins**: Can select any active shift or "All Shifts" to view 24-hour data
- **Timeline Chart**: Shows only data points within the selected shift hours
- **Summary Cards**: Metrics reflect the filtered time period
- **Duration Distribution**: Pie chart shows distribution only for the selected shift period

### 2. Dashboard Page (`/dashboard`)

**New Features:**
- ✅ Shift selector dropdown next to sensor selector
- ✅ Automatic shift assignment for operators
- ✅ Sensor data filtered by selected shift hours
- ✅ Chart displays only data within shift time window
- ✅ Current value display reflects filtered data

**Behavior:**
- **Operators**: Automatically see sensor data filtered by their assigned shift (dropdown is disabled/locked)
- **Admins**: Can select any active shift or "All Shifts" to view last hour data
- **Line Chart**: Shows only data points within the selected shift hours
- **Real-time Updates**: WebSocket updates are filtered based on shift timing
- **Current Value**: Reflects the latest value from filtered data

## Technical Implementation

### Shift Filtering Logic

Both pages use a `filterDataByShift` helper function that:
1. Converts shift start/end times to minutes since midnight
2. Handles overnight shifts (e.g., 22:00 - 06:00) correctly
3. Filters data points based on their time matching the shift hours
4. Returns filtered dataset for display

**Overnight Shift Handling:**
- If end time <= start time, it's treated as an overnight shift
- Data points are valid if time >= start OR time <= end
- Example: 22:00 - 06:00 includes all times from 22:00 to 23:59 and 00:00 to 06:00

### User Role Behavior

**Operators:**
- Shift dropdown is automatically set to their assigned shift
- Dropdown is disabled (cannot change)
- Label shows "(Your Shift)" to indicate it's locked
- Data is automatically filtered to their shift hours

**Admins:**
- Shift dropdown is enabled (can select any shift)
- Defaults to first available shift on page load
- Can select "All Shifts" to view unfiltered data
- Can switch between shifts to view different time periods

### State Management

**New State Variables:**
- `shifts`: Array of active shifts fetched from API
- `selectedShiftId`: Currently selected shift ID
- `selectedShift`: Full shift object with start_time, end_time, etc.
- `filteredTimelineData` / `filteredSensorData`: Filtered datasets

**Effect Hooks:**
1. Fetch shifts on component mount
2. Set initial shift based on user role
3. Filter data when shift selection changes
4. Update charts and metrics when filtered data changes

## User Interface

### Shift Selector Dropdown

**Location:**
- Switch Sensors: Next to date selector (grid layout)
- Dashboard: Next to sensor selector (grid layout)

**Options:**
- "All Shifts (24 Hours)" / "All Shifts (Last Hour)": Show unfiltered data
- List of active shifts with format: "Shift Name (HH:mm - HH:mm)"
- Example: "Morning Shift (06:00 - 14:00)"

**Visual Indicators:**
- Disabled state (grayed out) for operators
- Help text showing selected shift or "all shifts" status
- Shift name and time range displayed below dropdown

### Chart Updates

**Switch Sensors:**
- Timeline chart title changes to include shift name
- Chart data updates to show only shift hours
- X-axis shows filtered time range
- All metrics recalculate based on filtered data

**Dashboard:**
- Chart title includes shift name when filtered
- Chart data updates to show only shift hours
- Current value reflects latest from filtered dataset

## API Integration

**Endpoints Used:**
- `GET /api/shifts` - Fetch all active shifts
- User context provides `user.shift_id` for operators

**Data Flow:**
1. Component mounts → Fetch shifts
2. User context provides role and shift_id
3. Set initial shift based on role
4. Fetch sensor/timeline data
5. Filter data based on selected shift
6. Display filtered data in charts

## Example Scenarios

### Scenario 1: Operator Viewing Switch Sensors
1. Operator logs in (assigned to "Morning Shift" 06:00-14:00)
2. Opens Switch Sensors page
3. Shift dropdown automatically set to "Morning Shift (06:00 - 14:00)"
4. Dropdown is disabled (locked)
5. Timeline shows only data from 06:00 to 14:00
6. Summary metrics calculated only for this 8-hour period

### Scenario 2: Admin Viewing Dashboard
1. Admin logs in
2. Opens Dashboard page
3. Shift dropdown defaults to first shift (e.g., "Morning Shift")
4. Admin can change to "Afternoon Shift" or "All Shifts"
5. Chart updates to show data for selected shift period
6. Can switch between shifts to compare different time periods

### Scenario 3: Night Shift (Overnight)
1. User assigned to "Night Shift" (22:00 - 06:00)
2. Timeline/chart shows data from 22:00 to 23:59 and 00:00 to 06:00
3. Data points at 21:00 and 07:00 are excluded
4. Overnight shift logic correctly handles midnight crossover

## Files Modified

**Frontend:**
- `frontend/src/pages/SwitchSensors.jsx`
  - Added shift selector UI
  - Added shift filtering logic
  - Updated chart data source
  - Added filtered state management

- `frontend/src/pages/Dashboard.jsx`
  - Added shift selector UI
  - Added shift filtering logic
  - Updated chart data source
  - Added filtered state management

## Benefits

1. **Operators**: See only relevant data for their shift, improving focus and reducing confusion
2. **Admins**: Can analyze data by shift periods, making it easier to identify patterns
3. **Performance**: Filtered datasets reduce data processing for charts
4. **Compliance**: Ensures operators only view data during their authorized shift hours
5. **Flexibility**: Admins can compare different shift periods for analysis

## Notes

- Shift filtering is done client-side (frontend filtering)
- Original unfiltered data is preserved (filtered data is a separate state)
- Shift selection persists during the session but resets on page refresh
- Only active shifts are shown in the dropdown
- If no shift is selected, all data is shown (24-hour view)
- Overnight shifts are properly handled with special logic


