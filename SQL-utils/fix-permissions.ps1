# Fix Database Permissions Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Database Permissions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will grant necessary permissions to the iotuser"
Write-Host "for the public schema in PostgreSQL."
Write-Host ""
Write-Host "You will be prompted for the PostgreSQL superuser (postgres) password."
Write-Host ""

$continue = Read-Host "Press Enter to continue"

Write-Host ""
Write-Host "Running SQL commands to grant permissions..." -ForegroundColor Green
Write-Host ""

# SQL commands
$sqlCommands = @"
GRANT ALL ON SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO iotuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iotuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iotuser;
GRANT CREATE ON SCHEMA public TO iotuser;
"@

# Create temporary SQL file
$tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sqlCommands | Out-File -FilePath $tempFile -Encoding UTF8

try {
    # Check if psql is available
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        Write-Host "ERROR: psql command not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please run this SQL manually in pgAdmin:" -ForegroundColor Yellow
        Write-Host "1. Open pgAdmin"
        Write-Host "2. Connect to PostgreSQL server"
        Write-Host "3. Open Query Tool on iot_dashboard database"
        Write-Host "4. Execute fix-database-permissions.sql"
        Write-Host ""
        exit 1
    }

    # Execute SQL commands as postgres superuser
    & psql -U postgres -d iot_dashboard -f $tempFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Permissions granted successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now run create-admin-user.bat again." -ForegroundColor Yellow
    } else {
        throw "psql command failed"
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Failed to grant permissions!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL is running"
    Write-Host "2. You know the postgres superuser password"
    Write-Host "3. The iot_dashboard database exists"
    Write-Host ""
    Write-Host "Alternative: Open pgAdmin and execute fix-database-permissions.sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}

Write-Host ""


