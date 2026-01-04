# Database Migrations

## Adding data_status field to sensor_data

Run the migration to add the `data_status` field to the `sensor_data` table:

```sql
-- Run this SQL script to add the data_status column
psql -U your_username -d your_database -f add_data_status_to_sensor_data.sql
```

Or manually execute the SQL in `add_data_status_to_sensor_data.sql`.

The `data_status` field will track:
- `'live'` - Data received from MQTT payload
- `'offline'` - No payload received, all sensors set to zero

