@echo off
echo ========================================
echo IoT Dashboard - Database Setup Script
echo ========================================
echo.

REM Check if psql is available
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: psql command not found!
    echo.
    echo PostgreSQL is not in your PATH environment variable.
    echo.
    echo Solutions:
    echo 1. Add PostgreSQL bin directory to your PATH
    echo    Usually: C:\Program Files\PostgreSQL\14\bin
    echo    (or your PostgreSQL version number)
    echo.
    echo 2. Use the SQL file method instead:
    echo    - Run: setup-database-sql.bat
    echo    - Or manually execute the SQL file in pgAdmin
    echo.
    echo 3. Run psql with full path:
    echo    "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -f setup-database.sql
    echo.
    pause
    exit /b 1
)

echo This script will create:
echo - Database: iot_dashboard
echo - User: iotuser
echo - Password: iotpassword
echo.
echo You will be prompted for the PostgreSQL superuser password.
echo.
pause

echo.
echo Creating database and user...
echo.

REM Create SQL script file
(
    echo CREATE DATABASE iot_dashboard;
    echo CREATE USER iotuser WITH PASSWORD 'iotpassword';
    echo GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;
    echo \c iot_dashboard
    echo GRANT ALL ON SCHEMA public TO iotuser;
    echo GRANT CREATE ON SCHEMA public TO iotuser;
    echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
    echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;
    echo \q
) > %TEMP%\setup_db.sql

REM Execute SQL commands
psql -U postgres -f %TEMP%\setup_db.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Database setup completed successfully!
    echo ========================================
    echo.
    echo Database: iot_dashboard
    echo User: iotuser
    echo Password: iotpassword
    echo.
    echo You can now run the backend setup script.
) else (
    echo.
    echo ========================================
    echo Database setup failed!
    echo ========================================
    echo.
    echo Please check:
    echo 1. PostgreSQL is installed and running
    echo 2. You know the postgres superuser password
    echo 3. You have permission to create databases
    echo.
    echo You can also try running the SQL commands manually in pgAdmin
    echo or use setup-database-sql.bat which uses a different method.
    echo.
)

REM Clean up temp file
del %TEMP%\setup_db.sql 2>nul

echo.
pause
