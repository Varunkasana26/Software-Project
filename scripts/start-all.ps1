# Starts core (8001), backend (8000) and frontend (5173), waits for each health check, and prints the URLs.
# Needs: python 3.11+, node 20+, and backend\api\.env (copy .env.example and fill it in). See README.md.
param([switch]$Offline)  # -Offline: no database and no .env needed; the backend keeps data in memory
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $root ".run"
New-Item -ItemType Directory -Force $logs | Out-Null

if (-not $Offline -and -not (Test-Path "$root\backend\api\.env")) {
  Write-Host "No backend\api\.env found, so starting in OFFLINE DEMO mode (no database needed)."
  Write-Host "To use a real database, copy backend\api\.env.example to backend\api\.env and fill it in."
  $Offline = $true
}
if ($Offline) { $env:OFFLINE_DEMO = "true" }
if (-not (Test-Path "$root\backend\api\node_modules")) { Write-Host "Run 'npm install' in backend\api first (see README.md)."; exit 1 }
if (-not (Test-Path "$root\frontend\node_modules")) { Write-Host "Run 'npm install' in frontend first (see README.md)."; exit 1 }

$procs = @()
function Start-Svc($name, $file, $argList, $dir) {
  $p = Start-Process -FilePath $file -ArgumentList $argList -WorkingDirectory $dir -PassThru -WindowStyle Hidden `
       -RedirectStandardOutput "$logs\$name.log" -RedirectStandardError "$logs\$name.err.log"
  return $p
}
function Wait-For($name, $url, $text) {
  $end = (Get-Date).AddSeconds(90)  # give each service up to 90 seconds in total
  while ((Get-Date) -lt $end) {
    try { if ((Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 8).Content -match $text) { Write-Host "  OK   $name  $url"; return $true } } catch {}
    Start-Sleep -Seconds 1
  }
  Write-Host "  FAIL $name  $url  (see $logs\$name.log and $name.err.log)"
  try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 20 | Out-Null } catch {
    $body = ""; try { $body = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    if ($body -match '"database":"disconnected"') {
      Write-Host "       The backend is running but cannot reach the DATABASE. Check DATABASE_URL in backendpi\.env,"
      Write-Host "       that the Supabase project is not paused (dashboard > Restore project), and your network."
    }
  }
  return $false
}

try {
  $procs += Start-Svc "core" "python" "-m uvicorn service.main:app --port 8001" "$root\core"
  $procs += Start-Svc "backend" "cmd.exe" "/c npm run dev" "$root\backend\api"
  $procs += Start-Svc "frontend" "cmd.exe" "/c npm run dev -- --port 5173 --strictPort" "$root\frontend"

  Write-Host "Waiting for the services..."
  $ok = (Wait-For "core" "http://localhost:8001/health" '"ok"')
  $ok = (Wait-For "backend" "http://localhost:8000/api/health" '"status":"healthy"') -and $ok
  $ok = (Wait-For "frontend" "http://localhost:5173/" "root") -and $ok
  if (-not $ok) { exit 1 }

  Write-Host ""
  Write-Host "Ready:"
  Write-Host "  App (open this)  http://localhost:5173"
  Write-Host "  API              http://localhost:8000/api"
  Write-Host "  Core             http://localhost:8001/health"
  if ($Offline) { Write-Host "  OFFLINE DEMO MODE: no database, data is lost on restart. Demo accounts are listed on the login page and in README.md." }
  Write-Host "Logs are in $logs. Press Ctrl+C to stop everything."
  while ($true) { Start-Sleep -Seconds 5 }
} finally {
  foreach ($p in $procs) { if ($p -and -not $p.HasExited) { & taskkill /PID $p.Id /T /F | Out-Null } }
}
