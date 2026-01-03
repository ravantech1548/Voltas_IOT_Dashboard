@echo off
echo ========================================
echo Add Shifts Schema to Database
echo ========================================
echo.

cd backend

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found in backend directory!
    echo.
    echo Please create a .env file with your database configuration.
    echo See CREATE_ENV_INSTRUCTIONS.md for details.
    echo.
    cd ..
    pause
    exit /b 1
)

echo Running shifts schema migration...
echo.

node src/scripts/addShiftsSchema.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Shifts schema added successfully!
    echo ========================================
    echo.
    echo Default shifts created:
    echo   - Morning Shift (06:00 - 14:00)
    echo   - Afternoon Shift (14:00 - 22:00)
    echo   - Night Shift (22:00 - 06:00)
    echo.
    echo You can now:
    echo   1. Configure shifts in Settings page
    echo   2. Assign shifts to operators when creating users
    echo.
) else (
    echo.
    echo ========================================
    echo Migration failed!
    echo ========================================
    echo.
    echo Please check:
    echo   1. PostgreSQL is running
    echo   2. DATABASE_URL in backend/.env is correct
    echo   3. Database user has proper permissions
    echo.
)

cd ..
echo.
pause


