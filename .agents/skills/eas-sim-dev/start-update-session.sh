#!/usr/bin/env bash
# Start an EAS cloud simulator session that runs a published EAS Update group in
# the development build. No Metro: the JS comes from the update, so the session
# does not depend on this machine after it starts.
#
# Used by the eas-sim-verify-pr-ios, eas-sim-verify-pr-android, and
# eas-sim-preview-link skills.
#
# Usage:
#   start-update-session.sh --platform ios|android --group <update-group-id> --name "<name>"
#                           [--type agent-device|web-preview-only] [--max-minutes N] [--build-id ID]
#
# The development build must match the local fingerprint, so check out the
# commit that the update was published from before you run this.
#
# Writes SESSION_URL, PREVIEW_URL, BUILD_ID, and UPDATE_GROUP_ID to
# .expo/eas-sim/session.env.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
# shellcheck source=lib.sh
. .agents/skills/eas-sim-dev/lib.sh

PLATFORM="" GROUP="" NAME="" TYPE="agent-device" MAX_MINUTES="20" BUILD_ID="${BUILD_ID:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --platform) PLATFORM="$2"; shift 2 ;;
    --group) GROUP="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --type) TYPE="$2"; shift 2 ;;
    --max-minutes) MAX_MINUTES="$2"; shift 2 ;;
    --build-id) BUILD_ID="$2"; shift 2 ;;
    *) die "Unknown argument: $1" ;;
  esac
done
case "$PLATFORM" in ios | android) ;; *) die "--platform must be ios or android" ;; esac
[ -n "$GROUP" ] || die "--group is required"
[ -n "$NAME" ] || die "--name is required"

log "Checking EAS login and simulator access"
require_simulator_access
require_no_session
load_project_config
APP_ID=$(app_id "$PLATFORM")

if [ -z "$BUILD_ID" ]; then
  log "Finding a $(dev_build_profile "$PLATFORM") build for the local fingerprint"
  FINGERPRINT=$(local_fingerprint "$PLATFORM")
  [ -n "$FINGERPRINT" ] || die "Could not compute the local $PLATFORM fingerprint."
  echo "Fingerprint: $FINGERPRINT"
  BUILD_ID=$(find_dev_build "$PLATFORM" "$FINGERPRINT")
  [ -n "$BUILD_ID" ] || {
    echo "No $(dev_build_profile "$PLATFORM") build matches fingerprint $FINGERPRINT." >&2
    echo "The native code changed. Make a new development build, then run this again:" >&2
    echo "  $EAS build --platform $PLATFORM --profile $(dev_build_profile "$PLATFORM") --non-interactive" >&2
    exit 1
  }
fi
echo "Build: $BUILD_ID"

OPEN_URL=$(dev_client_url "$UPDATES_URL/group/$GROUP")
echo "Update group: $GROUP"

LAUNCH_ARGS=()
[ "$PLATFORM" = ios ] && LAUNCH_ARGS=("${IOS_DEV_MENU_LAUNCH_ARGS[@]}")

log "Starting EAS $PLATFORM simulator session ($TYPE, max $MAX_MINUTES minutes)"
START_LOG="$STATE_DIR/start.log"
printf '# managed by eas-cli\n' >.env.eas-simulator
$EAS simulator:start --platform "$PLATFORM" --type "$TYPE" \
  --build-id "$BUILD_ID" \
  ${LAUNCH_ARGS[@]+"${LAUNCH_ARGS[@]}"} \
  --open-url "$OPEN_URL" \
  --max-duration-minutes "$MAX_MINUTES" \
  --non-interactive \
  --name "$NAME" 2>&1 | quiet_npm | tee "$START_LOG"

log "Waiting for the session to be ready"
wait_until_live

SESSION_URL=$(session_url)
PREVIEW_URL=$(grep -o 'https://web-preview-[^ "]*' "$START_LOG" | tail -1 || true)
cat >"$SESSION_ENV" <<EOF
SESSION_URL=$SESSION_URL
PREVIEW_URL=$PREVIEW_URL
BUILD_ID=$BUILD_ID
UPDATE_GROUP_ID=$GROUP
PLATFORM=$PLATFORM
APP_ID=$APP_ID
EOF

if [ "$TYPE" = agent-device ]; then
  log "Attaching agent-device"
  $EAS simulator:exec npx agent-device@latest open "$APP_ID" --foreground --platform "$PLATFORM" 2>&1 | quiet_npm
fi

cat <<EOF

Session is live.
  Session page : $SESSION_URL
  Web preview  : ${PREVIEW_URL:-<see $START_LOG>}
  App          : $APP_ID ($PLATFORM)
  Stops after  : $MAX_MINUTES minutes, or run .agents/skills/eas-sim-dev/stop.sh
EOF
