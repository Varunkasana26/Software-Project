# Starts core (8001), backend (8000) and frontend (5173), waits for each health check, and prints the URLs.
# Needs: python 3.11+, node 20+, and backend\api\.env (copy .env.example and fill it in). See README.md.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$logs = Join-Path $root ".run"
New-Item -ItemType Directory -Force $logs | Out-Null

if (-not (Test-Path "$root\backend\api\.env")) { Write-Host "Missing backend\api\.env. Copy backend\api\.env.example to backend\api\.env and fill it in."; exit 1 }
if (-not (Test-Path "$root\backend\api\node_modules")) { Write-Host "Run 'npm install' in backend\api first (see README.md)."; exit 1 }
if (-not (Test-Path "$root\frontend\node_modules")) { Write-Host "Run 'npm install' in frontend first (see README.md)."; exit 1 }

$procs = @()
function Start-Svc($name, $file, $argList, $dir) {
  $p = Start-Process -FilePath $file -ArgumentList $argList -WorkingDirectory $dir -PassThru -WindowStyle Hidden `
       -RedirectStandardOutput "$logs\$name.log" -RedirectStandardError "$logs\$name.err.log"
  return $p
}
function Wait-For($name, $url, $text) {
  for ($i = 0; $i -lt 40; $i++) {  # up to about 40 x (8 s timeout + 1 s)
    try { if ((Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 8).Content -match $text) { Write-Host "  OK   $name  $url"; return $true } } catch {}
    Start-Sleep -Seconds 1
  }
  Write-Host "  FAIL $name  $url  (see $logs\$name.log and $name.err.log)"
  return $false
}

try {
  $procs += Start-Svc "core" "python" "-m uvicorn service.main:app --port 8001" "$root\core"
  $procs += Start-Svc "backend" "cmd.exe" "/c npm run dev" "$root\backend\api"
  $procs += Start-Svc "frontend" "cmd.exe" "/c npm run dev -- --port 5173 --strictPort" "$root\frontend"

  Write-Host "Waiting for the services..."
  $ok = (Wait-For "core" "http://localhost:8001/health" '"ok"')
  $ok = (Wait-For "backend" "http://localhost:8000/api/health" "healthy") -and $ok
  $ok = (Wait-For "frontend" "http://localhost:5173/" "root") -and $ok
  if (-not $ok) { exit 1 }

  Write-Host ""
  Write-Host "Ready:"
  Write-Host "  App (open this)  http://localhost:5173"
  Write-Host "  API              http://localhost:8000/api"
  Write-Host "  Core             http://localhost:8001/health"
  Write-Host "Logs are in $logs. Press Ctrl+C to stop everything."
  while ($true) { Start-Sleep -Seconds 5 }
} finally {
  foreach ($p in $procs) { if ($p -and -not $p.HasExited) { & taskkill /PID $p.Id /T /F | Out-Null } }
}
