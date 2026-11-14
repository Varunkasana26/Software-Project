#!/usr/bin/env bash
# Starts core (8001), backend (8000) and frontend (5173), waits for each health check, and prints the URLs.
# Needs: python 3.11+, node 20+, and backend/api/.env (copy .env.example and fill it in). See README.md.
# With --offline no database and no .env are needed: the backend keeps data in memory and creates the public demo accounts.
set -u
OFFLINE=0; [ "${1:-}" = "--offline" ] && OFFLINE=1
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Pick the first python that really runs (on Windows, python3 can be a Microsoft Store stub that does nothing).
PY=""
for cand in python3 python py; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >/dev/null 2>&1; then PY="$cand"; break; fi
done
[ -n "$PY" ] || { echo "Python 3.11 or newer was not found. Install it and try again."; exit 1; }
LOGS="$ROOT/.run"
mkdir -p "$LOGS"

[ "$OFFLINE" = 1 ] || [ -f "$ROOT/backend/api/.env" ] || { echo "Missing backend/api/.env. Copy backend/api/.env.example to backend/api/.env and fill it in."; exit 1; }
[ -d "$ROOT/backend/api/node_modules" ] || { echo "Run 'npm install' in backend/api first (see README.md)."; exit 1; }
[ -d "$ROOT/frontend/node_modules" ] || { echo "Run 'npm install' in frontend first (see README.md)."; exit 1; }

PIDS=()
cleanup() { echo; echo "Stopping..."; for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done; wait 2>/dev/null; }
trap cleanup EXIT INT TERM

(cd "$ROOT/core" && exec "$PY" -m uvicorn service.main:app --port 8001) >"$LOGS/core.log" 2>&1 & PIDS+=($!)
(cd "$ROOT/backend/api" && if [ "$OFFLINE" = 1 ]; then export OFFLINE_DEMO=true; fi; exec npm run dev) >"$LOGS/backend.log" 2>&1 & PIDS+=($!)
(cd "$ROOT/frontend" && exec npm run dev -- --port 5173 --strictPort) >"$LOGS/frontend.log" 2>&1 & PIDS+=($!)

wait_for() { # name url expected-text
  end=$((SECONDS + 90))  # give each service up to 90 seconds in total
  while [ "$SECONDS" -lt "$end" ]; do
    if curl -fs -m 5 "$2" 2>/dev/null | grep -q "$3"; then echo "  OK   $1  $2"; return 0; fi
    sleep 1
  done
  echo "  FAIL $1  $2  (see $LOGS/$4.log)"; tail -8 "$LOGS/$4.log"
  body="$(curl -s -m 20 "$2" 2>/dev/null)"
  if echo "$body" | grep -q '"database":"disconnected"'; then
    echo "       The backend is running but cannot reach the DATABASE. Check DATABASE_URL in backend/api/.env,"
    echo "       that the Supabase project is not paused (dashboard > Restore project), and your network."
  fi
  return 1
}

echo "Waiting for the services..."
ok=0
wait_for core     http://localhost:8001/health  '"ok"'      core     || ok=1
wait_for backend  http://localhost:8000/api/health '"status":"healthy"'  backend  || ok=1
wait_for frontend http://localhost:5173/        'root'      frontend || ok=1
[ "$ok" = 0 ] || exit 1

echo
echo "Ready:"
echo "  App (open this)  http://localhost:5173"
echo "  API              http://localhost:8000/api"
echo "  Core             http://localhost:8001/health"
[ "$OFFLINE" = 1 ] && echo "  OFFLINE DEMO MODE: no database, data is lost on restart. Demo accounts are listed on the login page and in README.md."
echo "Logs are in $LOGS. Press Ctrl+C to stop everything."
wait
