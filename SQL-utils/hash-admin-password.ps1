# Hash Admin Password Utility - PowerShell
# Hashes the admin password using bcrypt

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Hash Admin Password Utility" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location backend

# Check if Node.js is available
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js to use this script." -ForegroundColor Yellow
    Write-Host ""
    Set-Location ..
    exit 1
}

Write-Host "This script will hash the admin password using bcrypt." -ForegroundColor Green
Write-Host ""
Write-Host "The hash can be used to:" -ForegroundColor Yellow
Write-Host "  1. Update existing admin password in database"
Write-Host "  2. Verify password hashing is working correctly"
Write-Host "  3. Test password verification"
Write-Host ""

if ($args.Count -eq 0) {
    Write-Host "Hashing default password: admin123" -ForegroundColor Yellow
    Write-Host "(You can specify a different password as an argument)" -ForegroundColor Gray
    Write-Host ""
    node src/scripts/hashPassword.js admin123
} else {
    Write-Host "Hashing password: $($args[0])" -ForegroundColor Yellow
    Write-Host ""
    node src/scripts/hashPassword.js $args[0]
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Password hashing completed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Password hashing failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Set-Location ..
Write-Host ""


