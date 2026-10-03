#!/usr/bin/env bash
# Stop the EAS simulator session and the Metro process that start.sh created.
set -uo pipefail

cd "$(git rev-parse --show-toplevel)"
STATE_DIR=".expo/eas-sim"

if [ -f .env.eas-simulator ] && grep -q EAS_SIMULATOR_SESSION_ID .env.eas-simulator; then
  npx --yes eas-cli@latest simulator:stop --non-interactive 2>&1 | grep -v 'npm warn'
fi
printf '# managed by eas-cli\n' >.env.eas-simulator

if [ -f "$STATE_DIR/metro.port" ]; then
  PORT=$(cat "$STATE_DIR/metro.port")
  # npx forks expo as a grandchild, so match the command line rather than a pid.
  pkill -f "expo start --dev-client --tunnel --port $PORT" 2>/dev/null
  rm -f "$STATE_DIR/metro.host" "$STATE_DIR/metro.port"
  echo "Stopped Metro on :$PORT."
fi
