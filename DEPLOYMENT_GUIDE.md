# Complete Deployment Guide - IoT Dashboard Platform

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Schema](#database-schema)
4. [Database Setup](#database-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [MQTT Configuration](#mqtt-configuration)
8. [Production Deployment](#production-deployment)
9. [Environment Variables](#environment-variables)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)

---

## Overview

This guide provides complete instructions for deploying the IoT Dashboard Platform, including database schema, backend API, frontend application, and MQTT integration.

### System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │◄────►│   Backend    │◄────►│ PostgreSQL  │
│   (React)   │      │  (Node.js)   │      │  Database   │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  MQTT Broker │
                     │  (HiveMQ/    │
                     │   Mosquitto) │
                     └──────────────┘
```

### Key Technologies

- **Backend**: Node.js 18+, Express.js, PostgreSQL 14+, Socket.io
- **Frontend**: React 18+, Tailwind CSS, Recharts, Socket.io-client
- **Database**: PostgreSQL with TimescaleDB extension (optional)
- **Real-time**: WebSocket (Socket.io) for live data streaming
- **MQTT**: MQTT.js for sensor data ingestion
- **Authentication**: JWT with bcrypt password hashing

---

## Prerequisites

### System Requirements

- **Operating System**: Windows 10+, Linux (Ubuntu 20.04+), or macOS 10.15+
- **Node.js**: Version 18.0 or higher
- **PostgreSQL**: Version 14.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Memory**: Minimum 4GB RAM (8GB recommended for production)
- **Disk Space**: Minimum 10GB free space

### Software Installation

#### 1. Install Node.js

**Windows:**
- Download from https://nodejs.org/
- Run installer and follow wizard
- Verify: `node --version` and `npm --version`

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node@18
```

#### 2. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Run installer (remember the postgres user password)
- PostgreSQL service starts automatically

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### 3. Install TimescaleDB (Optional but Recommended)

**Windows:**
- Download from https://docs.timescale.com/install/latest/self-hosted/installation-windows/
- Run installer after PostgreSQL installation

**Linux:**
```bash
# Add TimescaleDB repository
sudo sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update
sudo apt install timescaledb-2-postgresql-14
sudo timescaledb-tune
sudo systemctl restart postgresql
```

**macOS:**
```bash
brew install timescaledb
```

---

## Database Schema

### Complete Database Schema

The application uses the following relational schema:

```sql
-- Hierarchical Structure
clients
  └── departments
        └── locations
              └── sensors
                    └── sensor_data (time-series)

-- Lookup Tables
sensor_types
shifts
users
```

### Table Definitions

#### 1. clients Table

Top-level tenant/organization table.

```sql
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_address TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
- `id`: Primary key (auto-increment)
- `name`: Client/organization name
- `site_address`: Physical address
- `contact_email`: Contact email
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### 2. departments Table

Departments within clients.

```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
- `id`: Primary key
- `client_id`: Foreign key to `clients.id`
- `name`: Department name
- `description`: Department description
- `created_at`: Record creation timestamp

#### 3. locations Table

Locations within departments.

```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor_level VARCHAR(50),
    geo_coordinates POINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
- `id`: Primary key
- `department_id`: Foreign key to `departments.id`
- `name`: Location name
- `floor_level`: Floor/level identifier
- `geo_coordinates`: Geographic coordinates (PostgreSQL POINT type)
- `created_at`: Record creation timestamp

#### 4. sensor_types Table

Lookup table for sensor type definitions.

```sql
CREATE TABLE sensor_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(20),
    description TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
- `id`: Primary key
- `name`: Sensor type name (e.g., "Temperature", "Switch", "Humidity")
- `unit`: Unit of measurement (e.g., "°C", "On/Off", "%")
- `description`: Sensor type description
- `min_value`: Minimum expected value
- `max_value`: Maximum expected value
- `created_at`: Record creation timestamp

#### 5. sensors Table

Sensor devices at locations.

```sql
CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(id) ON DELETE CASCADE,
    sensor_type_id INT REFERENCES sensor_types(id),
    name VARCHAR(255) NOT NULL,
    mqtt_topic VARCHAR(500) NOT NULL,
    sensor_count INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    device_id VARCHAR(50),
    channel_code VARCHAR(10),
    mqtt_payload_topic VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sensors_mqtt_topic ON sensors(mqtt_topic);
CREATE INDEX idx_sensors_device_id ON sensors(device_id);
CREATE INDEX idx_sensors_channel_code ON sensors(channel_code);
CREATE INDEX idx_sensors_mqtt_payload_topic ON sensors(mqtt_payload_topic);
```

**Columns:**
- `id`: Primary key
- `location_id`: Foreign key to `locations.id`
- `sensor_type_id`: Foreign key to `sensor_types.id`
- `name`: Sensor name (e.g., "CH01", "CH02")
- `mqtt_topic`: Legacy MQTT topic pattern
- `sensor_count`: Number of sensors in this device
- `status`: Sensor status ("active", "inactive", "maintenance")
- `device_id`: Device ID from MQTT payload (e.g., "00002")
- `channel_code`: Channel code in payload (e.g., "s1", "s2")
- `mqtt_payload_topic`: MQTT topic name for payload subscription (e.g., "voltas")
- `metadata`: Additional configuration as JSONB
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### 6. sensor_data Table

Time-series sensor readings (TimescaleDB hypertable).

```sql
CREATE TABLE sensor_data (
    id BIGSERIAL,
    sensor_id INT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value NUMERIC NOT NULL,
    quality VARCHAR(20) DEFAULT 'good',
    metadata JSONB,
    PRIMARY KEY (sensor_id, timestamp)
);

-- Convert to TimescaleDB hypertable (if TimescaleDB is installed)
SELECT create_hypertable('sensor_data', 'timestamp', if_not_exists => TRUE);

-- Create indexes for performance
CREATE INDEX idx_sensor_data_sensor_time ON sensor_data(sensor_id, timestamp DESC);
CREATE INDEX idx_sensor_data_timestamp ON sensor_data(timestamp DESC);
```

**Columns:**
- `id`: Big serial (internal TimescaleDB use)
- `sensor_id`: Foreign key to `sensors.id`
- `timestamp`: Timestamp of the reading (part of composite primary key)
- `value`: Sensor reading value (NUMERIC for precision)
- `quality`: Data quality indicator ("good", "poor", "error")
- `metadata`: Additional context as JSONB

**Important Notes:**
- Composite primary key: `(sensor_id, timestamp)` ensures one reading per sensor per timestamp
- Optimized for time-series queries with TimescaleDB
- Automatically partitioned by time for performance

#### 7. shifts Table

Shift definitions for operations.

```sql
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Columns:**
- `id`: Primary key
- `name`: Shift name (e.g., "Shift 1", "Day Shift")
- `start_time`: Shift start time (HH:MM:SS)
- `end_time`: Shift end time (HH:MM:SS)
- `is_active`: Whether shift is currently active
- `description`: Shift description
- `created_at`: Record creation timestamp

#### 8. users Table

User accounts with authentication.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    client_id INT REFERENCES clients(id),
    shift_id INT REFERENCES shifts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
```

**Columns:**
- `id`: Primary key
- `username`: Unique username for login
- `email`: Unique email address
- `password_hash`: Bcrypt hashed password
- `role`: User role ("admin", "manager", "operator", "viewer")
- `client_id`: Foreign key to `clients.id` (NULL for admin)
- `shift_id`: Foreign key to `shifts.id` (for operators)
- `created_at`: Account creation timestamp
- `last_login`: Last login timestamp

**User Roles:**
- `admin`: Full system access, can manage all clients
- `manager`: Can manage assigned client's data
- `operator`: View-only access for assigned shift
- `viewer`: Read-only access

### Database Relationships

```
clients (1) ──< (many) departments
departments (1) ──< (many) locations
locations (1) ──< (many) sensors
sensors (1) ──< (many) sensor_data
sensor_types (1) ──< (many) sensors
clients (1) ──< (many) users
shifts (1) ──< (many) users
```

### Indexes

Performance indexes created:

1. `idx_sensors_mqtt_topic` - Fast MQTT topic lookups
2. `idx_sensors_device_id` - Fast device ID lookups
3. `idx_sensors_channel_code` - Fast channel code lookups
4. `idx_sensors_mqtt_payload_topic` - Fast topic subscription lookups
5. `idx_sensor_data_sensor_time` - Fast sensor data queries by sensor and time
6. `idx_sensor_data_timestamp` - Fast time-range queries
7. `idx_users_email` - Fast user email lookups

---

## Database Setup

### Step 1: Create Database and User

**Using pgAdmin (Recommended for Windows):**

1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `iot_dashboard`
5. Click "Save"

**Using psql Command Line:**

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database
CREATE DATABASE iot_dashboard;

# Create user (optional - you can use postgres user)
CREATE USER iotuser WITH PASSWORD 'iotpassword';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;

# Exit psql
\q
```

**Using Setup Script:**

```bash
# Windows
setup-database.bat

# Linux/Mac
chmod +x setup-database.sh
./setup-database.sh
```

### Step 2: Create Database Schema

**Option A: Using SQL Script (Recommended)**

1. Open pgAdmin
2. Connect to `iot_dashboard` database
3. Open Query Tool
4. Execute `create-all-tables.sql`
5. Verify tables created

**Option B: Using Node.js Script**

```bash
cd backend
npm install
node src/scripts/initDatabase.js
```

This script will:
- Create all tables
- Enable TimescaleDB extension (if available)
- Convert `sensor_data` to hypertable
- Create all indexes

### Step 3: Apply Migrations

Apply any additional migrations:

```bash
# Apply MQTT fields migration
psql -U postgres -d iot_dashboard -f add-sensor-mqtt-fields.sql
```

### Step 4: Seed Initial Data

**Create admin user:**

```bash
cd backend
npm run create-admin
```

**Seed sample data (optional):**

```bash
cd backend
npm run seed-initial
```

This creates:
- Default admin user (username: `admin`, password: `admin123`)
- Sample clients, departments, locations
- Sensor types (Temperature, Humidity, Switch, etc.)
- Sample sensors
- Sample shifts

### Step 5: Verify Database Setup

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check TimescaleDB hypertable
SELECT * FROM timescaledb_information.hypertables 
WHERE hypertable_name = 'sensor_data';

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

---

## Backend Deployment

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

**Key Dependencies:**
- `express` - Web framework
- `pg` - PostgreSQL client
- `mqtt` - MQTT client
- `socket.io` - WebSocket server
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `dotenv` - Environment variables
- `cors` - CORS middleware

### Step 2: Configure Environment Variables

Create `backend/.env` file:

```bash
# Copy template
cp env.template .env

# Or create manually
```

**Required Configuration:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# MQTT Configuration (HiveMQ Cloud)
MQTT_BROKER_URL=mqtts://your-cluster-id.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=your-hivemq-username
MQTT_PASSWORD=your-hivemq-password
MQTT_TOPIC=voltas
MQTT_DISABLED=false

# OR for local Mosquitto
# MQTT_BROKER_URL=mqtt://localhost:1883
# MQTT_USERNAME=
# MQTT_PASSWORD=
# MQTT_TOPIC=client/+/dept/+/location/+/sensor/+
```

**Important Notes:**
- Change `JWT_SECRET` to a strong random string (minimum 32 characters)
- Update `DATABASE_URL` with your actual PostgreSQL credentials
- Set `NODE_ENV=production` for production deployment

### Step 3: Verify Database Connection

```bash
cd backend
node -e "require('dotenv').config(); const pool = require('./src/config/database'); pool.query('SELECT NOW()').then(() => { console.log('✅ Database connection successful'); process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"
```

### Step 4: Initialize Database (if not done already)

```bash
cd backend
node src/scripts/initDatabase.js
```

### Step 5: Start Backend Server

**Development Mode (with auto-reload):**

```bash
cd backend
npm run dev
```

**Production Mode:**

```bash
cd backend
npm start
```

**Verify Backend is Running:**

```bash
# Test health endpoint
curl http://localhost:5000/health

# Should return: {"status":"ok","timestamp":"2025-01-15T10:00:00.000Z"}
```

### Backend API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info

**Clients:**
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client by ID
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

**Sensors:**
- `GET /api/sensors` - List all sensors
- `POST /api/sensors` - Create sensor
- `GET /api/sensors/:id` - Get sensor by ID
- `PUT /api/sensors/:id` - Update sensor
- `DELETE /api/sensors/:id` - Delete sensor

**Sensor Data:**
- `GET /api/data/sensor/:sensor_id?start_time=...&end_time=...&limit=1000` - Get sensor data
- `GET /api/data/latest?sensor_ids=1,2,3` - Get latest sensor data
- `GET /api/data/aggregated?sensor_id=...&start_time=...&end_time=...&interval=1 hour` - Get aggregated data

**Shifts:**
- `GET /api/shifts` - List all shifts
- `POST /api/shifts` - Create shift
- `PUT /api/shifts/:id` - Update shift
- `DELETE /api/shifts/:id` - Delete shift

**Users:**
- `GET /api/users` - List all users (admin only)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

---

## Frontend Deployment

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

**Key Dependencies:**
- `react` - UI framework
- `react-router-dom` - Routing
- `axios` - HTTP client
- `socket.io-client` - WebSocket client
- `recharts` - Chart library
- `tailwindcss` - CSS framework
- `xlsx` - Excel export

### Step 2: Configure Environment Variables

Create `frontend/.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
```

**Production Configuration:**

```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_WS_URL=https://api.yourdomain.com
```

### Step 3: Start Development Server

```bash
cd frontend
npm start
```

The frontend will:
- Start on http://localhost:3000
- Open automatically in browser
- Hot-reload on code changes

### Step 4: Build for Production

```bash
cd frontend
npm run build
```

This creates optimized production build in `frontend/build/` directory.

**Build Output:**
- Optimized JavaScript bundles
- Minified CSS
- Static assets
- Production-ready HTML

---

## MQTT Configuration

### MQTT Payload Format

The application expects MQTT payloads in the following format:

```json
{
  "did": "00002",
  "date": "2026-01-03 12:13:55",
  "data": [
    { "s1": "1", "st": "12:13:55" },
    { "s2": "0", "st": "12:13:55" },
    { "s3": "0", "st": "12:13:55" },
    { "s4": "0", "st": "12:13:55" },
    { "s5": "0", "st": "12:13:55" },
    { "s6": "0", "st": "12:13:55" }
  ]
}
```

**Fields:**
- `did`: Device ID (matches `device_id` in sensors table)
- `date`: Date and time string (YYYY-MM-DD HH:MM:SS)
- `data`: Array of sensor readings
  - `s1` to `s6`: Sensor channel values ("0" or "1" for switches)
  - `st`: Status change timestamp (HH:MM:SS)

### Sensor Configuration Mapping

In the Settings page, configure sensors with:
- **Device ID**: `did` from payload (e.g., "00002")
- **Channel Code**: Channel in data array (e.g., "s1", "s2")
- **MQTT Payload Topic**: Topic name (e.g., "voltas")

### MQTT Broker Options

#### Option 1: HiveMQ Cloud (Recommended for Production)

1. Create account at https://www.hivemq.com/
2. Create a new cluster
3. Get connection details:
   - Cluster URL: `your-cluster-id.s1.eu.hivemq.cloud:8883`
   - Username: Your HiveMQ username
   - Password: Your HiveMQ password

**Configuration:**

```env
MQTT_BROKER_URL=mqtts://your-cluster-id.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
MQTT_TOPIC=voltas
```

#### Option 2: Local Mosquitto

**Install Mosquitto:**

**Windows:**
- Download from https://mosquitto.org/download/
- Install and start as Windows service

**Linux:**
```bash
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

**macOS:**
```bash
brew install mosquitto
brew services start mosquitto
```

**Configuration:**

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=client/+/dept/+/location/+/sensor/+
```

### Disable MQTT (Optional)

If MQTT is not needed:

```env
MQTT_DISABLED=true
```

---

## Production Deployment

### Backend Production Setup

#### 1. Environment Configuration

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

DATABASE_URL=postgresql://user:password@db-host:5432/iot_dashboard

JWT_SECRET=generate-strong-random-32-char-secret-here
JWT_EXPIRES_IN=7d

MQTT_BROKER_URL=mqtts://your-broker:8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
MQTT_TOPIC=voltas
```

#### 2. Use Process Manager (PM2)

**Install PM2:**

```bash
npm install -g pm2
```

**Start Backend:**

```bash
cd backend
pm2 start src/server.js --name iot-backend
pm2 save
pm2 startup
```

**Useful PM2 Commands:**

```bash
pm2 list              # List all processes
pm2 logs iot-backend  # View logs
pm2 restart iot-backend  # Restart
pm2 stop iot-backend     # Stop
pm2 delete iot-backend   # Remove
```

#### 3. Use Nginx as Reverse Proxy

**Nginx Configuration (`/etc/nginx/sites-available/iot-api`):**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_set_header Connection "upgrade";
    }
}
```

**Enable Site:**

```bash
sudo ln -s /etc/nginx/sites-available/iot-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Frontend Production Setup

#### 1. Build Frontend

```bash
cd frontend
npm run build
```

#### 2. Serve with Nginx

**Nginx Configuration (`/etc/nginx/sites-available/iot-frontend`):**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    root /path/to/frontend/build;
    index index.html;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable Site:**

```bash
sudo ln -s /etc/nginx/sites-available/iot-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Database Production Considerations

#### 1. Enable Connection Pooling

PostgreSQL connection pooling using pgBouncer:

```ini
[databases]
iot_dashboard = host=localhost port=5432 dbname=iot_dashboard

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

#### 2. Configure PostgreSQL for Production

**`postgresql.conf` adjustments:**

```ini
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

#### 3. Set Up Database Backups

**Automatic Daily Backups:**

```bash
#!/bin/bash
# /usr/local/bin/backup-iot-db.sh

BACKUP_DIR="/backups/iot_dashboard"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="iot_dashboard_${DATE}.sql"

mkdir -p $BACKUP_DIR
pg_dump -U postgres iot_dashboard > "$BACKUP_DIR/$FILENAME"
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $FILENAME.gz"
```

**Add to Crontab:**

```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-iot-db.sh
```

---

## Environment Variables

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Server port | `5000` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `https://yourdomain.com` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) | `your-secret-key-here` |
| `JWT_EXPIRES_IN` | No | JWT expiration time | `7d` |
| `MQTT_BROKER_URL` | No | MQTT broker URL | `mqtts://broker:8883` |
| `MQTT_USERNAME` | No | MQTT username | `username` |
| `MQTT_PASSWORD` | No | MQTT password | `password` |
| `MQTT_TOPIC` | No | MQTT topic to subscribe | `voltas` |
| `MQTT_DISABLED` | No | Disable MQTT | `false` |
| `MQTT_REJECT_UNAUTHORIZED` | No | Reject unauthorized SSL certs | `true` |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_API_URL` | Yes | Backend API URL | `https://api.yourdomain.com/api` |
| `REACT_APP_WS_URL` | Yes | WebSocket URL | `https://api.yourdomain.com` |

---

## Troubleshooting

### Database Connection Issues

**Error: "password authentication failed"**
- Verify credentials in `DATABASE_URL`
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify user exists: `SELECT * FROM pg_user WHERE usename = 'iotuser';`

**Error: "database does not exist"**
- Create database: `CREATE DATABASE iot_dashboard;`
- Verify: `\l` in psql

**Error: "permission denied for schema public"**
- Grant permissions: `GRANT ALL ON SCHEMA public TO iotuser;`
- See `fix-database-permissions.sql`

### MQTT Connection Issues

**Error: "ECONNREFUSED"**
- Verify MQTT broker is running
- Check broker URL and port
- Test connection: `mosquitto_pub -h localhost -t test -m "hello"`

**Error: "SSL/TLS connection failed"**
- Verify certificate for `mqtts://` connections
- Check `MQTT_REJECT_UNAUTHORIZED` setting
- Test with `mqtt://` first (non-SSL)

**Error: "Not authorized"**
- Verify username and password
- Check broker authentication settings

### Backend Issues

**Error: "Port already in use"**
- Kill process: `lsof -ti:5000 | xargs kill -9`
- Or change port in `.env`: `PORT=5001`

**Error: "Cannot find module"**
- Reinstall dependencies: `npm install`
- Clear cache: `rm -rf node_modules package-lock.json && npm install`

### Frontend Issues

**Error: "Cannot connect to API"**
- Verify `REACT_APP_API_URL` in `.env`
- Check backend is running
- Check CORS settings in backend

**Error: "WebSocket connection failed"**
- Verify `REACT_APP_WS_URL` in `.env`
- Check Socket.io is enabled in backend
- Check firewall/proxy settings

---

## Security Considerations

### Production Security Checklist

- [ ] Change default admin password
- [ ] Use strong `JWT_SECRET` (minimum 32 characters, random)
- [ ] Enable HTTPS for all connections
- [ ] Use secure MQTT (mqtts://) with valid certificates
- [ ] Restrict database user permissions
- [ ] Enable PostgreSQL SSL connections
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Enable rate limiting (already implemented)
- [ ] Use environment variables for all secrets
- [ ] Never commit `.env` files to version control
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

### Password Security

- Minimum password length: 8 characters
- Use bcrypt for password hashing (already implemented)
- Password strength requirements in frontend
- Regular password rotation policy

### Database Security

- Use dedicated database user with minimal permissions
- Enable PostgreSQL SSL
- Regular backups stored securely
- Access logging enabled

### API Security

- JWT token expiration (7 days default)
- CORS configured for specific origins
- Rate limiting enabled
- Input validation on all endpoints
- SQL injection protection (parameterized queries)

---

## Support and Documentation

### Additional Resources

- **Database Schema**: See `create-all-tables.sql`
- **MQTT Configuration**: See `backend/MQTT_CONFIG.md`
- **Testing MQTT**: See `backend/TEST_MQTT.md`
- **Quick Test**: See `backend/QUICK_TEST.md`

### Log Files

**Backend Logs:**
- Development: Console output
- Production (PM2): `~/.pm2/logs/iot-backend-out.log`

**Database Logs:**
- PostgreSQL: `/var/log/postgresql/postgresql-*.log`

**Nginx Logs:**
- Access: `/var/log/nginx/access.log`
- Error: `/var/log/nginx/error.log`

---

## Version Information

- **Backend**: Node.js 18+, Express.js 4.18+
- **Frontend**: React 18+, React Router 6+
- **Database**: PostgreSQL 14+, TimescaleDB 2.x (optional)
- **MQTT**: MQTT.js 5.3+
- **Socket.io**: 4.6+

---

## Conclusion

This deployment guide covers all aspects of deploying the IoT Dashboard Platform. For additional support or questions, refer to the troubleshooting section or check the individual component documentation files.

**Last Updated**: January 2026

