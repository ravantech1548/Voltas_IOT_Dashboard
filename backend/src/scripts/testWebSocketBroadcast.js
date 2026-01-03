/**
 * Test script to manually broadcast a WebSocket message
 * This helps verify that WebSocket broadcasting is working
 * even if MQTT isn't receiving messages
 * 
 * Usage:
 *   node src/scripts/testWebSocketBroadcast.js <sensor_id> <value>
 * 
 * Example:
 *   node src/scripts/testWebSocketBroadcast.js 7 1
 */

const { getIO } = require('../services/socketHandler');

const sensorId = process.argv[2] || 7;
const value = process.argv[3] || 1;
const sensorName = process.argv[4] || 'ch01';

console.log(`\n📡 Testing WebSocket broadcast...`);
console.log(`   Sensor ID: ${sensorId}`);
console.log(`   Sensor Name: ${sensorName}`);
console.log(`   Value: ${value}\n`);

try {
  const io = getIO();
  const roomName = `sensor_${sensorId}`;
  
  // Check how many clients are in the room
  const room = io.sockets.adapter.rooms.get(roomName);
  const clientCount = room ? room.size : 0;
  
  console.log(`📊 Room "${roomName}" has ${clientCount} client(s)`);
  
  if (clientCount === 0) {
    console.warn('⚠️  No clients in room! Make sure frontend is connected and has joined the room.');
  }
  
  const testData = {
    sensor_id: parseInt(sensorId),
    sensor_name: sensorName,
    value: parseFloat(value),
    timestamp: new Date().toISOString(),
    metadata: {
      test: true,
      source: 'manual_test_script'
    },
    topic: 'test',
    device_id: 'test_device'
  };
  
  console.log(`📤 Broadcasting test message...`);
  console.log(`   Data:`, JSON.stringify(testData, null, 2));
  
  io.to(roomName).emit('sensor_update', testData);
  
  console.log(`\n✅ Test message broadcasted to room "${roomName}"`);
  console.log(`   Check your frontend - sensor cards should update!\n`);
  
  // Keep process alive for a moment
  setTimeout(() => {
    process.exit(0);
  }, 1000);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('   Make sure the backend server is running and Socket.IO is initialized');
  process.exit(1);
}

