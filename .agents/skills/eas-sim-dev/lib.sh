# shellcheck shell=bash
# Shared helpers for the eas-sim-* skills. Source this file from the repo root.
#
# Everything project-specific (scheme, bundle IDs, project ID) is read from the
# development app config, so these scripts need no per-project edits.

EAS="npx --yes eas-cli@latest"
STATE_DIR=".expo/eas-sim"
SESSION_ENV="$STATE_DIR/session.env"
mkdir -p "$STATE_DIR"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
quiet_npm() { grep -v 'npm warn'; }

# Sets SCHEME, IOS_BUNDLE_ID, ANDROID_PACKAGE, PROJECT_ID, UPDATES_URL from the
# development variant (APP_VARIANT unset).
load_project_config() {
  local out
  out=$(env -u APP_VARIANT npx expo config --type public --json 2>/dev/null | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const c = JSON.parse(s);
  const scheme = Array.isArray(c.scheme) ? c.scheme[0] : c.scheme;
  const values = [
    scheme,
    c.ios && c.ios.bundleIdentifier,
    c.android && c.android.package,
    c.extra && c.extra.eas && c.extra.eas.projectId,
    c.updates && c.updates.url,
  ];
  console.log(values.map((v) => v || "").join("\n"));
});') || die "npx expo config failed. Run it to see the error."
  { read -r SCHEME; read -r IOS_BUNDLE_ID; read -r ANDROID_PACKAGE; read -r PROJECT_ID; read -r UPDATES_URL; } <<<"$out"
  [ -n "$SCHEME" ] || die "The app config has no scheme."
  [ -n "$PROJECT_ID" ] || die "The app config has no extra.eas.projectId. Run eas init."
  [ -n "$UPDATES_URL" ] || die "The app config has no updates.url. Run eas update:configure."
}

# app_id <platform> -> bundle ID (ios) or package (android)
app_id() {
  case "$1" in
    ios) echo "$IOS_BUNDLE_ID" ;;
    android) echo "$ANDROID_PACKAGE" ;;
  esac
}

# dev_build_profile <platform> -> the EAS build profile that runs on a cloud simulator
dev_build_profile() {
  case "$1" in
    ios) echo "development-simulator" ;;
    android) echo "development" ;;
  esac
}

# local_fingerprint <platform> -> fingerprint hash of the working tree (development variant)
local_fingerprint() {
  env -u APP_VARIANT npx expo-updates fingerprint:generate --platform "$1" 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).hash||"")}catch{}})'
}

# find_dev_build <platform> [fingerprint] -> latest finished development build ID.
# With a fingerprint, only builds with that fingerprint match.
find_dev_build() {
  local platform="$1" fingerprint="${2:-}" args=()
  [ -n "$fingerprint" ] && args=(--fingerprint-hash "$fingerprint")
  $EAS build:list --platform "$platform" --build-profile "$(dev_build_profile "$platform")" \
    --status finished --limit 1 --json --non-interactive ${args[@]+"${args[@]}"} 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const b=JSON.parse(s)[0];if(b)console.log(b.id)}catch{}})'
}

require_simulator_access() {
  $EAS whoami 2>/dev/null | head -1
  $EAS simulator:availability --json 2>/dev/null | grep -q '"available": true' ||
    die "EAS Simulator is not available for this account."
}

# Stops when .env.eas-simulator already records a session. Starting a new one
# would only stop tracking the old one; it would still run and bill.
require_no_session() {
  if [ -f .env.eas-simulator ] && grep -q EAS_SIMULATOR_SESSION_ID .env.eas-simulator; then
    echo "A session is already recorded in .env.eas-simulator." >&2
    echo "Stop it first: .agents/skills/eas-sim-dev/stop.sh" >&2
    echo "(or inspect it: $EAS simulator:get --json)" >&2
    exit 1
  fi
}

# Polls simulator:get until the session is IN_PROGRESS (boot can take minutes).
wait_until_live() {
  local state
  for _ in $(seq 1 64); do
    state=$($EAS simulator:get --json --non-interactive 2>/dev/null || true)
    printf '%s' "$state" | grep -q '"status": *"IN_PROGRESS"' && return 0
    printf '%s' "$state" | grep -qE '"status": *"(STOPPED|ERRORED)"' && die "The session stopped before it was ready."
    sleep 15
  done
  die "The session was not ready after 16 minutes."
}

# session_url -> expo.dev page for the current session (has the screen recording and logs)
session_url() {
  $EAS simulator:get --json --non-interactive 2>/dev/null |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const i=s.indexOf("{");try{console.log(JSON.parse(s.slice(i)).deviceRunSessionUrl||"")}catch{}})'
}

# dev_client_url <url> -> deep link that opens <url> in the development build
dev_client_url() {
  printf '%s://expo-development-client/?url=%s' "$SCHEME" \
    "$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1")"
}

# Launch args that hide the dev menu onboarding, auto-open, and floating button (iOS).
IOS_DEV_MENU_LAUNCH_ARGS=(
  --launch-arg "-EXDevMenuIsOnboardingFinished" --launch-arg "1"
  --launch-arg "-EXDevMenuShowsAtLaunch" --launch-arg "0"
  --launch-arg "-EXDevMenuShowFloatingActionButton" --launch-arg "0"
)
