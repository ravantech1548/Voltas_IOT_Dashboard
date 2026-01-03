# How to Create the .env File

## The Issue

You're getting a database connection error because the `.env` file is missing in the `backend` directory.

## Quick Solution

### Option 1: Copy from Template (Easiest)

**Windows:**
```powershell
cd backend
Copy-Item .env.template .env
```

**Linux/Mac:**
```bash
cd backend
cp .env.template .env
```

### Option 2: Create Manually

1. Navigate to the `backend` directory
2. Create a new file named `.env` (note the leading dot)
3. Copy and paste this content:

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

### Option 3: Use the Helper Script

**Windows:**
```bash
cd backend
create-env.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x create-env.sh
./create-env.sh
```

## Important: Update Your Database Credentials

After creating the `.env` file, **check if you need to update the DATABASE_URL**:

- **If you used the setup-database script** with defaults (iotuser/iotpassword): ✅ No changes needed
- **If you used the `postgres` user**: Change `DATABASE_URL` to:
  ```env
  DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/iot_dashboard
  ```
- **If you used different credentials**: Update username and password accordingly

## Verify It Works

After creating the `.env` file, restart your backend server:

```bash
cd backend
npm run dev
```

You should see "Database connection successful" instead of an error.


