#!/usr/bin/env bash
# Start EAS cloud simulators (iOS, Android, or both) that run the latest
# development builds connected to a dev server. Each session keeps its own
# agent-device config, so both can be driven at the same time.
#
# Usage: start.sh [both|ios|android]     (default: both)
#
# Env overrides:
#   IOS_BUILD_ID / ANDROID_BUILD_ID   build to install (default: latest finished
#                                     development build, preferring one that
#                                     matches the local fingerprint)
#   MAX_MINUTES                       session limit (default: 60)
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
# shellcheck source=../eas-sim-dev/lib.sh
. .agents/skills/eas-sim-dev/lib.sh

PAIR_DIR="$STATE_DIR/pair"
AD="npx --yes agent-device@0.21.35"
MAX_MINUTES="${MAX_MINUTES:-60}"
mkdir -p "$PAIR_DIR"
chmod 700 "$PAIR_DIR"

case "${1:-both}" in
  both) PLATFORMS=(ios android) ;;
  ios | android) PLATFORMS=("$1") ;;
  *) die "usage: start.sh [both|ios|android]" ;;
esac

# 1. Preflight -----------------------------------------------------------------
log "Checking EAS login and simulator access"
require_simulator_access
# simulator:exec reads .env.eas-simulator. This skill does not use it, and it
# must not hold a session that agent-device could be pointed at by mistake.
require_no_session
for p in "${PLATFORMS[@]}"; do
  [ ! -f "$PAIR_DIR/$p.id" ] || die "A $p session is already recorded. Stop it first: .agents/skills/eas-sim-pair/stop.sh $p"
done
load_project_config
SLUG=$(env -u APP_VARIANT npx expo config --type public --json 2>/dev/null |
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).slug))')

# 2. Dev server: reuse a running one with a tunnel, or start one -----------------
# Prints the tunnel host of a dev server for this project on localhost:<port>.
tunnel_host() {
  curl -s -m 3 -H "expo-platform: ios" -H "accept: application/expo+json" "localhost:$1/" 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const c=JSON.parse(s).extra.expoClient;if(c.slug===process.argv[1])console.log(c.hostUri)}catch{}})' "$SLUG"
}

log "Looking for a running dev server"
HOST=""
for port in $(seq 8081 8099); do
  h=$(tunnel_host "$port" || true)
  [ -n "$h" ] || continue
  case "$h" in
    *.on.expo.app) HOST="$h"; echo "Using the dev server on :$port (https://$HOST)"; break ;;
    *) echo "The dev server on :$port has no tunnel ($h). A cloud simulator cannot reach it." ;;
  esac
done

if [ -z "$HOST" ]; then
  PORT=8081
  while (echo >/dev/tcp/127.0.0.1/$PORT) 2>/dev/null; do PORT=$((PORT + 1)); done
  log "Starting a dev server on :$PORT with the Expo tunnel (log: $PAIR_DIR/metro.log)"
  # No CI=1 (it turns off Fast Refresh). No APP_VARIANT: development is the default.
  env -u APP_VARIANT EXPO_UNSTABLE_TUNNEL_V2=1 nohup npx expo start --dev-client --tunnel --port "$PORT" \
    >"$PAIR_DIR/metro.log" 2>&1 </dev/null &
  echo "$PORT" >"$PAIR_DIR/metro.port"
  for _ in $(seq 1 60); do
    HOST=$(tunnel_host "$PORT" || true)
    case "$HOST" in *.on.expo.app) break ;; esac
    sleep 2
  done
  case "$HOST" in *.on.expo.app) ;; *) die "The dev server tunnel did not come up. See $PAIR_DIR/metro.log" ;; esac
  echo "Dev server: https://$HOST"
fi
DEV_SERVER="https://$HOST"
echo "$DEV_SERVER" >"$PAIR_DIR/dev-server"
ENC=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$DEV_SERVER")

# 3. Builds and sessions -------------------------------------------------------
build_for() {
  local p="$1" override fp id
  override=$([ "$p" = ios ] && echo "${IOS_BUILD_ID:-}" || echo "${ANDROID_BUILD_ID:-}")
  if [ -n "$override" ]; then echo "$override"; return; fi
  fp=$(local_fingerprint "$p")
  id=""
  [ -n "$fp" ] && id=$(find_dev_build "$p" "$fp")
  if [ -z "$id" ]; then
    id=$(find_dev_build "$p")
    [ -n "$id" ] || die "No finished $(dev_build_profile "$p") build for $p. Make one: $EAS build --platform $p --profile $(dev_build_profile "$p")"
    echo "No $p build matches the local fingerprint. Using the latest one ($id):" >&2
    $EAS fingerprint:compare --build-id "$id" --non-interactive 2>&1 | quiet_npm |
      grep -E 'Fingerprint|Modified|Added|Removed' | head -6 >&2 || true
  fi
  echo "$id"
}

start_session() {
  local p="$1" build url args=()
  build=$(build_for "$p")
  if [ "$p" = ios ]; then
    url=$(dev_client_url "$DEV_SERVER")
    args=("${IOS_DEV_MENU_LAUNCH_ARGS[@]}")
  else
    # The development build's generated scheme
    url="exp+$SLUG://expo-development-client/?url=$ENC"
  fi
  log "Starting the $p session (build $build, max $MAX_MINUTES minutes)"
  # --out-config-type env prints the agent-device config instead of writing
  # .env.eas-simulator. It holds a session token: keep it private.
  (umask 077
    $EAS simulator:start --platform "$p" --type agent-device --build-id "$build" \
      ${args[@]+"${args[@]}"} --open-url "$url" \
      --max-duration-minutes "$MAX_MINUTES" --out-config-type env --non-interactive \
      --name "$p dev build + dev server ($(git branch --show-current))" >"$PAIR_DIR/$p.log" 2>&1) ||
    { cat "$PAIR_DIR/$p.log" >&2; die "simulator:start failed for $p"; }
  (umask 077; grep '^export ' "$PAIR_DIR/$p.log" >"$PAIR_DIR/$p.env")
  grep -oE 'session created \(id: [0-9a-f-]+' "$PAIR_DIR/$p.log" | grep -oE '[0-9a-f-]{36}' >"$PAIR_DIR/$p.id"
  echo "$build" >"$PAIR_DIR/$p.build"
  echo "Session: $(cat "$PAIR_DIR/$p.id")"
}

ad() { local p="$1"; shift; .agents/skills/eas-sim-pair/ad.sh "$p" "$@"; }

attach_ios() {
  log "Opening the app on iOS"
  ad ios open "$IOS_BUNDLE_ID" --foreground 2>&1 | quiet_npm | grep -E "Opened|Error" || true
}

attach_android() {
  # The dev server link does not always connect on Android (the launcher shows
  # instead). Enter the URL in the launcher when it is showing.
  log "Connecting the Android development build to the dev server"
  local snap field
  snap=$(ad android snapshot -i 2>&1 || true)
  if echo "$snap" | grep -q '\[button\] "Connect"'; then
    field=$(echo "$snap" | grep -E '\[text-field\]' | grep -oE '@e[0-9]+' | head -1)
    ad android fill "$field" "$DEV_SERVER" >/dev/null 2>&1
    ad android press 'label="Connect"' --settle >/dev/null 2>&1
    sleep 10
    snap=$(ad android snapshot -i 2>&1 || true)
  fi
  # Development menu first-run screen
  if echo "$snap" | grep -q '\[button\] "Continue"'; then
    ad android press 'label="Continue"' --settle >/dev/null 2>&1 || true
    ad android press 'label="Close"' --settle >/dev/null 2>&1 || true
  fi
}

for p in "${PLATFORMS[@]}"; do start_session "$p"; done
for p in "${PLATFORMS[@]}"; do "attach_$p"; done

cat <<EOT

Ready. Dev server: $DEV_SERVER
EOT
for p in "${PLATFORMS[@]}"; do
  echo "  $p preview: $(grep -oE 'https://expo.dev/[^ ]+/preview' "$PAIR_DIR/$p.log" | tail -1)"
done
cat <<'EOT'

Drive a session:  .agents/skills/eas-sim-pair/ad.sh <ios|android> snapshot -i
Stop:             .agents/skills/eas-sim-pair/stop.sh [both|ios|android]
EOT
