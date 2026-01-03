#!/bin/bash

echo "========================================"
echo "IoT Dashboard - Database Setup Script"
echo "========================================"
echo ""
echo "This script will create:"
echo "- Database: iot_dashboard"
echo "- User: iotuser"
echo "- Password: iotpassword"
echo ""
echo "You will be prompted for the PostgreSQL superuser password."
echo ""
read -p "Press Enter to continue..."

echo ""
echo "Creating database and user..."
echo ""

# Create SQL script
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" << EOF
CREATE DATABASE iot_dashboard;
CREATE USER iotuser WITH PASSWORD 'iotpassword';
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;
\c iot_dashboard
GRANT ALL ON SCHEMA public TO iotuser;
GRANT CREATE ON SCHEMA public TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;
\q
EOF

# Execute SQL commands
psql -U postgres -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Database setup completed successfully!"
    echo "========================================"
    echo ""
    echo "Database: iot_dashboard"
    echo "User: iotuser"
    echo "Password: iotpassword"
    echo ""
    echo "You can now run the backend setup script."
else
    echo ""
    echo "========================================"
    echo "Database setup failed!"
    echo "========================================"
    echo ""
    echo "Please check:"
    echo "1. PostgreSQL is installed and running"
    echo "2. psql is in your PATH"
    echo "3. You know the postgres superuser password"
    echo "4. You have permission to create databases"
    echo ""
    exit 1
fi

# Clean up
rm -f "$SQL_FILE"

echo ""
exit 0

