const pool = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

/**
 * Script to create an operator user with shift assignment
 * Usage: node src/scripts/createOperatorUser.js <username> <password> <email> <shift_id>
 * Example: node src/scripts/createOperatorUser.js operator1 op123 operator1@example.com 1
 */
const createOperatorUser = async () => {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
      console.error('Usage: node createOperatorUser.js <username> <password> <email> <shift_id>');
      console.error('');
      console.error('Example:');
      console.error('  node createOperatorUser.js operator1 op123 operator1@example.com 1');
      console.error('');
      console.error('Available shifts:');
      
      // List available shifts
      const shiftsResult = await pool.query('SELECT id, name, start_time, end_time FROM shifts ORDER BY id');
      if (shiftsResult.rows.length > 0) {
        shiftsResult.rows.forEach(shift => {
          console.error(`  ID ${shift.id}: ${shift.name} (${shift.start_time} - ${shift.end_time})`);
        });
      } else {
        console.error('  No shifts found. Please create shifts first using add-shifts-schema.bat');
      }
      
      process.exit(1);
    }

    const [username, password, email, shiftId] = args;

    console.log('Creating operator user...');
    console.log('');

    // Validate shift exists
    const shiftResult = await pool.query('SELECT id, name, is_active FROM shifts WHERE id = $1', [shiftId]);
    if (shiftResult.rows.length === 0) {
      console.error(`ERROR: Shift with ID ${shiftId} does not exist!`);
      process.exit(1);
    }

    const shift = shiftResult.rows[0];
    if (!shift.is_active) {
      console.error(`ERROR: Shift "${shift.name}" is not active!`);
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, username, role FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`User '${username}' already exists. Updating password and shift...`);
      
      // Hash password securely using bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2, shift_id = $3 WHERE username = $4',
        [passwordHash, 'operator', shiftId, username]
      );
      console.log(`✓ Operator user '${username}' updated successfully`);
    } else {
      // Hash password securely using bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Insert operator user
      await pool.query(
        `INSERT INTO users (username, email, password_hash, role, shift_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [username, email, passwordHash, 'operator', shiftId]
      );

      console.log(`✓ Operator user created successfully!`);
    }

    console.log('');
    console.log('Login credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  Email: ${email}`);
    console.log(`  Role: operator`);
    console.log(`  Shift: ${shift.name} (${shift.start_time} - ${shift.end_time})`);
    console.log('');
    console.log('NOTE: Password is securely hashed using bcrypt before storage.');
    console.log('');

  } catch (error) {
    console.error('Error creating operator user:', error.message);
    
    if (error.code === '42P01') {
      console.error('');
      console.error('Database tables do not exist. Please run:');
      console.error('  node src/scripts/initDatabase.js');
      console.error('  node src/scripts/addShiftsSchema.js');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('Cannot connect to database. Please check:');
      console.error('  1. PostgreSQL is running');
      console.error('  2. DATABASE_URL in .env file is correct');
    } else if (error.code === '23505') {
      console.error('');
      console.error('User with this username or email already exists.');
    } else if (error.code === '23503') {
      console.error('');
      console.error('Invalid shift_id. Shift does not exist.');
    }
    
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createOperatorUser()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

module.exports = createOperatorUser;


