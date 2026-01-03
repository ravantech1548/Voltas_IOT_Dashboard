# Database Connection Troubleshooting

## Error: "client password must be a string"

This error occurs when the PostgreSQL password in your `DATABASE_URL` is missing, empty, or incorrectly formatted.

### Solution 1: Create/Update .env File

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create .env file** (if it doesn't exist):

   **Windows:**
   ```bash
   create-env.bat
   ```
   Or manually create `.env` file with:
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
   chmod +x create-env.sh
   ./create-env.sh
   ```

3. **Update DATABASE_URL with your actual credentials:**
   - If you used the default `iotuser` / `iotpassword`: No changes needed
   - If you used `postgres` user: Change to `postgresql://postgres:YOUR_PASSWORD@localhost:5432/iot_dashboard`
   - If you created different user: Update username and password accordingly

### Solution 2: Check DATABASE_URL Format

The `DATABASE_URL` must follow this exact format:
```
postgresql://username:password@host:port/database
```

**Common mistakes:**
- ❌ Missing password: `postgresql://user@localhost:5432/db`
- ✅ Correct: `postgresql://user:password@localhost:5432/db`
- ❌ Missing `:` before password: `postgresql://userpassword@localhost:5432/db`
- ✅ Correct: `postgresql://user:password@localhost:5432/db`

### Solution 3: URL-Encode Special Characters

If your password contains special characters, they must be URL-encoded:

**Special characters that need encoding:**
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `%` → `%25`
- `#` → `%23`
- `?` → `%3F`
- `&` → `%26`
- `=` → `%3D`

**Example:**
If your password is `p@ssw:rd`, encode it as `p%40ssw%3Ard`:
```
DATABASE_URL=postgresql://user:p%40ssw%3Ard@localhost:5432/iot_dashboard
```

### Solution 4: Verify Database Credentials

1. **Test connection manually:**
   ```bash
   psql -U iotuser -d iot_dashboard -h localhost
   ```
   (Enter password when prompted)

2. **If connection fails:**
   - Verify database exists: `psql -U postgres -l` (list all databases)
   - Verify user exists: `psql -U postgres -c "\du"` (list all users)
   - Verify password is correct

### Solution 5: Use Postgres User (Simpler)

If you're having issues, use the default `postgres` user:

```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/iot_dashboard
```

Replace `YOUR_POSTGRES_PASSWORD` with the password you set during PostgreSQL installation.

## Quick Fix Commands

**Windows (PowerShell):**
```powershell
cd backend
@"
PORT=5000
DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard
MQTT_BROKER_URL=mqtt://localhost:1883
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
"@ | Out-File -FilePath .env -Encoding utf8
```

**Linux/Mac:**
```bash
cd backend
cat > .env << EOF
PORT=5000
DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard
MQTT_BROKER_URL=mqtt://localhost:1883
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF
```

**Remember to update the password if you used different credentials!**

## Still Having Issues?

1. Check that PostgreSQL is running
2. Verify the database `iot_dashboard` exists
3. Verify the user exists and has correct password
4. Check that port 5432 is not blocked by firewall
5. Try connecting with pgAdmin or psql directly to verify credentials work


