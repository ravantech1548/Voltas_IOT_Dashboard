@echo off
echo ========================================
echo Fix Database Permissions
echo ========================================
echo.
echo This script will grant necessary permissions to the iotuser
echo for the public schema in PostgreSQL.
echo.
echo You will be prompted for the PostgreSQL superuser (postgres) password.
echo.
pause

echo.
echo Running SQL commands to grant permissions...
echo.

REM Create SQL script file
(
    echo GRANT ALL ON SCHEMA public TO iotuser;
    echo GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iotuser;
    echo GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iotuser;
    echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
    echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;
    echo GRANT CREATE ON SCHEMA public TO iotuser;
) > %TEMP%\fix_perms.sql

REM Execute SQL commands as postgres superuser
psql -U postgres -d iot_dashboard -f %TEMP%\fix_perms.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Permissions granted successfully!
    echo ========================================
    echo.
    echo You can now run create-admin-user.bat again.
) else (
    echo.
    echo ========================================
    echo Failed to grant permissions!
    echo ========================================
    echo.
    echo Please check:
    echo 1. PostgreSQL is running
    echo 2. You know the postgres superuser password
    echo 3. The iot_dashboard database exists
    echo.
    echo Alternative: Open pgAdmin and execute fix-database-permissions.sql
    echo.
)

REM Clean up temp file
del %TEMP%\fix_perms.sql 2>nul

echo.
pause


