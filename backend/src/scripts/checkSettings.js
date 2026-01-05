const pool = require('../config/database');

const run = async () => {
    try {
        const res = await pool.query('SELECT * FROM system_settings');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
