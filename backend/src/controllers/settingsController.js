const pool = require('../config/database');
const { reloadSystemSettings } = require('../services/mqttHandler');

/**
 * Get all system settings
 */
const getAllSettings = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT setting_key, setting_value, description, updated_at FROM system_settings ORDER BY setting_key'
    );

    // Convert array to object for easier access
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
        updated_at: row.updated_at
      };
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    next(error);
  }
};

/**
 * Get a specific setting by key
 */
const getSetting = async (req, res, next) => {
  try {
    const { key } = req.params;

    const result = await pool.query(
      'SELECT setting_key, setting_value, description, updated_at FROM system_settings WHERE setting_key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const row = result.rows[0];

    // Reload MQTT settings if timeout/interval settings were updated
    if (['payload_timeout_minutes', 'offline_check_interval_minutes', 'heartbeat_interval_minutes'].includes(key)) {
      await reloadSystemSettings();
    }

    res.json({
      setting_key: row.setting_key,
      setting_value: row.setting_value,
      description: row.description,
      updated_at: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching system setting:', error);
    next(error);
  }
};

/**
 * Update a setting
 */
const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { setting_value, description } = req.body;

    if (setting_value === undefined || setting_value === null) {
      return res.status(400).json({ error: 'setting_value is required' });
    }

    // Validate numeric settings
    if (['payload_timeout_minutes', 'offline_check_interval_minutes', 'heartbeat_interval_minutes'].includes(key)) {
      const numValue = parseFloat(setting_value);
      if (isNaN(numValue) || numValue <= 0) {
        return res.status(400).json({ error: 'Value must be a positive number' });
      }
      if (numValue < 0.5) {
        return res.status(400).json({ error: 'Value must be at least 0.5 minutes' });
      }
      if (numValue > 60) {
        return res.status(400).json({ error: 'Value cannot exceed 60 minutes' });
      }
    }

    // Validate timezone setting
    if (key === 'timezone') {
      try {
        // Simple check: see if Intl supports it. fallback to valid IANA string check if needed.
        // We really only expect 'Asia/Kolkata' or 'Asia/Singapore' from the UI, but let's allow any valid one.
        Intl.DateTimeFormat(undefined, { timeZone: setting_value });
      } catch (e) {
        return res.status(400).json({ error: 'Invalid timezone identifier' });
      }
    }

    const result = await pool.query(
      `UPDATE system_settings 
       SET setting_value = $1, 
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE setting_key = $3
       RETURNING setting_key, setting_value, description, updated_at`,
      [String(setting_value), description || null, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Reload MQTT settings if timeout/interval settings were updated
    if (['payload_timeout_minutes', 'offline_check_interval_minutes', 'heartbeat_interval_minutes'].includes(key)) {
      await reloadSystemSettings();
    }

    res.json({
      setting_key: result.rows[0].setting_key,
      setting_value: result.rows[0].setting_value,
      description: result.rows[0].description,
      updated_at: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    next(error);
  }
};

/**
 * Update multiple settings at once
 */
const updateMultipleSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updated = {};
      for (const [key, value] of Object.entries(settings)) {
        // Validate numeric settings
        if (['payload_timeout_minutes', 'offline_check_interval_minutes', 'heartbeat_interval_minutes'].includes(key)) {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Invalid value for ${key}: must be a positive number` });
          }
          if (numValue < 0.5) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Value for ${key} must be at least 0.5 minutes` });
          }
          if (numValue > 60) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Value for ${key} cannot exceed 60 minutes` });
          }
        }

        // Validate timezone
        if (key === 'timezone') {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: value });
          } catch (e) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Invalid timezone identifier: ${value}` });
          }
        }

        const result = await client.query(
          `UPDATE system_settings 
           SET setting_value = $1, updated_at = NOW()
           WHERE setting_key = $2
           RETURNING setting_key, setting_value, description, updated_at`,
          [String(value), key]
        );

        if (result.rows.length > 0) {
          updated[key] = {
            setting_key: result.rows[0].setting_key,
            setting_value: result.rows[0].setting_value,
            description: result.rows[0].description,
            updated_at: result.rows[0].updated_at
          };
        }
      }

      await client.query('COMMIT');

      // Reload MQTT settings if any timeout/interval/timezone settings were updated
      const timeoutSettingsUpdated = Object.keys(settings).some(key =>
        ['payload_timeout_minutes', 'offline_check_interval_minutes', 'heartbeat_interval_minutes', 'timezone'].includes(key)
      );
      if (timeoutSettingsUpdated) {
        await reloadSystemSettings();
      }

      res.json({ updated, message: 'Settings updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating multiple settings:', error);
    next(error);
  }
};

module.exports = {
  getAllSettings,
  getSetting,
  updateSetting,
  updateMultipleSettings
};

