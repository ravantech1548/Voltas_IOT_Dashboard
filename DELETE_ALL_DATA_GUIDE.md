# Guide: Delete All Sensor Data

## ⚠️ WARNING

These scripts will **permanently delete** data. Make sure you have backups if needed!

## Available Scripts

### 1. `delete-all-sensor-data-only.sql` ⭐ RECOMMENDED
**Deletes:** Sensor data and sensors only  
**Keeps:** sensor_types, locations, departments, clients structure

**Use this if:** You want to clear data but keep the database structure so you can re-seed later.

```sql
-- Run this in pgAdmin or psql
\i delete-all-sensor-data-only.sql
```

Or in pgAdmin:
1. Open Query Tool
2. File → Open → select `delete-all-sensor-data-only.sql`
3. Execute (F5)

**After deletion:**
- All sensor readings will be gone
- All sensors will be deleted
- You can run `npm run seed-initial` in backend folder to recreate sensors

---

### 2. `delete-all-sensor-data-complete.sql`
**Deletes:** Everything (sensor_data, sensors, sensor_types, locations, departments, clients)

**Use this if:** You want to completely reset the database.

**⚠️ Important:** This script has `ROLLBACK` at the end by default for safety. Review the counts, then manually run `COMMIT;` if you're sure.

---

### 3. `delete-all-sensor-data-force.sql`
**Deletes:** Everything immediately (no transaction, cannot rollback)

**Use this if:** You're absolutely sure and want immediate deletion.

**⚠️ WARNING:** No rollback possible!

---

## Quick Start (Recommended)

1. **Open pgAdmin** (or your PostgreSQL client)

2. **Connect to your database** (`iot_dashboard`)

3. **Open Query Tool**

4. **Run the recommended script:**
   ```sql
   -- Copy and paste the contents of delete-all-sensor-data-only.sql
   -- Or open the file directly in Query Tool
   ```

5. **Verify deletion:**
   - Check the counts shown after execution
   - All should be 0

6. **Re-seed data (if needed):**
   ```bash
   cd backend
   npm run seed-initial
   ```

---

## What Gets Deleted

### `delete-all-sensor-data-only.sql`:
- ✅ `sensor_data` table (all historical readings)
- ✅ `sensors` table (all sensors like ch01-ch06)
- ❌ Keeps: sensor_types, locations, departments, clients

### `delete-all-sensor-data-complete.sql`:
- ✅ `sensor_data` table
- ✅ `sensors` table
- ✅ `sensor_types` table
- ✅ `locations` table
- ✅ `departments` table
- ✅ `clients` table

### `delete-all-sensor-data-force.sql`:
- ✅ Everything (same as complete, but immediate)

---

## After Deletion

### If you used `delete-all-sensor-data-only.sql`:
1. Re-seed initial data:
   ```bash
   cd backend
   npm run seed-initial
   ```

2. Restart backend to refresh sensor cache

### If you used `delete-all-sensor-data-complete.sql`:
1. Re-run database initialization:
   ```bash
   cd backend
   npm run init-db
   npm run seed-initial
   ```

2. Restart backend

---

## Verification

After deletion, verify with:

```sql
SELECT 
    (SELECT COUNT(*) FROM sensor_data) AS sensor_data_count,
    (SELECT COUNT(*) FROM sensors) AS sensors_count,
    (SELECT COUNT(*) FROM sensor_types) AS sensor_types_count,
    (SELECT COUNT(*) FROM locations) AS locations_count,
    (SELECT COUNT(*) FROM departments) AS departments_count,
    (SELECT COUNT(*) FROM clients) AS clients_count;
```

All counts should be 0 (or non-zero for tables you wanted to keep).

---

## Backup Before Deletion (Optional)

If you want to backup first:

```bash
# Backup database
pg_dump -U your_username -d iot_dashboard > backup_before_deletion.sql

# To restore later:
psql -U your_username -d iot_dashboard < backup_before_deletion.sql
```

