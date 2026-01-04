import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import useWebSocket from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import SensorCard from '../components/common/SensorCard';
import io from 'socket.io-client';

const Dashboard = () => {
  const { user } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [switchSensors, setSwitchSensors] = useState([]); // Switch sensors for status cards
  const [activeSensorId, setActiveSensorId] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorData, setSensorData] = useState([]);
  const [filteredSensorData, setFilteredSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [payloadReceived, setPayloadReceived] = useState(false); // Track if actual payload has been received
  const [lastPayloadTime, setLastPayloadTime] = useState(null);
  const [switchSensorData, setSwitchSensorData] = useState([]); // Data for all switch sensors during shift for Total Switches calculation
  const [showOfflineNotification, setShowOfflineNotification] = useState(false); // Show notification when dashboard clicked and offline
  const [payloadTimeoutMinutes, setPayloadTimeoutMinutes] = useState(5); // Configurable timeout from settings (default 5 minutes)
  const socketRef = useRef(null);
  const switchSensorsRef = useRef([]);
  const fetchingSwitchDataRef = useRef(false); // Track if we're already fetching to prevent duplicate requests
  const lastFetchParamsRef = useRef({ fetchKey: null, shiftId: null, date: null }); // Cache last fetch parameters
  const previousFetchKeyRef = useRef(null); // Track previous fetch key to prevent unnecessary re-runs

  useEffect(() => {
    fetchSensors();
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
          console.log(`✓ Dashboard: Loaded payload timeout: ${timeoutValue} minutes`);
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

  useEffect(() => {
    if (selectedSensor) {
      fetchSensorData(selectedSensor.id);
    }
  }, [selectedSensor, selectedShift]); // Also refetch when shift changes

  // Filter sensor data based on selected shift
  useEffect(() => {
    if (sensorData.length > 0 && selectedShift) {
      const filtered = filterDataByShift(sensorData, selectedShift);
      setFilteredSensorData(filtered);
    } else {
      setFilteredSensorData(sensorData);
    }
  }, [sensorData, selectedShift]);

  // Track last fetch time to prevent rapid successive calls
  const lastFetchTimeRef = useRef(0);
  
  // Fetch data for all switch sensors during the current shift for "Total Switches" calculation
  // Use a stable key to prevent unnecessary re-renders
  const switchSensorFetchKey = useMemo(() => {
    if (!selectedShift || switchSensors.length === 0) return null;
    const currentDate = new Date().toDateString();
    // Create a stable key from shift ID, date, and sensor count
    const key = `${selectedShift.id}_${currentDate}_${switchSensors.length}`;
    return key;
  }, [selectedShift?.id, switchSensors.length]);

  useEffect(() => {
    // Early exit if no valid key
    if (!switchSensorFetchKey) {
      if (switchSensorData.length > 0) {
        setSwitchSensorData([]);
      }
      previousFetchKeyRef.current = null;
      return;
    }

    // Check if key actually changed - if same as previous, skip entirely
    if (previousFetchKeyRef.current === switchSensorFetchKey) {
      // Key hasn't changed - don't re-fetch
      return;
    }

    // Check if we already have data for this exact key in cache
    const lastParams = lastFetchParamsRef.current;
    if (lastParams.fetchKey === switchSensorFetchKey) {
      if (fetchingSwitchDataRef.current) {
        console.log('📊 ⏳ Already fetching data for this key, waiting...');
        return;
      }
      // Cache hit - we already have this data loaded
      console.log('📊 ✅ Cache HIT - skipping duplicate fetch');
      console.log('   Key:', switchSensorFetchKey);
      console.log('   Data points:', switchSensorData.length);
      previousFetchKeyRef.current = switchSensorFetchKey;
      return;
    }

    // Prevent duplicate simultaneous requests
    if (fetchingSwitchDataRef.current) {
      console.log('📊 ⚠️ Fetch already in progress. Will skip this request.');
      console.log('   New key:', switchSensorFetchKey);
      console.log('   Current fetch key:', lastParams.fetchKey);
      return;
    }
    
    // Cache miss - need to fetch new data
    console.log('📊 🔄 Cache MISS - will fetch new data');
    console.log('   New key:', switchSensorFetchKey);
    console.log('   Previous key:', previousFetchKeyRef.current || lastParams.fetchKey || '(none)');
    
    // Update previous key immediately to prevent duplicate calls
    previousFetchKeyRef.current = switchSensorFetchKey;

    const fetchSwitchSensorData = async () => {
      fetchingSwitchDataRef.current = true;
      try {
        console.log(`📊 Fetching switch sensor data for key: ${switchSensorFetchKey}`);
        
        // Get shift time range for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [startHour, startMin] = selectedShift.start_time.slice(0, 5).split(':').map(Number);
        const [endHour, endMin] = selectedShift.end_time.slice(0, 5).split(':').map(Number);
        
        const startTime = new Date(today);
        startTime.setHours(startHour, startMin, 0, 0);
        
        const endTime = new Date(today);
        // Handle overnight shifts
        if (endHour * 60 + endMin <= startHour * 60 + startMin) {
          endTime.setDate(endTime.getDate() + 1); // Next day for overnight shift
        }
        endTime.setHours(endHour, endMin, 59, 999);

        // Fetch data for all switch sensors
        const allDataPromises = switchSensors.map(sensor =>
          api.get(`/data/sensor/${sensor.id}`, {
            params: {
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
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
        
        switchSensors.forEach((sensor, sensorIndex) => {
          const sensorDataArray = allResponses[sensorIndex].data || [];
          sensorDataArray.forEach(item => {
            const time = new Date(item.timestamp);
            const timeKey = time.toISOString();

            if (!dataMap.has(timeKey)) {
              dataMap.set(timeKey, {
                timestamp: time.toISOString(),
                time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
              });
              // Initialize all sensors to 0
              switchSensors.forEach(s => {
                const keyName = s.nameLower || s.name.toLowerCase();
                dataMap.get(timeKey)[keyName] = 0;
              });
            }

            const point = dataMap.get(timeKey);
            const keyName = sensor.nameLower || sensor.name.toLowerCase();
            point[keyName] = parseFloat(item.value);
          });
        });

        // Convert to array and sort by timestamp
        const timelineArray = Array.from(dataMap.values()).sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Filter by shift hours
        const filtered = filterDataByShift(timelineArray, selectedShift);
        
        // IMPORTANT: Update cache IMMEDIATELY and synchronously to prevent re-trigger
        // This must happen before any state updates
        lastFetchParamsRef.current = {
          fetchKey: switchSensorFetchKey,
          shiftId: selectedShift.id,
          date: new Date().toDateString(),
          timestamp: Date.now()
        };
        
        // Update fetch time
        lastFetchTimeRef.current = Date.now();
        
        // Update previous key ref
        previousFetchKeyRef.current = switchSensorFetchKey;
        
        // Now set the state (this won't trigger a re-fetch because cache is already set)
        setSwitchSensorData(filtered);
        
        console.log(`✅ Fetched ${filtered.length} switch sensor data points for shift ${selectedShift.name}`);
        console.log(`   Cached fetchKey: ${switchSensorFetchKey}`);
        console.log(`   Cache updated at: ${new Date(lastFetchParamsRef.current.timestamp).toLocaleTimeString()}`);
      } catch (error) {
        console.error('Error fetching switch sensor data for shift:', error);
        setSwitchSensorData([]);
      } finally {
        fetchingSwitchDataRef.current = false;
      }
    };

    fetchSwitchSensorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchSensorFetchKey]); // Only depend on the stable key - selectedShift is already included in the key

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

    return data.filter(point => {
      // Extract time from timestamp or time string
      let timeStr = point.time || point.timestamp;
      let pointDate = null;
      
      if (point.timestamp) {
        pointDate = new Date(point.timestamp);
        timeStr = `${String(pointDate.getHours()).padStart(2, '0')}:${String(pointDate.getMinutes()).padStart(2, '0')}`;
      } else if (point.time) {
        // For time strings, parse them
        timeStr = point.time;
      }
      
      const timeParts = timeStr.split(':');
      if (timeParts.length < 2) return true; // Include if time parsing fails
      
      const hour = parseInt(timeParts[0], 10);
      const min = parseInt(timeParts[1] || '0', 10);
      
      if (isNaN(hour) || isNaN(min)) return true; // Include if time parsing fails
      
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
  };

  const fetchSensors = async () => {
    try {
      const response = await api.get('/sensors');
      setSensors(response.data);
      
      // Filter for Switch type sensors dynamically based on database configuration
      // Use original database names (preserve case as configured)
      // Shows all active Switch sensors configured in Settings
      const switchSens = response.data
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
          name: s.name, // Use original database name (preserve case: CH01, ch01, etc.)
          nameLower: s.name.toLowerCase(), // Keep lowercase for matching
          location: s.location_name || 'Unknown',
          type: s.sensor_type || 'Switch',
          isActive: false,
          value: 0 // Initialize with OFF state (value=0)
        }));
      
      setSwitchSensors(switchSens);
      switchSensorsRef.current = switchSens;
      
      // Fetch latest sensor data to determine current active sensor
      if (switchSens.length > 0) {
        fetchLatestSensorData(switchSens);
      }
      
      if (response.data.length > 0 && !selectedSensor) {
        setSelectedSensor(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching sensors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest sensor data to determine current active sensor and check if payloads are being received
  const fetchLatestSensorDataRef = useRef(false); // Prevent duplicate calls
  const fetchLatestSensorData = async (sensorList) => {
    if (sensorList.length === 0) return;
    
    // Prevent duplicate simultaneous calls
    if (fetchLatestSensorDataRef.current) {
      console.log('📡 Already fetching latest sensor data, skipping duplicate request');
      return;
    }
    
    fetchLatestSensorDataRef.current = true;
    try {
      const sensorIds = sensorList.map(s => s.id).join(',');
      console.log(`📡 Fetching latest data for sensors: ${sensorIds}`);
      const response = await api.get(`/data/latest?sensor_ids=${sensorIds}`);
      
      // Check if any recent data exists (within configured timeout) to determine if system is "Live"
      const timeoutMs = payloadTimeoutMinutes * 60 * 1000;
      const timeoutAgo = new Date(Date.now() - timeoutMs);
      let hasRecentLiveData = false;
      let latestLiveDataTime = null;
      let hasRecentOfflineData = false;
      let latestOfflineDataTime = null;
      let latestDataTime = null;
      
      if (response.data && response.data.length > 0) {
        console.log(`📊 Processing ${response.data.length} latest data records`);
        response.data.forEach(d => {
          if (d.timestamp) {
            const dataTime = new Date(d.timestamp);
            const isRecent = dataTime >= timeoutAgo;
            const status = d.data_status || 'unknown';
            
            console.log(`   Sensor ${d.sensor_id}: timestamp=${dataTime.toISOString()}, data_status=${status}, isRecent=${isRecent}, timeout=${payloadTimeoutMinutes}min`);
            
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
                console.log(`   ✓ Found RECENT LIVE data for sensor ${d.sensor_id}`);
              } else if (d.data_status === 'offline') {
                hasRecentOfflineData = true;
                if (!latestOfflineDataTime || dataTime > latestOfflineDataTime) {
                  latestOfflineDataTime = dataTime;
                }
                console.log(`   ⚠ Found RECENT OFFLINE data for sensor ${d.sensor_id}`);
              } else {
                console.log(`   ? Found data with unknown status: ${status} for sensor ${d.sensor_id}`);
              }
            } else {
              console.log(`   ⏰ Data is OLD (${Math.round((Date.now() - dataTime.getTime()) / 1000 / 60)} minutes ago) for sensor ${d.sensor_id}`);
            }
          }
        });
      } else {
        console.log('⚠️ No latest data received from API');
      }
      
      console.log(`📊 Summary: hasRecentLiveData=${hasRecentLiveData}, hasRecentOfflineData=${hasRecentOfflineData}, latestLiveDataTime=${latestLiveDataTime ? latestLiveDataTime.toISOString() : 'null'}`);
      
      // Set payloadReceived based on data_status: true only if we have recent LIVE data
      // If we only have offline data or no recent data, set to false
      if (hasRecentLiveData && latestLiveDataTime) {
        setPayloadReceived(true);
        setLastPayloadTime(latestLiveDataTime);
        
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
            setSwitchSensors(prevSensors => 
              prevSensors.map(s => ({
                ...s,
                isActive: s.id === activeSensor.id
              }))
            );
          }
        } else {
          // No active sensor in recent data - set all to OFF (value=0)
          setActiveSensorId(null);
          setSwitchSensors(prevSensors => 
            prevSensors.map(s => ({
              ...s,
              isActive: false,
              value: 0 // Ensure value is 0 (OFF state)
            }))
          );
        }
      } else {
        // No recent live data - set to Offline and reset all sensors to inactive
        setPayloadReceived(false);
        
        // If we have recent offline data, show its timestamp; otherwise null
        if (hasRecentOfflineData && latestOfflineDataTime) {
          setLastPayloadTime(latestOfflineDataTime);
          console.log('⚠️ Recent offline data detected - Dashboard set to Offline, all sensors reset to OFF (value=0)');
        } else {
          setLastPayloadTime(null);
          console.log('⚠️ No recent payload data - Dashboard set to Offline, all sensors reset to OFF (value=0)');
        }
        
        setActiveSensorId(null);
        setSwitchSensors(prevSensors => 
          prevSensors.map(s => ({
            ...s,
            isActive: false,
            value: 0 // Ensure value is 0 (OFF state)
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching latest sensor data:', error);
      // On error, set to Offline
      setPayloadReceived(false);
      setLastPayloadTime(null);
    } finally {
      fetchLatestSensorDataRef.current = false;
    }
  };

  const fetchSensorData = async (sensorId) => {
    try {
      let startTime, endTime;
      const now = new Date();
      endTime = now.toISOString();

      // If shift is selected, fetch data for shift period
      if (selectedShift && selectedShift.start_time && selectedShift.end_time) {
        const startTimeStr = selectedShift.start_time.slice(0, 5); // HH:mm
        const endTimeStr = selectedShift.end_time.slice(0, 5); // HH:mm
        const [startHour, startMin] = startTimeStr.split(':').map(Number);
        const [endHour, endMin] = endTimeStr.split(':').map(Number);
        
        // Check if overnight shift
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const isOvernight = endMinutes <= startMinutes;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Calculate start time
        const shiftStart = new Date(now);
        shiftStart.setHours(startHour, startMin, 0, 0);
        shiftStart.setSeconds(0, 0);
        
        if (isOvernight) {
          // For overnight shifts (e.g., 22:00 - 06:00):
          // If current time is before end time (e.g., 02:00 < 06:00), shift started yesterday
          // If current time is after start time (e.g., 23:00 > 22:00), shift started today
          if (currentMinutes < endMinutes) {
            // We're in the part after midnight, so shift started yesterday
            shiftStart.setDate(shiftStart.getDate() - 1);
          }
          // Otherwise, we're between start and midnight, so shift started today (already set)
        } else {
          // For normal shifts, if start time hasn't occurred today, use yesterday
          if (currentMinutes < startMinutes) {
            shiftStart.setDate(shiftStart.getDate() - 1);
          }
        }
        
        startTime = shiftStart.toISOString();
      } else {
        // Default: last 1 hour
        startTime = new Date(Date.now() - 3600000).toISOString();
      }

      const response = await api.get(`/data/sensor/${sensorId}`, {
        params: {
          start_time: startTime,
          end_time: endTime,
          limit: 1000 // Increased limit to capture full shift period
        }
      });

      const formattedData = response.data.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        value: parseFloat(item.value),
        timestamp: item.timestamp
      }));

      setSensorData(formattedData);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    }
  };

  const { lastMessage } = useWebSocket(selectedSensor ? `sensor_${selectedSensor.id}` : null);

  useEffect(() => {
    if (lastMessage && selectedSensor && lastMessage.sensor_id === selectedSensor.id) {
      const newPoint = {
        time: new Date(lastMessage.timestamp).toLocaleTimeString(),
        value: parseFloat(lastMessage.value),
        timestamp: lastMessage.timestamp
      };

      setSensorData(prevData => {
        const updated = [...prevData, newPoint];
        // Keep last 100 data points
        return updated.slice(-100);
      });
    }
  }, [lastMessage, selectedSensor]);

  // Track sensor IDs to detect actual changes (not just array reference changes)
  const switchSensorIdsRef = useRef('');
  const isConnectingRef = useRef(false);
  
  // WebSocket connection for live switch sensor updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    
    // Create stable sensor IDs string for comparison
    const currentSensorIds = switchSensors.map(s => s.id).sort().join(',');
    
    // If sensor IDs haven't changed and socket is already connected, skip
    if (switchSensorIdsRef.current === currentSensorIds && socketRef.current?.connected) {
      return;
    }
    
    // Prevent duplicate connections
    if (isConnectingRef.current || (socketRef.current && socketRef.current.connected)) {
      console.log('🔌 WebSocket already connected or connecting, skipping...');
      return;
    }
    
    if (!token || switchSensors.length === 0) {
      // Clean up if no sensors
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Clean up existing connection if sensor IDs changed
    if (socketRef.current && switchSensorIdsRef.current !== currentSensorIds) {
      console.log('🔌 Sensor IDs changed, cleaning up old connection...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    switchSensorIdsRef.current = currentSensorIds;

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
      console.log('✅ Dashboard WebSocket connected');
      setWsConnected(true);
      isConnectingRef.current = false;
      // Join all switch sensor rooms
      switchSensorsRef.current.forEach(sensor => {
        socketInstance.emit('join_room', `sensor_${sensor.id}`);
      });
    });

    socketInstance.on('sensor_update', (data) => {
      console.log('🔴 Dashboard: LIVE UPDATE RECEIVED:', data);
      // Check data_status from WebSocket message - only mark as Live if data_status is 'live'
      const isLiveData = data.data_status === 'live' || !data.data_status; // Default to 'live' if not specified (backward compatibility)
      
      if (isLiveData) {
        // Mark that actual payload has been received (only for live data)
        setPayloadReceived(true);
        const now = new Date();
        setLastPayloadTime(now);
      } else {
        // If data_status is 'offline', mark as offline
        console.log('⚠️ Dashboard: Received offline status from WebSocket');
        setPayloadReceived(false);
        const now = new Date();
        setLastPayloadTime(now);
      }
      
      // Update switch sensor status
      if (data.sensor_id && data.sensor_name) {
        const sensorValue = parseFloat(data.value);
        const isActive = sensorValue === 1;
        
        setSwitchSensors(prevSensors => {
          // Match sensor by ID first, then by name (case-insensitive) as fallback
          const updated = prevSensors.map(sensor => {
            // Match by sensor_id (primary method)
            if (sensor.id === data.sensor_id) {
              return { ...sensor, isActive: isActive };
            }
            // Also try matching by name (case-insensitive) for compatibility
            const sensorNameLower = data.sensor_name.toLowerCase();
            const dbNameLower = sensor.nameLower || sensor.name.toLowerCase();
            if (dbNameLower === sensorNameLower) {
              return { ...sensor, isActive: isActive };
            } else if (isActive && sensor.isActive) {
              // If a sensor is turning ON, all others must be OFF (mutually exclusive)
              return { ...sensor, isActive: false, value: 0 }; // Set value to 0 (OFF state)
            }
            return sensor;
          });
          
          // Update activeSensorId
          const activeSensors = updated.filter(s => s.isActive);
          if (activeSensors.length > 0) {
            setActiveSensorId(activeSensors[0].id);
          } else {
            setActiveSensorId(null);
          }
          
          return updated;
        });
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`❌ Dashboard WebSocket DISCONNECTED. Reason: ${reason}`);
      setWsConnected(false);
      
      // If server disconnected us, don't try to reconnect automatically
      if (reason === 'io server disconnect') {
        console.log('⚠️  Server disconnected client - manual reconnection may be required');
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Dashboard WebSocket connection error:', error);
      setWsConnected(false);
      isConnectingRef.current = false;
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄✅ Dashboard WebSocket RECONNECTED after ${attemptNumber} attempts`);
      setWsConnected(true);
      // Rejoin all switch sensor rooms after reconnection
      switchSensorsRef.current.forEach(sensor => {
        socketInstance.emit('join_room', `sensor_${sensor.id}`);
      });
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Dashboard reconnection attempt ${attemptNumber}...`);
      setWsConnected(false);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Dashboard reconnection error:', error);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌❌❌ Dashboard WebSocket reconnection FAILED - giving up');
      setWsConnected(false);
    });

    return () => {
      isConnectingRef.current = false;
      if (socketInstance) {
        // Only cleanup if this is a real unmount, not just a dependency change
        if (socketRef.current === socketInstance) {
          switchSensorsRef.current.forEach(sensor => {
            try {
              socketInstance.emit('leave_room', `sensor_${sensor.id}`);
            } catch (e) {
              console.warn('⚠️ Error leaving room:', e);
            }
          });
          socketInstance.removeAllListeners();
          socketInstance.disconnect();
          socketRef.current = null;
        }
      }
    };
  }, [switchSensors.map(s => s.id).join(',')]); // Only depend on sensor IDs, not array reference

  // Periodic check for offline state - if no payload received within timeout, mark as offline
  useEffect(() => {
    const OFFLINE_TIMEOUT_MS = payloadTimeoutMinutes * 60 * 1000; // Use configurable timeout
    
    const checkOfflineStatus = () => {
      if (payloadReceived && lastPayloadTime) {
        const timeSinceLastPayload = Date.now() - lastPayloadTime.getTime();
        
        if (timeSinceLastPayload > OFFLINE_TIMEOUT_MS) {
          console.log(`⚠️  Dashboard: No payload received for ${Math.round(timeSinceLastPayload / 1000 / 60)} minutes - marking as OFFLINE`);
          console.log('   Setting all sensors to OFF state');
          
          // Mark as offline
          setPayloadReceived(false);
          
          // Reset all sensors to inactive (OFF state - value 0)
          setActiveSensorId(null);
          setSwitchSensors(prevSensors => 
            prevSensors.map(s => ({
              ...s,
              isActive: false,
              value: 0 // Ensure value is 0 (OFF state)
            }))
          );
          
          console.log('✅ Dashboard: All sensors reset to OFF (value=0) - system marked as Offline');
        }
      } else if (payloadReceived && !lastPayloadTime) {
        // If payloadReceived is true but no lastPayloadTime, reset it
        console.log('⚠️  Dashboard: payloadReceived is true but no lastPayloadTime - resetting to offline');
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

  // Update ref when switch sensors change - use length to avoid re-running on object reference changes
  useEffect(() => {
    switchSensorsRef.current = switchSensors;
  }, [switchSensors.length]); // Only update ref when length changes, not on every object reference change

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

  // Calculate summary metrics - MUST be before any early returns (React Hooks rule)
  const summaryMetrics = useMemo(() => {
    // Only show active sensor if payloads are being received (system is Live)
    const activeSensor = payloadReceived ? switchSensors.find(s => s.isActive) : null;
    
    // Calculate total switches based on shift data
    // Count the number of switch activations during the selected shift
    let switchCount = 0;
    
    if (selectedShift && switchSensorData.length > 0) {
      // Count transitions between sensors (switch activations)
      let previousActiveSensor = null;
      
      switchSensorData.forEach(point => {
        // Find which sensor was active at this point
        // Check for any sensor with value = 1
        const activeSensorAtPoint = switchSensors.find(sensor => {
          // Check if this point has data for this sensor
          const sensorKey = sensor.nameLower || sensor.name.toLowerCase();
          const value = point[sensorKey] !== undefined ? parseFloat(point[sensorKey]) : null;
          return value === 1;
        });
        
        if (activeSensorAtPoint && activeSensorAtPoint.name !== previousActiveSensor) {
          // This is a new activation (switch change)
          if (previousActiveSensor !== null) {
            switchCount++; // Count transition from one sensor to another
          } else if (previousActiveSensor === null) {
            // First activation from OFF state
            switchCount++;
          }
          previousActiveSensor = activeSensorAtPoint.name;
        } else if (!activeSensorAtPoint && previousActiveSensor !== null) {
          // Sensor turned OFF
          previousActiveSensor = null;
        }
      });
    } else if (activeSensor) {
      // Fallback: if no shift data but there's an active sensor, count as at least 1
      switchCount = 1;
    }
    
    return {
      activeSensor: (payloadReceived && activeSensor) ? activeSensor.name : 'None', // Use original database name (preserve case)
      totalSwitches: switchCount,
      totalSensors: switchSensors.length
    };
  }, [switchSensors, selectedShift, switchSensorData, payloadReceived]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (sensors.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          No sensors found. Please add sensors in the Settings page.
        </div>
      </div>
    );
  }

  // Handle dashboard click to show notification if offline
  const handleDashboardClick = () => {
    if (!payloadReceived) {
      setShowOfflineNotification(true);
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowOfflineNotification(false);
      }, 5000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" onClick={handleDashboardClick}>
      {/* Offline Notification */}
      {showOfflineNotification && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-fade-in">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">No Payload Received</p>
            <p className="text-sm mt-1">The system is offline. No sensor data is being received from the MQTT broker.</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOfflineNotification(false);
            }}
            className="ml-4 text-white hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${payloadReceived ? 'bg-green-500' : 'bg-gray-400'} ${payloadReceived ? 'animate-pulse' : ''}`}></div>
            <span className="text-sm text-gray-600 font-medium">
              {payloadReceived ? 'Live' : 'Offline'}
            </span>
            {lastPayloadTime && (
              <span className="text-xs text-gray-500 ml-2">
                Last: {lastPayloadTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Switch Sensor Status Cards */}
      {switchSensors.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Sensor Status</h2>
          <div className={`grid grid-cols-2 md:grid-cols-3 ${switchSensors.length <= 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-4 xl:grid-cols-6'} gap-4 mb-6`}>
            {switchSensors.map(sensor => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                isActive={sensor.isActive}
              />
            ))}
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Active Sensor</div>
              <div className="text-3xl font-bold text-green-600">
                {summaryMetrics.activeSensor}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Switches</div>
              <div className="text-3xl font-bold text-blue-600">
                {summaryMetrics.totalSwitches}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {getCurrentActiveShift 
                  ? `During ${getCurrentActiveShift.name}` 
                  : selectedShift 
                    ? `During ${selectedShift.name}` 
                    : 'In last 24 hours'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Sensors</div>
              <div className="text-3xl font-bold text-purple-600">
                {summaryMetrics.totalSensors}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

