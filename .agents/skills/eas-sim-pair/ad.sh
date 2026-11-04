#!/usr/bin/env bash
# Run agent-device against one eas-sim-pair session, with only that session's
# config loaded:  ad.sh <ios|android> <agent-device args...>
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
p="${1:-}"; shift || true
case "$p" in ios | android) ;; *) echo "usage: ad.sh <ios|android> <agent-device args...>" >&2; exit 2 ;; esac
CONFIG=".expo/eas-sim/pair/$p.env"
[ -f "$CONFIG" ] || { echo "No $p session. Start one: .agents/skills/eas-sim-pair/start.sh $p" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "$CONFIG"
set +a
exec npx --yes agent-device@0.21.35 "$@" --platform "$p"
