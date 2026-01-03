@echo off
echo ========================================
echo Test Login Script (using curl)
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

REM Check if curl is available
where curl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: curl is not installed or not in PATH!
    echo.
    echo Please install curl or use test-login.bat (requires Node.js) instead.
    echo.
    pause
    exit /b 1
)

echo Sending login request...
echo.

curl -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"%USERNAME%\",\"password\":\"%PASSWORD%\"}" ^
  -w "\n\nStatus Code: %%{http_code}\n"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Login test completed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Login test failed!
    echo ========================================
    echo.
    echo Please check:
    echo   1. Backend server is running on %API_URL%
    echo   2. The API URL is correct
)

echo.
pause


