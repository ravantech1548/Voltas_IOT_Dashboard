@echo off
echo Killing process on port 5000...
echo.

REM Find process using port 5000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    set PID=%%a
    echo Found process with PID: %%a
    echo Killing process...
    taskkill /PID %%a /F
    if %ERRORLEVEL% EQU 0 (
        echo Process killed successfully!
    ) else (
        echo Failed to kill process. You may need to run as administrator.
    )
    goto done
)

echo No process found on port 5000.
:done
echo.
pause


