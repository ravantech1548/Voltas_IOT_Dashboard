# Quick Fix: Database Connection Error

## The Problem

You're getting this error:
```
Database connection failed: Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

This means the `.env` file is missing or the `DATABASE_URL` is incorrectly formatted.

## The Solution

### Step 1: Create the .env file

Navigate to the `backend` directory and create a file named `.env` with the following content:

**Windows (PowerShell):**
```powershell
cd backend
Copy-Item .env.template .env
```

Or manually create `backend\.env` file with:

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

**Linux/Mac:**
```bash
cd backend
cp .env.template .env
```

### Step 2: Update DATABASE_URL (if needed)

**If you used the default database setup** (iotuser/iotpassword):
- No changes needed! The `.env` file above is correct.

**If you used the `postgres` user instead:**
Change the `DATABASE_URL` line to:
```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/iot_dashboard
```
(Replace `YOUR_POSTGRES_PASSWORD` with your actual PostgreSQL password)

**If you used different credentials:**
Update the `DATABASE_URL` with your actual username and password:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/iot_dashboard
```

### Step 3: Restart the server

After creating/updating the `.env` file, restart your backend server:

```bash
cd backend
npm run dev
```

The server should now connect successfully!

## Important Notes

1. **Password format**: Make sure there's a `:` between username and password in the URL
   - ✅ Correct: `postgresql://user:password@host/db`
   - ❌ Wrong: `postgresql://userpassword@host/db`

2. **Special characters**: If your password has special characters, they may need to be URL-encoded (see `DATABASE_SETUP_TROUBLESHOOTING.md` for details)

3. **File location**: The `.env` file must be in the `backend` directory (same level as `package.json`)

## Still having issues?

Check `DATABASE_SETUP_TROUBLESHOOTING.md` for more detailed troubleshooting steps.


