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
  const socketRef = useRef(null);
  const switchSensorsRef = useRef([]);

  useEffect(() => {
    fetchSensors();
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

  // Fetch data for all switch sensors during the current shift for "Total Switches" calculation
  useEffect(() => {
    if (switchSensors.length === 0 || !selectedShift) return;

    const fetchSwitchSensorData = async () => {
      try {
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
        setSwitchSensorData(filtered);
      } catch (error) {
        console.error('Error fetching switch sensor data for shift:', error);
        setSwitchSensorData([]);
      }
    };

    fetchSwitchSensorData();
  }, [switchSensors, selectedShift]);

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
          isActive: false
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
  const fetchLatestSensorData = async (sensorList) => {
    if (sensorList.length === 0) return;
    
    try {
      const sensorIds = sensorList.map(s => s.id).join(',');
      const response = await api.get(`/data/latest?sensor_ids=${sensorIds}`);
      
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
            setSwitchSensors(prevSensors => 
              prevSensors.map(s => ({
                ...s,
                isActive: s.id === activeSensor.id
              }))
            );
          }
        } else {
          // No active sensor in recent data
          setActiveSensorId(null);
          setSwitchSensors(prevSensors => 
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
        setSwitchSensors(prevSensors => 
          prevSensors.map(s => ({
            ...s,
            isActive: false
          }))
        );
        console.log('⚠️ No recent payload data - Dashboard set to Offline');
      }
    } catch (error) {
      console.error('Error fetching latest sensor data:', error);
      // On error, set to Offline
      setPayloadReceived(false);
      setLastPayloadTime(null);
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

  // WebSocket connection for live switch sensor updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    
    if (!token || switchSensorsRef.current.length === 0) return;

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
      // Join all switch sensor rooms
      switchSensorsRef.current.forEach(sensor => {
        socketInstance.emit('join_room', `sensor_${sensor.id}`);
      });
    });

    socketInstance.on('sensor_update', (data) => {
      // Mark that actual payload has been received
      setPayloadReceived(true);
      setLastPayloadTime(new Date());
      
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
              return { ...sensor, isActive: false };
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
      if (socketInstance) {
        switchSensorsRef.current.forEach(sensor => {
          socketInstance.emit('leave_room', `sensor_${sensor.id}`);
        });
        socketInstance.disconnect();
      }
    };
  }, [switchSensors.length]);

  // Update ref when switch sensors change
  useEffect(() => {
    switchSensorsRef.current = switchSensors;
  }, [switchSensors]);

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
    const activeSensor = switchSensors.find(s => s.isActive);
    
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
      activeSensor: activeSensor ? activeSensor.name : 'None', // Use original database name (preserve case)
      totalSwitches: switchCount,
      totalSensors: switchSensors.length
    };
  }, [switchSensors, selectedShift, switchSensorData]);

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

  return (
    <div className="container mx-auto px-4 py-8">
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

