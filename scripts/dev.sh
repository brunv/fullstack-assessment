#!/usr/bin/env bash
set -eE

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
  *)                    OS="other" ;;
esac

on_error() {
  local ec=$?
  local ln=${1:-?}
  echo "" >&2
  echo "[dev.sh] Failed at line $ln (exit $ec)" >&2
  if [[ "$OS" == "windows" && -t 0 ]]; then
    read -r -n 1 -p "Press any key to close..." _ || true
    echo "" >&2
  fi
  exit "$ec"
}
trap 'on_error $LINENO' ERR

if [[ -z "${MOBILE_PLATFORM:-}" ]]; then
  echo "Which mobile platform?"
  echo "  1) iOS (default)"
  echo "  2) Android"
  read -r -p "> " choice
  case "$choice" in
    2|android|a) export MOBILE_PLATFORM="android" ;;
    *)           export MOBILE_PLATFORM="ios" ;;
  esac
fi

API_HEALTH_URL="${API_HEALTH_URL:-http://localhost:8000/health/}"
if command -v curl >/dev/null 2>&1 && ! curl -sf -o /dev/null --max-time 2 "$API_HEALTH_URL"; then
  echo "" >&2
  echo "[dev.sh] Warning: API not reachable at $API_HEALTH_URL" >&2
  echo "[dev.sh] 'yarn dev' only starts web + mobile. Start the backend first with 'yarn stack:up' (in another terminal)." >&2
  echo "" >&2
fi

# A previous run that got killed abruptly (common on Windows, where signals
# don't always reach background jobs) can leave `next dev` orphaned on 3000.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/free-port.js" 3000

if [[ "$OS" == "windows" ]]; then
  set +eE
  trap - ERR
  LOG_FILE="${TMPDIR:-${TEMP:-/tmp}}/yarn-dev-$$.log"
  echo "[dev.sh] Full output also being written to: $LOG_FILE"
  echo ""
  npx concurrently -k -n web,mobile -c blue,magenta \
    "yarn workspace web dev" \
    "yarn workspace mobile dev" 2>&1 | tee "$LOG_FILE"
  ec=${PIPESTATUS[0]}
  echo ""
  echo "[dev.sh] concurrently exited with code $ec"
  echo "[dev.sh] Log saved at: $LOG_FILE"
  if [[ -t 0 ]]; then
    read -r -n 1 -p "Press any key to close..." _ || true
    echo ""
  fi
  exit $ec
else
  exec npx concurrently -k -n web,mobile -c blue,magenta \
    "yarn workspace web dev" \
    "yarn workspace mobile dev"
fi
