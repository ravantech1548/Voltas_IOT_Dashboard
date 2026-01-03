# Shift Timing Filtering Fixes

## Issues Fixed

### 1. Night Shift Timing in Time Series Chart
**Problem:** Night shift timing (overnight shifts like 22:00 - 06:00) was not being correctly filtered in the time series charts.

**Solution:** 
- Improved the `filterDataByShift` function to properly handle time string parsing
- Enhanced overnight shift detection and filtering logic
- Fixed data fetching to include the correct time range for overnight shifts

### 2. Dashboard Data Filtering Based on Shift Hours
**Problem:** Dashboard was fetching only last 1 hour of data regardless of shift timing.

**Solution:**
- Updated `fetchSensorData` to fetch data based on selected shift hours
- For overnight shifts, correctly calculates start time (yesterday's start time if currently in the morning portion)
- Increased data limit to 1000 to capture full shift periods
- Dashboard now fetches and displays data only for the selected shift period

## Technical Changes

### Dashboard.jsx

1. **Enhanced `fetchSensorData` function:**
   - Now accepts shift timing into account when fetching data
   - Calculates proper start time for overnight shifts
   - Fetches data for the entire shift period (not just last hour)
   - Increased limit from 100 to 1000 to capture full shift data

2. **Improved `filterDataByShift` function:**
   - Better time string parsing with error handling
   - Robust handling of both timestamp and time string formats
   - Improved overnight shift logic (includes times >= start OR <= end)

3. **Updated useEffect dependencies:**
   - `fetchSensorData` now re-runs when `selectedShift` changes
   - Ensures data is refetched when shift selection changes

### SwitchSensors.jsx

1. **Improved `filterDataByShift` function:**
   - Better error handling for time parsing
   - More robust filtering logic for overnight shifts
   - Proper handling of edge cases

## Overnight Shift Logic

For overnight shifts (e.g., 22:00 - 06:00):

**Data Fetching:**
- If current time is between 00:00-06:00: Fetch from yesterday 22:00 to now
- If current time is between 22:00-23:59: Fetch from today 22:00 to now

**Data Filtering:**
- Times >= 22:00 (start) are included
- Times <= 06:00 (end) are included
- Times between 06:01 and 21:59 are excluded

## Example Scenarios

### Scenario 1: Night Shift (22:00 - 06:00) at 02:00 AM
1. Current time: 02:00 (today)
2. Fetch data from: Yesterday 22:00 to today 02:00
3. Filter includes: All times from 22:00-23:59 and 00:00-02:00
4. Chart shows: Data for the night shift period

### Scenario 2: Night Shift (22:00 - 06:00) at 23:00
1. Current time: 23:00 (today)
2. Fetch data from: Today 22:00 to today 23:00
3. Filter includes: All times from 22:00-23:00
4. Chart shows: Data for the night shift period so far

### Scenario 3: Morning Shift (06:00 - 14:00) at 10:00
1. Current time: 10:00 (today)
2. Fetch data from: Today 06:00 to today 10:00
3. Filter includes: All times from 06:00-10:00
4. Chart shows: Data for the morning shift period so far

## Benefits

1. **Accurate Data Display:** Charts now show only data relevant to the selected shift
2. **Correct Overnight Handling:** Night shifts spanning midnight are properly handled
3. **Better Performance:** Only fetches data needed for the shift period
4. **Improved User Experience:** Operators see exactly the data for their shift hours
5. **Flexible for Admins:** Admins can view data for any shift period

## Testing Recommendations

1. Test with morning shift (06:00-14:00) - should show only that period
2. Test with afternoon shift (14:00-22:00) - should show only that period
3. Test with night shift (22:00-06:00) at different times:
   - At 23:00 (should show 22:00-23:00)
   - At 02:00 (should show 22:00-06:00 from yesterday and today)
   - At 05:00 (should show full shift period)
4. Test switching between shifts - data should update correctly
5. Test with "All Shifts" option - should show unfiltered data


