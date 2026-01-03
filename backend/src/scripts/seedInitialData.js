const pool = require('../config/database');
require('dotenv').config();

const seedInitialData = async () => {
  try {
    console.log('Seeding initial data...');
    console.log('');

    // 1. Create Clients
    console.log('Creating clients...');
    
    // Check if clients already exist
    let voltasCheck = await pool.query('SELECT id FROM clients WHERE name = $1', ['Voltas']);
    let qautomationCheck = await pool.query('SELECT id FROM clients WHERE name = $1', ['Qautomation']);

    let voltasId, qautomationId;

    if (voltasCheck.rows.length > 0) {
      voltasId = voltasCheck.rows[0].id;
      console.log(`  - Voltas already exists (ID: ${voltasId})`);
    } else {
      const voltasResult = await pool.query(
        `INSERT INTO clients (name, site_address, contact_email)
         VALUES ('Voltas', NULL, NULL)
         RETURNING id`
      );
      voltasId = voltasResult.rows[0].id;
      console.log(`  - Created Voltas (ID: ${voltasId})`);
    }

    if (qautomationCheck.rows.length > 0) {
      qautomationId = qautomationCheck.rows[0].id;
      console.log(`  - Qautomation already exists (ID: ${qautomationId})`);
    } else {
      const qautomationResult = await pool.query(
        `INSERT INTO clients (name, site_address, contact_email)
         VALUES ('Qautomation', NULL, NULL)
         RETURNING id`
      );
      qautomationId = qautomationResult.rows[0].id;
      console.log(`  - Created Qautomation (ID: ${qautomationId})`);
    }

    // 2. Create Departments
    console.log('Creating departments...');
    
    let engDeptCheck = await pool.query('SELECT id FROM departments WHERE name = $1 AND client_id = $2', ['Engineering', voltasId]);
    let opsDeptCheck = await pool.query('SELECT id FROM departments WHERE name = $1 AND client_id = $2', ['Operations', voltasId]);

    let engDeptId, opsDeptId;

    if (engDeptCheck.rows.length > 0) {
      engDeptId = engDeptCheck.rows[0].id;
      console.log(`  - Engineering already exists (ID: ${engDeptId})`);
    } else {
      const engDeptResult = await pool.query(
        `INSERT INTO departments (client_id, name, description)
         VALUES ($1, 'Engineering', NULL)
         RETURNING id`,
        [voltasId]
      );
      engDeptId = engDeptResult.rows[0].id;
      console.log(`  - Created Engineering (ID: ${engDeptId})`);
    }

    if (opsDeptCheck.rows.length > 0) {
      opsDeptId = opsDeptCheck.rows[0].id;
      console.log(`  - Operations already exists (ID: ${opsDeptId})`);
    } else {
      const opsDeptResult = await pool.query(
        `INSERT INTO departments (client_id, name, description)
         VALUES ($1, 'Operations', NULL)
         RETURNING id`,
        [voltasId]
      );
      opsDeptId = opsDeptResult.rows[0].id;
      console.log(`  - Created Operations (ID: ${opsDeptId})`);
    }

    // 3. Create Locations
    console.log('Creating locations...');
    
    let cbeSouthCheck = await pool.query('SELECT id FROM locations WHERE name = $1', ['CBE-South']);
    let cbeNorthCheck = await pool.query('SELECT id FROM locations WHERE name = $1', ['CBE-North']);

    let cbeSouthId, cbeNorthId;

    if (cbeSouthCheck.rows.length > 0) {
      cbeSouthId = cbeSouthCheck.rows[0].id;
      console.log(`  - CBE-South already exists (ID: ${cbeSouthId})`);
    } else {
      const cbeSouthResult = await pool.query(
        `INSERT INTO locations (department_id, name, floor_level)
         VALUES ($1, 'CBE-South', NULL)
         RETURNING id`,
        [engDeptId]
      );
      cbeSouthId = cbeSouthResult.rows[0].id;
      console.log(`  - Created CBE-South (ID: ${cbeSouthId})`);
    }

    if (cbeNorthCheck.rows.length > 0) {
      cbeNorthId = cbeNorthCheck.rows[0].id;
      console.log(`  - CBE-North already exists (ID: ${cbeNorthId})`);
    } else {
      const cbeNorthResult = await pool.query(
        `INSERT INTO locations (department_id, name, floor_level)
         VALUES ($1, 'CBE-North', NULL)
         RETURNING id`,
        [engDeptId]
      );
      cbeNorthId = cbeNorthResult.rows[0].id;
      console.log(`  - Created CBE-North (ID: ${cbeNorthId})`);
    }

    // 4. Create Sensor Types
    console.log('Creating sensor types...');
    
    let tempCheck = await pool.query('SELECT id FROM sensor_types WHERE name = $1', ['Temperature']);
    let humidityCheck = await pool.query('SELECT id FROM sensor_types WHERE name = $1', ['Humidity']);
    let pressureCheck = await pool.query('SELECT id FROM sensor_types WHERE name = $1', ['Pressure']);
    let switchCheck = await pool.query('SELECT id FROM sensor_types WHERE name = $1', ['Switch']);

    let tempId, humidityId, pressureId, switchId;

    if (tempCheck.rows.length > 0) {
      tempId = tempCheck.rows[0].id;
      console.log(`  - Temperature already exists (ID: ${tempId})`);
    } else {
      const tempResult = await pool.query(
        `INSERT INTO sensor_types (name, unit, description, min_value, max_value)
         VALUES ('Temperature', '°C', 'Temperature sensor', -50, 100)
         RETURNING id`
      );
      tempId = tempResult.rows[0].id;
      console.log(`  - Created Temperature (ID: ${tempId})`);
    }

    if (humidityCheck.rows.length > 0) {
      humidityId = humidityCheck.rows[0].id;
      console.log(`  - Humidity already exists (ID: ${humidityId})`);
    } else {
      const humidityResult = await pool.query(
        `INSERT INTO sensor_types (name, unit, description, min_value, max_value)
         VALUES ('Humidity', '%', 'Humidity sensor', 0, 100)
         RETURNING id`
      );
      humidityId = humidityResult.rows[0].id;
      console.log(`  - Created Humidity (ID: ${humidityId})`);
    }

    if (pressureCheck.rows.length > 0) {
      pressureId = pressureCheck.rows[0].id;
      console.log(`  - Pressure already exists (ID: ${pressureId})`);
    } else {
      const pressureResult = await pool.query(
        `INSERT INTO sensor_types (name, unit, description, min_value, max_value)
         VALUES ('Pressure', 'hPa', 'Pressure sensor', 800, 1200)
         RETURNING id`
      );
      pressureId = pressureResult.rows[0].id;
      console.log(`  - Created Pressure (ID: ${pressureId})`);
    }

    if (switchCheck.rows.length > 0) {
      switchId = switchCheck.rows[0].id;
      console.log(`  - Switch already exists (ID: ${switchId})`);
    } else {
      const switchResult = await pool.query(
        `INSERT INTO sensor_types (name, unit, description, min_value, max_value)
         VALUES ('Switch', 'State', 'Switch signal type (On/Off)', 0, 1)
         RETURNING id`
      );
      switchId = switchResult.rows[0].id;
      console.log(`  - Created Switch (ID: ${switchId})`);
    }

    // 5. Create Sensors (ch01 to ch06)
    console.log('Creating sensors...');
    const sensorNames = ['ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06'];
    const sensorTypeIds = [tempId, humidityId, pressureId]; // Rotate through types

    for (let i = 0; i < sensorNames.length; i++) {
      const sensorName = sensorNames[i];
      const locationId = i < 3 ? cbeSouthId : cbeNorthId; // First 3 in CBE-South, next 3 in CBE-North
      const sensorTypeId = sensorTypeIds[i % 3]; // Rotate through types
      const mqttTopic = `client/${voltasId}/location/${locationId}/sensor/${sensorName}`;

      // Check if sensor already exists
      const existing = await pool.query('SELECT id FROM sensors WHERE name = $1', [sensorName]);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO sensors (location_id, sensor_type_id, name, mqtt_topic, sensor_count, status)
           VALUES ($1, $2, $3, $4, 1, 'active')`,
          [locationId, sensorTypeId, sensorName, mqttTopic]
        );
        console.log(`  - Created sensor ${sensorName}`);
      } else {
        console.log(`  - Sensor ${sensorName} already exists`);
      }
    }

    console.log(`  ✓ Created sensors: ${sensorNames.join(', ')}`);

    console.log('');
    console.log('Initial data seeding complete!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Clients: 2 (Voltas, Qautomation)`);
    console.log(`  - Departments: 2 (Engineering, Operations)`);
    console.log(`  - Locations: 2 (CBE-South, CBE-North)`);
    console.log(`  - Sensor Types: 4 (Temperature, Humidity, Pressure, Switch)`);
    console.log(`  - Sensors: 6 (ch01-ch06)`);

  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  seedInitialData()
    .then(() => {
      console.log('');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      process.exit(1);
    });
}

module.exports = seedInitialData;

