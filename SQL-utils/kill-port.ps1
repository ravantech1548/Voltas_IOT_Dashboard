# Kill process on port 5000
$port = 5000

Write-Host "Finding process on port $port..." -ForegroundColor Yellow

try {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop
    $pid = $connection.OwningProcess
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "Found process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Cyan
        Write-Host "Killing process..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force
        Write-Host "✓ Process killed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Process with PID $pid not found" -ForegroundColor Red
    }
} catch {
    Write-Host "No process found on port $port" -ForegroundColor Yellow
    Write-Host "You can start your server now." -ForegroundColor Green
}

Write-Host ""


