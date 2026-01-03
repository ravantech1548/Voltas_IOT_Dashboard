import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
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

  // Initialize with 6 switch sensors (ch01-ch06)
  useEffect(() => {
    initializeSensors();
    fetchShifts();
  }, []);

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
    if (!shift || !shift.start_time || !shift.end_time) return data;

    const startTime = shift.start_time.slice(0, 5); // HH:mm
    const endTime = shift.end_time.slice(0, 5); // HH:mm

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight shifts (e.g., 22:00 - 06:00)
    const isOvernight = endMinutes <= startMinutes;

    const filtered = data.filter(point => {
      // Parse time from point.time (format: "HH:mm")
      const timeParts = point.time ? point.time.split(':') : [];
      if (timeParts.length < 2) return false; // Exclude if time parsing fails
      
      const hour = parseInt(timeParts[0], 10);
      const min = parseInt(timeParts[1] || '0', 10);
      
      if (isNaN(hour) || isNaN(min)) return false; // Exclude if time parsing fails
      
      const pointMinutes = hour * 60 + min;

      if (isOvernight) {
        // Overnight shift: point is valid if >= start OR <= end
        // This includes times from start (e.g., 22:00) to end (e.g., 06:00) next day
        return pointMinutes >= startMinutes || pointMinutes <= endMinutes;
      } else {
        // Normal shift: point is valid if between start and end
        return pointMinutes >= startMinutes && pointMinutes <= endMinutes;
      }
    });

    // For overnight shifts, sort so that start time comes first (22:00 before 00:00)
    if (isOvernight && filtered.length > 0) {
      return filtered.sort((a, b) => {
        const [hourA, minA] = a.time.split(':').map(Number);
        const [hourB, minB] = b.time.split(':').map(Number);
        const minutesA = hourA * 60 + minA;
        const minutesB = hourB * 60 + minB;
        
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

    try {
      console.log(`📅 Fetching timeline data for date: ${selectedDate}`);
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`   Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch data for all sensors
      const allDataPromises = sensors.map(sensor =>
        api.get(`/data/sensor/${sensor.id}`, {
          params: {
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
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
          const time = new Date(item.timestamp);
          // Use actual timestamp with seconds precision to preserve all database records
          // Round to nearest 10 seconds to group very close timestamps (within same second)
          const roundedSeconds = Math.floor(time.getSeconds() / 10) * 10;
          const timeKey = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(roundedSeconds).padStart(2, '0')}`;
          
          if (!dataMap.has(timeKey)) {
            dataMap.set(timeKey, {
              time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
              timestamp: time.toISOString(),
              fullTimestamp: time
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
            point.fullTimestamp = time;
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

      console.log(`📊 Timeline array created with ${timelineArray.length} points`);
      setTimelineData(timelineArray);

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
      console.error('Error fetching timeline data:', error);
      setTimelineData([]);
    }
  };

  // Filter timeline data based on selected shift
  useEffect(() => {
    if (timelineData.length > 0 && selectedShift) {
      const filtered = filterDataByShift(timelineData, selectedShift);
      setFilteredTimelineData(filtered);
    } else {
      setFilteredTimelineData(timelineData);
    }
  }, [timelineData, selectedShift]);

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
  const fetchLatestSensorData = async (sensorList) => {
    if (sensorList.length === 0) return;
    
    try {
      const sensorIds = sensorList.map(s => s.id).join(',');
      console.log(`📡 Fetching latest data for sensors: ${sensorIds}`);
      const response = await api.get(`/data/latest?sensor_ids=${sensorIds}`);
      console.log('📡 Latest sensor data received:', response.data);
      
      // Check if any recent data exists (within last 5 minutes) to determine if system is "Live"
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      let hasRecentData = false;
      let latestDataTime = null;
      
      if (response.data && response.data.length > 0) {
        response.data.forEach(d => {
          if (d.timestamp) {
            const dataTime = new Date(d.timestamp);
            if (dataTime >= fiveMinutesAgo) {
              hasRecentData = true;
              if (!latestDataTime || dataTime > latestDataTime) {
                latestDataTime = dataTime;
              }
            }
          }
        });
      }
      
      // Only set payloadReceived if we have recent data (within 5 minutes)
      if (hasRecentData && latestDataTime) {
        setPayloadReceived(true);
        setLastPayloadTime(latestDataTime);
        console.log('✅ Recent payload data found - marking as Live');
        
        // Only set active sensor states if we have recent live data
        const activeSensorData = response.data.find(d => {
          if (!d.timestamp) return false;
          const dataTime = new Date(d.timestamp);
          if (dataTime < fiveMinutesAgo) return false; // Ignore old data
          
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
        // No recent data - set to Offline and reset all sensors to inactive
        setPayloadReceived(false);
        setLastPayloadTime(null);
        setActiveSensorId(null);
        setSensors(prevSensors => 
          prevSensors.map(s => ({
            ...s,
            isActive: false
          }))
        );
        console.log('⚠️ No recent payload data found - marking as Offline and resetting sensors');
      }
      
      // Log detailed data for debugging
      if (response.data && response.data.length > 0) {
        console.log('📡 Latest data details:');
        response.data.forEach(d => {
          const dataTime = d.timestamp ? new Date(d.timestamp) : null;
          const isRecent = dataTime && dataTime >= fiveMinutesAgo;
          console.log(`   - Sensor ID: ${d.sensor_id}, Value: ${d.value}, Timestamp: ${d.timestamp} ${isRecent ? '(RECENT)' : '(OLD)'}`);
        });
      } else {
        console.log('⚠️  Latest sensor data array is empty - no data in database yet');
      }
    } catch (error) {
      console.error('❌ Error fetching latest sensor data:', error);
      console.error('  Full error:', error.response || error.message);
    }
  };

  // WebSocket connection for live updates
  const socketRef = useRef(null);
  const sensorsRef = useRef(sensors);
  
  // Update ref when sensors change
  useEffect(() => {
    sensorsRef.current = sensors;
  }, [sensors]);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    
    console.log('🔌 Initializing WebSocket connection...');
    console.log('  - WS URL:', wsUrl);
    console.log('  - Token exists:', !!token);
    console.log('  - Sensors count:', sensorsRef.current.length);
    
    if (!token) {
      console.error('❌ No authentication token found - WebSocket connection aborted');
      return;
    }
    
    if (sensorsRef.current.length === 0) {
      console.log('⏳ Waiting for sensors to load before connecting WebSocket...');
      return;
    }

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
      forceNew: false,
      // Upgrade from polling to websocket
      upgrade: true
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('✅✅✅ WebSocket CONNECTED for Switch Sensors');
      setWsConnected(true);
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
      console.log('  - Full data object:', JSON.stringify(data, null, 2));
      
      // Mark that actual payload has been received
      setPayloadReceived(true);
      const now = new Date();
      setLastPayloadTime(now);
      
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
      
      // If server disconnected us, don't try to reconnect automatically
      if (reason === 'io server disconnect') {
        console.log('⚠️  Server disconnected client - manual reconnection may be required');
      }
    });

    return () => {
      if (socketInstance) {
        sensorsRef.current.forEach(sensor => {
          socketInstance.emit('leave_room', `sensor_${sensor.id}`);
        });
        socketInstance.disconnect();
      }
    };
  }, [sensors, selectedDate]); // Removed activeSensorId from dependencies to avoid loops


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

    dataToUse.forEach((point, index) => {
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

      // Calculate duration (15 minutes per interval) - use original database name
      if (activeSensor) {
        durations[activeSensor.name] += 15; // minutes
        // Also update lowercase if different
        if (activeSensor.nameLower && activeSensor.nameLower !== activeSensor.name) {
          durations[activeSensor.nameLower] = (durations[activeSensor.nameLower] || 0) + 15;
        }
      }
    });

    // Convert to hours and minutes - use original database names
    const formattedDurations = {};
    sensors.forEach(sensor => {
      // Use original database name for lookup
      const minutes = durations[sensor.name] || durations[sensor.nameLower] || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      formattedDurations[sensor.name] = {
        hours,
        minutes: mins,
        totalMinutes: minutes,
        percentage: dataToUse.length > 0 ? (minutes / (dataToUse.length * 15)) * 100 : 0
      };
    });

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
  }, [filteredTimelineData, timelineData, sensors]);

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
    const dataToUse = filteredTimelineData.length > 0 ? filteredTimelineData : timelineData;
    if (!sensors.length || !selectedShift) {
      return [];
    }
    
    // If no data, return empty array but we'll still show the chart with all sensors
    if (!dataToUse.length) {
      return [];
    }

    // Calculate shift start time in minutes from midnight
    const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
    const shiftStartMinutes = startHour * 60 + startMin;

    // Calculate shift end time in minutes from midnight
    const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
    const shiftEndMinutes = endHour * 60 + endMin;

    // Check if shift is overnight
    const isOvernight = shiftEndMinutes <= shiftStartMinutes;
    const shiftDurationMinutes = isOvernight 
      ? (24 * 60 - shiftStartMinutes) + shiftEndMinutes 
      : shiftEndMinutes - shiftStartMinutes;

    // Convert timeline points to minutes from shift start
    // Use actual timestamp if available, otherwise parse from time string
    const timelinePoints = dataToUse.map(point => {
      let pointMinutes;
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

      // Calculate minutes from shift start
      let minutesFromStart;
      if (isOvernight) {
        if (pointMinutes >= shiftStartMinutes) {
          // Point is in the same day as shift start
          minutesFromStart = pointMinutes - shiftStartMinutes;
        } else {
          // Point is in the next day (morning part of overnight shift)
          minutesFromStart = (24 * 60 - shiftStartMinutes) + pointMinutes;
        }
      } else {
        minutesFromStart = pointMinutes - shiftStartMinutes;
      }

      // Find which sensor is active (value = 1)
      const activeSensor = sensors.find(s => {
        const keyName = s.nameLower || s.name.toLowerCase();
        return point[keyName] === 1 || point[s.name] === 1;
      });

      return {
        minutesFromStart,
        time: point.time,
        timestamp: point.timestamp || (point.fullTimestamp ? point.fullTimestamp.toISOString() : null),
        activeSensor: activeSensor ? activeSensor.name : null,
        activeSensorId: activeSensor ? activeSensor.id : null
      };
    }).sort((a, b) => a.minutesFromStart - b.minutesFromStart);
    
    console.log(`📊 Processing ${timelinePoints.length} timeline points for chart`);

    // Group consecutive ON periods for each sensor
    const sensorBars = [];
    const sensorActivePeriods = {}; // Track start time for each sensor

    timelinePoints.forEach((point, index) => {
      // End all currently active sensors at this point
      Object.keys(sensorActivePeriods).forEach(sensorName => {
        if (sensorActivePeriods[sensorName] !== null) {
          sensorBars.push({
            sensor: sensorName,
            start: sensorActivePeriods[sensorName],
            end: point.minutesFromStart,
            color: COLORS[sensors.findIndex(s => s.name === sensorName) % COLORS.length]
          });
          sensorActivePeriods[sensorName] = null;
        }
      });

      // Start new period for the active sensor at this point
      if (point.activeSensor) {
        if (sensorActivePeriods[point.activeSensor] === null) {
          sensorActivePeriods[point.activeSensor] = point.minutesFromStart;
        }
      }
    });

    // Close any remaining active periods at shift end
    Object.keys(sensorActivePeriods).forEach(sensorName => {
      if (sensorActivePeriods[sensorName] !== null) {
        sensorBars.push({
          sensor: sensorName,
          start: sensorActivePeriods[sensorName],
          end: shiftDurationMinutes,
          color: COLORS[sensors.findIndex(s => s.name === sensorName) % COLORS.length]
        });
      }
    });

    // Filter out bars with zero or negative duration
    const filteredBars = sensorBars.filter(bar => bar.end > bar.start);
    console.log(`📊 Timeline bar chart: ${filteredBars.length} bars created from ${timelinePoints.length} timeline points`);
    return filteredBars;
  }, [filteredTimelineData, timelineData, sensors, selectedShift]);

  // Custom tooltip for timeline bar chart
  const TimelineBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const duration = data.end - data.start;
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      const startHours = Math.floor(data.start / 60);
      const startMins = data.start % 60;
      const endHours = Math.floor(data.end / 60);
      const endMins = data.end % 60;
      
      return (
        <div className="bg-white p-2 border border-gray-300 shadow-md rounded">
          <p className="font-bold">{data.sensor}</p>
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
            {activeSensorId && (
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
            {sensors.find(s => s.id === activeSensorId)?.name || 'None'}
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
          <div className="w-full" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height={Math.max(400, sensors.length * 60 + 100)}>
              <BarChart
                layout="vertical"
                data={timelineBarData.length > 0 ? timelineBarData : []}
                margin={{ top: 5, right: 30, left: 100, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
            <XAxis 
                  type="number" 
                  domain={[0, (dataMax) => {
                    // Calculate shift duration for max domain
                    const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
                    const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
                    const shiftStartMinutes = startHour * 60 + startMin;
                    const shiftEndMinutes = endHour * 60 + endMin;
                    const isOvernight = shiftEndMinutes <= shiftStartMinutes;
                    const shiftDuration = isOvernight 
                      ? (24 * 60 - shiftStartMinutes) + shiftEndMinutes 
                      : shiftEndMinutes - shiftStartMinutes;
                    return shiftDuration;
                  }]}
                  label={{ value: 'Time (Minutes into Shift)', position: 'insideBottom', offset: -10 }}
                  tickFormatter={(value) => {
                    const hours = Math.floor(value / 60);
                    const mins = value % 60;
                    if (hours > 0) {
                      return `${hours}h ${mins}m`;
                    }
                    return `${mins}m`;
                  }}
            />
            <YAxis 
                  dataKey="sensor" 
                  type="category" 
                  width={90}
                  tick={{ fontSize: 12 }}
                  domain={sensors.map(s => s.name)}
                  ticks={sensors.map(s => s.name)}
                />
                <Tooltip content={<TimelineBarTooltip />} />
                <Bar 
                  dataKey="end"
                  shape={(props) => {
                    const { payload, x, y, width, height } = props;
                    // width is the bar width for the 'end' value (from 0 to end)
                    // We want a bar from 'start' to 'end'
                    // So the actual bar width is: width * ((end - start) / end)
                    // And the start position is: x - width + (width * (start / end))
                    const ratio = payload.end > 0 ? payload.start / payload.end : 0;
                    const barWidth = width * ((payload.end - payload.start) / payload.end);
                    const startX = x - width + (width * ratio);
                    
                    return (
                      <rect
                        x={startX}
                        y={y}
                        width={barWidth}
                        height={height || 20}
                        fill={payload.color}
                        rx={4}
                      />
                    );
                  }}
                >
                  {timelineBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} />
                  ))}
                </Bar>
              </BarChart>
        </ResponsiveContainer>
          </div>
        ) : selectedShift ? (
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">No Sensor Data Available</p>
              <p className="text-sm">No data has been recorded for the selected date and shift.</p>
            </div>
          </div>
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

