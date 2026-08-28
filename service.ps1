# ==============================================================================
# V-Face Service Manager Script for Windows (PowerShell)
# Supports: start | stop | restart | status | logs
# Targets:  all (default) | core-user | backend | frontend | db
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "restart", "status", "test", "logs", "help")]
    [string]$Command = "help",

    [Parameter(Position = 1)]
    [ValidateSet("all", "core-user", "backend", "frontend", "db")]
    [string]$Target = "all"
)

$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$PID_DIR = Join-Path $PROJECT_ROOT ".pids"
$LOG_DIR = Join-Path $PROJECT_ROOT "logs"

$CORE_USER_DIR = Join-Path $PROJECT_ROOT "services\core-user"

$CORE_USER_PID_FILE = Join-Path $PID_DIR "core_user.pid"
$BACKEND_PID_FILE = Join-Path $PID_DIR "backend.pid"
$FRONTEND_PID_FILE = Join-Path $PID_DIR "frontend.pid"

$CORE_USER_LOG_FILE = Join-Path $LOG_DIR "core_user.log"
$BACKEND_LOG_FILE = Join-Path $LOG_DIR "backend.log"
$FRONTEND_LOG_FILE = Join-Path $LOG_DIR "frontend.log"

$CORE_USER_PORT = 8001
$BACKEND_PORT = 8000
$FRONTEND_PORT = 3000

# Ensure directories exist
if (-not (Test-Path $PID_DIR)) { New-Item -ItemType Directory -Path $PID_DIR -Force | Out-Null }
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

# Helper: check if a PID is running
function Test-PidRunning([int]$pidNumber) {
    if ($pidNumber -le 0) { return $false }
    try {
        $proc = Get-Process -Id $pidNumber -ErrorAction Stop
        return ($null -ne $proc)
    }
    catch {
        return $false
    }
}

# Helper: find PID by listening port
function Get-PidByPort([int]$portNumber) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $portNumber -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            return ($connections | Select-Object -ExpandProperty OwningProcess -First 1)
        }
    }
    catch {
        # Fallback to netstat if Get-NetTCPConnection fails
        $lines = netstat -ano | Select-String ":$portNumber\s+.*LISTENING\s+(\d+)"
        if ($lines) {
            $match = [regex]::Match($lines[0], ":$portNumber\s+.*LISTENING\s+(\d+)")
            if ($match.Success) {
                return [int]$match.Groups[1].Value
            }
        }
    }
    return $null
}

# Helper: stop a process tree safely
function Stop-ProcessTree([int]$pidNumber) {
    if (Test-PidRunning $pidNumber) {
        try {
            taskkill /PID $pidNumber /T /F 2>$null | Out-Null
        }
        catch {
            Stop-Process -Id $pidNumber -Force -ErrorAction SilentlyContinue
        }
    }
}

# Helper: resolve Python executable & auto-prepare environment
function Get-PythonExec {
    $pythonExec = Join-Path $PROJECT_ROOT "venv\Scripts\python.exe"
    if (-not (Test-Path $pythonExec)) {
        $pythonExec = Join-Path $PROJECT_ROOT ".venv\Scripts\python.exe"
    }

    if (-not (Test-Path $pythonExec)) {
        # Check if global python has uvicorn
        $hasUvicorn = $false
        try {
            $uvicornCheck = python -c "import uvicorn; print('ok')" 2>$null
            if ($uvicornCheck -eq "ok") {
                return "python"
            }
        } catch {}

        # Auto-create venv if missing or python lacks uvicorn
        Write-Host "Creating Python virtual environment in .\venv..." -ForegroundColor Yellow
        try {
            python -m venv (Join-Path $PROJECT_ROOT "venv")
            $venvPython = Join-Path $PROJECT_ROOT "venv\Scripts\python.exe"
            if (Test-Path $venvPython) {
                Write-Host "Installing backend and core-user dependencies..." -ForegroundColor Yellow
                & $venvPython -m pip install --upgrade pip --quiet
                if (Test-Path (Join-Path $PROJECT_ROOT "requirements.txt")) {
                    & $venvPython -m pip install -r (Join-Path $PROJECT_ROOT "requirements.txt") --quiet
                }
                if (Test-Path (Join-Path $CORE_USER_DIR "requirements.txt")) {
                    & $venvPython -m pip install -r (Join-Path $CORE_USER_DIR "requirements.txt") --quiet
                }
                return $venvPython
            }
        } catch {
            Write-Host "⚠ Error initializing Python virtual environment." -ForegroundColor Red
        }
        return "python"
    }
    return $pythonExec
}

# ------------------------------------------------------------------------------
# DATABASE (Docker Compose)
# ------------------------------------------------------------------------------
function Start-Db {
    $composeFile = Join-Path $PROJECT_ROOT "docker-compose.yml"
    $hasDocker = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null

    if ($hasDocker) {
        Write-Host "[DB] Starting PostgreSQL container..." -ForegroundColor Cyan
        try {
            docker compose -f $composeFile up -d postgres
            Write-Host "✔ [DB] PostgreSQL is running." -ForegroundColor Green
        }
        catch {
            Write-Host "⚠ [DB] Failed to start Docker container via docker compose." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "⚠ [DB] Docker not found or not running. Skipping database container auto-start." -ForegroundColor Yellow
    }
}

function Stop-Db {
    $composeFile = Join-Path $PROJECT_ROOT "docker-compose.yml"
    $hasDocker = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null

    if ($hasDocker) {
        Write-Host "[DB] Stopping PostgreSQL container..." -ForegroundColor Cyan
        try {
            docker compose -f $composeFile stop postgres
            Write-Host "✔ [DB] PostgreSQL container stopped." -ForegroundColor Green
        }
        catch {
            Write-Host "⚠ [DB] Failed to stop Docker container." -ForegroundColor Yellow
        }
    }
}

# ------------------------------------------------------------------------------
# CORE USER SERVICE (Port 8001)
# ------------------------------------------------------------------------------
function Start-CoreUser {
    Write-Host "▶ Starting Core User Service (IAM/Auth/RBAC/Org)..." -ForegroundColor Magenta

    # Check PID file
    if (Test-Path $CORE_USER_PID_FILE) {
        $pidContent = (Get-Content $CORE_USER_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$') {
            $pidNumber = [int]$pidContent
            if (Test-PidRunning $pidNumber) {
                Write-Host "⚠ Core User Service is already running (PID: $pidNumber) on port $CORE_USER_PORT" -ForegroundColor Yellow
                return
            }
        }
    }

    # Check port
    $portPid = Get-PidByPort $CORE_USER_PORT
    if ($portPid) {
        Write-Host "⚠ Port $CORE_USER_PORT is already in use by PID $portPid." -ForegroundColor Yellow
        Set-Content -Path $CORE_USER_PID_FILE -Value $portPid
        return
    }

    $pythonExec = Get-PythonExec

    # Start process via cmd.exe redirection to avoid file locking issues in PowerShell
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = '/c ""' + $pythonExec + '" -m uvicorn app.main:app --host 0.0.0.0 --port ' + $CORE_USER_PORT + ' >> "' + $CORE_USER_LOG_FILE + '" 2>&1"'
    $psi.WorkingDirectory = $CORE_USER_DIR
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $proc = [System.Diagnostics.Process]::Start($psi)
    if ($proc) {
        Set-Content -Path $CORE_USER_PID_FILE -Value $proc.Id

        Start-Sleep -Milliseconds 2000

        $portPid = Get-PidByPort $CORE_USER_PORT
        if ($portPid -or (Test-PidRunning $proc.Id)) {
            if ($portPid) { Set-Content -Path $CORE_USER_PID_FILE -Value $portPid }
            Write-Host "✔ Core User Service started! (PID: $($proc.Id))" -ForegroundColor Green
            Write-Host "  API URL:  http://localhost:$CORE_USER_PORT" -ForegroundColor Cyan
            Write-Host "  Docs URL: http://localhost:$CORE_USER_PORT/docs" -ForegroundColor Cyan
            Write-Host "  Logs:     $CORE_USER_LOG_FILE"
        }
        else {
            Write-Host "✖ Failed to start Core User Service. Check logs: $CORE_USER_LOG_FILE" -ForegroundColor Red
            if (Test-Path $CORE_USER_PID_FILE) { Remove-Item $CORE_USER_PID_FILE -Force }
        }
    }
}

function Stop-CoreUser {
    Write-Host "■ Stopping Core User Service..." -ForegroundColor Magenta
    $stopped = $false

    if (Test-Path $CORE_USER_PID_FILE) {
        $pidContent = (Get-Content $CORE_USER_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$') {
            $pidNumber = [int]$pidContent
            if (Test-PidRunning $pidNumber) {
                Stop-ProcessTree $pidNumber
                $stopped = $true
                Write-Host "✔ Core User Service (PID: $pidNumber) stopped." -ForegroundColor Green
            }
        }
        Remove-Item $CORE_USER_PID_FILE -Force -ErrorAction SilentlyContinue
    }

    $portPid = Get-PidByPort $CORE_USER_PORT
    if ($portPid) {
        Stop-ProcessTree $portPid
        $stopped = $true
        Write-Host "✔ Cleaned up process occupying port $CORE_USER_PORT (PID: $portPid)." -ForegroundColor Green
    }

    if (-not $stopped) {
        Write-Host "Core User Service is not running." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------------------
# BACKEND - FACE AI (Port 8000)
# ------------------------------------------------------------------------------
function Start-Backend {
    Write-Host "▶ Starting Face AI Attendance Backend..." -ForegroundColor Blue

    # Check PID file
    if (Test-Path $BACKEND_PID_FILE) {
        $pidContent = (Get-Content $BACKEND_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$') {
            $pidNumber = [int]$pidContent
            if (Test-PidRunning $pidNumber) {
                Write-Host "⚠ Backend is already running (PID: $pidNumber) on port $BACKEND_PORT" -ForegroundColor Yellow
                return
            }
        }
    }

    # Check port
    $portPid = Get-PidByPort $BACKEND_PORT
    if ($portPid) {
        Write-Host "⚠ Port $BACKEND_PORT is already in use by PID $portPid." -ForegroundColor Yellow
        Set-Content -Path $BACKEND_PID_FILE -Value $portPid
        return
    }

    $pythonExec = Get-PythonExec

    # Start background process via cmd.exe redirection to prevent file locks
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = '/c ""' + $pythonExec + '" -m uvicorn app.main:app --host 0.0.0.0 --port ' + $BACKEND_PORT + ' >> "' + $BACKEND_LOG_FILE + '" 2>&1"'
    $psi.WorkingDirectory = $PROJECT_ROOT
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $proc = [System.Diagnostics.Process]::Start($psi)
    if ($proc) {
        Set-Content -Path $BACKEND_PID_FILE -Value $proc.Id

        Start-Sleep -Milliseconds 2000

        $portPid = Get-PidByPort $BACKEND_PORT
        if ($portPid -or (Test-PidRunning $proc.Id)) {
            if ($portPid) { Set-Content -Path $BACKEND_PID_FILE -Value $portPid }
            Write-Host "✔ Face AI Backend started! (PID: $($proc.Id))" -ForegroundColor Green
            Write-Host "  API URL:  http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
            Write-Host "  Docs URL: http://localhost:$BACKEND_PORT/docs" -ForegroundColor Cyan
            Write-Host "  Logs:     $BACKEND_LOG_FILE"
        }
        else {
            Write-Host "✖ Failed to start Backend. Check logs: $BACKEND_LOG_FILE" -ForegroundColor Red
            if (Test-Path $BACKEND_PID_FILE) { Remove-Item $BACKEND_PID_FILE -Force }
        }
    }
}

function Stop-Backend {
    Write-Host "■ Stopping Face AI Backend..." -ForegroundColor Blue
    $stopped = $false

    if (Test-Path $BACKEND_PID_FILE) {
        $pidContent = (Get-Content $BACKEND_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$') {
            $pidNumber = [int]$pidContent
            if (Test-PidRunning $pidNumber) {
                Stop-ProcessTree $pidNumber
                $stopped = $true
                Write-Host "✔ Face AI Backend (PID: $pidNumber) stopped." -ForegroundColor Green
            }
        }
        Remove-Item $BACKEND_PID_FILE -Force -ErrorAction SilentlyContinue
    }

    $portPid = Get-PidByPort $BACKEND_PORT
    if ($portPid) {
        Stop-ProcessTree $portPid
        $stopped = $true
        Write-Host "✔ Cleaned up process occupying port $BACKEND_PORT (PID: $portPid)." -ForegroundColor Green
    }

    if (-not $stopped) {
        Write-Host "Face AI Backend is not running." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------------------
# FRONTEND
# ------------------------------------------------------------------------------
function Start-Frontend {
    Write-Host "▶ Starting Frontend (Vite/React)..." -ForegroundColor Cyan
    $frontendDir = Join-Path $PROJECT_ROOT "frontend"

    # Check PID file
    if (Test-Path $FRONTEND_PID_FILE) {
        $pidContent = (Get-Content $FRONTEND_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$') {
            $pidNumber = [int]$pidContent
            if (Test-PidRunning $pidNumber) {
                Write-Host "⚠ Frontend is already running (PID: $pidNumber) on port $FRONTEND_PORT" -ForegroundColor Yellow
                return
            }
        }
    }

    # Check port
    $portPid = Get-PidByPort $FRONTEND_PORT
    if ($portPid) {
        Write-Host "⚠ Port $FRONTEND_PORT is already in use by PID $portPid." -ForegroundColor Yellow
        Set-Content -Path $FRONTEND_PID_FILE -Value $portPid
        return
    }

    # Check node_modules
    $nodeModules = Join-Path $frontendDir "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location $frontendDir
        npm install
        Pop-Location
    }

    # Start Vite in background via cmd.exe redirection
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = '/c "npm run dev >> "' + $FRONTEND_LOG_FILE + '" 2>&1"'
    $psi.WorkingDirectory = $frontendDir
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $proc = [System.Diagnostics.Process]::Start($psi)
    if ($proc) {
        Set-Content -Path $FRONTEND_PID_FILE -Value $proc.Id

        Start-Sleep -Milliseconds 2000

        $portPid = Get-PidByPort $FRONTEND_PORT
        if ($portPid -or (Test-PidRunning $proc.Id)) {
            if ($portPid) { Set-Content -Path $FRONTEND_PID_FILE -Value $portPid }
            Write-Host "✔ Frontend started! (PID: $($proc.Id))" -ForegroundColor Green
            Write-Host "  Web URL: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
            Write-Host "  Logs:    $FRONTEND_LOG_FILE"
        }
        else {
            Write-Host "✖ Failed to start Frontend. Check logs: $FRONTEND_LOG_FILE" -ForegroundColor Red
            if (Test-Path $FRONTEND_PID_FILE) { Remove-Item $FRONTEND_PID_FILE -Force }
        }
    }
}

function Stop-Frontend {
    Write-Host "■ Stopping Frontend..." -ForegroundColor Cyan
    $stopped = $false

    if (Test-Path $FRONTEND_PID_FILE) {
        $pidContent = (Get-Content $FRONTEND_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$') {
            $pidNumber = [int]$pidContent
            if (Test-PidRunning $pidNumber) {
                Stop-ProcessTree $pidNumber
                $stopped = $true
                Write-Host "✔ Frontend (PID: $pidNumber) stopped." -ForegroundColor Green
            }
        }
        Remove-Item $FRONTEND_PID_FILE -Force -ErrorAction SilentlyContinue
    }

    $portPid = Get-PidByPort $FRONTEND_PORT
    if ($portPid) {
        Stop-ProcessTree $portPid
        $stopped = $true
        Write-Host "✔ Cleaned up process occupying port $FRONTEND_PORT (PID: $portPid)." -ForegroundColor Green
    }

    if (-not $stopped) {
        Write-Host "Frontend is not running." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------------------------
# STATUS
# ------------------------------------------------------------------------------
function Get-ServiceStatus {
    Write-Host "`n====== V-Face Ecosystem Services Status ======" -ForegroundColor DarkCyan

    # Database
    $hasDocker = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null
    if ($hasDocker) {
        $dbStatus = docker ps --filter "name=vface_postgres" --format "{{.Status}}" 2>$null
        if ($dbStatus) {
            Write-Host "  PostgreSQL:   " -NoNewline
            Write-Host "● Running ($dbStatus)" -ForegroundColor Green
        }
        else {
            Write-Host "  PostgreSQL:   " -NoNewline
            Write-Host "○ Stopped" -ForegroundColor Red
        }
    }

    # Core User Service
    $coreUserPid = $null
    if (Test-Path $CORE_USER_PID_FILE) {
        $pidContent = (Get-Content $CORE_USER_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$' -and (Test-PidRunning ([int]$pidContent))) {
            $coreUserPid = [int]$pidContent
        }
    }
    if (-not $coreUserPid) {
        $coreUserPid = Get-PidByPort $CORE_USER_PORT
    }

    if ($coreUserPid) {
        Write-Host "  Core User:    " -NoNewline
        Write-Host "● Running " -ForegroundColor Green -NoNewline
        Write-Host "(PID: $coreUserPid, Port: $CORE_USER_PORT) -> http://localhost:$CORE_USER_PORT/docs"
    }
    else {
        Write-Host "  Core User:    " -NoNewline
        Write-Host "○ Stopped" -ForegroundColor Red
    }

    # Backend Face AI
    $backendPid = $null
    if (Test-Path $BACKEND_PID_FILE) {
        $pidContent = (Get-Content $BACKEND_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$' -and (Test-PidRunning ([int]$pidContent))) {
            $backendPid = [int]$pidContent
        }
    }
    if (-not $backendPid) {
        $backendPid = Get-PidByPort $BACKEND_PORT
    }

    if ($backendPid) {
        Write-Host "  Face AI:      " -NoNewline
        Write-Host "● Running " -ForegroundColor Green -NoNewline
        Write-Host "(PID: $backendPid, Port: $BACKEND_PORT) -> http://localhost:$BACKEND_PORT/docs"
    }
    else {
        Write-Host "  Face AI:      " -NoNewline
        Write-Host "○ Stopped" -ForegroundColor Red
    }

    # Frontend
    $frontendPid = $null
    if (Test-Path $FRONTEND_PID_FILE) {
        $pidContent = (Get-Content $FRONTEND_PID_FILE -ErrorAction SilentlyContinue | Out-String).Trim()
        if ($pidContent -match '^\d+$' -and (Test-PidRunning ([int]$pidContent))) {
            $frontendPid = [int]$pidContent
        }
    }
    if (-not $frontendPid) {
        $frontendPid = Get-PidByPort $FRONTEND_PORT
    }

    if ($frontendPid) {
        Write-Host "  Frontend:     " -NoNewline
        Write-Host "● Running " -ForegroundColor Green -NoNewline
        Write-Host "(PID: $frontendPid, Port: $FRONTEND_PORT) -> http://localhost:$FRONTEND_PORT"
    }
    else {
        Write-Host "  Frontend:     " -NoNewline
        Write-Host "○ Stopped" -ForegroundColor Red
    }

    Write-Host "==============================================`n" -ForegroundColor DarkCyan
}

# ------------------------------------------------------------------------------
# LOGS
# ------------------------------------------------------------------------------
function Show-Logs([string]$logTarget) {
    switch ($logTarget) {
        "core-user" {
            if (-not (Test-Path $CORE_USER_LOG_FILE)) { New-Item -ItemType File -Path $CORE_USER_LOG_FILE -Force | Out-Null }
            Write-Host "Following Core User logs ($CORE_USER_LOG_FILE)... (Press Ctrl+C to exit)" -ForegroundColor Cyan
            Get-Content -Path $CORE_USER_LOG_FILE -Tail 50 -Wait
        }
        "backend" {
            if (-not (Test-Path $BACKEND_LOG_FILE)) { New-Item -ItemType File -Path $BACKEND_LOG_FILE -Force | Out-Null }
            Write-Host "Following Face AI Backend logs ($BACKEND_LOG_FILE)... (Press Ctrl+C to exit)" -ForegroundColor Cyan
            Get-Content -Path $BACKEND_LOG_FILE -Tail 50 -Wait
        }
        "frontend" {
            if (-not (Test-Path $FRONTEND_LOG_FILE)) { New-Item -ItemType File -Path $FRONTEND_LOG_FILE -Force | Out-Null }
            Write-Host "Following Frontend logs ($FRONTEND_LOG_FILE)... (Press Ctrl+C to exit)" -ForegroundColor Cyan
            Get-Content -Path $FRONTEND_LOG_FILE -Tail 50 -Wait
        }
        default {
            Write-Host "Showing last lines of logs..." -ForegroundColor Cyan
            if (Test-Path $CORE_USER_LOG_FILE) {
                Write-Host "--- Core User Log ($CORE_USER_LOG_FILE) ---" -ForegroundColor Magenta
                Get-Content -Path $CORE_USER_LOG_FILE -Tail 15 -ErrorAction SilentlyContinue
            }
            if (Test-Path $BACKEND_LOG_FILE) {
                Write-Host "`n--- Face AI Backend Log ($BACKEND_LOG_FILE) ---" -ForegroundColor Blue
                Get-Content -Path $BACKEND_LOG_FILE -Tail 15 -ErrorAction SilentlyContinue
            }
            if (Test-Path $FRONTEND_LOG_FILE) {
                Write-Host "`n--- Frontend Log ($FRONTEND_LOG_FILE) ---" -ForegroundColor Yellow
                Get-Content -Path $FRONTEND_LOG_FILE -Tail 15 -ErrorAction SilentlyContinue
            }
            Write-Host "`n(Tip: Run '.\service.ps1 logs core-user' or '.\service.ps1 logs backend' to follow in real-time)" -ForegroundColor DarkGray
        }
    }
}

# ------------------------------------------------------------------------------
# MAIN CLI ROUTER
# ------------------------------------------------------------------------------
function Show-Usage {
    Write-Host "Usage: .\service.ps1 {start|stop|restart|status|logs} [all|core-user|backend|frontend|db]`n" -ForegroundColor Yellow
    Write-Host "Examples:"
    Write-Host "  .\service.ps1 start                  # Start DB, Core User, Face AI & Frontend"
    Write-Host "  .\service.ps1 stop                   # Stop all services"
    Write-Host "  .\service.ps1 restart                # Restart all services"
    Write-Host "  .\service.ps1 start core-user        # Start Core User Service only (Port 8001)"
    Write-Host "  .\service.ps1 stop core-user         # Stop Core User Service only"
    Write-Host "  .\service.ps1 start backend          # Start Face AI Backend only (Port 8000)"
    Write-Host "  .\service.ps1 stop backend           # Stop Face AI Backend only"
    Write-Host "  .\service.ps1 start frontend         # Start Frontend only (Port 5173)"
    Write-Host "  .\service.ps1 stop frontend          # Stop Frontend only"
    Write-Host "  .\service.ps1 status                 # Check status of all ecosystem services"
    Write-Host "  .\service.ps1 test                   # Run automated Playwright E2E tests"
    Write-Host "  .\service.ps1 logs core-user         # Stream Core User service logs"
    Write-Host "  .\service.ps1 logs backend           # Stream Face AI Backend logs"
}

function Run-E2ETests {
    Write-Host "`n🚀 Running Playwright E2E Tests for V-Face Ecosystem..." -ForegroundColor Cyan
    $frontendDir = Join-Path $PROJECT_ROOT "frontend"
    Push-Location $frontendDir
    npx playwright test
    Pop-Location
}

switch ($Command) {
    "start" {
        switch ($Target) {
            "core-user" { Start-CoreUser }
            "backend"   { Start-Backend }
            "frontend"  { Start-Frontend }
            "db"        { Start-Db }
            default     { Start-Db; Start-CoreUser; Start-Backend; Start-Frontend }
        }
    }
    "stop" {
        switch ($Target) {
            "core-user" { Stop-CoreUser }
            "backend"   { Stop-Backend }
            "frontend"  { Stop-Frontend }
            "db"        { Stop-Db }
            default     { Stop-Frontend; Stop-Backend; Stop-CoreUser }
        }
    }
    "restart" {
        switch ($Target) {
            "core-user" { Stop-CoreUser; Start-CoreUser }
            "backend"   { Stop-Backend; Start-Backend }
            "frontend"  { Stop-Frontend; Start-Frontend }
            "db"        { Stop-Db; Start-Db }
            default     { Stop-Frontend; Stop-Backend; Stop-CoreUser; Start-Db; Start-CoreUser; Start-Backend; Start-Frontend }
        }
    }
    "status" {
        Get-ServiceStatus
    }
    "test" {
        Run-E2ETests
    }
    "logs" {
        Show-Logs $Target
    }
    default {
        Show-Usage
    }
}

