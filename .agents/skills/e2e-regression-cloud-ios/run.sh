#!/usr/bin/env bash
# Run the e2e regression test on an EAS cloud iOS Simulator. e2e runs on this
# machine and drives the remote simulator through agent-device.
#
# The test needs an `e2e-ios-simulator` build of the current commit (a release
# build: the JS is in the app). The script reuses one if it exists.
#
# Env:
#   IOS_SIMULATOR_BUILD_ID  build to use (skips the lookup)
#   BUILD=1                 make the build if none exists (paid, about 15 minutes)
# Other arguments go to `e2e run`, for example --video.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
EAS="npx --yes eas-cli@latest"
COMMIT=$(git rev-parse HEAD)

[ -z "$(git status --porcelain)" ] ||
  echo "warning: uncommitted changes. A build of $COMMIT does not include them." >&2

first_id() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const b=JSON.parse(s.slice(s.indexOf("[")));if(b[0])console.log(b[0].id)}catch{}})'; }

if [ -z "${IOS_SIMULATOR_BUILD_ID:-}" ]; then
  echo "==> Finding an e2e-ios-simulator build of $COMMIT"
  IOS_SIMULATOR_BUILD_ID=$($EAS build:list --platform ios --build-profile e2e-ios-simulator \
    --git-commit-hash "$COMMIT" --status finished --limit 1 --json --non-interactive 2>/dev/null | first_id)
fi

if [ -z "${IOS_SIMULATOR_BUILD_ID:-}" ]; then
  if [ "${BUILD:-}" != 1 ]; then
    echo "No e2e-ios-simulator build of $COMMIT. Make one (paid), then run this again:" >&2
    echo "  BUILD=1 $0" >&2
    exit 1
  fi
  echo "==> Building e2e-ios-simulator for $COMMIT"
  IOS_SIMULATOR_BUILD_ID=$($EAS build --platform ios --profile e2e-ios-simulator \
    --non-interactive --wait --json 2>/dev/null | first_id)
  [ -n "$IOS_SIMULATOR_BUILD_ID" ] || { echo "The build failed. See expo.dev." >&2; exit 1; }
fi
echo "Build: $IOS_SIMULATOR_BUILD_ID"

export IOS_SIMULATOR_BUILD_ID
echo "==> Running the regression test (the session page link prints when the simulator is ready)"
npx e2e run tests/hof-golf-regression.e2e.ts --config e2e.eas.config.ts "$@"
