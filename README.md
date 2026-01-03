# IoT Dashboard Platform

A real-time IoT dashboard platform for monitoring and visualizing sensor data streams from MQTT-enabled devices. The system supports multi-tenant configurations across client sites, departments, locations, and sensor types.

## Features

- **Real-time Monitoring**: Live streaming dashboards with interactive charts
- **Multi-tenant Architecture**: Support for clients, departments, locations, and sensors
- **MQTT Integration**: Real-time data ingestion from MQTT protocol
- **WebSocket Updates**: Live data streaming to frontend
- **Historical Data**: PostgreSQL with TimescaleDB for time-series optimization
- **User Authentication**: JWT-based local authentication (username/password)
- **Role-based Access Control**: Admin, Manager, and Viewer roles

## Technology Stack

### Backend
- Node.js 18+ with Express.js
- PostgreSQL 14+ (TimescaleDB extension optional)
- MQTT (Mosquitto broker)
- Socket.io for WebSocket
- JWT authentication with bcrypt

### Frontend
- React.js 18+
- Recharts for data visualization
- Tailwind CSS for styling
- React Router for navigation
- Socket.io-client for real-time updates

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL 14+** - [Download here](https://www.postgresql.org/download/)
- **MQTT Broker (Mosquitto)** - [Download here](https://mosquitto.org/download/) - *Optional but recommended*
- **npm** or **yarn** package manager

**Note**: The server will run without MQTT, but real-time sensor data ingestion will not work. You can disable MQTT by setting `MQTT_DISABLED=true` in `backend/.env`.

### Installing PostgreSQL

#### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` superuser
4. PostgreSQL will run as a Windows service by default

#### macOS
```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Installing Mosquitto MQTT Broker

#### Windows
1. Download from https://mosquitto.org/download/
2. Run the installer
3. Mosquitto will run as a Windows service

#### macOS
```bash
# Using Homebrew
brew install mosquitto
brew services start mosquitto
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

## Quick Start - Local Setup

**Option 1: Using Setup Scripts (Recommended)**

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

1. **Using pgAdmin (Recommended):**
   - Open pgAdmin
   - Connect to PostgreSQL server
   - Open Query Tool (right-click on postgres database → Query Tool)
   - Open and execute `setup-database.sql` file
   - Or copy/paste the SQL commands from the file

2. **Add PostgreSQL to PATH:**
   - See `setup-database-manual.md` for detailed instructions
   - Usually: Add `C:\Program Files\PostgreSQL\14\bin` to PATH
   - Restart terminal and try the script again

3. **Use full path to psql:**
   ```bash
   "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -f setup-database.sql
   ```
   (Replace `14` with your PostgreSQL version)

This creates the `iot_dashboard` database and `iotuser` user.

### Step 2: Backend & Frontend Setup

**Windows:**
```bash
# Setup backend
setup-backend.bat

# Setup frontend (in a new terminal)
setup-frontend.bat
```

**Linux/Mac:**
```bash
# Make scripts executable
chmod +x setup-backend.sh setup-frontend.sh

# Setup backend
./setup-backend.sh

# Setup frontend (in a new terminal)
./setup-frontend.sh
```

**Option 2: Manual Setup (see detailed instructions below)**

## Detailed Local Setup Instructions

### Step 1: Database Setup

**Option A: Using Setup Script (Recommended)**

Run the database setup script:
- Windows: `setup-database.bat` or `.\setup-database.ps1`
- Linux/Mac: `./setup-database.sh`

**Option B: Manual Setup**

1. Create a PostgreSQL database and user:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE iot_dashboard;

-- Create user (optional, or use existing postgres user)
CREATE USER iotuser WITH PASSWORD 'iotpassword';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;

-- Exit psql
\q
```

**Note**: If you prefer to use the default `postgres` user, you can skip the user creation step and use `postgres` as the username in your `.env` file.

### Step 2: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (copy from `.env.example` if it exists, or create new):
   ```bash
   # Windows (PowerShell)
   copy .env.example .env
   
   # Linux/Mac
   cp .env.example .env
   ```

4. Edit the `.env` file with your database credentials:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard
   MQTT_BROKER_URL=mqtt://localhost:1883
   MQTT_USERNAME=
   MQTT_PASSWORD=
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

   **Important**: Update `DATABASE_URL` with your actual PostgreSQL credentials:
   - If using default postgres user: `postgresql://postgres:YOUR_PASSWORD@localhost:5432/iot_dashboard`
   - If using created user: `postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard`

5. Initialize the database schema:
   ```bash
   node src/scripts/initDatabase.js
   ```

   This will create all necessary tables. If TimescaleDB extension is available, it will be enabled automatically.

6. Seed initial data (creates admin user and sample data):
   ```bash
   npm run seed
   ```

7. Start the backend server:
   ```bash
   npm run dev
   ```

   The backend will be running on http://localhost:5000

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   # Windows (PowerShell)
   copy .env.example .env
   
   # Linux/Mac
   cp .env.example .env
   ```

4. Edit the `.env` file (it should already have the correct values):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_WS_URL=http://localhost:5000
   ```

5. Start the frontend development server:
   ```bash
   npm start
   ```

   The frontend will open automatically in your browser at http://localhost:3000

### Step 4: Verify MQTT Broker

Verify that Mosquitto is running:

```bash
# Check if Mosquitto is running (Windows)
# Check Services panel or run:
mosquitto -v

# Check if Mosquitto is running (Linux/Mac)
sudo systemctl status mosquitto
# or
brew services list | grep mosquitto
```

The MQTT broker should be accessible at `mqtt://localhost:1883`

## Create Admin User

To create the default admin user, run:

**Windows:**
```bash
create-admin-user.bat
```

**Linux/Mac:**
```bash
chmod +x create-admin-user.sh
./create-admin-user.sh
```

**Or directly:**
```bash
cd backend
npm run create-admin
```

This will:
- Initialize the database schema if it doesn't exist
- Create an admin user with username: `admin` and password: `admin123`
- Update the password if the user already exists

**Note:** If you get a "permission denied for schema public" error, see `DATABASE_PERMISSIONS_FIX.md` for instructions on granting the necessary permissions.

## Default Credentials

After running the admin user creation script, you can login with:

- **Username**: `admin`
- **Password**: `admin123`

**Important**: Change the default password in production!

## Test Login

To test the login API endpoint, use one of these scripts:

**Windows (Node.js):**
```bash
test-login.bat
```

**Windows (PowerShell):**
```powershell
.\test-login.ps1
```

**Windows (curl):**
```bash
test-login-curl.bat
```

**Linux/Mac:**
```bash
chmod +x test-login.sh
./test-login.sh
```

**Or using npm:**
```bash
npm run test:login
```

**Or directly with Node.js:**
```bash
node test-login.js [username] [password]
```

Example:
```bash
node test-login.js admin admin123
```

The script will test the login endpoint and display the JWT token if successful.

## Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

### Start Frontend (Terminal 2)
```bash
cd frontend
npm start
```

### Verify Services

1. **Backend API**: http://localhost:5000/health (should return `{"status":"ok"}`)
2. **Frontend**: http://localhost:3000
3. **MQTT Broker**: Should be running on port 1883

## Troubleshooting

### Port Already in Use

**Error: `EADDRINUSE: address already in use :::5000`**

This means port 5000 is already being used by another process.

**Quick fix:**
- **Windows:** Run `kill-port.bat` or `.\kill-port.ps1`
- **Linux/Mac:** `lsof -ti:5000 | xargs kill -9`
- Or change port in `backend/.env`: `PORT=5001`

See `PORT_IN_USE_FIX.md` for detailed instructions.

### Database Connection Issues

- **Error: "password authentication failed"**
  - Check your database credentials in `backend/.env`
  - Verify PostgreSQL is running: `pg_isready` or check services

- **Error: "database does not exist"**
  - Create the database: `CREATE DATABASE iot_dashboard;`

- **Error: "TimescaleDB extension"**
  - This is optional. The app will work without TimescaleDB, using regular PostgreSQL

### MQTT Connection Issues

- **Error: "ECONNREFUSED" when connecting to MQTT broker (port 1883)**

  **Solution Options:**
  1. **Start Mosquitto broker:**
     - Windows: Check Services panel for "Mosquitto Broker" service and start it
     - Linux: `sudo systemctl start mosquitto`
     - Mac: `brew services start mosquitto`
     - See `MQTT_SETUP.md` for detailed instructions
  
  2. **Disable MQTT (if not needed):**
     - Add `MQTT_DISABLED=true` to `backend/.env`
     - Restart the server
     - The server will work normally without MQTT (real-time sensor data won't work)
  
  3. **Note**: The server will continue to run without MQTT. Errors are warnings and won't crash the server. Error messages are now throttled to reduce console spam.

### Port Already in Use

- **Port 5000 (Backend)**: Change `PORT` in `backend/.env`
- **Port 3000 (Frontend)**: React will prompt to use another port automatically
- **Port 5432 (PostgreSQL)**: Check if another PostgreSQL instance is running
- **Port 1883 (MQTT)**: Check if another MQTT broker is running

## Database Schema

The application uses the following main tables:
- `clients` - Top-level tenants
- `departments` - Departments within clients
- `locations` - Locations within departments
- `sensor_types` - Sensor type definitions
- `sensors` - Sensor devices at locations
- `sensor_data` - Time-series sensor readings (TimescaleDB hypertable if available)
- `users` - User accounts with authentication

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/me` - Get current user info

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Sensors
- `GET /api/sensors` - Get all sensors
- `GET /api/sensors/:id` - Get sensor by ID
- `POST /api/sensors` - Create new sensor
- `PUT /api/sensors/:id` - Update sensor
- `DELETE /api/sensors/:id` - Delete sensor

### Data
- `GET /api/data/sensor/:sensor_id` - Get sensor data
- `GET /api/data/latest?sensor_ids=1,2,3` - Get latest data for sensors
- `GET /api/data/aggregated` - Get aggregated sensor data

## MQTT Topic Format

Sensors publish data to topics in the format:
```
client/{clientId}/dept/{deptId}/location/{locId}/sensor/{sensorId}
```

Payload format:
```json
{
  "sensor_id": 1,
  "value": 23.5,
  "timestamp": "2025-01-01T10:00:00Z",
  "metadata": {
    "battery": 85,
    "signal_strength": -60
  }
}
```

### Testing MQTT

You can test MQTT publishing using the `mosquitto_pub` command:

```bash
mosquitto_pub -h localhost -t "client/1/dept/1/location/1/sensor/1" -m '{"sensor_id": 1, "value": 23.5, "timestamp": "2025-01-15T10:00:00Z"}'
```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Database and auth configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth and error middleware
│   │   ├── services/        # MQTT and Socket.io handlers
│   │   └── scripts/         # Database initialization scripts
│   ├── .env                 # Environment variables (create this)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Utility functions
│   ├── .env                 # Environment variables (create this)
│   └── package.json
└── README.md
```

## Development

### Running Tests

Currently, the project doesn't include test suites. You can add tests using Jest and React Testing Library.

### Code Style

The project uses ESLint configuration from Create React App for the frontend. Backend follows standard Node.js conventions.

## Production Deployment

For production deployment:

1. Update environment variables with secure values
2. Change JWT_SECRET to a strong random string
3. Set NODE_ENV=production
4. Build the frontend: `cd frontend && npm run build`
5. Use a reverse proxy (Nginx) for the frontend
6. Enable HTTPS
7. Configure proper CORS settings
8. Set up database backups
9. Use process manager (PM2) for Node.js processes

## License

ISC
