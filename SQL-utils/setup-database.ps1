# IoT Dashboard - Database Setup Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IoT Dashboard - Database Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will create:"
Write-Host "- Database: iot_dashboard"
Write-Host "- User: iotuser"
Write-Host "- Password: iotpassword"
Write-Host ""
Write-Host "You will be prompted for the PostgreSQL superuser password."
Write-Host ""

$continue = Read-Host "Press Enter to continue"

Write-Host ""
Write-Host "Creating database and user..." -ForegroundColor Green
Write-Host ""

# SQL commands - Create database and user first
$sqlCommands1 = @"
CREATE DATABASE iot_dashboard;
CREATE USER iotuser WITH PASSWORD 'iotpassword';
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO iotuser;
"@

# SQL commands - Grant schema permissions
$sqlCommands2 = @"
GRANT ALL ON SCHEMA public TO iotuser;
GRANT CREATE ON SCHEMA public TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;
"@

# Create temporary SQL files
$tempFile1 = [System.IO.Path]::GetTempFileName() + ".sql"
$tempFile2 = [System.IO.Path]::GetTempFileName() + ".sql"
$sqlCommands1 | Out-File -FilePath $tempFile1 -Encoding UTF8
$sqlCommands2 | Out-File -FilePath $tempFile2 -Encoding UTF8

try {
    # Check if psql is available
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        Write-Host "ERROR: psql command not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "PostgreSQL is not in your PATH environment variable." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Cyan
        Write-Host "1. Add PostgreSQL bin directory to your PATH"
        Write-Host "   Usually: C:\Program Files\PostgreSQL\14\bin"
        Write-Host "   (Check your PostgreSQL installation directory)"
        Write-Host ""
        Write-Host "2. Use pgAdmin instead:"
        Write-Host "   - Open pgAdmin"
        Write-Host "   - Connect to your PostgreSQL server"
        Write-Host "   - Execute the SQL commands from setup-database.sql"
        Write-Host ""
        exit 1
    }

    # Execute first set of commands (create database and user)
    & psql -U postgres -f $tempFile1
    
    if ($LASTEXITCODE -eq 0) {
        # Execute second set on the database (grant schema permissions)
        & psql -U postgres -d iot_dashboard -f $tempFile2
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Database setup completed successfully!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Database: iot_dashboard"
            Write-Host "User: iotuser"
            Write-Host "Password: iotpassword"
            Write-Host ""
            Write-Host "You can now run the backend setup script." -ForegroundColor Green
        } else {
            throw "Failed to grant schema permissions"
        }
    } else {
        throw "Failed to create database and user"
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Database setup failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL is installed and running"
    Write-Host "2. You know the postgres superuser password"
    Write-Host "3. You have permission to create databases"
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Open pgAdmin and execute setup-database.sql manually." -ForegroundColor Yellow
    exit 1
} finally {
    # Clean up temp files
    if (Test-Path $tempFile1) {
        Remove-Item $tempFile1 -Force
    }
    if (Test-Path $tempFile2) {
        Remove-Item $tempFile2 -Force
    }
}

Write-Host ""
