# Start-FoodDonation.ps1
# Launch order: 1) SSH tunnel  -> wait for 5433 up -> 2) Backend -> 3) Frontend

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ---- Config ----
$SshUser      = "db-dev"
$SshHost      = "35.212.169.134"
$RemotePgPort = 5432
$LocalPgPort  = 5433
$WaitTimeoutS = 60          # max seconds to wait for the tunnel
$ProbeEveryMs = 500         # probe interval
$UseWindowsTerminal = $true # set $false to use plain PowerShell windows
# -----------------

# Paths
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath    = Join-Path $scriptDir "food-donation"
$backendPath = Join-Path $rootPath "backend"

if (!(Test-Path $rootPath))   { throw "Cannot find folder: $rootPath" }
if (!(Test-Path $backendPath)){ throw "Cannot find folder: $backendPath" }

function Ensure-NpmInstall($path) {
  Write-Host "Checking dependencies in $path ..."
  Push-Location $path
  try {
    if (!(Test-Path "node_modules")) {
      Write-Host "node_modules not found -> running npm install..."
      npm install
    } else {
      Write-Host "node_modules found -> skipping npm install."
    }
  } finally { Pop-Location }
}

# Optional: install deps once
Ensure-NpmInstall $rootPath
Ensure-NpmInstall $backendPath

# Helper: open a new console/tab
$wt = if ($UseWindowsTerminal) { Get-Command "wt.exe" -ErrorAction SilentlyContinue } else { $null }
function Start-NewConsole {
  param([string]$Title,[string]$WorkingDir,[string]$Command)
  if ($wt) {
    wt.exe new-tab --title $Title --startingDirectory "$WorkingDir" powershell -NoExit -Command $Command | Out-Null
  } else {
    Start-Process powershell.exe -ArgumentList "-NoExit","-Command","Set-Location `"$WorkingDir`"; $Command" | Out-Null
  }
}

# Start SSH tunnel (ExitOnForwardFailure makes ssh exit if bind/forward fails)
$sshCmd = "ssh -N -L $LocalPgPort`:localhost:$RemotePgPort -o ExitOnForwardFailure=yes -o ServerAliveInterval=60 -o ServerAliveCountMax=3 $SshUser@$SshHost"
Start-NewConsole -Title "SSH Tunnel" -WorkingDir $backendPath -Command $sshCmd

# --- fixed Test-PortOpen function (no $Host conflict) ---
function Test-PortOpen([string]$TargetHost, [int]$TargetPort, [int]$TimeoutMs = 400) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect($TargetHost, $TargetPort, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      $client.EndConnect($iar)
      $client.Close()
      return $true
    } else {
      $client.Close()
      return $false
    }
  } catch { return $false }
}

# Wait for tunnel to be ready
Write-Host "Waiting for SSH tunnel to open tcp $LocalPgPort ..."
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt $WaitTimeoutS) {
  if (Test-PortOpen -TargetHost "127.0.0.1" -TargetPort $LocalPgPort) {
    Write-Host "Tunnel is up on 127.0.0.1:$LocalPgPort"
    break
  }
  Start-Sleep -Milliseconds $ProbeEveryMs
}
$sw.Stop()

if (-not (Test-PortOpen -TargetHost "127.0.0.1" -TargetPort $LocalPgPort)) {
  Write-Host "Tunnel did not come up within $WaitTimeoutS seconds. Check the SSH tab for errors." -ForegroundColor Red
  exit 1
}

# Start backend and frontend
Start-NewConsole -Title "Backend"  -WorkingDir $backendPath -Command "node server.js"
Start-NewConsole -Title "Frontend" -WorkingDir $rootPath   -Command "npm start"

Write-Host "`nLaunched all tabs: SSH (up), Backend, Frontend."
Write-Host "Tip: set up SSH keys so the SSH tab doesn't ask for a password each time."
