const mqtt = require('mqtt');
const pool = require('../config/database');
const { getIO } = require('./socketHandler');
const mqttConfig = require('../config/mqtt');

let mqttClient = null;
let reconnectAttempts = 0;
let lastErrorLog = 0;
const ERROR_LOG_INTERVAL = 30000; // Log errors at most once every 30 seconds

// Cache for sensor name to ID mapping (ch01 -> sensor_id)
let sensorNameToIdCache = {};
// Cache for sensor configurations (device_id, channel_code, mqtt_payload_topic)
let sensorConfigCache = {}; // key: sensor_id, value: {device_id, channel_code, mqtt_payload_topic, name}
let channelCodeToSensorCache = {}; // key: channel_code (e.g., "s1"), value: {sensor_id, sensor_name}
let deviceIdToSensorsCache = {}; // key: device_id, value: array of {sensor_id, sensor_name, channel_code}
let sensorCacheTimestamp = 0;
const SENSOR_CACHE_TTL = 60000; // Cache for 60 seconds

/**
 * Get sensor ID by sensor name (ch01, ch02, etc.)
 * Uses caching to reduce database queries
 */
const getSensorIdByName = async (sensorName) => {
  // Check cache first
  const now = Date.now();
  if (sensorNameToIdCache[sensorName] && (now - sensorCacheTimestamp < SENSOR_CACHE_TTL)) {
    return sensorNameToIdCache[sensorName];
  }

  try {
    // Try case-insensitive lookup first - if multiple found, use the one with lowest ID
    const result = await pool.query(
      'SELECT id FROM sensors WHERE LOWER(name) = LOWER($1) ORDER BY id ASC LIMIT 1', 
      [sensorName]
    );
    
    if (result.rows.length > 0) {
      const sensorId = result.rows[0].id;
      // Cache both original and lowercase versions
      sensorNameToIdCache[sensorName] = sensorId;
      sensorNameToIdCache[sensorName.toLowerCase()] = sensorId;
      sensorCacheTimestamp = now;
      return sensorId;
    }
    
    // If not found, refresh entire cache and try again
    await refreshSensorCache();
    // Try both exact match and lowercase match
    return sensorNameToIdCache[sensorName] || sensorNameToIdCache[sensorName.toLowerCase()] || null;
  } catch (error) {
    console.error(`Error fetching sensor ID for ${sensorName}:`, error);
    return null;
  }
};

/**
 * Refresh the sensor cache with full configuration (name, device_id, channel_code, mqtt_payload_topic)
 */
const refreshSensorCache = async () => {
  try {
    // Get all Switch type sensors with their MQTT configuration
    const result = await pool.query(
      `SELECT s.id, s.name, s.device_id, s.channel_code, s.mqtt_payload_topic, s.status
       FROM sensors s
       JOIN sensor_types st ON s.sensor_type_id = st.id
       WHERE LOWER(st.name) = 'switch'
       AND s.status = 'active'
       ORDER BY s.name ASC`
    );
    
    sensorNameToIdCache = {};
    sensorConfigCache = {};
    channelCodeToSensorCache = {};
    deviceIdToSensorsCache = {};
    
    result.rows.forEach(row => {
      // Store name to ID mapping
      const nameLower = row.name.toLowerCase();
      sensorNameToIdCache[row.name] = row.id;
      sensorNameToIdCache[nameLower] = row.id;
      
      // Store full sensor configuration
      sensorConfigCache[row.id] = {
        name: row.name,
        device_id: row.device_id,
        channel_code: row.channel_code,
        mqtt_payload_topic: row.mqtt_payload_topic,
        status: row.status
      };
      
      // Build channel_code to sensor mapping (if channel_code is configured)
      if (row.channel_code) {
        const channelLower = row.channel_code.toLowerCase();
        channelCodeToSensorCache[channelLower] = {
          sensor_id: row.id,
          sensor_name: row.name,
          device_id: row.device_id
        };
      }
      
      // Build device_id to sensors mapping (if device_id is configured)
      if (row.device_id) {
        if (!deviceIdToSensorsCache[row.device_id]) {
          deviceIdToSensorsCache[row.device_id] = [];
        }
        deviceIdToSensorsCache[row.device_id].push({
          sensor_id: row.id,
          sensor_name: row.name,
          channel_code: row.channel_code
        });
      }
    });
    
    sensorCacheTimestamp = Date.now();
    
    console.log(`✓ Refreshed sensor cache: ${result.rows.length} sensors mapped`);
    result.rows.forEach(row => {
      const config = `device_id=${row.device_id || 'N/A'}, channel=${row.channel_code || 'N/A'}, topic=${row.mqtt_payload_topic || 'N/A'}`;
      console.log(`   ${row.name} (ID: ${row.id}) - ${config}`);
    });
    
    // Log summary
    const withDeviceId = result.rows.filter(r => r.device_id).length;
    const withChannelCode = result.rows.filter(r => r.channel_code).length;
    const withTopic = result.rows.filter(r => r.mqtt_payload_topic).length;
    console.log(`   Summary: ${withDeviceId} with device_id, ${withChannelCode} with channel_code, ${withTopic} with mqtt_payload_topic`);
  } catch (error) {
    console.error('Error refreshing sensor cache:', error);
  }
};

/**
 * Map sensor channel code (s1, s2, etc.) to sensor name (ch01, ch02, etc.)
 */
const mapChannelToSensorName = (channel) => {
  const mapping = {
    's1': 'ch01',
    's2': 'ch02',
    's3': 'ch03',
    's4': 'ch04',
    's5': 'ch05',
    's6': 'ch06'
  };
  return mapping[channel] || null;
};

/**
 * Parse date and time strings into a Date object
 * date format: "2026-01-03 12:13:55" or "2026-01-03"
 * time format: "12:13:55"
 */
const parseDateTime = (dateStr, timeStr = null) => {
  try {
    if (timeStr) {
      // Combine date and time
      const combined = `${dateStr.split(' ')[0]} ${timeStr}`;
      return new Date(combined);
    } else {
      // Date string might already include time
      return new Date(dateStr);
    }
  } catch (error) {
    console.error('Error parsing datetime:', error);
    return new Date(); // Fallback to current time
  }
};

/**
 * Get the last complete snapshot of all sensors for a device
 * Returns a map of sensor_id -> value for the most recent timestamp
 */
const getLastPayloadSnapshot = async (deviceId, sensorIds) => {
  try {
    if (!sensorIds || sensorIds.length === 0) {
      return null;
    }
    
    // Get the most recent timestamp that has records for all sensors (or most sensors)
    const result = await pool.query(
      `SELECT sensor_id, value, timestamp
       FROM sensor_data
       WHERE sensor_id = ANY($1)
       AND metadata->>'device_id' = $2
       AND timestamp = (
         SELECT MAX(timestamp) 
         FROM sensor_data 
         WHERE sensor_id = ANY($1)
         AND metadata->>'device_id' = $2
       )
       ORDER BY sensor_id`,
      [sensorIds, deviceId]
    );
    
    if (result.rows.length === 0) {
      return null; // No previous snapshot
    }
    
    // Build map of sensor_id -> value from the last snapshot
    const snapshot = {};
    result.rows.forEach(row => {
      snapshot[row.sensor_id] = parseFloat(row.value);
    });
    
    return snapshot;
  } catch (error) {
    console.error(`Error getting last payload snapshot for device ${deviceId}:`, error);
    return null; // On error, treat as no previous snapshot (will insert)
  }
};

/**
 * Check if sensor value has changed from the last recorded value
 * Returns true if value should be inserted (changed or first record)
 * DEPRECATED: Use getLastPayloadSnapshot instead for comparing full payloads
 */
const shouldInsertSensorValue = async (sensorId, newValue) => {
  try {
    const result = await pool.query(
      `SELECT value FROM sensor_data 
       WHERE sensor_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [sensorId]
    );
    
    if (result.rows.length === 0) {
      // No previous record - insert this one
      return { shouldInsert: true, lastValue: null };
    }
    
    const lastValue = parseFloat(result.rows[0].value);
    const newValueFloat = parseFloat(newValue);
    
    if (lastValue !== newValueFloat) {
      // Value has changed - insert new record
      return { shouldInsert: true, lastValue };
    } else {
      // Value unchanged - skip database insertion
      return { shouldInsert: false, lastValue };
    }
  } catch (error) {
    console.error(`Error checking last value for sensor ${sensorId}:`, error);
    // On error, insert anyway to ensure data integrity
    return { shouldInsert: true, lastValue: null };
  }
};

const initializeMQTT = () => {
  // Check if MQTT is disabled
  if (mqttConfig.disabled) {
    console.log('MQTT is disabled (MQTT_DISABLED=true)');
    return;
  }

  // Validate configuration
  if (!mqttConfig.brokerUrl) {
    console.error('ERROR: MQTT_BROKER_URL is not configured in .env file');
    return;
  }

  // Log connection details (hide password)
  console.log(`Connecting to MQTT broker: ${mqttConfig.brokerUrl.replace(/\/\/.*@/, '//***@')}`);
  if (mqttConfig.username) {
    console.log(`Using MQTT username: ${mqttConfig.username}`);
  }

  mqttClient = mqtt.connect(mqttConfig.brokerUrl, mqttConfig.options);

  mqttClient.on('connect', async () => {
    console.log('✓ Connected to MQTT broker');
    reconnectAttempts = 0; // Reset on successful connection
    
    // Refresh sensor cache on connection
    await refreshSensorCache();
    
    // Periodically refresh sensor cache (every 5 minutes) to pick up configuration changes
    setInterval(async () => {
      console.log('🔄 Periodically refreshing sensor cache...');
      const oldTopics = new Set(
        Object.values(sensorConfigCache)
          .filter(c => c.mqtt_payload_topic && c.status === 'active')
          .map(c => c.mqtt_payload_topic)
      );
      
      await refreshSensorCache();
      
      // Check for new topics and subscribe
      const newTopics = new Set(
        Object.values(sensorConfigCache)
          .filter(c => c.mqtt_payload_topic && c.status === 'active')
          .map(c => c.mqtt_payload_topic)
      );
      
      // Subscribe to newly added topics
      newTopics.forEach(topic => {
        if (!oldTopics.has(topic)) {
          mqttClient.subscribe(topic, (err) => {
            if (err) {
              console.error(`Error subscribing to new MQTT topic: ${topic}`, err);
            } else {
              console.log(`✓ Subscribed to new topic from sensor config: ${topic}`);
            }
          });
        }
      });
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Collect all topics to subscribe to
    const topicsSet = new Set();
    
    // 1. Add topics from environment variable (MQTT_TOPIC)
    const envTopics = mqttConfig.topic.split(',').map(t => t.trim()).filter(t => t);
    envTopics.forEach(t => topicsSet.add(t));
    
    // 2. Add topics from sensor mqtt_payload_topic configurations
    Object.values(sensorConfigCache).forEach(config => {
      if (config.mqtt_payload_topic && config.status === 'active') {
        topicsSet.add(config.mqtt_payload_topic);
      }
    });
    
    const topics = Array.from(topicsSet);
    
    // Subscribe to all collected topics
    topics.forEach((topic, index) => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`Error subscribing to MQTT topic: ${topic}`, err);
        } else {
          console.log(`✓ Subscribed to MQTT topic [${index + 1}/${topics.length}]: ${topic}`);
        }
      });
    });
    
    if (topics.length === 0) {
      console.warn('⚠ No MQTT topics configured. Set MQTT_TOPIC in .env file or configure mqtt_payload_topic in sensor settings.');
    } else {
      console.log(`📡 Subscribed to ${topics.length} topic(s): ${topics.join(', ')}`);
    }
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      // Log received message (for debugging)
      console.log(`\n📨 ===== MQTT MESSAGE RECEIVED =====`);
      console.log(`   Topic: ${topic}`);
      console.log(`   Message length: ${message.length} bytes`);
      
      // Parse message payload
      let payload;
      try {
        payload = JSON.parse(message.toString());
        console.log(`   Parsed payload structure:`, {
          hasDid: !!payload.did,
          hasDate: !!payload.date,
          hasData: !!payload.data,
          dataIsArray: Array.isArray(payload.data),
          dataLength: Array.isArray(payload.data) ? payload.data.length : 0
        });
      } catch (parseError) {
        console.error('❌ Error parsing MQTT message as JSON:', parseError.message);
        console.error('Raw message (first 200 chars):', message.toString().substring(0, 200));
        return;
      }

      // Handle Voltas device format: { did, date, data: [{ s1, st }, { s2, st }, ...] }
      if (payload.did !== undefined && payload.data && Array.isArray(payload.data)) {
        const { did, date, data } = payload;
        
        console.log(`📦 Processing device ${did} with ${data.length} sensor readings`);
        console.log(`   Date: ${date}`);
        console.log(`   Data array preview:`, data.map(r => {
          const ch = Object.keys(r).find(k => k.startsWith('s'));
          return ch ? `${ch}=${r[ch]}` : '?';
        }).join(', '));
        
        // Check if device_id matches any configured sensors
        const deviceSensors = deviceIdToSensorsCache[did] || [];
        if (deviceSensors.length === 0) {
          console.warn(`⚠️  No sensors configured for device_id: ${did}. Check sensor configuration in Settings.`);
        }
        
        // Process all sensor readings in the data array
        // IMPORTANT: Compare current payload with previous payload snapshot
        // Only store to database if ANY sensor value has changed from previous payload
        // If all values are same as previous payload, skip database insert
        
        const statusTime = data.length > 0 && data[0].st ? data[0].st : null;
        const timestamp = parseDateTime(date, statusTime);
        
        console.log(`📊 Processing payload snapshot at ${timestamp.toISOString()}`);
        
        // First pass: Map all sensors from current payload
        const sensorUpdates = [];
        const sensorIds = [];
        
        for (const reading of data) {
          // Find the sensor channel (s1, s2, s3, s4, s5, s6)
          const channel = Object.keys(reading).find(key => key.startsWith('s') && key.length === 2);
          
          if (!channel) {
            console.warn(`⚠️  Skipping reading - no valid channel found:`, reading);
            continue; // Skip if no valid channel found
          }
          
          const channelLower = channel.toLowerCase();
          
          // Try to find sensor by device_id + channel_code from database configuration
          let sensorConfig = null;
          let sensorId = null;
          let sensorName = null;
          
          // Method 1: Look up by device_id + channel_code (from database configuration)
          const matchedSensor = deviceSensors.find(s => 
            s.channel_code && s.channel_code.toLowerCase() === channelLower
          );
          
          if (matchedSensor && sensorConfigCache[matchedSensor.sensor_id]) {
            sensorConfig = sensorConfigCache[matchedSensor.sensor_id];
            sensorId = matchedSensor.sensor_id;
            sensorName = matchedSensor.sensor_name;
            console.log(`   ✅ Matched by device_id (${did}) + channel_code (${channel}): ${sensorName} (ID: ${sensorId})`);
          } else {
            // Method 2: Fallback to channel_code lookup (without device_id check)
            const channelMatch = channelCodeToSensorCache[channelLower];
            if (channelMatch && sensorConfigCache[channelMatch.sensor_id]) {
              sensorConfig = sensorConfigCache[channelMatch.sensor_id];
              // Verify device_id matches if configured
              if (!sensorConfig.device_id || sensorConfig.device_id === did) {
                sensorId = channelMatch.sensor_id;
                sensorName = channelMatch.sensor_name;
                console.log(`   ✅ Matched by channel_code (${channel}): ${sensorName} (ID: ${sensorId})`);
              } else {
                console.warn(`   ⚠️  Channel ${channel} matches sensor ${channelMatch.sensor_name}, but device_id mismatch (expected: ${sensorConfig.device_id}, got: ${did})`);
                continue;
              }
            } else {
              // Method 3: Fallback to hardcoded mapping (backward compatibility)
              sensorName = mapChannelToSensorName(channel);
              if (sensorName) {
                sensorId = await getSensorIdByName(sensorName);
                if (sensorId && sensorConfigCache[sensorId]) {
                  sensorConfig = sensorConfigCache[sensorId];
                  // Verify device_id matches if configured
                  if (sensorConfig.device_id && sensorConfig.device_id !== did) {
                    console.warn(`   ⚠️  Sensor ${sensorName} device_id mismatch (expected: ${sensorConfig.device_id}, got: ${did})`);
                    continue;
                  }
                  console.log(`   ⚠️  Using fallback mapping for ${channel} -> ${sensorName} (ID: ${sensorId})`);
                }
              }
            }
          }
          
          if (!sensorId || !sensorName) {
            console.warn(`⚠️  Could not find sensor for device_id=${did}, channel=${channel}. Configure in Settings.`);
            continue;
          }
          
          const value = parseFloat(reading[channel]);
          sensorIds.push(sensorId);
          
          // Store sensor update for comparison and batch processing
          sensorUpdates.push({
            sensorId,
            sensorName,
            channel,
            value,
            metadata: {
              device_id: did,
              channel: channel,
              sensor_name: sensorName,
              status_timestamp: statusTime,
              mqtt_topic: topic
            }
          });
          
          console.log(`   🔄 Mapped ${sensorName} (${channel}): value=${value}, sensorId=${sensorId}`);
        }
        
        // Second pass: Compare current payload with previous payload snapshot
        // Get the last complete snapshot for this device
        const previousSnapshot = await getLastPayloadSnapshot(did, sensorIds);
        
        let shouldStoreSnapshot = false;
        
        if (!previousSnapshot) {
          // No previous snapshot - store this one (first payload)
          console.log(`📝 No previous snapshot found - storing first payload snapshot`);
          shouldStoreSnapshot = true;
        } else {
          // Compare current payload with previous snapshot
          console.log(`🔍 Comparing current payload with previous snapshot...`);
          
          for (const update of sensorUpdates) {
            const previousValue = previousSnapshot[update.sensorId];
            const currentValue = update.value;
            
            if (previousValue === undefined) {
              // New sensor in payload - store
              console.log(`   🔴 New sensor ${update.sensorName} found - will store`);
              shouldStoreSnapshot = true;
              break;
            } else if (previousValue !== currentValue) {
              // Value changed - store entire snapshot
              console.log(`   🔴 ${update.sensorName} changed: ${previousValue} → ${currentValue} - will store snapshot`);
              shouldStoreSnapshot = true;
              break;
            } else {
              console.log(`   ✅ ${update.sensorName}: ${currentValue} (unchanged)`);
            }
          }
          
          if (!shouldStoreSnapshot) {
            console.log(`⏭️  All sensor values unchanged from previous payload - skipping database insert`);
          }
        }
        
        // Third pass: Insert ALL sensor statuses if any value changed
        // This creates a complete snapshot of all sensors at this timestamp
        if (shouldStoreSnapshot) {
          console.log(`📝 Storing complete payload snapshot at ${timestamp.toISOString()}`);
          
          for (const update of sensorUpdates) {
            try {
              // Use INSERT ... ON CONFLICT to handle duplicate timestamps
              await pool.query(
                `INSERT INTO sensor_data (sensor_id, value, timestamp, metadata) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (sensor_id, timestamp) 
                 DO UPDATE SET value = EXCLUDED.value, metadata = EXCLUDED.metadata`,
                [
                  update.sensorId,
                  update.value,
                  timestamp,
                  JSON.stringify(update.metadata)
                ]
              );
              
              console.log(`   ✅ Stored ${update.sensorName}: value=${update.value}`);
            } catch (insertError) {
              console.error(`   ❌ Error inserting data for ${update.sensorName}:`, insertError);
            }
          }
          
          processedCount = sensorUpdates.length;
          console.log(`✅ Stored complete snapshot: ${processedCount} sensors at ${timestamp.toISOString()}`);
        } else {
          processedCount = sensorUpdates.length;
          console.log(`⏭️  Skipped database insert (no changes) - ${processedCount} sensors in payload`);
          // Still broadcast to WebSocket for real-time updates
        }

        // Broadcast to WebSocket clients - ALWAYS broadcast for real-time updates
        // Broadcast ALL sensor updates from this payload snapshot
        try {
          const io = getIO();
          
          for (const update of sensorUpdates) {
            const roomName = `sensor_${update.sensorId}`;
            const updateData = {
              sensor_id: update.sensorId,
              sensor_name: update.sensorName,
              value: update.value,
              timestamp: timestamp.toISOString(),
              metadata: update.metadata,
              topic,
              device_id: did,
              channel_code: update.channel
            };
            
            // Get number of clients in room
            const room = io.sockets.adapter.rooms.get(roomName);
            const clientCount = room ? room.size : 0;
            
            // Always broadcast, even if value is 0 (so frontend knows sensor is OFF)
            io.to(roomName).emit('sensor_update', updateData);
            
            console.log(`📡 Broadcasted ${update.sensorName} (${update.channel}): value=${update.value} to room "${roomName}" (${clientCount} clients)`);
            
            if (clientCount === 0) {
              console.warn(`⚠️  No clients in room "${roomName}" - message was sent but not received!`);
            }
          }
          
          console.log(`✅ Broadcasted ${sensorUpdates.length} sensor updates from payload snapshot at ${timestamp.toISOString()}`);
        } catch (err) {
          console.error('❌ Socket.IO broadcast error:', err);
          console.warn('Socket.IO not initialized, skipping broadcast');
        }
        
        console.log(`✅ Finished processing payload from device ${did}: ${processedCount} sensors processed`);
        
        console.log(`📊 Summary: Processed ${processedCount} out of ${data.length} sensor readings from device ${did}`);
        console.log(`📨 ===== END MQTT MESSAGE PROCESSING =====\n`);
        
        return; // Successfully processed Voltas format
      }

      // Legacy format support: { sensor_id, value, timestamp, metadata }
      const { sensor_id, sensorId, value, timestamp, metadata } = payload;
      
      if (sensor_id || sensorId) {
        const id = sensor_id || sensorId;
        
        if (value === undefined) {
          console.error('Invalid MQTT payload: missing value', payload);
          return;
        }

        // Check if value has changed before inserting
        const { shouldInsert, lastValue } = await shouldInsertSensorValue(id, value);
        
        if (shouldInsert) {
          if (lastValue === null) {
            console.log(`📝 First record for sensor ${id} - inserting value=${value}`);
          } else {
            console.log(`📝 Status change detected for sensor ${id}: ${lastValue} → ${value} - inserting`);
          }
          
          // Insert into PostgreSQL
          await pool.query(
            'INSERT INTO sensor_data (sensor_id, value, timestamp, metadata) VALUES ($1, $2, $3, $4)',
            [
              id,
              parseFloat(value),
              timestamp ? new Date(timestamp) : new Date(),
              metadata ? JSON.stringify(metadata) : null
            ]
          );
        } else {
          console.log(`⏭️  No status change for sensor ${id} (value=${value} unchanged) - skipping database insert`);
        }

        // Broadcast to WebSocket clients
        try {
          const io = getIO();
          io.to(`sensor_${id}`).emit('sensor_update', {
            sensor_id: id,
            value: parseFloat(value),
            timestamp: timestamp || new Date().toISOString(),
            metadata,
            topic
          });
        } catch (err) {
          console.warn('Socket.IO not initialized, skipping broadcast');
        }

        console.log(`✓ Processed MQTT message for sensor ${id}: ${value} (topic: ${topic})`);
        return;
      } 
      
      // Legacy format: Array of sensor data
      if (Array.isArray(payload)) {
        for (const item of payload) {
          const id = item.sensor_id || item.sensorId;
          if (id !== undefined && item.value !== undefined) {
            // Check if value has changed before inserting
            const { shouldInsert, lastValue } = await shouldInsertSensorValue(id, item.value);
            
            if (shouldInsert) {
              if (lastValue === null) {
                console.log(`📝 First record for sensor ${id} - inserting value=${item.value}`);
              } else {
                console.log(`📝 Status change detected for sensor ${id}: ${lastValue} → ${item.value} - inserting`);
              }
              
              await pool.query(
                'INSERT INTO sensor_data (sensor_id, value, timestamp, metadata) VALUES ($1, $2, $3, $4)',
                [
                  id,
                  parseFloat(item.value),
                  item.timestamp ? new Date(item.timestamp) : new Date(),
                  item.metadata ? JSON.stringify(item.metadata) : null
                ]
              );
            } else {
              console.log(`⏭️  No status change for sensor ${id} (value=${item.value} unchanged) - skipping database insert`);
            }
            
            try {
              const io = getIO();
              io.to(`sensor_${id}`).emit('sensor_update', {
                sensor_id: id,
                value: parseFloat(item.value),
                timestamp: item.timestamp || new Date().toISOString(),
                metadata: item.metadata,
                topic
              });
            } catch (err) {
              console.warn('Socket.IO not initialized, skipping broadcast');
            }
            
            console.log(`✓ Processed MQTT message for sensor ${id}: ${item.value}`);
          }
        }
        return;
      }
      
      // Unknown format
      console.warn('Unknown MQTT payload format. Expected Voltas format {did, date, data} or legacy formats.', payload);
    } catch (error) {
      console.error('Error processing MQTT message:', error);
      console.error('Topic:', topic, 'Message:', message.toString().substring(0, 200));
    }
  });

  mqttClient.on('error', (error) => {
    const now = Date.now();
    // Only log errors occasionally to reduce spam
    if (now - lastErrorLog > ERROR_LOG_INTERVAL) {
      console.warn('⚠ MQTT connection error:', error.message);
      console.warn('   MQTT broker may not be running. The server will continue without MQTT.');
      console.warn('   To disable MQTT warnings, set MQTT_DISABLED=true in .env');
      console.warn('   To start Mosquitto: See MQTT_SETUP.md for instructions');
      lastErrorLog = now;
    }
  });

  mqttClient.on('close', () => {
    // Only log on first disconnect, not on every reconnection attempt
    if (reconnectAttempts === 0) {
      console.warn('⚠ MQTT client disconnected. Attempting to reconnect...');
      console.warn('   The server will continue to run without MQTT.');
    }
  });

  mqttClient.on('reconnect', () => {
    reconnectAttempts++;
    // Only log every 10th reconnection attempt
    if (reconnectAttempts % 10 === 0) {
      console.warn(`⚠ MQTT reconnection attempt #${reconnectAttempts}...`);
      console.warn('   Start Mosquitto to enable MQTT features.');
    }
  });

  // Handle offline event
  mqttClient.on('offline', () => {
    if (reconnectAttempts === 0) {
      console.warn('⚠ MQTT broker is offline.');
    }
  });
};

const getMQTTClient = () => mqttClient;

module.exports = {
  initializeMQTT,
  getMQTTClient
};

