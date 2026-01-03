@echo off
echo ========================================
echo Initialize Database Schema
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

echo Running database initialization...
echo.

node src/scripts/initDatabase.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Database initialization completed successfully!
    echo ========================================
    echo.
    echo You can now create an admin user by running:
    echo   create-admin-user.bat
) else (
    echo.
    echo ========================================
    echo Database initialization failed!
    echo ========================================
    echo.
    echo Please check:
    echo   1. PostgreSQL is running
    echo   2. DATABASE_URL in backend/.env is correct
    echo   3. Database user has proper permissions
    echo.
    echo See DATABASE_SETUP_TROUBLESHOOTING.md for help.
)

cd ..
echo.
pause


