/**
 * Comprehensive test script to verify MQTT → WebSocket → Frontend flow
 * 
 * Usage:
 *   node src/scripts/testMqttAndWebSocket.js
 */

const { getIO } = require('../services/socketHandler');
const pool = require('../config/database');

async function testFlow() {
  console.log('\n🧪 Testing MQTT → WebSocket → Frontend Flow\n');
  
  try {
    // 1. Check sensor cache
    console.log('1️⃣  Checking sensors in database...');
    const sensorResult = await pool.query(
      `SELECT id, name FROM sensors 
       WHERE LOWER(name) IN ('ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06')
       ORDER BY name`
    );
    
    if (sensorResult.rows.length === 0) {
      console.error('❌ No sensors found! Run: npm run seed-initial');
      process.exit(1);
    }
    
    console.log(`✅ Found ${sensorResult.rows.length} sensors:`);
    sensorResult.rows.forEach(row => {
      console.log(`   - ${row.name} (ID: ${row.id})`);
    });
    
    // 2. Test WebSocket broadcasting
    console.log('\n2️⃣  Testing WebSocket broadcast...');
    const io = getIO();
    
    const testSensor = sensorResult.rows[0];
    const roomName = `sensor_${testSensor.id}`;
    const room = io.sockets.adapter.rooms.get(roomName);
    const clientCount = room ? room.size : 0;
    
    console.log(`   Room: ${roomName}`);
    console.log(`   Clients in room: ${clientCount}`);
    
    if (clientCount === 0) {
      console.warn('   ⚠️  No clients in room! Make sure frontend is open and connected.');
    }
    
    const testData = {
      sensor_id: testSensor.id,
      sensor_name: testSensor.name.toLowerCase(),
      value: 1,
      timestamp: new Date().toISOString(),
      metadata: { test: true },
      topic: 'test',
      device_id: 'test_device'
    };
    
    console.log(`\n   📤 Broadcasting test message...`);
    io.to(roomName).emit('sensor_update', testData);
    console.log(`   ✅ Test message sent!`);
    console.log(`   Check frontend - ${testSensor.name} should turn ON`);
    
    // 3. Wait a moment, then send OFF
    setTimeout(() => {
      console.log(`\n   📤 Sending OFF signal...`);
      testData.value = 0;
      io.to(roomName).emit('sensor_update', testData);
      console.log(`   ✅ OFF signal sent!`);
      
      setTimeout(() => {
        console.log('\n✅ Test complete!\n');
        process.exit(0);
      }, 500);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFlow();

