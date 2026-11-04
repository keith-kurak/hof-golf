#!/usr/bin/env bash
# Stop eas-sim-pair sessions, and the dev server if start.sh started it.
# Usage: stop.sh [both|ios|android]     (default: both)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
PAIR_DIR=".expo/eas-sim/pair"

case "${1:-both}" in
  both) PLATFORMS=(ios android) ;;
  ios | android) PLATFORMS=("$1") ;;
  *) echo "usage: stop.sh [both|ios|android]" >&2; exit 2 ;;
esac

for p in "${PLATFORMS[@]}"; do
  if [ -f "$PAIR_DIR/$p.id" ]; then
    npx --yes eas-cli@latest simulator:stop --id "$(cat "$PAIR_DIR/$p.id")" --non-interactive 2>&1 | grep -v 'npm warn'
  fi
  rm -f "$PAIR_DIR/$p".{id,env,log,build}
done

# When no session is left: forget the dev server, and stop it if this skill
# started it (a dev server you started yourself keeps running)
if ! ls "$PAIR_DIR"/*.id >/dev/null 2>&1; then
  if [ -f "$PAIR_DIR/metro.port" ]; then
    PORT=$(cat "$PAIR_DIR/metro.port")
    # npx forks expo as a grandchild, so match the command line rather than a pid.
    pkill -f "expo start --dev-client --tunnel --port $PORT" 2>/dev/null
    rm -f "$PAIR_DIR/metro.port"
    echo "Stopped the dev server on :$PORT."
  fi
  rm -f "$PAIR_DIR/dev-server"
fi
