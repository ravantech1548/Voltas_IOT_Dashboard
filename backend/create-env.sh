#!/bin/bash

echo "Creating .env file for backend..."
echo ""

if [ -f .env ]; then
    echo ".env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

echo "Enter your PostgreSQL database credentials:"
echo ""

read -p "Database username (default: iotuser): " DB_USER
DB_USER=${DB_USER:-iotuser}

read -sp "Database password (default: iotpassword): " DB_PASS
echo ""
DB_PASS=${DB_PASS:-iotpassword}

read -p "Database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Database name (default: iot_dashboard): " DB_NAME
DB_NAME=${DB_NAME:-iot_dashboard}

cat > .env << EOF
PORT=5000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# MQTT Configuration
# For HiveMQ Cloud: mqtts://your-cluster-id.s1.eu.hivemq.cloud:8883
# For local Mosquitto: mqtt://localhost:1883
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=client/+/dept/+/location/+/sensor/+
MQTT_DISABLED=false

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF

echo ""
echo ".env file created successfully!"
echo ""
echo "DATABASE_URL: postgresql://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""


