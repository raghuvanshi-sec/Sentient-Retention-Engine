# Sentient Retention Engine - Microservices Developer Startup Orchestrator
# Highly resilient, dynamic port cleanup, and interactive master dashboard.
# Conforms to strict Windows PowerShell safety and compatibility standards.

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# Bulletproof script directory resolution across all execution styles (saving, selection, copy-paste)
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { $pwd.Path }

$SpawnedProcesses = @()

# Function to clean up a port listener
function Stop-PortListener ($Port, $Name) {
    try {
        $Connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($Connections) {
            foreach ($Conn in $Connections) {
                $TargetProcessId = if ($Conn) { $Conn.OwningProcess } else { $null }
                if ($TargetProcessId) {
                    Write-Host "[!] Port $Port in use by legacy $Name. Reclaiming port (PID: $TargetProcessId)..." -ForegroundColor Yellow
                    Stop-Process -Id $TargetProcessId -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 500
                }
            }
        }
    }
    catch {
        # Suppress any command availability or operational errors
    }
}

try {
    # Safely clear screen
    try { Clear-Host } catch {}

    # Set window title safely (null-guarding host interfaces)
    try {
        if ($Host -and $Host.UI -and $Host.UI.RawUI) {
            $Host.UI.RawUI.WindowTitle = "Sentient-Retention Dev Suite Orchestrator"
        }
    }
    catch {}

    # Define ANSI colors for premium aesthetic (using ASCII only)
    $E = [char]27
    $EscGreen   = "$E[38;2;46;204;113m"
    $EscCyan    = "$E[38;2;52;152;219m"
    $EscYellow  = "$E[38;2;241;196;15m"
    $EscMagenta = "$E[38;2;155;89;182m"
    $EscWhite   = "$E[38;2;236;240;241m"
    $EscRed     = "$E[38;2;231;76;60m"
    $EscReset   = "$E[0m"

    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "   [SRE] SENTIENT RETENTION ENGINE - DEVELOPER SUITE      " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "Initializing resilient dev environment..." -ForegroundColor Yellow

    $Services = @(
        @{
            Name = "React Dashboard Frontend"
            Path = Join-Path $ScriptDir "frontend"
            Cmd  = "npm run dev"
            Port = 3000
            Color = "Green"
            EscColor = $EscGreen
        },
        @{
            Name = "Express Governance Backend"
            Path = Join-Path $ScriptDir "backend"
            Cmd  = "npm run dev"
            Port = 8000
            Color = "Blue"
            EscColor = $EscCyan
        },
        @{
            Name = "Agentic AI Orchestrator (LangGraph)"
            Path = Join-Path $ScriptDir "agents"
            Cmd  = "python api/ai_api.py"
            Port = 8002
            Color = "Magenta"
            EscColor = $EscMagenta
        },
        @{
            Name = "ML Churn Prediction Service"
            Path = Join-Path $ScriptDir "simulation\ml-service"
            Cmd  = "python main.py"
            Port = 8001
            Color = "Cyan"
            EscColor = $EscCyan
        }
    )

    # 1. Port Conflict Cleanup
    Write-Host "`n[INFO] Performing pre-flight port hygiene..." -ForegroundColor Cyan
    foreach ($Service in $Services) {
        $sPort = $Service.Port
        $sName = $Service.Name
        Stop-PortListener -Port $sPort -Name $sName
    }

    # 2. Dependency Audit
    Write-Host "`n[INFO] Verifying local workspace structure..." -ForegroundColor Cyan
    foreach ($Service in $Services) {
        $sPath = $Service.Path
        $sName = $Service.Name
        if (-not (Test-Path $sPath)) {
            throw "Target path not found: $sPath"
        }
    }
    Write-Host "[OK] Workspace structure verified. Safe to proceed." -ForegroundColor Green

    # 3. Launch Services
    Write-Host "`n[START] Launching microservices..." -ForegroundColor Yellow

    foreach ($Service in $Services) {
        $sName = $Service.Name
        $sPort = $Service.Port
        $sPath = $Service.Path
        $sCmd  = $Service.Cmd
        $sColor = $Service.Color

        Write-Host "  -> Spawning $sName on Port $sPort..." -ForegroundColor $sColor
        
        # Dynamically resolve python executable from local venv if present
        $ResolvedCmd = $sCmd
        if ($sCmd -like "python *") {
            $VenvPython = Join-Path $sPath "venv\Scripts\python.exe"
            if (Test-Path $VenvPython) {
                $ResolvedCmd = $sCmd.Replace("python", "& '$VenvPython'")
            }
        }

        # Styled powershell command block with defensive window-title wrapping
        $ScriptBlock = "
        try { Clear-Host } catch {}
        try {
            if (`$Host -and `$Host.UI -and `$Host.UI.RawUI) {
                `$Host.UI.RawUI.WindowTitle = '$sName [SRE Dev]'
            }
        } catch {}
        Write-Host '==========================================================' -ForegroundColor $sColor
        Write-Host '   [+] Active Service: $sName' -ForegroundColor $sColor
        Write-Host '   [URL] Local Endpoint: http://localhost:$sPort' -ForegroundColor $sColor
        Write-Host '==========================================================' -ForegroundColor $sColor
        cd '$sPath'
        $ResolvedCmd
        "
        
        $Proc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $ScriptBlock -PassThru
        $SpawnedProcesses += $Proc
    }

    # 4. Master Command Center Dashboard
    try { Clear-Host } catch {}
    Write-Output "${EscCyan}======================================================================${EscReset}"
    Write-Output "${EscGreen}   [SRE] SENTIENT RETENTION ENGINE - DEVELOPER SUITE ACTIVE           ${EscReset}"
    Write-Output "${EscCyan}======================================================================${EscReset}"
    Write-Output ""
    Write-Output "${EscWhite}The following microservices are running in active telemetry mode:${EscReset}"
    Write-Output ""

    foreach ($Service in $Services) {
        $sName = $Service.Name
        $sNamePad = $sName.PadRight(38)
        $sPort = $Service.Port
        $sPath = $Service.Path
        $sEscColor = $Service.EscColor
        Write-Output "   ${EscWhite}* ${sEscColor}${sNamePad}${EscWhite} -> Port: ${EscGreen}${sPort}${EscWhite} | Path: ${EscCyan}${sPath}${EscReset}"
    }

    Write-Output ""
    Write-Output "${EscYellow}----------------------------------------------------------------------${EscReset}"
    Write-Output "   [INFO] React Frontend      : http://localhost:3000"
    Write-Output "   [INFO] Express Backend      : http://localhost:8000"
    Write-Output "   [INFO] Agentic AI Service   : http://localhost:8002"
    Write-Output "   [INFO] ML Predict Service   : http://localhost:8001"
    Write-Output "${EscYellow}----------------------------------------------------------------------${EscReset}"
    Write-Output ""
    Write-Output "${EscCyan}   [Press 'Q' to quit all services cleanly / 'R' to restart services]${EscReset}"
    Write-Output ""

    # Check console capabilities to prevent crashes in non-interactive/redirected terminals
    $IsInteractive = $true
    try {
        $dummy = [console]::KeyAvailable
    }
    catch {
        $IsInteractive = $false
    }

    if (-not $IsInteractive) {
        Write-Host "[INFO] Non-interactive or redirected terminal detected." -ForegroundColor Yellow
        Write-Host "[INFO] Running in passive monitor mode. Press Ctrl+C to stop all services." -ForegroundColor Yellow
        while ($true) {
            Start-Sleep -Seconds 2
        }
    }

    # 5. Interactive Event Loop
    while ($true) {
        $KeyAvailable = $false
        try {
            $KeyAvailable = [console]::KeyAvailable
        }
        catch {
            $IsInteractive = $false
        }

        if (-not $IsInteractive) {
            while ($true) { Start-Sleep -Seconds 2 }
        }

        if ($KeyAvailable) {
            $Key = $null
            try {
                $Key = [console]::ReadKey($true)
            }
            catch {
                $Key = $null
            }

            if ($Key) {
                if ((($Key.KeyChar -eq 'q') -or ($Key.KeyChar -eq 'Q')) -or (($Key.Key -eq [ConsoleKey]::Q))) {
                    Write-Host "`n[SHUTDOWN] Shutdown key pressed." -ForegroundColor Red
                    break
                }
                elseif ((($Key.KeyChar -eq 'r') -or ($Key.KeyChar -eq 'R')) -or (($Key.Key -eq [ConsoleKey]::R))) {
                    Write-Host "`n[RESTART] Restart key pressed. Triggering recycle..." -ForegroundColor Yellow
                    
                    # Kill current processes before recycle so they don't leak
                    foreach ($Proc in $SpawnedProcesses) {
                        if ($Proc -and (-not $Proc.HasExited)) {
                            Stop-Process -Id $Proc.Id -Force -ErrorAction SilentlyContinue
                        }
                    }
                    
                    # Recurse clean start
                    & $PSCommandPath
                    break
                }
            }
        }
        Start-Sleep -Milliseconds 250
    }
}
catch {
    Write-Host "`n[X] SRE Developer Suite Orchestrator encountered a fatal error:" -ForegroundColor Red
    Write-Host "    $_" -ForegroundColor Yellow
    Write-Host "    At line: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Cyan
    exit 1
}
finally {
    # Global teardown block - guaranteed to run on Q key, Ctrl+C, script stop, or terminal termination!
    Write-Host "`n[SHUTDOWN] Performing clean teardown of SRE Developer Suite..." -ForegroundColor Red
    
    # Kill processes we spawned
    if ($SpawnedProcesses) {
        foreach ($Proc in $SpawnedProcesses) {
            if ($Proc -and (-not $Proc.HasExited)) {
                $SpawnedPid = $Proc.Id
                Write-Host "   Stopping spawned terminal window (PID: $SpawnedPid)..." -ForegroundColor Yellow
                Stop-Process -Id $SpawnedPid -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    # Sweep target ports to ensure absolutely clean release
    Write-Host "[CLEANUP] Reclaiming ports..." -ForegroundColor Yellow
    foreach ($Service in $Services) {
        $sPort = $Service.Port
        $sName = $Service.Name
        Stop-PortListener -Port $sPort -Name $sName
    }
    
    Write-Host "[OK] All resources released cleanly. Goodbye!`n" -ForegroundColor Green
}
