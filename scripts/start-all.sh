#!/usr/bin/env bash
# Starts core (port 8001) and backend/api together. Reads secrets from backend/api/.env.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
(cd "$ROOT/core" && python -m uvicorn service.main:app --port 8001) &
CORE_PID=$!
trap 'kill $CORE_PID 2>/dev/null' EXIT
cd "$ROOT/backend/api" && npm run dev
