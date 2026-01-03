const pool = require('../config/database');

/**
 * Middleware to check if operator user is within their assigned shift time
 * Only applies to users with role 'operator'
 * Admins and managers bypass this check
 */
const checkShiftAccess = async (req, res, next) => {
  try {
    const user = req.user;

    // Allow admins and managers to access anytime
    if (user.role === 'admin' || user.role === 'manager') {
      return next();
    }

    // Only check shift access for operators
    if (user.role !== 'operator') {
      return next();
    }

    // If operator doesn't have a shift assigned, deny access
    if (!user.shift_id) {
      return res.status(403).json({ 
        error: 'Access denied. No shift assigned to your account. Please contact administrator.' 
      });
    }

    // Get shift details
    const shiftResult = await pool.query(
      'SELECT id, name, start_time, end_time, is_active FROM shifts WHERE id = $1',
      [user.shift_id]
    );

    if (shiftResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. Your assigned shift no longer exists. Please contact administrator.' 
      });
    }

    const shift = shiftResult.rows[0];

    // Check if shift is active
    if (!shift.is_active) {
      return res.status(403).json({ 
        error: 'Access denied. Your assigned shift is currently inactive. Please contact administrator.' 
      });
    }

    // Check if current time is within shift hours
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:mm:ss format

    const isWithinShift = isTimeInShift(currentTime, shift.start_time, shift.end_time);

    if (!isWithinShift) {
      return res.status(403).json({ 
        error: `Access denied. You can only access the system during your shift (${shift.start_time} - ${shift.end_time}). Current time: ${currentTime}` 
      });
    }

    // Add shift info to request for potential use
    req.shift = shift;
    next();
  } catch (error) {
    console.error('Error in shift access check:', error);
    res.status(500).json({ error: 'Error checking shift access' });
  }
};

/**
 * Check if current time is within shift hours
 * Handles shifts that span midnight (e.g., 22:00 to 06:00)
 */
function isTimeInShift(currentTime, startTime, endTime) {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  // Handle shifts that span midnight (end time is earlier than start time)
  if (end < start) {
    // Shift spans midnight (e.g., 22:00 to 06:00)
    // User is in shift if current >= start OR current <= end
    return current >= start || current <= end;
  } else {
    // Normal shift within same day
    return current >= start && current <= end;
  }
}

/**
 * Convert time string (HH:mm:ss) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

module.exports = checkShiftAccess;


