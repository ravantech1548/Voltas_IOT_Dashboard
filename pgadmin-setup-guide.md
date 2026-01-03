# Step-by-Step Database Setup in pgAdmin

## Step 1: Grant Permissions to iotuser

1. **In pgAdmin, right-click on the `iot_dashboard` database**
2. **Select "Query Tool"**
3. **Copy and paste this SQL:**

```sql
-- Grant permissions to iotuser for the public schema
GRANT ALL ON SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;
GRANT CREATE ON SCHEMA public TO iotuser;
```

4. **Click Execute (F5) or press F5**
5. **You should see "Query returned successfully" message**

## Step 2: Initialize Database Schema (Create All Tables)

After granting permissions, you need to create all the database tables. You have two options:

### Option A: Use the Script (Recommended)

Run this command in your terminal/PowerShell:

```bash
.\init-database.bat
```

Or:

```bash
cd backend
npm run init-db
```

### Option B: Run SQL Manually in pgAdmin

If the script doesn't work, you can create the tables manually by running the SQL in `backend/src/scripts/initDatabase.js`. However, **Option A is much easier!**

## Step 3: Verify Tables Are Created

After Step 2, run this query in pgAdmin to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- clients
- departments
- locations
- sensor_data
- sensor_types
- sensors
- users

## Step 4: Create Admin User

After the tables are created, run:

```bash
.\create-admin-user.bat
```

Or in pgAdmin, verify the admin user exists:

```sql
SELECT id, username, email, role, created_at 
FROM users 
WHERE username = 'admin';
```

## Troubleshooting

If you get "permission denied" errors in Step 2:
- Make sure you completed Step 1 correctly
- Try connecting as the `postgres` superuser instead of `iotuser` in your `.env` file temporarily

If tables still don't get created:
- Check the terminal output for any error messages
- Make sure PostgreSQL is running
- Verify DATABASE_URL in `backend/.env` is correct


