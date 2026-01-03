# Add Shifts Schema Script - PowerShell
# Adds shifts table and updates users table with shift_id column

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Add Shifts Schema to Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location backend

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "ERROR: .env file not found in backend directory!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file with your database configuration." -ForegroundColor Yellow
    Write-Host "See CREATE_ENV_INSTRUCTIONS.md for details." -ForegroundColor Yellow
    Write-Host ""
    Set-Location ..
    exit 1
}

Write-Host "Running shifts schema migration..." -ForegroundColor Green
Write-Host ""

node src/scripts/addShiftsSchema.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Shifts schema added successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Default shifts created:" -ForegroundColor Yellow
    Write-Host "  - Morning Shift (06:00 - 14:00)"
    Write-Host "  - Afternoon Shift (14:00 - 22:00)"
    Write-Host "  - Night Shift (22:00 - 06:00)"
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Yellow
    Write-Host "  1. Configure shifts in Settings page"
    Write-Host "  2. Assign shifts to operators when creating users"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Migration failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is running"
    Write-Host "  2. DATABASE_URL in backend/.env is correct"
    Write-Host "  3. Database user has proper permissions"
    Write-Host ""
}

Set-Location ..
Write-Host ""


