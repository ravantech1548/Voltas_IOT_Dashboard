const pool = require('../config/database');
require('dotenv').config();

const addShiftsSchema = async () => {
  try {
    console.log('Adding shifts schema...');

    // Create shifts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('✓ Created shifts table');

    // Add shift_id column to users table if it doesn't exist
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'shift_id'
      );
    `);

    if (!columnExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN shift_id INT REFERENCES shifts(id) ON DELETE SET NULL
      `);
      console.log('✓ Added shift_id column to users table');
    } else {
      console.log('✓ shift_id column already exists in users table');
    }

    // Create index on shift_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_shift_id ON users(shift_id)
    `);

    console.log('✓ Created index on shift_id');

    // Insert default shifts (Morning, Afternoon, Night)
    const defaultShifts = [
      { name: 'Morning Shift', start_time: '06:00:00', end_time: '14:00:00', description: 'Morning shift from 6 AM to 2 PM' },
      { name: 'Afternoon Shift', start_time: '14:00:00', end_time: '22:00:00', description: 'Afternoon shift from 2 PM to 10 PM' },
      { name: 'Night Shift', start_time: '22:00:00', end_time: '06:00:00', description: 'Night shift from 10 PM to 6 AM' }
    ];

    for (const shift of defaultShifts) {
      await pool.query(`
        INSERT INTO shifts (name, start_time, end_time, description, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO UPDATE
        SET start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            description = EXCLUDED.description,
            updated_at = NOW()
      `, [shift.name, shift.start_time, shift.end_time, shift.description, true]);
    }

    console.log('✓ Created default shifts');

    console.log('');
    console.log('Shifts schema added successfully!');
  } catch (error) {
    console.error('Error adding shifts schema:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  addShiftsSchema()
    .then(() => {
      console.log('');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      process.exit(1);
    });
}

module.exports = addShiftsSchema;


