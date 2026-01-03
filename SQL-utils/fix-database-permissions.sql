-- Fix Database Permissions Script
-- Run this as PostgreSQL superuser (postgres user)
-- This grants necessary permissions to the iotuser on the public schema

-- Grant schema usage and creation privileges
GRANT ALL ON SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iotuser;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;

-- If using PostgreSQL 15+, also grant CREATE privilege explicitly
GRANT CREATE ON SCHEMA public TO iotuser;

-- Verify permissions (optional - for checking)
SELECT 
    nspname AS schema_name,
    has_schema_privilege('iotuser', nspname, 'CREATE') AS can_create,
    has_schema_privilege('iotuser', nspname, 'USAGE') AS can_use
FROM pg_namespace
WHERE nspname = 'public';


