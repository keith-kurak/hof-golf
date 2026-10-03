#!/usr/bin/env bash
# Start Metro (Expo tunnel) + an EAS iOS cloud simulator running the dev client,
# then attach agent-device. Run from anywhere inside the repo.
#
# Env overrides:
#   BUILD_ID      EAS build to install (default: latest finished development-simulator build)
#   METRO_PORT    local Metro port (default: first free port from 8091)
#   SESSION_NAME  name shown on expo.dev (default: "Dev build on <branch>")
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

EAS="npx --yes eas-cli@latest"
BUNDLE_ID="com.keithkurak.hofgolf"
SCHEME="hofgolf"
STATE_DIR=".expo/eas-sim"
METRO_LOG="$STATE_DIR/metro.log"
mkdir -p "$STATE_DIR"

log() { printf '\n==> %s\n' "$*"; }

# 1. Preflight -----------------------------------------------------------------
log "Checking EAS login and simulator access"
$EAS whoami 2>/dev/null | head -1
$EAS simulator:availability --json 2>/dev/null | grep -q '"available": true' || {
  echo "EAS Simulator is not available for this account." >&2
  exit 1
}

if [ -f .env.eas-simulator ] && grep -q EAS_SIMULATOR_SESSION_ID .env.eas-simulator; then
  echo "A session is already recorded in .env.eas-simulator." >&2
  echo "Run .agents/skills/eas-sim-dev/stop.sh first (or inspect with: $EAS simulator:get --json)." >&2
  exit 1
fi

# 2. Pick the dev-client build -------------------------------------------------
if [ -z "${BUILD_ID:-}" ]; then
  log "Finding latest development-simulator build"
  BUILD_ID=$($EAS build:list --platform ios --simulator --status finished \
    --build-profile development-simulator --limit 1 --json --non-interactive 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s)[0];if(b)console.log(b.id)})')
fi
[ -n "$BUILD_ID" ] || {
  echo "No dev-client simulator build found. Build one:" >&2
  echo "  $EAS build --platform ios --profile development-simulator --non-interactive" >&2
  exit 1
}
echo "Build: $BUILD_ID"
log "Comparing build fingerprint with local source (only native changes matter)"
$EAS fingerprint:compare --build-id "$BUILD_ID" --non-interactive 2>&1 | grep -v 'npm warn' | tail -6 || true

# 3. Metro through the Expo tunnel ---------------------------------------------
if [ -z "${METRO_PORT:-}" ]; then
  METRO_PORT=8091
  while (echo >/dev/tcp/127.0.0.1/$METRO_PORT) 2>/dev/null; do METRO_PORT=$((METRO_PORT + 1)); done
fi
log "Starting Metro on :$METRO_PORT with the Expo tunnel (log: $METRO_LOG)"
# No CI=1: CI mode turns off Fast Refresh.
EXPO_UNSTABLE_TUNNEL_V2=1 nohup npx expo start --dev-client --tunnel --port "$METRO_PORT" \
  >"$METRO_LOG" 2>&1 </dev/null &
echo "$METRO_PORT" >"$STATE_DIR/metro.port"

HOST=""
for _ in $(seq 1 60); do
  HOST=$(curl -s -H "expo-platform: ios" -H "accept: application/expo+json" "localhost:$METRO_PORT/" 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).extra.expoClient.hostUri)}catch{}})' || true)
  case "$HOST" in *.on.expo.app) break ;; esac
  sleep 2
done
case "$HOST" in *.on.expo.app) ;; *)
  echo "Metro tunnel did not come up. See $METRO_LOG" >&2
  exit 1 ;;
esac
echo "$HOST" >"$STATE_DIR/metro.host"
DEV_URL="$SCHEME://expo-development-client/?url=https%3A%2F%2F$HOST"
echo "Metro: https://$HOST"

# 4. Simulator session (installs build, launches, opens Metro URL) --------------
log "Starting EAS iOS simulator session"
printf '# managed by eas-cli\n' >.env.eas-simulator
$EAS simulator:start --platform ios --type agent-device \
  --build-id "$BUILD_ID" \
  --launch-arg "-EXDevMenuIsOnboardingFinished" --launch-arg "1" \
  --launch-arg "-EXDevMenuShowsAtLaunch" --launch-arg "0" \
  --launch-arg "-EXDevMenuShowFloatingActionButton" --launch-arg "0" \
  --open-url "$DEV_URL" \
  --non-interactive \
  --name "${SESSION_NAME:-Dev build on $(git branch --show-current)}" 2>&1 | grep -v 'npm warn'

# 5. Wait for the bundle, then attach agent-device ------------------------------
log "Waiting for the iOS bundle"
for _ in $(seq 1 60); do grep -q "iOS Bundled" "$METRO_LOG" && break; sleep 3; done
grep "iOS Bundled" "$METRO_LOG" | tail -1 || echo "No bundle yet; check $METRO_LOG"

log "Attaching agent-device"
$EAS simulator:exec npx agent-device@latest open "$BUNDLE_ID" --foreground --platform ios 2>&1 | grep -v 'npm warn'

cat <<EOF

Ready. Drive the app with:
  npx --yes eas-cli@latest simulator:exec npx agent-device@latest <verb>
Dev client URL (for relaunch): $DEV_URL
Stop everything with: .agents/skills/eas-sim-dev/stop.sh
EOF
