const pool = require('../config/database');

const run = async () => {
    try {
        console.log('Running addTimezoneSetting migration...');

        // Insert timezone setting if it doesn't exist
        await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES ('timezone', 'Asia/Kolkata', 'System-wide timezone for date/time display (e.g. Asia/Kolkata, Asia/Singapore)')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

        console.log('✅ Timezone setting added successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding timezone setting:', error);
        process.exit(1);
    }
};

run();
