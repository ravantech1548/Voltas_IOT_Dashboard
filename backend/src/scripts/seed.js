const pool = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('Seeding database...');

    // Create default admin user (password is securely hashed using bcrypt)
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);
    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, client_id)
      VALUES ('admin', 'admin@iotdashboard.com', $1, 'admin', NULL)
      ON CONFLICT (username) DO NOTHING
    `, [adminPasswordHash]);

    console.log('Created default admin user (username: admin, password: admin123)');

    // Create sample sensor types
    await pool.query(`
      INSERT INTO sensor_types (name, unit, description, min_value, max_value)
      VALUES 
        ('temperature', '°C', 'Temperature sensor', -50, 100),
        ('humidity', '%', 'Humidity sensor', 0, 100),
        ('pressure', 'hPa', 'Pressure sensor', 800, 1200),
        ('CO2', 'ppm', 'CO2 sensor', 0, 5000)
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('Created sample sensor types');

    // Create a sample client
    const clientResult = await pool.query(`
      INSERT INTO clients (name, site_address, contact_email)
      VALUES ('Demo Client', '123 Main St, City', 'demo@client.com')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    if (clientResult.rows.length > 0) {
      const clientId = clientResult.rows[0].id;

      // Create a sample department
      const deptResult = await pool.query(`
        INSERT INTO departments (client_id, name, description)
        VALUES ($1, 'Manufacturing', 'Main manufacturing department')
        RETURNING id
      `, [clientId]);

      const deptId = deptResult.rows[0].id;

      // Create a sample location
      const locResult = await pool.query(`
        INSERT INTO locations (department_id, name, floor_level)
        VALUES ($1, 'Production Floor', '1')
        RETURNING id
      `, [deptId]);

      const locId = locResult.rows[0].id;

      // Get temperature sensor type
      const tempSensorType = await pool.query('SELECT id FROM sensor_types WHERE name = $1', ['temperature']);

      if (tempSensorType.rows.length > 0) {
        await pool.query(`
          INSERT INTO sensors (location_id, sensor_type_id, name, mqtt_topic, sensor_count, status)
          VALUES ($1, $2, 'Temperature Sensor 1', 'client/$3/location/$1/sensor/', 1, 'active')
        `, [locId, tempSensorType.rows[0].id, clientId]);

        console.log('Created sample client, department, location, and sensor');
      }
    }

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;

