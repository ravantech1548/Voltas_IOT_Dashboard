const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const initDatabase = require('./initDatabase');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    console.log('Creating admin user...');
    console.log('');

    // First, check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Users table does not exist. Initializing database schema...');
      console.log('');
      await initDatabase();
      console.log('');
    }

    // Create admin user
    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@iotdashboard.com';
    const role = 'admin';

    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id, username, role FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`User '${username}' already exists with role '${user.role}'`);
      console.log('Updating password and ensuring admin role...');
      
      // Hash password securely using bcrypt (generate salt first)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2 WHERE username = $3',
        [passwordHash, role, username]
      );
      console.log(`✓ User '${username}' password and role updated`);
      console.log('  NOTE: Password is securely hashed using bcrypt before storage.');
    } else {
      // Hash password securely using bcrypt (generate salt first)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Insert admin user (shift_id is NULL for admins - they don't need shifts)
      // Handle case where shift_id column may not exist yet
      try {
        await pool.query(
          `INSERT INTO users (username, email, password_hash, role, client_id, shift_id)
           VALUES ($1, $2, $3, $4, NULL, NULL)`,
          [username, email, passwordHash, role]
        );
      } catch (error) {
        // If shift_id column doesn't exist, insert without it
        if (error.code === '42703') { // column does not exist
          await pool.query(
            `INSERT INTO users (username, email, password_hash, role, client_id)
             VALUES ($1, $2, $3, $4, NULL)`,
            [username, email, passwordHash, role]
          );
        } else {
          throw error;
        }
      }

      console.log(`✓ Admin user created successfully!`);
    }

    console.log('');
    console.log('Login credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: ${role}`);
    console.log('');
    console.log('NOTE: Password is securely hashed using bcrypt before storage.');
    console.log('');
    console.log('Admin user setup complete!');
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    
    if (error.code === '42P01') { // relation does not exist
      console.error('');
      console.error('Database tables do not exist. The script should have initialized them.');
      console.error('Please run database initialization manually:');
      console.error('  node src/scripts/initDatabase.js');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('Cannot connect to database. Please check:');
      console.error('  1. PostgreSQL is running');
      console.error('  2. DATABASE_URL in .env file is correct');
      console.error('  3. Database credentials are correct');
    } else if (error.code === '23505') { // unique violation
      console.error('');
      console.error('User already exists (unique constraint violation).');
    }
    
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      process.exit(1);
    });
}

module.exports = createAdminUser;
