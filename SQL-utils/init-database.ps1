# Initialize Database Schema Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Initialize Database Schema" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: backend directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found in backend directory!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file with your database configuration." -ForegroundColor Yellow
    Write-Host "See CREATE_ENV_INSTRUCTIONS.md for details." -ForegroundColor Yellow
    Write-Host ""
    Set-Location $scriptPath
    exit 1
}

Write-Host "Running database initialization..." -ForegroundColor Yellow
Write-Host ""

node src/scripts/initDatabase.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Database initialization completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now create an admin user by running:" -ForegroundColor Cyan
    Write-Host "  create-admin-user.bat"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Database initialization failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is running"
    Write-Host "  2. DATABASE_URL in backend/.env is correct"
    Write-Host "  3. Database user has proper permissions"
    Write-Host ""
    Write-Host "See DATABASE_SETUP_TROUBLESHOOTING.md for help." -ForegroundColor Yellow
}

Set-Location $scriptPath


