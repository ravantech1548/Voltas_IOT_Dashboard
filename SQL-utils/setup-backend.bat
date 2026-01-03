@echo off
echo Setting up Backend...
cd backend

echo Installing dependencies...
call npm install

if not exist .env (
    echo Creating .env file...
    (
        echo PORT=5000
        echo DATABASE_URL=postgresql://iotuser:iotpassword@localhost:5432/iot_dashboard
        echo MQTT_BROKER_URL=mqtt://localhost:1883
        echo MQTT_USERNAME=
        echo MQTT_PASSWORD=
        echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
        echo JWT_EXPIRES_IN=7d
        echo NODE_ENV=development
        echo FRONTEND_URL=http://localhost:3000
    ) > .env
    echo .env file created. Please edit it with your database credentials.
    pause
)

echo Initializing database...
call node src/scripts/initDatabase.js

echo Seeding database...
call npm run seed

echo Backend setup complete!
echo.
echo Next steps:
echo 1. Edit backend/.env with your database credentials
echo 2. Run: npm run dev
cd ..
pause


