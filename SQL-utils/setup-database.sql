-- IoT Dashboard Database Setup Script
-- Execute this script as PostgreSQL superuser (postgres)
-- You can run this in pgAdmin, psql, or any PostgreSQL client

-- Create the database
CREATE DATABASE iot_dashboard;

-- Create the user
CREATE USER iotuser WITH PASSWORD 'iotpassword';

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;

-- Connect to the database and grant schema permissions (important for PostgreSQL 15+)
\c iot_dashboard

-- Grant schema permissions (fixes "permission denied for schema public" error)
GRANT ALL ON SCHEMA public TO iotuser;
GRANT CREATE ON SCHEMA public TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;

