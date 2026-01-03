# Manual Database Setup Guide

If `psql` is not in your PATH, you can set up the database manually using one of these methods:

## Method 1: Using pgAdmin (Recommended for Windows)

1. **Open pgAdmin** (usually installed with PostgreSQL)

2. **Connect to PostgreSQL server:**
   - Right-click on "Servers" → "Create" → "Server"
   - Or use existing connection
   - Enter your PostgreSQL password when prompted

3. **Open Query Tool:**
   - Right-click on "postgres" database (or any database)
   - Select "Query Tool"

4. **Execute SQL commands:**
   - Copy the contents of `setup-database.sql`
   - Paste into the Query Tool
   - Click "Execute" (F5)

5. **Verify:**
   - You should see "Success" messages
   - The `iot_dashboard` database should appear in the database list

## Method 2: Add PostgreSQL to PATH

### Windows

1. **Find PostgreSQL installation:**
   - Usually located at: `C:\Program Files\PostgreSQL\14\bin` (version number may vary)
   - Or search for `psql.exe` on your system

2. **Add to PATH:**
   - Right-click "This PC" → "Properties"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\14\bin` (adjust version number)
   - Click "OK" on all dialogs

3. **Restart your terminal/PowerShell**

4. **Verify:**
   ```bash
   psql --version
   ```

5. **Run the setup script again:**
   ```bash
   setup-database.bat
   ```

### Linux/Mac

1. **Find PostgreSQL bin directory:**
   ```bash
   which psql
   # or
   find /usr -name psql 2>/dev/null
   ```

2. **If not found, install PostgreSQL or add to PATH:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export PATH=$PATH:/usr/local/pgsql/bin
   # or wherever PostgreSQL is installed
   ```

3. **Reload shell:**
   ```bash
   source ~/.bashrc  # or source ~/.zshrc
   ```

## Method 3: Use Full Path to psql

### Windows (Command Prompt)
```cmd
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -f setup-database.sql
```

### Windows (PowerShell)
```powershell
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -f setup-database.sql
```

**Note:** Replace `14` with your PostgreSQL version number (could be 15, 16, etc.)

## Method 4: Copy SQL Commands Directly

1. Open `setup-database.sql` file
2. Copy all the SQL commands
3. Open pgAdmin Query Tool or psql
4. Paste and execute

## Quick SQL Commands

If you prefer to type manually:

```sql
CREATE DATABASE iot_dashboard;
CREATE USER iotuser WITH PASSWORD 'iotpassword';
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;
```

## Troubleshooting

**Error: "permission denied"**
- Make sure you're connected as the `postgres` superuser
- In pgAdmin, right-click server → Properties → check you're using postgres user

**Error: "database already exists"**
- The database is already created, you can skip this step
- Or drop it first: `DROP DATABASE iot_dashboard;` (be careful!)

**Error: "role already exists"**
- The user already exists, you can skip this step
- Or drop it first: `DROP USER iotuser;` (be careful!)

## Verify Setup

After setup, verify everything works:

```sql
-- List databases
\l

-- Connect to the database
\c iot_dashboard

-- List users
\du
```

You should see:
- Database: `iot_dashboard`
- User: `iotuser`


