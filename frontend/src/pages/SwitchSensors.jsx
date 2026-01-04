import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ReferenceArea } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const SwitchSensors = () => {
  const { user } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [activeSensorId, setActiveSensorId] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [filteredTimelineData, setFilteredTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [payloadReceived, setPayloadReceived] = useState(false); // Track if actual payload has been received
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [lastPayloadTime, setLastPayloadTime] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [payloadTimeoutMinutes, setPayloadTimeoutMinutes] = useState(5); // Configurable timeout from settings (default 5 minutes)
  const fetchingTimelineRef = useRef(false);
  const lastTimelineFetchRef = useRef({ date: null, sensorCount: 0 });

  // Initialize with 6 switch sensors (ch01-ch06)
  useEffect(() => {
    initializeSensors();
    fetchShifts();
    fetchSystemSettings();
  }, []);

  // Fetch system settings (timeout configuration)
  const fetchSystemSettings = async () => {
    try {
      const response = await api.get('/settings');
      const settings = response.data;
      if (settings.payload_timeout_minutes?.value) {
        const timeoutValue = parseFloat(settings.payload_timeout_minutes.value);
        if (!isNaN(timeoutValue) && timeoutValue > 0) {
          setPayloadTimeoutMinutes(timeoutValue);
          console.log(`✓ SwitchSensors: Loaded payload timeout: ${timeoutValue} minutes`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load system settings, using default timeout:', error.message);
    }
  };

  // Set initial shift based on user role
  useEffect(() => {
    if (shifts.length > 0 && user) {
      if (user.role === 'operator' && user.shift_id) {
        // Operator: use their assigned shift
        const userShift = shifts.find(s => s.id === user.shift_id);
        if (userShift) {
          setSelectedShiftId(user.shift_id);
          setSelectedShift(userShift);
        }
      } else if (user.role === 'admin' && shifts.length > 0) {
        // Admin: default to first shift, but can change
        setSelectedShiftId(shifts[0].id);
        setSelectedShift(shifts[0]);
      }
    }
  }, [shifts, user]);

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts');
      setShifts(response.data.filter(s => s.is_active));
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  // Helper function to filter data by shift hours
  const filterDataByShift = (data, shift) => {
    if (!shift || !shift.start_time || !shift.end_time) {
      console.log(`⚠️  filterDataByShift: No shift provided or missing times - returning all data`);
      return data;
    }

    const startTime = shift.start_time.slice(0, 5); // HH:mm
    const endTime = shift.end_time.slice(0, 5); // HH:mm

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight shifts (e.g., 22:00 - 06:00)
    const isOvernight = endMinutes <= startMinutes;

    console.log(`🔄 Filtering data by shift ${shift.name}: ${startTime} - ${endTime} (overnight: ${isOvernight})`);

    const filtered = data.filter(point => {
      // Use timestamp if available (more accurate), otherwise parse from point.time
      let pointMinutes;
      
      if (point.fullTimestamp) {
        // Use actual timestamp (preferred method)
        const time = new Date(point.fullTimestamp);
        pointMinutes = time.getHours() * 60 + time.getMinutes();
      } else if (point.timestamp) {
        // Use timestamp string
        const time = new Date(point.timestamp);
        pointMinutes = time.getHours() * 60 + time.getMinutes();
      } else if (point.time) {
      // Parse time from point.time (format: "HH:mm")
        const timeParts = point.time.split(':');
      if (timeParts.length < 2) return false; // Exclude if time parsing fails
      
      const hour = parseInt(timeParts[0], 10);
      const min = parseInt(timeParts[1] || '0', 10);
      
      if (isNaN(hour) || isNaN(min)) return false; // Exclude if time parsing fails
      
        pointMinutes = hour * 60 + min;
      } else {
        return false; // No time information available
      }

      if (isOvernight) {
        // Overnight shift: point is valid if >= start OR <= end
        // This includes times from start (e.g., 23:00) to end (e.g., 07:00) next day
        return pointMinutes >= startMinutes || pointMinutes <= endMinutes;
      } else {
        // Normal shift: point is valid if between start and end
        return pointMinutes >= startMinutes && pointMinutes <= endMinutes;
      }
    });

    console.log(`✅ Shift filter: ${filtered.length} of ${data.length} points match shift hours`);

    // For overnight shifts, sort so that start time comes first (22:00 before 00:00)
    if (isOvernight && filtered.length > 0) {
      return filtered.sort((a, b) => {
        // Use timestamp if available, otherwise parse from time string
        let minutesA, minutesB;
        
        if (a.fullTimestamp) {
          const timeA = new Date(a.fullTimestamp);
          minutesA = timeA.getHours() * 60 + timeA.getMinutes();
        } else if (a.timestamp) {
          const timeA = new Date(a.timestamp);
          minutesA = timeA.getHours() * 60 + timeA.getMinutes();
        } else {
        const [hourA, minA] = a.time.split(':').map(Number);
          minutesA = hourA * 60 + minA;
        }
        
        if (b.fullTimestamp) {
          const timeB = new Date(b.fullTimestamp);
          minutesB = timeB.getHours() * 60 + timeB.getMinutes();
        } else if (b.timestamp) {
          const timeB = new Date(b.timestamp);
          minutesB = timeB.getHours() * 60 + timeB.getMinutes();
        } else {
        const [hourB, minB] = b.time.split(':').map(Number);
          minutesB = hourB * 60 + minB;
        }
        
        // If both are in the "evening" part (>= start), sort normally
        if (minutesA >= startMinutes && minutesB >= startMinutes) {
          return minutesA - minutesB;
        }
        // If both are in the "morning" part (<= end), sort normally
        if (minutesA <= endMinutes && minutesB <= endMinutes) {
          return minutesA - minutesB;
        }
        // If A is in evening (>= start) and B is in morning (<= end), A comes first
        if (minutesA >= startMinutes && minutesB <= endMinutes) {
          return -1;
        }
        // If A is in morning (<= end) and B is in evening (>= start), B comes first
        if (minutesA <= endMinutes && minutesB >= startMinutes) {
          return 1;
        }
        return minutesA - minutesB;
      });
    }

    return filtered;
  };

  // Fetch timeline data when sensors are loaded or date changes
  useEffect(() => {
    console.log('📅 Selected date changed:', selectedDate);
    if (sensors.length > 0) {
      fetchTimelineDataForDate();
    } else {
      setTimelineData([]);
    }
  }, [selectedDate, sensors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch historical data for the selected date
  const fetchTimelineDataForDate = async () => {
    if (sensors.length === 0) return;

    fetchingTimelineRef.current = true;
    try {
      console.log(`📅 Fetching timeline data for date: ${selectedDate}`);
      
      // Use local date components to avoid timezone issues
      const dateParts = selectedDate.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(dateParts[2], 10);
      
      // Create dates in local timezone
      const startDate = new Date(year, month, day, 0, 0, 0, 0);
      const endDate = new Date(year, month, day, 23, 59, 59, 999);
      
      // Calculate timezone offset to ensure we fetch the correct UTC range
      // getTimezoneOffset() returns minutes difference: UTC - Local (negative if local is ahead)
      // Example: UTC+5:30 (IST) returns -330, meaning UTC is 330 minutes behind local
      // To convert local to UTC: UTC = Local - offset = Local - (-330) = Local + 330
      // So we SUBTRACT the negative offset (i.e., ADD it)
      const tzOffsetMinutes = startDate.getTimezoneOffset(); // e.g., -330 for UTC+5:30
      const tzOffsetMs = tzOffsetMinutes * 60000;
      const startDateUTC = new Date(startDate.getTime() - tzOffsetMs); // Subtract negative = add
      const endDateUTC = new Date(endDate.getTime() - tzOffsetMs);
      
      console.log(`📅 Fetching timeline data for date: ${selectedDate}`);
      console.log(`   Local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
      console.log(`   Timezone offset: ${tzOffsetMinutes} minutes (UTC ${tzOffsetMinutes < 0 ? '+' : ''}${(tzOffsetMinutes / -60).toFixed(1)})`);
      console.log(`   Local date range: ${startDate.toLocaleString()} to ${endDate.toLocaleString()}`);
      console.log(`   UTC date range (for DB query): ${startDateUTC.toISOString()} to ${endDateUTC.toISOString()}`);
      console.log(`   This ensures all records for the selected LOCAL date are fetched`);

      // Fetch data for all sensors using UTC-adjusted dates
      // This ensures we get all records for the selected local date regardless of timezone
      const allDataPromises = sensors.map(sensor =>
        api.get(`/data/sensor/${sensor.id}`, {
          params: {
            start_time: startDateUTC.toISOString(),
            end_time: endDateUTC.toISOString(),
            limit: 10000
          }
        }).catch(err => {
          console.error(`Error fetching data for ${sensor.name}:`, err);
          return { data: [] };
        })
      );

      const allResponses = await Promise.all(allDataPromises);
      
      // Combine all sensor data into timeline format
      const dataMap = new Map();

      let totalRecords = 0;
      sensors.forEach((sensor, sensorIndex) => {
        const sensorData = allResponses[sensorIndex].data || [];
        console.log(`📊 Fetched ${sensorData.length} records for ${sensor.name}`);
        totalRecords += sensorData.length;
        
        sensorData.forEach(item => {
          // Parse timestamp - database stores in UTC, convert to local timezone for display
          const time = new Date(item.timestamp);
          
          // Verify the timestamp falls within the selected date in LOCAL timezone
          // This ensures we only process records for the correct local date
          const localYear = time.getFullYear();
          const localMonth = time.getMonth() + 1;
          const localDay = time.getDate();
          const selectedYear = parseInt(dateParts[0], 10);
          const selectedMonth = parseInt(dateParts[1], 10);
          const selectedDay = parseInt(dateParts[2], 10);
          
          // Only process if the record's local date matches the selected date
          if (localYear !== selectedYear || localMonth !== selectedMonth || localDay !== selectedDay) {
            // This record is from a different date in local timezone - skip it
            return;
          }
          
          // Use actual timestamp with seconds precision to preserve all database records
          // Round to nearest 10 seconds to group very close timestamps (within same second)
          const roundedSeconds = Math.floor(time.getSeconds() / 10) * 10;
          const timeKey = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(roundedSeconds).padStart(2, '0')}`;
          
          if (!dataMap.has(timeKey)) {
            dataMap.set(timeKey, {
              time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
              timestamp: time.toISOString(),
              fullTimestamp: time // Store as Date object for accurate time calculations in local timezone
            });
            // Initialize all sensors to 0 - use nameLower for data keys
            sensors.forEach(s => {
              const keyName = s.nameLower || s.name.toLowerCase();
              dataMap.get(timeKey)[keyName] = 0;
            });
          }
          
          const point = dataMap.get(timeKey);
          // Use nameLower for data keys to ensure consistency
          const keyName = sensor.nameLower || sensor.name.toLowerCase();
          // Keep the latest value if multiple records exist at same time
          const newValue = parseFloat(item.value);
          const pointTime = point.fullTimestamp ? new Date(point.fullTimestamp) : new Date(point.timestamp);
          if (point[keyName] === 0 || time > pointTime) {
            point[keyName] = newValue;
            point.timestamp = time.toISOString(); // Update to latest timestamp
            point.fullTimestamp = time; // Store as Date object in local timezone context
          }
        });
      });
      
      console.log(`📊 Total database records processed: ${totalRecords}`);
      console.log(`📊 Total timeline points created: ${dataMap.size}`);

      // Convert map to array and sort by timestamp (preserves all records)
      const timelineArray = Array.from(dataMap.values()).sort((a, b) => {
        const timeA = a.fullTimestamp ? new Date(a.fullTimestamp) : new Date(a.timestamp);
        const timeB = b.fullTimestamp ? new Date(b.fullTimestamp) : new Date(b.timestamp);
        return timeA - timeB;
      });

      console.log(`✅ Timeline array created with ${timelineArray.length} points`);
      
      if (timelineArray.length === 0) {
        console.warn(`⚠️  No timeline data found for date ${selectedDate}. Check:`);
        console.warn(`   1. Database has records for this date (check UTC date range: ${startDateUTC.toISOString()} to ${endDateUTC.toISOString()})`);
        console.warn(`   2. Sensors are configured correctly`);
        console.warn(`   3. Date format is correct: ${selectedDate}`);
        console.warn(`   4. Timezone: Local timezone is ${Intl.DateTimeFormat().resolvedOptions().timeZone}, offset: ${tzOffsetMinutes} minutes`);
        console.warn(`   5. Total records fetched: ${totalRecords} (before date filtering)`);
      } else {
        console.log(`📊 Sample timeline points:`, timelineArray.slice(0, 5).map(p => ({
          time: p.time,
          timestamp: p.timestamp,
          sensors: sensors.map(s => {
            const key = s.nameLower || s.name.toLowerCase();
            return `${s.name}:${p[key] || 0}`;
          }).join(', ')
        })));
      }
      
      setTimelineData(timelineArray);
      
      // Cache the fetch parameters
      lastTimelineFetchRef.current = {
        date: selectedDate,
        sensorCount: sensors.length
      };

      // Update active sensor based on latest data
      if (timelineArray.length > 0) {
        const latestPoint = timelineArray[timelineArray.length - 1];
        // Find active sensor by checking nameLower keys in timeline data
        const activeSensor = sensors.find(s => {
          const keyName = s.nameLower || s.name.toLowerCase();
          return latestPoint[keyName] === 1 || latestPoint[s.name] === 1;
        });
        if (activeSensor) {
          setActiveSensorId(activeSensor.id);
          setSensors(prevSensors => 
            prevSensors.map(s => ({
              ...s,
              isActive: s.id === activeSensor.id
            }))
          );
        }
      }
    } catch (error) {
      console.error('❌ Error fetching timeline data:', error);
      setTimelineData([]);
    } finally {
      fetchingTimelineRef.current = false;
    }
  };

  // Filter timeline data based on selected shift
  useEffect(() => {
    console.log(`🔄 Filtering timeline data for shift: ${selectedShift ? selectedShift.name : 'None'}`);
    console.log(`   Total timeline data points: ${timelineData.length}`);
    
    if (timelineData.length > 0 && selectedShift) {
      const filtered = filterDataByShift(timelineData, selectedShift);
      console.log(`   Filtered data points: ${filtered.length}`);
      console.log(`   Filtered data sample:`, filtered.slice(0, 3).map(p => ({
        time: p.time,
        timestamp: p.timestamp,
        sensors: sensors.map(s => {
          const key = s.nameLower || s.name.toLowerCase();
          return `${s.name}:${p[key] || 0}`;
        }).join(', ')
      })));
      setFilteredTimelineData(filtered);
    } else {
      console.log(`   No shift selected or no timeline data - using all data`);
      setFilteredTimelineData(timelineData);
    }
  }, [timelineData, selectedShift, sensors]);

  const initializeSensors = async () => {
    try {
      // Fetch all sensors
      const response = await api.get('/sensors');
      const allSensors = response.data;

      // Filter for Switch type sensors dynamically based on database configuration
      // Shows all active Switch sensors configured in Settings
      // Preserve original case from database as configured in Settings
      const switchSensors = allSensors
        .filter(s => {
          // Filter by sensor type = 'Switch' (case-insensitive)
          const sensorType = s.sensor_type?.toLowerCase() || '';
          return sensorType === 'switch' && s.status === 'active';
        })
        .sort((a, b) => {
          // Sort by name for consistent ordering
          return (a.name || '').localeCompare(b.name || '');
        })
        .map(s => ({
          id: s.id,
          name: s.name, // Use original name from database (preserve case: CH01, ch01, etc.)
          nameLower: s.name.toLowerCase(), // Keep lowercase version for matching/processing
          location: s.location_name || 'Unknown',
          type: s.sensor_type || 'Switch',
          isActive: false
        }));

      console.log('📋 Processed switch sensors:', switchSensors.map(s => ({ id: s.id, name: s.name })));

      // REMOVED: No longer creating dummy sensor cards
      // Only show real sensors from the database

          // REMOVED: No longer setting default active sensor
      // All sensors start as inactive when there's no real data
      setActiveSensorId(null);
        switchSensors.forEach(s => {
        s.isActive = false;
        });

      setSensors(switchSensors);
      setLoading(false);
      
      console.log(`✅ Loaded ${switchSensors.length} sensors:`, switchSensors.map(s => s.name));
      
      // Fetch latest sensor data to determine current active sensor
      fetchLatestSensorData(switchSensors);
    } catch (error) {
      console.error('Error fetching sensors:', error);
      // REMOVED: No longer using dummy data on API failure
      // Just set empty sensors array
      setSensors([]);
      setActiveSensorId(null);
      setLoading(false);
    }
  };

  // Fetch latest sensor data to determine current active sensor and check if payloads are being received
  const fetchLatestSensorDataRef = useRef(false); // Prevent duplicate calls
  const lastFetchTimeRef = useRef(0); // Track last fetch time for debouncing
  
  const fetchLatestSensorData = async (sensorList) => {
    if (sensorList.length === 0) return;
    
    // Debounce: Don't fetch if we fetched within the last 10 seconds
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 10000) {
      console.log('📡 Debouncing fetchLatestSensorData - last fetch was less than 10 seconds ago');
      return;
    }
    
    // Prevent duplicate simultaneous calls
    if (fetchLatestSensorDataRef.current) {
      console.log('📡 Already fetching latest sensor data, skipping duplicate request');
      return;
    }
    
    fetchLatestSensorDataRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      const sensorIds = sensorList.map(s => s.id).join(',');
      console.log(`📡 Fetching latest data for sensors: ${sensorIds}`);
      const response = await api.get(`/data/latest?sensor_ids=${sensorIds}`);
      console.log('📡 Latest sensor data received:', response.data);
      
      // Check if any recent data exists (within configured timeout) to determine if system is "Live"
      const timeoutMs = payloadTimeoutMinutes * 60 * 1000;
      const timeoutAgo = new Date(Date.now() - timeoutMs);
      let hasRecentLiveData = false;
      let latestLiveDataTime = null;
      let hasRecentOfflineData = false;
      let latestOfflineDataTime = null;
      let latestDataTime = null;
      
      if (response.data && response.data.length > 0) {
        response.data.forEach(d => {
          if (d.timestamp) {
            const dataTime = new Date(d.timestamp);
            const isRecent = dataTime >= timeoutAgo;
            
            if (isRecent) {
              // Track the latest data time regardless of status
              if (!latestDataTime || dataTime > latestDataTime) {
                latestDataTime = dataTime;
              }
              
              // Check data_status to determine if it's live or offline
              if (d.data_status === 'live') {
                hasRecentLiveData = true;
                if (!latestLiveDataTime || dataTime > latestLiveDataTime) {
                  latestLiveDataTime = dataTime;
                }
              } else if (d.data_status === 'offline') {
                hasRecentOfflineData = true;
                if (!latestOfflineDataTime || dataTime > latestOfflineDataTime) {
                  latestOfflineDataTime = dataTime;
                }
              }
            }
          }
        });
      }
      
      // Set payloadReceived based on data_status: true only if we have recent LIVE data
      // If we only have offline data or no recent data, set to false
      if (hasRecentLiveData && latestLiveDataTime) {
        setPayloadReceived(true);
        setLastPayloadTime(latestLiveDataTime);
        console.log('✅ Recent live payload data found - marking as Live');
        
        // Only set active sensor states if we have recent live data
        const activeSensorData = response.data.find(d => {
          if (!d.timestamp) return false;
          const dataTime = new Date(d.timestamp);
          if (dataTime < timeoutAgo) return false; // Ignore old data
          if (d.data_status !== 'live') return false; // Only consider live data
          
          const value = parseFloat(d.value);
          return value === 1 || value === "1" || d.value === 1 || d.value === "1";
        });
        
        if (activeSensorData) {
          const activeSensor = sensorList.find(s => s.id === activeSensorData.sensor_id);
          if (activeSensor) {
            setActiveSensorId(activeSensor.id);
            setSensors(prevSensors => 
              prevSensors.map(s => ({
                ...s,
                isActive: s.id === activeSensor.id
              }))
            );
          }
        } else {
          // No active sensor in recent data
          setActiveSensorId(null);
          setSensors(prevSensors => 
            prevSensors.map(s => ({
              ...s,
              isActive: false
            }))
          );
        }
      } else {
        // No recent live data - set to Offline and reset all sensors to inactive
        setPayloadReceived(false);
        
        // If we have recent offline data, show its timestamp; otherwise null
        if (hasRecentOfflineData && latestOfflineDataTime) {
          setLastPayloadTime(latestOfflineDataTime);
          console.log('⚠️ Recent offline data detected - marking as Offline and resetting sensors');
        } else {
          setLastPayloadTime(null);
          console.log('⚠️ No recent payload data found - marking as Offline and resetting sensors');
        }
        
        setActiveSensorId(null);
        setSensors(prevSensors => 
          prevSensors.map(s => ({
            ...s,
            isActive: false,
            value: 0 // Ensure value is 0 (OFF state)
          }))
        );
      }
      
      // Log detailed data for debugging
      if (response.data && response.data.length > 0) {
        console.log('📡 Latest data details:');
        response.data.forEach(d => {
          const dataTime = d.timestamp ? new Date(d.timestamp) : null;
          const isRecent = dataTime && dataTime >= timeoutAgo;
          const status = d.data_status || 'unknown';
          console.log(`   - Sensor ID: ${d.sensor_id}, Value: ${d.value}, Status: ${status}, Timestamp: ${d.timestamp} ${isRecent ? '(RECENT)' : '(OLD)'}`);
        });
      } else {
        console.log('⚠️  Latest sensor data array is empty - no data in database yet');
      }
    } catch (error) {
      console.error('❌ Error fetching latest sensor data:', error);
      console.error('  Full error:', error.response || error.message);
    } finally {
      fetchLatestSensorDataRef.current = false;
    }
  };

  // WebSocket connection for live updates
  const socketRef = useRef(null);
  const sensorsRef = useRef(sensors);
  const isConnectingRef = useRef(false);
  const sensorIdsRef = useRef(''); // Track sensor IDs to detect actual changes
  
  // Update ref when sensors change
  useEffect(() => {
    sensorsRef.current = sensors;
  }, [sensors]);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    
    // Create stable sensor IDs string for comparison
    const currentSensorIds = sensors.map(s => s.id).sort().join(',');
    
    // If sensor IDs haven't changed and socket is already connected, skip
    if (sensorIdsRef.current === currentSensorIds && socketRef.current?.connected) {
      return;
    }
    
    // Prevent duplicate connections
    if (isConnectingRef.current || (socketRef.current && socketRef.current.connected)) {
      console.log('🔌 WebSocket already connected or connecting, skipping...');
      return;
    }
    
    console.log('🔌 Initializing WebSocket connection...');
    console.log('  - WS URL:', wsUrl);
    console.log('  - Token exists:', !!token);
    console.log('  - Sensors count:', sensors.length);
    console.log('  - Sensor IDs:', currentSensorIds);
    
    if (!token) {
      console.error('❌ No authentication token found - WebSocket connection aborted');
      return;
    }
    
    if (sensors.length === 0) {
      // Clean up if no sensors
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      sensorIdsRef.current = '';
      return;
    }

    // Clean up existing connection only if sensor IDs actually changed
    if (socketRef.current && sensorIdsRef.current !== currentSensorIds && sensorIdsRef.current !== '') {
      console.log('🔌 Sensor IDs changed, cleaning up old connection...');
      console.log('   Old IDs:', sensorIdsRef.current);
      console.log('   New IDs:', currentSensorIds);
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    sensorIdsRef.current = currentSensorIds;

    // Connect to WebSocket
    console.log('🔌 Connecting to WebSocket...');
    const socketInstance = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 1000, // Start with 1 second delay
      reconnectionDelayMax: 5000, // Maximum 5 seconds delay
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000, // Connection timeout (20 seconds)
      // Force new connection
      forceNew: true, // Changed to true to avoid connection reuse issues
      // Upgrade from polling to websocket
      upgrade: true,
      // Add ping/pong settings for better connection stability
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000 // 25 seconds
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('✅✅✅ WebSocket CONNECTED for Switch Sensors');
      setWsConnected(true);
      isConnectingRef.current = false;
      // Join all sensor rooms
      const currentSensors = sensorsRef.current;
      console.log(`✅ Joining ${currentSensors.length} sensor rooms...`);
      currentSensors.forEach(sensor => {
        socketInstance.emit('join_room', `sensor_${sensor.id}`);
        console.log(`✅ Joined room: sensor_${sensor.id} (${sensor.name})`);
      });
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('❌❌❌ WebSocket CONNECTION ERROR:', error);
      console.error('   Error details:', {
        message: error.message,
        type: error.type,
        description: error.description
      });
      setWsConnected(false);
      isConnectingRef.current = false;
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄✅ WebSocket RECONNECTED after ${attemptNumber} attempts`);
      setWsConnected(true);
      // Rejoin all sensor rooms after reconnection
      const currentSensors = sensorsRef.current;
      console.log(`✅ Rejoining ${currentSensors.length} sensor rooms after reconnect...`);
      currentSensors.forEach(sensor => {
        socketInstance.emit('join_room', `sensor_${sensor.id}`);
        console.log(`✅ Rejoined room: sensor_${sensor.id} (${sensor.name})`);
      });
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
      setWsConnected(false);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌❌❌ WebSocket reconnection FAILED - giving up');
      setWsConnected(false);
    });

    // Listen for sensor updates
    socketInstance.on('sensor_update', (data) => {
      console.log('🔴🔴🔴 LIVE UPDATE RECEIVED:', data);
      console.log('  - Sensor ID:', data.sensor_id);
      console.log('  - Sensor Name:', data.sensor_name);
      console.log('  - Value:', data.value);
      console.log('  - Timestamp:', data.timestamp);
      console.log('  - Data Status:', data.data_status || 'live (default)');
      console.log('  - Full data object:', JSON.stringify(data, null, 2));
      
      // Check data_status from WebSocket message - only mark as Live if data_status is 'live'
      const isLiveData = data.data_status === 'live' || !data.data_status; // Default to 'live' if not specified (backward compatibility)
      
      // Create now variable before if/else so it's accessible for status indicators
      const now = new Date();
      
      if (isLiveData) {
        // Mark that actual payload has been received (only for live data)
        setPayloadReceived(true);
        setLastPayloadTime(now);
      } else {
        // If data_status is 'offline', mark as offline
        console.log('⚠️ SwitchSensors: Received offline status from WebSocket');
        setPayloadReceived(false);
        setLastPayloadTime(now);
      }
      
      // Update status indicators
      setLastUpdateTime(now.toLocaleTimeString());
      setUpdateCount(prev => prev + 1);
      
      // Force a visual update indicator
      console.log('🎨 Updating UI with new sensor data...');
      
      // Update sensor active state based on value - STATE IS RETAINED until explicitly updated
      if (data.sensor_id && data.sensor_name) {
        const sensorValue = parseFloat(data.value);
        const isActive = sensorValue === 1;
        
        console.log(`🔴 Processing update for sensor_id=${data.sensor_id}, sensor_name=${data.sensor_name}, value=${sensorValue}, isActive=${isActive}`);
        
        setSensors(prevSensors => {
          // First, determine which sensor is turning ON (if any)
          const sensorTurningOn = isActive ? data.sensor_id : null;
          
          const updated = prevSensors.map(sensor => {
            // Update the sensor that received the message - this is the new state from payload
            if (sensor.id === data.sensor_id) {
              console.log(`🔴 ✅ Updating ${sensor.name} (ID: ${sensor.id}) to ${isActive ? 'ACTIVE' : 'INACTIVE'} - State retained until next payload`);
              return {
                ...sensor,
                isActive: isActive
              };
            } 
            // If a sensor is turning ON, all others must be OFF (mutually exclusive)
            // This ensures only one sensor can be active at a time
            else if (sensorTurningOn && sensor.isActive) {
              console.log(`🔴 ⚠️  Setting ${sensor.name} (ID: ${sensor.id}) to INACTIVE (mutually exclusive - ${data.sensor_name} is now ON)`);
              return {
                ...sensor,
                isActive: false
              };
            }
            // Keep other sensors in their current state - they retain their value until explicitly updated
            // This is important: if s1 was ON, it stays ON until the next payload sets it to 0
            return sensor;
          });
          
          const activeSensors = updated.filter(s => s.isActive);
          console.log(`🔴 Final state - Active sensors: ${activeSensors.length > 0 ? activeSensors.map(s => s.name).join(', ') : 'None'}`);
          console.log(`🔴 All sensors state:`, updated.map(s => `${s.name}=${s.isActive ? 'ON' : 'OFF'}`).join(', '));
          console.log(`🔴 State retention: Each sensor maintains its state until next payload updates it`);
          
          // Update activeSensorId based on the final updated state
          // This ensures state is retained correctly - sensor stays ON until next payload changes it
          if (activeSensors.length > 0) {
            const newActiveId = activeSensors[0].id;
            if (newActiveId !== activeSensorId) {
              console.log(`🔴 Setting activeSensorId to ${newActiveId} (${activeSensors[0].name}) - will retain until next payload`);
              setActiveSensorId(newActiveId);
            }
          } else {
            // No active sensors - only clear if it was set
            if (activeSensorId !== null) {
              console.log('🔴 All sensors OFF - clearing activeSensorId');
              setActiveSensorId(null);
            }
          }
          
          return updated;
        });

        // Update timeline data with new point
        const time = new Date(data.timestamp);
        
        // Convert timestamp to local date string for comparison (YYYY-MM-DD format)
        // This handles timezone correctly by using local date components
        const year = time.getFullYear();
        const month = String(time.getMonth() + 1).padStart(2, '0');
        const day = String(time.getDate()).padStart(2, '0');
        const localDateStr = `${year}-${month}-${day}`;
        
        console.log('🔴 Date comparison:');
        console.log('  - Timestamp received:', data.timestamp);
        console.log('  - Parsed date object:', time.toString());
        console.log('  - Local date string:', localDateStr);
        console.log('  - Selected date:', selectedDate);
        console.log('  - Match?', localDateStr === selectedDate);
        
        // Only add if it's for the selected date (compare in local timezone)
        if (localDateStr === selectedDate) {
          console.log('🔴 ✅ Date matches! Adding to timeline for', data.sensor_name);
          setTimelineData(prevData => {
            const newPoint = {
              timestamp: data.timestamp
            };

            // Initialize all sensors to 0 - use nameLower for data keys to match timeline format
            sensorsRef.current.forEach(s => {
              const keyName = s.nameLower || s.name.toLowerCase();
              newPoint[keyName] = 0;
            });

            // Set the active sensor to 1 - match by case-insensitive name
            if (data.sensor_name) {
              const sensorNameLower = data.sensor_name.toLowerCase();
              // Find matching sensor
              const matchingSensor = sensorsRef.current.find(s => {
                const sNameLower = s.nameLower || s.name.toLowerCase();
                return sNameLower === sensorNameLower;
              });
              
              if (matchingSensor) {
                const keyName = matchingSensor.nameLower || matchingSensor.name.toLowerCase();
                newPoint[keyName] = parseFloat(data.value);
              }
            }

            // Check if we already have data for this time slot (15-minute intervals)
            // Use local time for display (the time variable is already in local timezone)
            const roundedMinutes = Math.floor(time.getMinutes() / 15) * 15;
            const hours = time.getHours();
            const timeKey = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
            newPoint.time = timeKey;
            
            console.log('🔴 Adding timeline point:');
            console.log('  - Time key:', timeKey);
            console.log('  - Sensor:', data.sensor_name);
            console.log('  - Value:', data.value);
            console.log('  - All sensor values:', Object.keys(newPoint).filter(k => k !== 'time' && k !== 'timestamp').map(k => `${k}:${newPoint[k]}`).join(', '));
            
            const existingIndex = prevData.findIndex(p => p.time === timeKey);
            
            if (existingIndex >= 0) {
              // Update existing point
              console.log('🔴 Updating existing point at', timeKey);
              const updated = [...prevData];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...newPoint
              };
              return updated;
            } else {
              // Add new point
              console.log('🔴 Adding new point at', timeKey);
              return [...prevData, newPoint].sort((a, b) => {
                const [hA, mA] = a.time.split(':').map(Number);
                const [hB, mB] = b.time.split(':').map(Number);
                return (hA * 60 + mA) - (hB * 60 + mB);
              });
            }
          });
        } else {
          console.log('🔴 ❌ Date mismatch - not adding to timeline');
        }
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`❌ WebSocket DISCONNECTED. Reason: ${reason}`);
      console.log(`   Will attempt to reconnect: ${reason === 'io server disconnect' ? 'No (server disconnected)' : 'Yes'}`);
      setWsConnected(false);
      isConnectingRef.current = false;
      
      // If server disconnected us, don't try to reconnect automatically
      if (reason === 'io server disconnect') {
        console.log('⚠️  Server disconnected client - manual reconnection may be required');
      }
    });

    // Handle socket errors
    socketInstance.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    return () => {
      isConnectingRef.current = false;
      
      if (socketInstance) {
        // Only cleanup if this is a real unmount, not just a dependency change
        if (socketRef.current === socketInstance) {
          console.log('🔌 Cleaning up WebSocket connection...');
          
          // Remove all event listeners to prevent memory leaks
          socketInstance.removeAllListeners();
          
          // Leave all rooms
          sensorsRef.current.forEach(sensor => {
            try {
              socketInstance.emit('leave_room', `sensor_${sensor.id}`);
            } catch (e) {
              console.warn('⚠️  Error leaving room:', e);
            }
          });
          
          // Disconnect if still connected
          if (socketInstance.connected) {
            socketInstance.disconnect();
          }
          
          socketRef.current = null;
        }
      }
    };
  }, [sensors.map(s => s.id).join(',')]); // Only depend on sensor IDs, not array reference

  // Periodic check for offline state - if no payload received within timeout, mark as offline
  useEffect(() => {
    const OFFLINE_TIMEOUT_MS = payloadTimeoutMinutes * 60 * 1000; // Use configurable timeout
    
    const checkOfflineStatus = () => {
      if (payloadReceived && lastPayloadTime) {
        const timeSinceLastPayload = Date.now() - lastPayloadTime.getTime();
        
        if (timeSinceLastPayload > OFFLINE_TIMEOUT_MS) {
          console.log(`⚠️  No payload received for ${Math.round(timeSinceLastPayload / 1000 / 60)} minutes - marking as OFFLINE`);
          console.log('   Setting all sensors to OFF state');
          
          // Mark as offline
          setPayloadReceived(false);
          
          // Reset all sensors to inactive
          setActiveSensorId(null);
    setSensors(prevSensors => 
            prevSensors.map(s => ({
              ...s,
              isActive: false
      }))
    );
          
          console.log('✅ All sensors reset to OFF - system marked as Offline');
        }
      } else if (payloadReceived && !lastPayloadTime) {
        // If payloadReceived is true but no lastPayloadTime, reset it
        console.log('⚠️  payloadReceived is true but no lastPayloadTime - resetting to offline');
        setPayloadReceived(false);
      }
    };
    
    // Check immediately
    checkOfflineStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkOfflineStatus, 30 * 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [payloadReceived, lastPayloadTime, payloadTimeoutMinutes]);


  // Calculate summary metrics based on filtered data
  const summaryMetrics = useMemo(() => {
    const dataToUse = filteredTimelineData.length > 0 ? filteredTimelineData : timelineData;
    if (!dataToUse.length || !sensors.length) {
      return {
        durations: {},
        switchCount: 0,
        chartData: []
      };
    }

    const durations = {};
    let switchCount = 0;
    let previousActiveSensor = null;

    // Initialize durations using original database names (preserve case)
    sensors.forEach(sensor => {
      durations[sensor.name] = 0;
      // Also check lowercase version for backward compatibility
      if (sensor.nameLower && sensor.nameLower !== sensor.name) {
        durations[sensor.nameLower] = 0;
      }
    });

    // Calculate actual durations based on timestamps (not fixed 15-minute intervals)
    // IMPORTANT: Only count durations within the shift period boundaries
    dataToUse.forEach((point, index) => {
      // Get timestamp for current point in local timezone
      const currentTime = point.fullTimestamp 
        ? new Date(point.fullTimestamp) 
        : point.timestamp 
          ? new Date(point.timestamp) 
          : null;
      
      if (!currentTime) return; // Skip if no valid timestamp
      
      // Get current time in local timezone
      const currentHour = currentTime.getHours();
      const currentMin = currentTime.getMinutes();
      const currentMinutes = currentHour * 60 + currentMin;
      
      // Verify this point is within shift boundaries if shift is selected
      if (selectedShift && selectedShift.start_time && selectedShift.end_time) {
        const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
        const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
        const shiftStartMinutes = startHour * 60 + startMin;
        const shiftEndMinutes = endHour * 60 + endMin;
        const isOvernight = shiftEndMinutes <= shiftStartMinutes;
        
        // Check if point is within shift period (in local timezone)
        let isInShift = false;
        if (isOvernight) {
          // Overnight shift: current time >= start OR current time <= end
          isInShift = currentMinutes >= shiftStartMinutes || currentMinutes <= shiftEndMinutes;
        } else {
          // Normal shift: current time >= start AND current time <= end
          isInShift = currentMinutes >= shiftStartMinutes && currentMinutes <= shiftEndMinutes;
        }
        
        if (!isInShift) {
          // Point is outside shift boundaries - skip it
          return;
        }
      }
      
      // Try to find active sensor by checking both original name and lowercase
      const activeSensor = sensors.find(s => {
        // Check original name first
        if (point[s.name] === 1) return true;
        // Check lowercase version if different
        if (s.nameLower && point[s.nameLower] === 1) return true;
        return false;
      });
      
      if (activeSensor && activeSensor.name !== previousActiveSensor) {
        if (previousActiveSensor !== null) {
          switchCount++;
        }
        previousActiveSensor = activeSensor.name;
      }

      // Calculate duration based on actual timestamps
      // Use the time difference between this point and the next point (or shift end)
      // CRITICAL: Only count duration up to shift end time, not beyond
      if (activeSensor) {
        let durationMinutes = 0;
        
        if (index < dataToUse.length - 1) {
          // Calculate duration until next point
          const nextPoint = dataToUse[index + 1];
          const nextTime = nextPoint.fullTimestamp 
            ? new Date(nextPoint.fullTimestamp) 
            : nextPoint.timestamp 
              ? new Date(nextPoint.timestamp) 
              : null;
          
          if (nextTime) {
            // Get next point time in local timezone
            const nextHour = nextTime.getHours();
            const nextMin = nextTime.getMinutes();
            const nextMinutes = nextHour * 60 + nextMin;
            
            // Ensure we don't count duration beyond shift end
            if (selectedShift && selectedShift.end_time) {
              const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
              const shiftEndMinutes = endHour * 60 + endMin;
              const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
              const shiftStartMinutes = startHour * 60 + startMin;
              const isOvernight = shiftEndMinutes <= shiftStartMinutes;
              
              // Calculate shift end in absolute time
              const shiftEndTime = new Date(currentTime);
              shiftEndTime.setHours(endHour, endMin, 0, 0);
              if (isOvernight && currentMinutes < shiftEndMinutes) {
                shiftEndTime.setDate(shiftEndTime.getDate() + 1);
              }
              
              // Use the minimum of: time to next point OR time to shift end
              const timeToNextPoint = (nextTime - currentTime) / (1000 * 60);
              const timeToShiftEnd = Math.max(0, (shiftEndTime - currentTime) / (1000 * 60));
              durationMinutes = Math.min(timeToNextPoint, timeToShiftEnd);
            } else {
              durationMinutes = (nextTime - currentTime) / (1000 * 60); // Convert ms to minutes
            }
          } else {
            // If no next point, calculate to shift end
            if (selectedShift && selectedShift.end_time) {
              const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
              const shiftEndTime = new Date(currentTime);
              shiftEndTime.setHours(endHour, endMin, 0, 0);
              
              const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
              const shiftStartMinutes = startHour * 60 + startMin;
              const shiftEndMinutes = endHour * 60 + endMin;
              const isOvernight = shiftEndMinutes <= shiftStartMinutes;
              
              if (isOvernight && currentMinutes < shiftEndMinutes) {
                shiftEndTime.setDate(shiftEndTime.getDate() + 1);
              }
              
              durationMinutes = Math.max(0, (shiftEndTime - currentTime) / (1000 * 60));
            } else {
              durationMinutes = 15; // Fallback
            }
          }
        } else {
          // Last point - calculate duration until shift end (if shift selected)
          if (selectedShift && selectedShift.end_time) {
            // Use local time components to match shift times (which are in local timezone)
            const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
            const shiftEndTime = new Date(currentTime);
            shiftEndTime.setHours(endHour, endMin, 0, 0);
            
            // Handle overnight shifts - shift times are in local timezone
            const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
            const shiftStartMinutes = startHour * 60 + startMin;
            const shiftEndMinutes = endHour * 60 + endMin;
            const isOvernight = shiftEndMinutes <= shiftStartMinutes;
            
            if (isOvernight && currentMinutes < shiftEndMinutes) {
              // Current time is after midnight but before shift end (overnight shift)
              shiftEndTime.setDate(shiftEndTime.getDate() + 1);
            } else if (!isOvernight && currentMinutes >= shiftEndMinutes) {
              // Normal shift but we're past shift end - duration should be 0
              durationMinutes = 0;
            } else {
              // Calculate duration until shift end
              durationMinutes = Math.max(0, (shiftEndTime - currentTime) / (1000 * 60));
            }
          } else {
            // No shift or no timestamp - use fallback
            durationMinutes = 15;
          }
        }
        
        // Ensure duration is non-negative and within shift bounds
        durationMinutes = Math.max(0, durationMinutes);
        
        durations[activeSensor.name] = (durations[activeSensor.name] || 0) + durationMinutes;
        // Also update lowercase if different
        if (activeSensor.nameLower && activeSensor.nameLower !== activeSensor.name) {
          durations[activeSensor.nameLower] = (durations[activeSensor.nameLower] || 0) + durationMinutes;
        }
      }
    });

    // Calculate total duration for percentage calculation
    // ALWAYS use shift duration as the base for percentages (shift times are in local timezone)
    let totalDurationMinutes = 0;
    if (selectedShift && selectedShift.start_time && selectedShift.end_time) {
      // Shift times are stored as HH:mm in local timezone
      const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
      const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
      const shiftStartMinutes = startHour * 60 + startMin;
      const shiftEndMinutes = endHour * 60 + endMin;
      const isOvernight = shiftEndMinutes <= shiftStartMinutes;
      
      if (isOvernight) {
        // Overnight shift: e.g., 22:00 - 06:00 = 8 hours = 480 minutes
        totalDurationMinutes = (24 * 60 - shiftStartMinutes) + shiftEndMinutes;
      } else {
        // Normal shift: e.g., 06:00 - 14:00 = 8 hours = 480 minutes
        totalDurationMinutes = shiftEndMinutes - shiftStartMinutes;
      }
      
      console.log(`📊 Shift duration calculation:`);
      console.log(`   Shift: ${selectedShift.name} (${selectedShift.start_time} - ${selectedShift.end_time})`);
      console.log(`   Start minutes: ${shiftStartMinutes}, End minutes: ${shiftEndMinutes}`);
      console.log(`   Overnight: ${isOvernight}`);
      console.log(`   Total shift duration: ${totalDurationMinutes} minutes (${(totalDurationMinutes / 60).toFixed(2)} hours)`);
    } else {
      // No shift selected - use sum of all sensor durations as fallback
      // Note: This should rarely happen as shifts should always be selected
      console.warn('⚠️  No shift selected - using sum of sensor durations for percentage calculation');
      Object.values(durations).forEach(duration => {
        totalDurationMinutes += duration;
      });
    }
    
    // Convert to hours and minutes - use original database names
    const formattedDurations = {};
    sensors.forEach(sensor => {
      // Use original database name for lookup
      const minutes = durations[sensor.name] || durations[sensor.nameLower] || 0;
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      formattedDurations[sensor.name] = {
        hours,
        minutes: mins,
        totalMinutes: minutes,
        percentage: totalDurationMinutes > 0 ? (minutes / totalDurationMinutes) * 100 : 0
      };
    });
    
    console.log(`📊 Duration calculation summary (SHIFT-BASED):`);
    console.log(`   Selected shift: ${selectedShift ? `${selectedShift.name} (${selectedShift.start_time} - ${selectedShift.end_time})` : 'None'}`);
    console.log(`   Total shift duration: ${totalDurationMinutes} minutes (${(totalDurationMinutes / 60).toFixed(2)} hours)`);
    console.log(`   Data points processed: ${dataToUse.length}`);
    console.log(`   Sensor durations (within shift period only):`);
    sensors.forEach(sensor => {
      const duration = formattedDurations[sensor.name];
      if (duration.totalMinutes > 0) {
        console.log(`     ${sensor.name}: ${duration.hours}h ${duration.minutes}m (${duration.percentage.toFixed(2)}% of shift duration)`);
      }
    });
    
    // Verify: Sum of percentages should not exceed 100% (sensors are mutually exclusive)
    const totalPercentage = Object.values(formattedDurations).reduce((sum, d) => sum + d.percentage, 0);
    if (totalPercentage > 100.1) { // Allow small floating point error
      console.warn(`⚠️  Warning: Total percentage exceeds 100%: ${totalPercentage.toFixed(2)}% - This may indicate overlapping durations`);
    } else {
      console.log(`   Total percentage: ${totalPercentage.toFixed(2)}% (should be ≤100% as sensors are mutually exclusive)`);
    }

    // Prepare data for pie chart
    const chartData = sensors.map(sensor => ({
      name: sensor.name,
      value: formattedDurations[sensor.name].totalMinutes,
      percentage: formattedDurations[sensor.name].percentage.toFixed(1)
    }));

    return {
      durations: formattedDurations,
      switchCount,
      chartData
    };
  }, [filteredTimelineData, timelineData, sensors, selectedShift, payloadReceived, lastPayloadTime]);

  // Calculate which shift is currently active based on current time
  const getCurrentActiveShift = useMemo(() => {
    if (!shifts || shifts.length === 0) return null;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    // Find the shift that matches the current time
    for (const shift of shifts) {
      if (!shift.start_time || !shift.end_time || !shift.is_active) continue;
      
      const [startHour, startMin] = shift.start_time.slice(0, 5).split(':').map(Number);
      const [endHour, endMin] = shift.end_time.slice(0, 5).split(':').map(Number);
      
      const startTotalMinutes = startHour * 60 + startMin;
      const endTotalMinutes = endHour * 60 + endMin;
      
      // Check if shift is overnight (end time is less than start time, e.g., 22:00 - 06:00)
      const isOvernight = endTotalMinutes <= startTotalMinutes;
      
      let isInShift = false;
      if (isOvernight) {
        // Overnight shift: current time >= start OR current time <= end
        isInShift = currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
      } else {
        // Normal shift: current time >= start AND current time <= end
        isInShift = currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
      }
      
      if (isInShift) {
        return shift;
      }
    }
    
    return null;
  }, [shifts]);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

  // Transform timeline data into horizontal bar chart format
  const timelineBarData = useMemo(() => {
    // Use filtered data if available, otherwise fall back to all timeline data
    // But always respect shift boundaries if shift is selected
    let dataToUse = filteredTimelineData.length > 0 ? filteredTimelineData : timelineData;
    
    if (!sensors.length || !selectedShift) {
      console.log(`📊 Timeline bar data skipped: sensors=${sensors.length}, shift=${selectedShift ? 'set' : 'none'}`);
      return [];
    }
    
    // Re-filter data if we're using timelineData fallback but shift is selected
    // This ensures we only show data within shift hours
    if (dataToUse.length > 0 && selectedShift && filteredTimelineData.length === 0) {
      console.log(`📊 Re-filtering timeline data for shift ${selectedShift.name}...`);
      dataToUse = filterDataByShift(dataToUse, selectedShift);
      console.log(`   Re-filtered data points: ${dataToUse.length}`);
    }
    
    // If offline (no payload received), filter out any data points after the last payload time
    // This prevents showing historical data bars extending through the entire shift
    if (!payloadReceived && lastPayloadTime && dataToUse.length > 0) {
      const cutoffTime = lastPayloadTime.getTime();
      const originalLength = dataToUse.length;
      dataToUse = dataToUse.filter(point => {
        if (point.fullTimestamp) {
          return new Date(point.fullTimestamp).getTime() <= cutoffTime;
        } else if (point.timestamp) {
          return new Date(point.timestamp).getTime() <= cutoffTime;
        }
        return true; // Keep if no timestamp available
      });
      console.log(`📊 Offline mode: Filtered data from ${originalLength} to ${dataToUse.length} points (cutoff: ${lastPayloadTime.toISOString()})`);
    }
    
    // If no data, return empty array but we'll still show the chart with all sensors
    if (!dataToUse.length) {
      console.log(`📊 Timeline bar data: No data for date ${selectedDate}, shift ${selectedShift.name}`);
      console.log(`   Timeline data: ${timelineData.length} points`);
      console.log(`   Filtered timeline data: ${filteredTimelineData.length} points`);
      console.log(`   Selected shift: ${selectedShift.name} (${selectedShift.start_time} - ${selectedShift.end_time})`);
      return [];
    }
    
    console.log(`📊 Processing ${dataToUse.length} timeline points for bar chart`);
      console.log(`   Selected date: ${selectedDate}`);
      console.log(`   Selected shift: ${selectedShift.name} (${selectedShift.start_time} - ${selectedShift.end_time})`);
      console.log(`   Payload received: ${payloadReceived}, Last payload time: ${lastPayloadTime ? lastPayloadTime.toISOString() : 'None'}`);

    // Calculate shift start time in minutes from midnight (actual clock time)
    const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
    const shiftStartMinutes = startHour * 60 + startMin;

    // Calculate shift end time in minutes from midnight (actual clock time)
    const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
    let shiftEndMinutes = endHour * 60 + endMin;

    // Check if shift is overnight
    const isOvernight = shiftEndMinutes <= shiftStartMinutes;
    if (isOvernight) {
      // For overnight shifts, shiftEndMinutes is on the next day
      // We'll handle this in the chart domain by adding 24 hours (1440 minutes)
      shiftEndMinutes = shiftEndMinutes + (24 * 60);
    }

    // Convert timeline points to actual clock times (minutes from midnight)
    // Use actual timestamp if available, otherwise parse from time string
    const timelinePoints = dataToUse.map(point => {
      let pointMinutes; // Minutes from midnight (0-1440)
      if (point.fullTimestamp) {
        // Use actual timestamp from database for accurate positioning
        const time = new Date(point.fullTimestamp);
        pointMinutes = time.getHours() * 60 + time.getMinutes() + (time.getSeconds() / 60);
      } else if (point.timestamp) {
        // Fallback to timestamp string
        const time = new Date(point.timestamp);
        pointMinutes = time.getHours() * 60 + time.getMinutes() + (time.getSeconds() / 60);
      } else {
        // Fallback to parsing time string
        const timeParts = point.time.split(':');
        const hour = parseInt(timeParts[0], 10);
        const min = parseInt(timeParts[1] || '0', 10);
        pointMinutes = hour * 60 + min;
      }

      // For overnight shifts, if point is before shift start (e.g., 1:00 when shift is 23:00-7:00),
      // treat it as next day (add 24 hours)
      let actualClockMinutes = pointMinutes;
      if (isOvernight && pointMinutes < shiftStartMinutes) {
        // Point is in the morning part of overnight shift (next day)
        actualClockMinutes = pointMinutes + (24 * 60);
      }

      // Find which sensor is active (value = 1)
      // Check both lowercase key and original name, and handle string/number values
      const activeSensor = sensors.find(s => {
        const keyName = s.nameLower || s.name.toLowerCase();
        const valueLower = point[keyName] !== undefined ? parseFloat(point[keyName]) : null;
        const valueOriginal = point[s.name] !== undefined ? parseFloat(point[s.name]) : null;
        // Sensor is active if value is 1 (as number, string "1", or boolean true)
        const isActive = valueLower === 1 || valueOriginal === 1 || 
                        point[keyName] === "1" || point[s.name] === "1" ||
                        point[keyName] === true || point[s.name] === true;
        return isActive;
      });
      
      // Debug: Log if we found an active sensor
      if (activeSensor) {
        const hours = Math.floor(actualClockMinutes / 60);
        const mins = actualClockMinutes % 60;
        const clockTime = `${String(hours % 24).padStart(2, '0')}:${String(Math.floor(mins)).padStart(2, '0')}`;
        console.log(`   🔍 Found active sensor: ${activeSensor.name} at ${clockTime} (${actualClockMinutes} minutes from midnight)`);
      }

      return {
        clockMinutes: actualClockMinutes, // Actual clock time in minutes from midnight (0-2880 for overnight shifts)
        time: point.time,
        timestamp: point.timestamp || (point.fullTimestamp ? point.fullTimestamp.toISOString() : null),
        fullTimestamp: point.fullTimestamp,
        activeSensor: activeSensor ? activeSensor.name : null,
        activeSensorId: activeSensor ? activeSensor.id : null
      };
    }).filter(point => {
      // Filter out points that are outside shift boundaries (safety check)
      // Point should be within the shift time range (actual clock times)
      if (selectedShift) {
        if (isOvernight) {
          // Overnight shift: point should be >= shiftStartMinutes OR <= original shiftEndMinutes (before adding 24h)
          // OR >= shiftStartMinutes + 24h (for next day points)
          const originalEndMinutes = endHour * 60 + endMin;
          return (point.clockMinutes >= shiftStartMinutes && point.clockMinutes <= shiftEndMinutes) ||
                 (point.clockMinutes < originalEndMinutes); // Next day points that wrapped around
        } else {
          // Normal shift: point should be within shift time range
          return point.clockMinutes >= shiftStartMinutes && point.clockMinutes <= shiftEndMinutes;
        }
      }
      return true;
    }).sort((a, b) => a.clockMinutes - b.clockMinutes);
    
    console.log(`📊 Processing ${timelinePoints.length} timeline points for chart (after filtering)`);
    if (timelinePoints.length > 0) {
      console.log(`   Sample points:`, timelinePoints.slice(0, 5).map(p => {
        const startHours = Math.floor(p.clockMinutes / 60);
        const startMins = Math.floor(p.clockMinutes % 60);
        const clockTime = `${String(startHours % 24).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`;
        return {
          time: p.time,
          clockTime: clockTime,
          clockMinutes: p.clockMinutes.toFixed(1),
          activeSensor: p.activeSensor || 'None'
        };
      }));
    } else {
      console.log(`   ⚠️  No timeline points found - check:`);
      console.log(`     1. Data exists in database for date: ${selectedDate}`);
      console.log(`     2. Data falls within shift hours: ${selectedShift.start_time} - ${selectedShift.end_time}`);
      console.log(`     3. Sensors have value=1 (ON) in the data`);
      console.log(`     4. Original timelineData has ${timelineData.length} points`);
      console.log(`     5. Filtered timelineData has ${filteredTimelineData.length} points`);
    }

    // Group consecutive ON periods for each sensor
    // Bars will use actual clock times (minutes from midnight)
    const sensorBars = [];
    const sensorActivePeriods = {}; // Track start time for each sensor (in clock minutes)

    timelinePoints.forEach((point, index) => {
      // End all currently active sensors at this point (mutually exclusive)
      Object.keys(sensorActivePeriods).forEach(sensorName => {
        if (sensorActivePeriods[sensorName] !== null) {
          // Only create bar if there's a valid duration
          if (point.clockMinutes > sensorActivePeriods[sensorName]) {
            sensorBars.push({
              sensor: sensorName,
              start: sensorActivePeriods[sensorName], // Actual clock time (minutes from midnight)
              end: point.clockMinutes, // Actual clock time (minutes from midnight)
              color: COLORS[sensors.findIndex(s => s.name === sensorName) % COLORS.length]
            });
          }
          sensorActivePeriods[sensorName] = null;
        }
      });

      // Start new period for the active sensor at this point
      if (point.activeSensor) {
        // If sensor was not active before, start a new period
        if (sensorActivePeriods[point.activeSensor] === null || sensorActivePeriods[point.activeSensor] === undefined) {
          sensorActivePeriods[point.activeSensor] = point.clockMinutes;
        }
      }
    });

    // Close any remaining active periods
    // If offline, close at lastPayloadTime instead of shift end to prevent showing bars beyond last payload
    let closingTime = shiftEndMinutes;
    if (!payloadReceived && lastPayloadTime) {
      const lastPayloadDate = new Date(lastPayloadTime);
      let lastPayloadMinutes = lastPayloadDate.getHours() * 60 + lastPayloadDate.getMinutes();
      // Handle overnight shifts
      if (isOvernight && lastPayloadMinutes < shiftStartMinutes) {
        // Last payload is on next day (for overnight shifts)
        lastPayloadMinutes = lastPayloadMinutes + (24 * 60);
      }
      closingTime = lastPayloadMinutes;
      console.log(`📊 Offline mode: Closing bars at lastPayloadTime (${lastPayloadTime.toISOString()}) = ${closingTime} minutes instead of shift end ${shiftEndMinutes}`);
    }
    
    Object.keys(sensorActivePeriods).forEach(sensorName => {
      if (sensorActivePeriods[sensorName] !== null) {
        // Only create bar if closing time is after start time
        if (closingTime > sensorActivePeriods[sensorName]) {
          sensorBars.push({
            sensor: sensorName,
            start: sensorActivePeriods[sensorName], // Actual clock time
            end: closingTime, // Use closingTime (lastPayloadTime if offline, shiftEndMinutes if live)
            color: COLORS[sensors.findIndex(s => s.name === sensorName) % COLORS.length]
          });
        }
      }
    });

    // Filter out bars with zero or negative duration
    const filteredBars = sensorBars.filter(bar => bar.end > bar.start);
    
    // Create a map from sensor name to Y-axis index (0-based)
    // Ensure consistent mapping by using exact name match (case-sensitive)
    const sensorToIndexMap = {};
    sensors.forEach((sensor, index) => {
      sensorToIndexMap[sensor.name] = index;
      // Also map lowercase version for case-insensitive matching
      sensorToIndexMap[sensor.name.toLowerCase()] = index;
    });
    
    // Add Y-axis index to each bar so multiple bars for same sensor appear on same row
    const barsWithIndex = filteredBars.map(bar => {
      // Try exact match first, then case-insensitive
      let sensorIndex = sensorToIndexMap[bar.sensor];
      if (sensorIndex === undefined) {
        sensorIndex = sensorToIndexMap[bar.sensor.toLowerCase()];
      }
      if (sensorIndex === undefined) {
        // Find by name match (case-insensitive)
        const foundSensor = sensors.find(s => 
          s.name.toLowerCase() === bar.sensor.toLowerCase() || s.name === bar.sensor
        );
        sensorIndex = foundSensor ? sensors.indexOf(foundSensor) : -1;
      }
      
      return {
        ...bar,
        sensorIndex: sensorIndex !== undefined && sensorIndex !== null ? sensorIndex : -1,
        sensorName: bar.sensor // Keep original name for tooltip
      };
    });
    
    // Debug: Log sensor index mapping
    console.log(`📊 Sensor index mapping:`, sensors.map((s, idx) => `${s.name} -> ${idx}`).join(', '));
    console.log(`📊 Bar indices:`, barsWithIndex.slice(0, 10).map(b => `${b.sensor} -> ${b.sensorIndex}`).join(', '));
    
    console.log(`📊 Timeline bar chart: ${barsWithIndex.length} bars created from ${timelinePoints.length} timeline points`);
    if (barsWithIndex.length > 0) {
      console.log(`   Sample bars:`, barsWithIndex.slice(0, 5).map(bar => {
        const startH = Math.floor(bar.start / 60) % 24;
        const startM = Math.floor(bar.start % 60);
        const endH = Math.floor(bar.end / 60) % 24;
        const endM = Math.floor(bar.end % 60);
        return {
          sensor: bar.sensor,
          start: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
          end: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
          sensorIndex: bar.sensorIndex,
          duration: (bar.end - bar.start).toFixed(1) + ' min'
        };
      }));
    }
    return barsWithIndex;
  }, [filteredTimelineData, timelineData, sensors, selectedShift, payloadReceived, lastPayloadTime]);

  // Custom tooltip for timeline bar chart
  const TimelineBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // For ReferenceArea, payload structure is different - get data from ReferenceArea props
      // Find the bar data for this sensor index (label is the sensorIndex)
      const sensorIndex = typeof label === 'number' ? label : parseInt(label);
      const bar = timelineBarData.find(b => b.sensorIndex === sensorIndex);
      if (!bar) return null;
      
      const duration = bar.end - bar.start;
      const hours = Math.floor(duration / 60);
      const mins = Math.floor(duration % 60);
      
      // Convert start and end times (clock minutes) to HH:mm format
      let startHours = Math.floor(bar.start / 60);
      let startMins = Math.floor(bar.start % 60);
      let endHours = Math.floor(bar.end / 60);
      let endMins = Math.floor(bar.end % 60);
      
      // Handle overnight shifts: wrap hours >= 24 back to 0-23
      if (startHours >= 24) {
        startHours = startHours % 24;
      }
      if (endHours >= 24) {
        endHours = endHours % 24;
      }
      
      return (
        <div className="bg-white p-2 border border-gray-300 shadow-md rounded">
          <p className="font-bold">{bar.sensorName || bar.sensor}</p>
          <p>{`Duration: ${hours > 0 ? `${hours}h ` : ''}${mins}m`}</p>
          <p>{`Time: ${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`}</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const activeSensor = payload.find(p => p.value === 1);
      if (activeSensor) {
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-semibold">{`Time: ${label}`}</p>
            <p className="text-green-600 font-medium">{`Active: ${activeSensor.name}`}</p>
          </div>
        );
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading switch sensors...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-3xl font-bold mb-2">Switch Sensors Control</h1>
        <p className="text-gray-600">Mutually exclusive switch sensors - Only one active at a time</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${payloadReceived ? 'bg-green-500' : 'bg-gray-400'} ${payloadReceived ? 'animate-pulse' : ''}`}></div>
              <span className="text-sm text-gray-600 font-medium">
                {payloadReceived ? 'Live' : 'Offline'}
              </span>
            </div>
            {payloadReceived && (
              <div className="text-xs text-gray-500">
                Updates: {updateCount} | Last: {lastPayloadTime ? lastPayloadTime.toLocaleTimeString() : lastUpdateTime || 'None'}
              </div>
            )}
            {payloadReceived && activeSensorId && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Active: {sensors.find(s => s.id === activeSensorId)?.name || 'Unknown'}
              </span>
            )}
          </div>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-500">
            Selected Date: {selectedDate} | WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
          </div>
        )}
      </div>

      {/* Date and Shift Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Shift {user?.role === 'operator' && '(Your Shift)'}
          </label>
          <select
            value={selectedShiftId || ''}
            onChange={(e) => {
              const shiftId = parseInt(e.target.value);
              const shift = shifts.find(s => s.id === shiftId);
              setSelectedShiftId(shiftId);
              setSelectedShift(shift || null);
            }}
            disabled={user?.role === 'operator'}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 ${
              user?.role === 'operator' ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">All Shifts (24 Hours)</option>
            {shifts.map(shift => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
          {selectedShift && (
            <p className="text-xs text-gray-500 mt-1">
              Showing data for {selectedShift.name} ({selectedShift.start_time.slice(0, 5)} - {selectedShift.end_time.slice(0, 5)})
            </p>
          )}
          {!selectedShift && (
            <p className="text-xs text-gray-500 mt-1">
              Showing data for all 24 hours
            </p>
          )}
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Sensor</h3>
          <p className="text-2xl font-bold text-green-600">
            {payloadReceived && activeSensorId ? (sensors.find(s => s.id === activeSensorId)?.name || 'None') : 'None'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Switches</h3>
          <p className="text-2xl font-bold text-blue-600">{summaryMetrics.switchCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            {getCurrentActiveShift 
              ? `During ${getCurrentActiveShift.name}` 
              : selectedShift 
                ? `During ${selectedShift.name}` 
                : 'In last 24 hours'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Sensors</h3>
          <p className="text-2xl font-bold text-purple-600">{sensors.length}</p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">
          {selectedShift ? `${selectedShift.name} Sensor Activity Timeline` : 'Sensor Activity Timeline'}
        </h2>
        {selectedShift ? (
          timelineBarData.length > 0 || timelineData.length > 0 ? (
            <div className="w-full" style={{ minHeight: '400px' }}>
              <ResponsiveContainer width="100%" height={Math.max(400, sensors.length * 60 + 100)}>
                <ComposedChart
                  layout="vertical"
                  data={sensors.map((s, index) => ({ sensorIndex: index, sensorName: s.name }))} // One entry per sensor for Y-axis with numeric index
                  margin={{ top: 5, right: 30, left: 100, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
            <XAxis 
                    type="number" 
                    domain={(dataMin, dataMax) => {
                      // X-axis domain: actual shift start to end times (clock hours in minutes from midnight)
                      const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
                      const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
                      const shiftStartMinutes = startHour * 60 + startMin;
                      let shiftEndMinutes = endHour * 60 + endMin;
                      const isOvernight = shiftEndMinutes <= shiftStartMinutes;
                      
                      // For overnight shifts, add 24 hours to end time for chart display
                      if (isOvernight) {
                        shiftEndMinutes = shiftEndMinutes + (24 * 60);
                      }
                      
                      return [shiftStartMinutes, shiftEndMinutes];
                    }}
                    label={{ value: 'Time (Clock Hours)', position: 'insideBottom', offset: -10 }}
                    tickFormatter={(value) => {
                      // Format as HH:mm (actual clock time)
                      let hours = Math.floor(value / 60);
                      const mins = Math.floor(value % 60);
                      
                      // Handle overnight shifts: wrap hours >= 24 back to 0-23
                      if (hours >= 24) {
                        hours = hours % 24;
                      }
                      
                      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                    }}
            />
            <YAxis 
                    dataKey="sensorIndex" 
                    type="number"
                    width={90}
                    tick={{ fontSize: 0 }} // Hide tick labels
                    domain={[0, Math.max(0, sensors.length - 1)]}
                    ticks={sensors.map((_, index) => index)} // Explicitly set ticks to sensor indices
                    tickFormatter={() => ''} // Return empty string to hide labels
                    label={{ value: 'Sensor Data', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<TimelineBarTooltip />} />
                  {/* Render ReferenceArea for each bar - grouped by sensor index */}
                  {timelineBarData.map((bar, index) => {
                    if (bar.sensorIndex === -1) return null; // Skip invalid bars
                    return (
                      <ReferenceArea
                        key={`ref-area-${bar.sensor}-${index}-${bar.start}-${bar.end}`}
                        y1={bar.sensorIndex}
                        y2={bar.sensorIndex}
                        x1={bar.start}
                        x2={bar.end}
                        fill={bar.color}
                        fillOpacity={0.8}
                        stroke={bar.color}
                strokeWidth={2}
                        isFront={false}
                      />
                    );
                  })}
                </ComposedChart>
        </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">No Sensor Data Available</p>
                <p className="text-sm mb-2">No data has been recorded for the selected date ({selectedDate}) and shift ({selectedShift.name}).</p>
                <p className="text-xs text-gray-400 mt-4">
                  Debug Info: Timeline Data: {timelineData.length} records, Filtered: {filteredTimelineData.length} records
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Please Select a Shift</p>
              <p className="text-sm">Select a shift from the dropdown above to view the timeline chart.</p>
            </div>
          </div>
        )}
      </div>

      {/* Duration Distribution Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Total On Duration Distribution</h2>
          {summaryMetrics.chartData.length > 0 && summaryMetrics.chartData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={summaryMetrics.chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {summaryMetrics.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => {
                  const hours = Math.floor(value / 60);
                  const mins = value % 60;
                  return `${hours}h ${mins}m`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-72 text-gray-500">
              <p className="text-sm">No duration data available</p>
            </div>
          )}
        </div>

        {/* Detailed Duration Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Sensor Duration Details</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sensor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sensors.map((sensor) => {
                  const duration = summaryMetrics.durations[sensor.name] || {
                    hours: 0,
                    minutes: 0,
                    totalMinutes: 0,
                    percentage: 0
                  };
                  return (
                    <tr key={sensor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sensor.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {duration.hours}h {duration.minutes}m
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${duration.percentage}%` }}
                            />
                          </div>
                          <span>{duration.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwitchSensors;

