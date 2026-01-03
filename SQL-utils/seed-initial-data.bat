@echo off
echo ========================================
echo Seed Initial Data
echo ========================================
echo.
echo This script will populate the database with:
echo   Clients: Voltas, Qautomation
echo   Departments: Engineering, Operations
echo   Locations: CBE-South, CBE-North
echo   Sensors: ch01, ch02, ch03, ch04, ch05, ch06
echo   Sensor Types: Temperature, Humidity, Pressure
echo.

cd backend

if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create .env file first.
    echo.
    pause
    exit /b 1
)

echo Running seed script...
echo.

call npm run seed-initial

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Initial data seeded successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Seeding failed!
    echo ========================================
)

cd ..
echo.
pause


