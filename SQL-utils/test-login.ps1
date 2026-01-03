# Test Login Script - PowerShell
# Tests the login API endpoint with admin credentials

param(
    [string]$ApiUrl = "http://localhost:5000",
    [string]$Username = "admin",
    [string]$Password = "admin123"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Login Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing login with:" -ForegroundColor Yellow
Write-Host "  API URL: $ApiUrl/api/auth/login"
Write-Host "  Username: $Username"
Write-Host "  Password: $('*' * $Password.Length)"
Write-Host ""
Write-Host "Sending login request..." -ForegroundColor Green
Write-Host ""

try {
    # First, check if server is reachable
    Write-Host "Checking if backend server is reachable..." -ForegroundColor Yellow
    try {
        $healthCheck = Invoke-WebRequest -Uri "$ApiUrl/health" -Method Get -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($healthCheck.StatusCode -eq 200) {
            Write-Host "✓ Backend server is reachable" -ForegroundColor Green
        }
    } catch {
        Write-Host "✗ Backend server is not reachable!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please start the backend server:" -ForegroundColor Yellow
        Write-Host "  cd backend"
        Write-Host "  npm run dev"
        Write-Host ""
        exit 1
    }

    Write-Host ""

    $body = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 5 `
        -ErrorAction Stop

    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "  Token: $($response.token.Substring(0, [Math]::Min(50, $response.token.Length)))..."
    Write-Host "  User ID: $($response.user.id)"
    Write-Host "  Username: $($response.user.username)"
    Write-Host "  Email: $($response.user.email)"
    Write-Host "  Role: $($response.user.role)"
    Write-Host "  Client ID: $($response.user.client_id)"
    Write-Host ""
    Write-Host "Full token:" -ForegroundColor Yellow
    Write-Host $response.token
    Write-Host ""
    Write-Host "To use this token in API requests, add this header:" -ForegroundColor Cyan
    Write-Host "Authorization: Bearer $($response.token)"
    Write-Host ""
} catch {
    Write-Host "✗ Login failed!" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        try {
            $errorObj = $responseBody | ConvertFrom-Json
            Write-Host "Error: $($errorObj.error)" -ForegroundColor Red
        } catch {
            Write-Host "Error: $responseBody" -ForegroundColor Red
        }
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "Possible reasons:" -ForegroundColor Yellow
            Write-Host "  - Username or password is incorrect"
            Write-Host "  - Admin user has not been created yet"
            Write-Host ""
            Write-Host "To create admin user, run:" -ForegroundColor Cyan
            Write-Host "  create-admin-user.bat"
        }
    } else {
        $errorMsg = $_.Exception.Message
        Write-Host "Error: $errorMsg" -ForegroundColor Red
        
        if ($errorMsg -like "*Unable to connect*" -or $errorMsg -like "*Connection refused*") {
            Write-Host ""
            Write-Host "Backend server is not running!" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please start the backend server:" -ForegroundColor Yellow
            Write-Host "  cd backend"
            Write-Host "  npm run dev"
        } else {
            Write-Host ""
            Write-Host "Please check:" -ForegroundColor Yellow
            Write-Host "  1. Backend server is running on $ApiUrl"
            Write-Host "  2. The API URL is correct"
            Write-Host "  3. No firewall is blocking the connection"
        }
    }
    
    exit 1
}

Write-Host ""

