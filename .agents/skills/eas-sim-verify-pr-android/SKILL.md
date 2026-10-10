---
name: eas-sim-verify-pr-android
description: On-demand Android validation of a pull request on an EAS cloud emulator. Runs the PR's EAS Update in the Android development build, checks the change with agent-device, and posts a PASS/FAIL comment with a link to the emulator run on the PR. Use when asked to validate, verify, test, or QA a PR on Android.
---

# Validate a PR on an EAS Android cloud emulator

Follow `.agents/skills/eas-sim-dev/references/pr-validation.md` with `PLATFORM=android`.

Android details:

- The build profile is `development`. Its internal-distribution APK installs on the emulator. There is no separate simulator profile.
- The iOS dev-menu launch args do not apply. If the dev menu or its onboarding covers the app, close it with agent-device (`snapshot -i`, then press the close or continue button).
- If a "Open with" chooser shows for the deep link, select the development build (`HOF-DEV`).
- Android support in EAS Simulator is newer than iOS support. If the session or a verb fails, report the failure on the PR and do not retry more than once.

EAS Simulator is a paid service. The default session limit is 20 minutes (`--max-minutes`). Stop the session when the checks are done.

For general EAS Simulator details, load the `expo:eas-simulator` skill.
