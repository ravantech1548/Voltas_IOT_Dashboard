const bcrypt = require('bcryptjs');

/**
 * Utility script to hash passwords using bcrypt
 * Usage: node src/scripts/hashPassword.js <password>
 * Example: node src/scripts/hashPassword.js admin123
 * 
 * If no password is provided, it will hash "admin123" by default
 */
const hashPassword = async () => {
  try {
    const password = process.argv[2] || 'admin123';
    const rounds = 10;

    console.log('========================================');
    console.log('Password Hashing Utility');
    console.log('========================================');
    console.log('');
    console.log(`Password to hash: ${password}`);
    console.log(`Bcrypt rounds: ${rounds}`);
    console.log('');

    // Generate salt and hash password
    console.log('Generating salt and hashing password...');
    const salt = await bcrypt.genSalt(rounds);
    const hash = await bcrypt.hash(password, salt);

    console.log('');
    console.log('========================================');
    console.log('Result:');
    console.log('========================================');
    console.log('');
    console.log('Hashed Password (for database):');
    console.log(hash);
    console.log('');

    // Verify the hash works
    console.log('Verifying hash...');
    const isValid = await bcrypt.compare(password, hash);
    if (isValid) {
      console.log('✓ Hash verification successful!');
      console.log('  The hash correctly corresponds to the password.');
    } else {
      console.log('✗ Hash verification failed!');
      console.log('  Something went wrong.');
    }
    console.log('');

    // Show example SQL
    console.log('========================================');
    console.log('Example SQL (for reference only):');
    console.log('========================================');
    console.log('');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';`);
    console.log('');
    console.log('Or INSERT:');
    console.log(`INSERT INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@example.com', '${hash}', 'admin');`);
    console.log('');
    console.log('========================================');
    console.log('Security Notes:');
    console.log('========================================');
    console.log('');
    console.log('1. This hash should be stored in the password_hash column');
    console.log('2. Never store the plaintext password in the database');
    console.log('3. The hash includes the salt, so each hash is unique');
    console.log('4. Use bcrypt.compare() to verify passwords during login');
    console.log('5. Usernames are NOT hashed (they are stored in plaintext)');
    console.log('');

  } catch (error) {
    console.error('Error hashing password:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  hashPassword()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = hashPassword;


