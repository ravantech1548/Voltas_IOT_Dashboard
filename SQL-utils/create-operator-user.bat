@echo off
echo ========================================
echo Create Operator User
echo ========================================
echo.

if "%4"=="" (
    echo Usage: create-operator-user.bat ^<username^> ^<password^> ^<email^> ^<shift_id^>
    echo.
    echo Example:
    echo   create-operator-user.bat operator1 op123 operator1@example.com 1
    echo.
    echo This script will create an operator user with the specified shift.
    echo The password will be securely hashed using bcrypt before storage.
    echo.
    pause
    exit /b 1
)

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

echo Creating operator user...
echo   Username: %1
echo   Email: %3
echo   Shift ID: %4
echo.

node src/scripts/createOperatorUser.js %1 %2 %3 %4

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Operator user created successfully!
    echo ========================================
    echo.
    echo The password has been securely hashed using bcrypt.
    echo The operator can only login during their assigned shift hours.
    echo.
) else (
    echo.
    echo ========================================
    echo Failed to create operator user!
    echo ========================================
    echo.
)

cd ..
pause


