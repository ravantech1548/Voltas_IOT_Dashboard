# Quick Setup Guide - Local Deployment

This guide provides step-by-step instructions for setting up the IoT Dashboard Platform locally.

## Quick Setup Scripts

For fastest setup, use the provided scripts:

### Step 1: Database Setup

**Option A: Using Setup Script (if psql is in PATH)**

**Windows (Command Prompt):**
```bash
setup-database.bat
```

**Windows (PowerShell):**
```powershell
.\setup-database.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-database.sh
./setup-database.sh
```

**Option B: Manual Setup (if psql is not in PATH)**

If you get an error that `psql` is not recognized:

1. **Using pgAdmin (Easiest):**
   - Open pgAdmin (installed with PostgreSQL)
   - Connect to your PostgreSQL server
   - Right-click on "postgres" database → "Query Tool"
   - Open `setup-database.sql` file or copy/paste its contents
   - Click "Execute" (F5)

2. **Add PostgreSQL to PATH:**
   - See `setup-database-manual.md` for detailed instructions
   - Add PostgreSQL bin directory to PATH (usually `C:\Program Files\PostgreSQL\14\bin`)
   - Restart terminal and try script again

3. **See `setup-database-manual.md` for more options**

This will create the `iot_dashboard` database and `iotuser` user.

### Step 2: Backend & Frontend Setup

**Windows:**
- Run `setup-backend.bat` to set up the backend
- Run `setup-frontend.bat` to set up the frontend (in a new terminal)

**Linux/Mac:**
```bash
chmod +x setup-backend.sh setup-frontend.sh
./setup-backend.sh
./setup-frontend.sh
```

The scripts will:
- Install all dependencies
- Create `.env` files with default values
- Initialize the database schema
- Seed initial data (admin user)

**Important**: After running the scripts, edit `backend/.env` with your actual PostgreSQL credentials if you used different values!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Mosquitto MQTT broker installed and running
- [ ] npm or yarn installed

## Manual Setup (Alternative)

### 1. Database Setup

#### Create Database and User

**Option A: Using psql command line**
```bash
# Connect to PostgreSQL
psql -U postgres

# Run these commands in psql:
CREATE DATABASE iot_dashboard;
CREATE USER iotuser WITH PASSWORD 'iotpassword';
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;

# Connect to the database and grant schema permissions (important!)
\c iot_dashboard
GRANT ALL ON SCHEMA public TO iotuser;
GRANT CREATE ON SCHEMA public TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;

\q
```

**Important:** The schema permissions (GRANT commands after `\c iot_dashboard`) are required to avoid "permission denied for schema public" errors in PostgreSQL 15+.

**Option B: Using pgAdmin or another GUI tool**
1. Connect to PostgreSQL server
2. Create a new database named `iot_dashboard`
3. Create a new user `iotuser` with password `iotpassword`
4. Grant all privileges on `iot_dashboard` to `iotuser`

**Option C: Use default postgres user (simpler for development)**
- Just create the database: `CREATE DATABASE iot_dashboard;`
- Use `postgres` as username in `.env` file

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (Windows)
copy .env.example .env

# Create .env file (Linux/Mac)
cp .env.example .env
```

Edit `backend/.env` and update the `DATABASE_URL`:
```env
DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard
```

If using default postgres user:
```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/iot_dashboard
```

Then run:
```bash
# Initialize database schema
node src/scripts/initDatabase.js

# Seed initial data (creates admin user)
npm run seed

# Start backend server
npm run dev
```

### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file (Windows)
copy .env.example .env

# Create .env file (Linux/Mac)
cp .env.example .env

# Start frontend (no need to edit .env, defaults are correct)
npm start
```

### 4. Verify Installation

1. Backend should be running at: http://localhost:5000
   - Test: http://localhost:5000/health (should return `{"status":"ok"}`)

2. Frontend should open automatically at: http://localhost:3000

3. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`

## Common Issues and Solutions

### PostgreSQL Connection Error

**Problem**: `password authentication failed`

**Solution**:
- Verify PostgreSQL is running
- Check username/password in `backend/.env`
- Windows: Check Services panel for PostgreSQL service
- Linux: `sudo systemctl status postgresql`
- Mac: `brew services list | grep postgresql`

### MQTT Connection Error

**Problem**: `ECONNREFUSED` when connecting to MQTT

**Solution**:
- Verify Mosquitto is running
- Windows: Check Services panel for Mosquitto service
- Linux: `sudo systemctl start mosquitto`
- Mac: `brew services start mosquitto`
- Test connection: `mosquitto_sub -h localhost -t test`

### Port Already in Use

**Problem**: Port 5000, 3000, 5432, or 1883 already in use

**Solution**:
- Backend port: Change `PORT` in `backend/.env`
- Frontend port: React will auto-select another port
- PostgreSQL: Stop other PostgreSQL instances or change port
- MQTT: Stop other MQTT brokers or change port in Mosquitto config

### Module Not Found Errors

**Problem**: `Cannot find module` errors

**Solution**:
```bash
# Delete node_modules and reinstall
cd backend  # or frontend
rm -rf node_modules package-lock.json
npm install
```

### TimescaleDB Extension Error

**Problem**: Warning about TimescaleDB extension

**Solution**: This is not critical! The app works without TimescaleDB. The warning is normal if you're using regular PostgreSQL.

## Next Steps

1. Login to the dashboard with admin credentials
2. Navigate to Settings to add clients, departments, locations, and sensors
3. Test MQTT data publishing (see README.md for MQTT topic format)
4. View real-time data on the Dashboard

## Getting Help

- Check the main README.md for detailed documentation
- Verify all services are running (PostgreSQL, Mosquitto, Backend, Frontend)
- Check console logs for error messages
- Ensure all environment variables are set correctly

