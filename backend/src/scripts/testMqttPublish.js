/**
 * Test script to publish MQTT messages to the Voltas topic
 * This simulates device messages in the Voltas format
 * 
 * Usage:
 *   node src/scripts/testMqttPublish.js
 * 
 * Make sure your .env file has MQTT configuration set up
 */

const mqtt = require('mqtt');
require('dotenv').config();

// Get MQTT configuration from environment
const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const username = process.env.MQTT_USERNAME || '';
const password = process.env.MQTT_PASSWORD || '';
const topic = process.env.MQTT_TOPIC || 'voltas';

// Connection options
const options = {
  reconnectPeriod: 5000,
  connectTimeout: 10000
};

if (username && password) {
  options.username = username;
  options.password = password;
}

console.log(`\n🔌 Connecting to MQTT broker: ${brokerUrl.replace(/\/\/.*@/, '//***@')}`);
console.log(`📡 Topic: ${topic}\n`);

const client = mqtt.connect(brokerUrl, options);

client.on('connect', () => {
  console.log('✓ Connected to MQTT broker\n');
  console.log('📤 Starting to publish test messages...\n');
  console.log('Press Ctrl+C to stop\n');
  
  let messageCount = 0;
  
  // Publish test messages every 5 seconds
  const interval = setInterval(() => {
    messageCount++;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
    const timeStr = now.toTimeString().slice(0, 8);
    
    // Create test payload in Voltas format
    // Rotate which sensor is ON (s1-s6)
    const activeSensor = `s${((messageCount - 1) % 6) + 1}`;
    
    // Build data array - each sensor reading is a separate object
    const dataArray = [];
    for (let i = 1; i <= 6; i++) {
      const channel = `s${i}`;
      dataArray.push({
        [channel]: activeSensor === channel ? "1" : "0",
        st: timeStr
      });
    }
    
    const payload = {
      did: "00002",
      date: dateStr,
      data: dataArray
    };
    
    client.publish(topic, JSON.stringify(payload), (err) => {
      if (err) {
        console.error(`❌ Error publishing message #${messageCount}:`, err);
      } else {
        console.log(`✓ Published message #${messageCount} - Active sensor: ${activeSensor.toUpperCase()} (${activeSensor === 's1' ? 'ch01' : activeSensor === 's2' ? 'ch02' : activeSensor === 's3' ? 'ch03' : activeSensor === 's4' ? 'ch04' : activeSensor === 's5' ? 'ch05' : 'ch06'})`);
        console.log(`  Device: ${payload.did}, Time: ${timeStr}`);
      }
    });
  }, 5000); // Publish every 5 seconds
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping test publisher...');
    clearInterval(interval);
    client.end();
    process.exit(0);
  });
});

client.on('error', (error) => {
  console.error('❌ MQTT connection error:', error.message);
  process.exit(1);
});

client.on('offline', () => {
  console.error('❌ MQTT client went offline');
});

