-- Fix: Add shift_id column to users table
-- Run this in pgAdmin Query Tool on the iot_dashboard database
-- This script safely adds the shift_id column if it doesn't exist

-- Step 1: Create shifts table if it doesn't exist
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add shift_id column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'shift_id'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN shift_id INT REFERENCES shifts(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added shift_id column to users table';
  ELSE
    RAISE NOTICE 'shift_id column already exists in users table';
  END IF;
END
$$;

-- Step 3: Create index on shift_id
CREATE INDEX IF NOT EXISTS idx_users_shift_id ON users(shift_id);

-- Step 4: Insert default shifts (if they don't exist)
INSERT INTO shifts (name, start_time, end_time, description, is_active)
VALUES 
  ('Morning Shift', '06:00:00', '14:00:00', 'Morning shift from 6 AM to 2 PM', TRUE),
  ('Afternoon Shift', '14:00:00', '22:00:00', 'Afternoon shift from 2 PM to 10 PM', TRUE),
  ('Night Shift', '22:00:00', '06:00:00', 'Night shift from 10 PM to 6 AM', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Verification: Check that the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'shift_id';

-- Note: Admin users will have NULL shift_id (which is correct - admins don't need shifts)
-- Operators should have a shift_id assigned


