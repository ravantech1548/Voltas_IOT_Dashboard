require('dotenv').config();

/**
 * MQTT Configuration
 * All MQTT settings can be configured via environment variables in .env file
 */
const mqttConfig = {
  // MQTT Broker URL
  // For HiveMQ Cloud: mqtts://your-cluster-id.s1.eu.hivemq.cloud:8883
  // For local Mosquitto: mqtt://localhost:1883
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  
  // MQTT Credentials (required for HiveMQ Cloud)
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
  
  // MQTT Topic to subscribe to
  // Can be a specific topic or use wildcards like 'voltas/#' to subscribe to all sub-topics
  topic: process.env.MQTT_TOPIC || 'client/+/dept/+/location/+/sensor/+',
  
  // Connection options
  options: {
    reconnectPeriod: 5000, // Reconnect every 5 seconds
    connectTimeout: 10000, // 10 second timeout
    
    // Add credentials if provided
    ...(process.env.MQTT_USERNAME && process.env.MQTT_PASSWORD && {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD
    }),
    
    // For secure MQTT (mqtts://), rejectUnauthorized can be set to false for self-signed certs
    ...(process.env.MQTT_BROKER_URL && process.env.MQTT_BROKER_URL.startsWith('mqtts://') && {
      rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== 'false'
    })
  },
  
  // Disable MQTT entirely if needed
  disabled: process.env.MQTT_DISABLED === 'true'
};

module.exports = mqttConfig;

