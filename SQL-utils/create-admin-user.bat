@echo off
echo ========================================
echo Create Admin User Script
echo ========================================
echo.
echo This script will create an admin user with:
echo   Username: admin
echo   Password: admin123
echo   Role: admin
echo.
echo If the database schema doesn't exist, it will be created first.
echo.
pause

cd backend

if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create .env file first or run setup-backend.bat
    echo.
    pause
    exit /b 1
)

echo.
echo Creating admin user...
echo.

call npm run create-admin

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Admin user created successfully!
    echo ========================================
    echo.
    echo You can now login with:
    echo   Username: admin
    echo   Password: admin123
    echo.
) else (
    echo.
    echo ========================================
    echo Failed to create admin user!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

cd ..
pause


