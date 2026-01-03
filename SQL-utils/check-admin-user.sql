-- Check if admin user exists
-- Run this in pgAdmin Query Tool on the iot_dashboard database

-- First, check if users table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
) AS users_table_exists;

-- If table exists, check for admin user
SELECT 
    id,
    username,
    email,
    role,
    client_id,
    created_at,
    last_login
FROM users
WHERE username = 'admin';

-- Count total users
SELECT COUNT(*) AS total_users FROM users;

-- List all users (if you want to see all users)
SELECT 
    id,
    username,
    email,
    role,
    client_id,
    created_at
FROM users
ORDER BY created_at;


