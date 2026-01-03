# Fix: Port 5000 Already in Use

## The Problem

You're seeing this error:
```
Error: listen EADDRINUSE: address already in use :::5000
```

This means another process (likely another instance of your backend server) is already using port 5000.

## Solution Options

### Option 1: Kill the Process Using Port 5000 (Recommended)

**Windows (PowerShell):**
```powershell
# Find and kill process on port 5000
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | 
  Select-Object -ExpandProperty OwningProcess | 
  ForEach-Object { Stop-Process -Id $_ -Force }
```

**Windows (Command Prompt):**
```cmd
# Find the process ID
netstat -ano | findstr :5000

# Kill the process (replace PID with the actual process ID from above)
taskkill /PID <PID> /F
```

**Example:**
```cmd
netstat -ano | findstr :5000
# Output shows PID 13196
taskkill /PID 13196 /F
```

**Linux/Mac:**
```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9
# or
kill -9 $(lsof -t -i:5000)
```

### Option 2: Change the Port

1. **Edit `backend/.env` file:**
   ```env
   PORT=5001
   ```
   (Change from 5000 to any other available port, like 5001, 5002, etc.)

2. **Update frontend `.env` file** to match:
   ```env
   REACT_APP_API_URL=http://localhost:5001/api
   REACT_APP_WS_URL=http://localhost:5001
   ```

3. **Restart both backend and frontend servers**

### Option 3: Check for Multiple Server Instances

You might have multiple terminal windows running `npm run dev`. Check all your terminals and stop the duplicate instances.

**To check if Node.js is running:**
```powershell
# Windows
Get-Process node

# Kill all node processes (be careful!)
Stop-Process -Name node -Force
```

## Quick Fix Command (Windows PowerShell)

Run this to automatically kill the process on port 5000:

```powershell
$port = 5000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($process) {
    $pid = $process.OwningProcess
    Write-Host "Killing process $pid using port $port..."
    Stop-Process -Id $pid -Force
    Write-Host "Process killed. You can now start your server."
} else {
    Write-Host "No process found on port $port"
}
```

## After Fixing

Once you've freed up port 5000 (or changed to a different port), restart your backend server:

```bash
cd backend
npm run dev
```

You should see:
```
Database connection successful
Server running on port 5000
Environment: development
```

## Prevention

To avoid this in the future:
- Always stop the server (Ctrl+C) before starting a new instance
- Check if the server is already running before starting it again
- Use a different port for different projects


