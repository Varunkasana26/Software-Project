# Starts core (port 8001) and backend/api together. Reads secrets from backend/api/.env.
$root = Split-Path -Parent $PSScriptRoot
$core = Start-Process python -ArgumentList "-m","uvicorn","service.main:app","--port","8001" -WorkingDirectory "$root\core" -PassThru -NoNewWindow
try {
  Set-Location "$root\backend\api"
  npm run dev
} finally {
  Stop-Process -Id $core.Id -ErrorAction SilentlyContinue
}
