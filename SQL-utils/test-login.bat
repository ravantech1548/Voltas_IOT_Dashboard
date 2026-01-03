@echo off
echo ========================================
echo Test Login Script
echo ========================================
echo.

set API_URL=http://localhost:5000
set USERNAME=admin
set PASSWORD=admin123

if not "%1"=="" set USERNAME=%1
if not "%2"=="" set PASSWORD=%2

echo Testing login with:
echo   API URL: %API_URL%/api/auth/login
echo   Username: %USERNAME%
echo   Password: %PASSWORD%
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js or use test-login-curl.bat instead.
    echo.
    pause
    exit /b 1
)

echo Checking if backend server is running...
echo.

REM Quick check if backend is running
curl -s http://localhost:5000/health >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Backend server does not appear to be running!
    echo.
    echo Please start the backend server first:
    echo   cd backend
    echo   npm run dev
    echo.
    echo Then run this test script again.
    echo.
    pause
    exit /b 1
)

echo Backend server is reachable.
echo.
echo Running login test...
echo.

node test-login.js %USERNAME% %PASSWORD%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Login test completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Login test failed!
    echo ========================================
)

echo.
pause

