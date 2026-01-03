# Complete Database Setup Steps

Since you're seeing that the `users` table doesn't exist, follow these steps **in order**:

## Step 1: Fix Database Permissions (Run in pgAdmin)

1. **Open pgAdmin**
2. **Connect to your PostgreSQL server**
3. **Right-click on `iot_dashboard` database → Query Tool**
4. **Copy and paste the SQL from `fix-database-permissions.sql`**:

```sql
-- Grant permissions to iotuser for the public schema
GRANT ALL ON SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;
GRANT CREATE ON SCHEMA public TO iotuser;
```

5. **Click Execute (F5)**
6. **You should see "Query returned successfully"**

## Step 2: Create All Tables (Choose ONE method)

### Method A: Using pgAdmin (Easiest if scripts don't work)

1. **In pgAdmin, with `iot_dashboard` database selected → Query Tool**
2. **Open the file `create-all-tables.sql`** (or copy its contents)
3. **Paste it into the Query Tool**
4. **Click Execute (F5)**
5. **You should see a list of all created tables at the end**

### Method B: Using the Script (Recommended)

In your terminal/PowerShell, run:

```bash
.\init-database.bat
```

This will create all the tables automatically.

## Step 3: Verify Tables Are Created

In pgAdmin Query Tool, run:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see these 7 tables:
- clients
- departments
- locations
- sensor_data
- sensor_types
- sensors
- users

## Step 4: Create Admin User

After tables are created, run:

```bash
.\create-admin-user.bat
```

Or verify in pgAdmin:

```sql
SELECT id, username, email, role, created_at 
FROM users 
WHERE username = 'admin';
```

## Quick Checklist

- [ ] Step 1: Fixed permissions (granted to iotuser)
- [ ] Step 2: Created all tables
- [ ] Step 3: Verified tables exist
- [ ] Step 4: Created admin user

## Troubleshooting

**If you get "permission denied" in Step 2:**
- Make sure you completed Step 1
- Try running the SQL queries as the `postgres` superuser instead

**If tables still don't appear:**
- Check for error messages in the Messages tab in pgAdmin
- Make sure you're connected to the correct database (`iot_dashboard`)
- Verify PostgreSQL service is running


