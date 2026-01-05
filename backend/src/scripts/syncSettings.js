const pool = require('../config/database');

const run = async () => {
    try {
        console.log('Syncing system settings...');

        // Update heartbeat to 15 if it is 1
        await pool.query(`
      UPDATE system_settings 
      SET setting_value = '15', updated_at = NOW()
      WHERE setting_key = 'heartbeat_interval_minutes' AND setting_value = '1'
    `);

        // Ensure timezone exists
        await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, description)
      VALUES ('timezone', 'Asia/Kolkata', 'System-wide timezone for date/time display')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

        console.log('✅ Settings synced.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing settings:', error);
        process.exit(1);
    }
};

run();
