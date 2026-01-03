# Fix: shift_id Column Does Not Exist

## Problem
You're getting an error: `column "shift_id" does not exist`

This happens because the `shift_id` column hasn't been added to the `users` table yet.

## Solution

You have **two options**:

### Option 1: Run the Migration Script (Recommended)

Run the migration script that adds the `shift_id` column:

**Windows:**
```bash
.\add-shifts-schema.bat
```

**PowerShell:**
```powershell
.\add-shifts-schema.ps1
```

**Linux/Mac:**
```bash
cd backend
node src/scripts/addShiftsSchema.js
```

### Option 2: Manual SQL Fix (Using pgAdmin)

1. Open **pgAdmin**
2. Connect to your PostgreSQL server
3. Right-click on `iot_dashboard` database → **Query Tool**
4. Open and run `fix-shift-id-column.sql` (or copy its contents)
5. Click **Execute (F5)**

## What This Does

1. Creates the `shifts` table (if it doesn't exist)
2. Adds `shift_id` column to the `users` table
3. Creates an index on `shift_id`
4. Creates default shifts (Morning, Afternoon, Night)
5. Sets up foreign key relationship

## Important Notes

- **Admin users** have `shift_id = NULL` (admins don't need shifts - they have full access)
- **Operator users** should have a `shift_id` assigned
- The code now handles missing `shift_id` column gracefully (backwards compatible)

## Admin Access

✅ **Admins have full control:**
- Can view all data (no client_id restrictions)
- Can access system at any time (no shift restrictions)
- Can create/edit/delete all resources
- Bypass all access control checks

The system already implements this correctly - admin users with `role = 'admin'` bypass all restrictions.

## Verification

After running the fix, verify the column exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'shift_id';
```

You should see the `shift_id` column listed.


