@echo off
echo ========================================
echo Fix: Add shift_id Column to Users Table
echo ========================================
echo.

echo This script will add the shift_id column to the users table.
echo It also creates the shifts table and default shifts.
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

echo Running shift schema migration...
echo.

node src/scripts/addShiftsSchema.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo shift_id column added successfully!
    echo ========================================
    echo.
    echo What was done:
    echo   - Created shifts table
    echo   - Added shift_id column to users table
    echo   - Created default shifts (Morning, Afternoon, Night)
    echo.
    echo Note: Admin users have NULL shift_id (correct - admins have full access)
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
    echo You can also run the SQL manually using fix-shift-id-column.sql in pgAdmin
    echo.
)

cd ..
echo.
pause


