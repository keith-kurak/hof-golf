#!/usr/bin/env bash
# Start Metro (Expo tunnel) + an EAS iOS cloud simulator running the dev client,
# then attach agent-device. Run from anywhere inside the repo.
#
# Env overrides:
#   BUILD_ID      EAS build to install (default: development-simulator build that
#                 matches the local fingerprint, else the latest one)
#   METRO_PORT    local Metro port (default: first free port from 8091)
#   SESSION_NAME  name shown on expo.dev (default: "Dev build on <branch>")
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
# shellcheck source=lib.sh
. .agents/skills/eas-sim-dev/lib.sh

METRO_LOG="$STATE_DIR/metro.log"

# 1. Preflight -----------------------------------------------------------------
log "Checking EAS login and simulator access"
require_simulator_access
require_no_session
load_project_config
echo "Bundle ID: $IOS_BUNDLE_ID  Scheme: $SCHEME"

# 2. Pick the dev-client build -------------------------------------------------
if [ -z "${BUILD_ID:-}" ]; then
  log "Finding a development-simulator build for the local fingerprint"
  FINGERPRINT=$(local_fingerprint ios)
  echo "Local fingerprint: ${FINGERPRINT:-<unknown>}"
  [ -n "$FINGERPRINT" ] && BUILD_ID=$(find_dev_build ios "$FINGERPRINT")
  if [ -z "${BUILD_ID:-}" ]; then
    echo "No build matches the local fingerprint. Using the latest development-simulator build."
    BUILD_ID=$(find_dev_build ios)
    [ -n "$BUILD_ID" ] && $EAS fingerprint:compare --build-id "$BUILD_ID" --non-interactive 2>&1 | quiet_npm | tail -6 || true
  fi
fi
[ -n "${BUILD_ID:-}" ] || {
  echo "No development-simulator build found. Build one:" >&2
  echo "  $EAS workflow:run .eas/workflows/dev-builds.yaml" >&2
  echo "  (or: $EAS build --platform ios --profile development-simulator --non-interactive)" >&2
  exit 1
}
echo "Build: $BUILD_ID"

# 3. Metro through the Expo tunnel ---------------------------------------------
if [ -z "${METRO_PORT:-}" ]; then
  METRO_PORT=8091
  while (echo >/dev/tcp/127.0.0.1/$METRO_PORT) 2>/dev/null; do METRO_PORT=$((METRO_PORT + 1)); done
fi
log "Starting Metro on :$METRO_PORT with the Expo tunnel (log: $METRO_LOG)"
# No CI=1: CI mode turns off Fast Refresh. No APP_VARIANT: development is the default.
env -u APP_VARIANT EXPO_UNSTABLE_TUNNEL_V2=1 nohup npx expo start --dev-client --tunnel --port "$METRO_PORT" \
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
DEV_URL=$(dev_client_url "https://$HOST")
echo "Metro: https://$HOST"

# 4. Simulator session (installs build, launches, opens Metro URL) --------------
# Metro must be up first: the URL opens during startup, with no retry.
log "Starting EAS iOS simulator session"
printf '# managed by eas-cli\n' >.env.eas-simulator
$EAS simulator:start --platform ios --type agent-device \
  --build-id "$BUILD_ID" \
  "${IOS_DEV_MENU_LAUNCH_ARGS[@]}" \
  --open-url "$DEV_URL" \
  --non-interactive \
  --name "${SESSION_NAME:-Dev build on $(git branch --show-current)}" 2>&1 | quiet_npm

# 5. Wait for the bundle, then attach agent-device ------------------------------
log "Waiting for the iOS bundle"
for _ in $(seq 1 60); do grep -q "iOS Bundled" "$METRO_LOG" && break; sleep 3; done
grep "iOS Bundled" "$METRO_LOG" | tail -1 || echo "No bundle yet; check $METRO_LOG"

log "Attaching agent-device"
$EAS simulator:exec npx agent-device@latest open "$IOS_BUNDLE_ID" --foreground --platform ios 2>&1 | quiet_npm

cat <<EOF

Ready. Drive the app with:
  npx --yes eas-cli@latest simulator:exec npx agent-device@latest <verb>
Session page: $(session_url)
Dev client URL (for relaunch): $DEV_URL
Stop everything with: .agents/skills/eas-sim-dev/stop.sh
EOF
