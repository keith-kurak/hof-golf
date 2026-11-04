---
name: eas-sim-verify-pr-ios
description: Validate a pull request on an EAS iOS cloud simulator. Runs the PR's EAS Update in the development build, checks the change with agent-device, and posts a PASS/FAIL comment with a link to the simulator run on the PR. Use when asked to validate, verify, test, or QA a PR on iOS.
---

# Validate a PR on an EAS iOS cloud simulator

Follow `.agents/skills/eas-sim-dev/references/pr-validation.md` with `PLATFORM=ios`.

iOS details:

- The build profile is `development-simulator`.
- `start-update-session.sh` passes launch args that hide the dev menu onboarding, the auto-open dev menu, and the floating button.
- `--open-url` approves the app's scheme for the session. A later "Open in …?" alert is unusual, but press `label="Open"` if one shows.
- `snapshot -i` on iOS can take tens of seconds. Wait for it.

EAS Simulator is a paid service. The default session limit is 20 minutes (`--max-minutes`). Stop the session when the checks are done.

For general EAS Simulator details, load the `expo:eas-simulator` skill.
