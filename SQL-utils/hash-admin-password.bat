@echo off
echo ========================================
echo Hash Admin Password Utility
echo ========================================
echo.

cd backend

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js to use this script.
    echo.
    cd ..
    pause
    exit /b 1
)

echo This script will hash the admin password "admin123" using bcrypt.
echo.
echo The hash can be used to:
echo   1. Update existing admin password in database
echo   2. Verify password hashing is working correctly
echo   3. Test password verification
echo.

if "%1"=="" (
    echo Hashing default password: admin123
    echo (You can specify a different password as an argument)
    echo.
    node src/scripts/hashPassword.js admin123
) else (
    echo Hashing password: %1
    echo.
    node src/scripts/hashPassword.js %1
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Password hashing completed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Password hashing failed!
    echo ========================================
)

cd ..
echo.
pause


