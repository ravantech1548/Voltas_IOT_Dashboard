@echo off
echo Creating .env file for backend...
echo.

if exist .env (
    echo .env file already exists!
    echo.
    choice /C YN /M "Do you want to overwrite it"
    if errorlevel 2 goto end
    if errorlevel 1 goto create
) else (
    goto create
)

:create
echo Enter your PostgreSQL database credentials:
echo.

set /p DB_USER="Database username (default: iotuser): "
if "%DB_USER%"=="" set DB_USER=iotuser

set /p DB_PASS="Database password (default: iotpassword): "
if "%DB_PASS%"=="" set DB_PASS=iotpassword

set /p DB_HOST="Database host (default: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Database port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_NAME="Database name (default: iot_dashboard): "
if "%DB_NAME%"=="" set DB_NAME=iot_dashboard

(
    echo PORT=5000
    echo DATABASE_URL=postgresql://%DB_USER%:%DB_PASS%@%DB_HOST%:%DB_PORT%/%DB_NAME%
    echo.
    echo # MQTT Configuration
    echo # For HiveMQ Cloud: mqtts://your-cluster-id.s1.eu.hivemq.cloud:8883
    echo # For local Mosquitto: mqtt://localhost:1883
    echo MQTT_BROKER_URL=mqtt://localhost:1883
    echo MQTT_USERNAME=
    echo MQTT_PASSWORD=
    echo MQTT_TOPIC=client/+/dept/+/location/+/sensor/+
    echo MQTT_DISABLED=false
    echo.
    echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
    echo JWT_EXPIRES_IN=7d
    echo NODE_ENV=development
    echo FRONTEND_URL=http://localhost:3000
) > .env

echo.
echo .env file created successfully!
echo.
echo DATABASE_URL: postgresql://%DB_USER%:***@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo.

:end
pause


