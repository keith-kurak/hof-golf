---
name: eas-sim-pair
description: Start EAS cloud simulators for iOS and Android (or one of them) at the same time, running the latest development builds connected to a dev server, each with its own agent-device config. Use when asked to run the app on both platforms in the cloud, to watch iOS and Android side by side, or to drive two cloud simulators with agent-device.
---

# iOS and Android cloud simulators together

Starts one EAS Simulator session per platform. Each runs the latest development build and loads JS from a dev server through the Expo tunnel, so code edits show on both with Fast Refresh. EAS Simulator is a paid service. Stop the sessions when you are done.

For one iOS simulator only, `eas-sim-dev` is simpler. For agent-device verbs, see the `agent-device` skill.

## Start

```bash
.agents/skills/eas-sim-pair/start.sh            # both
.agents/skills/eas-sim-pair/start.sh ios        # or one platform
```

The script:

1. Checks `eas whoami` and `simulator:availability`. It stops if `.env.eas-simulator` records a session, or if this skill already has a session for the platform.
2. **Dev server:** looks on ports 8081-8099 for a dev server of this project with an Expo tunnel (`*.on.expo.app`) and uses it. A dev server without a tunnel is reported and skipped: a cloud simulator cannot reach `localhost`. With none found, it starts `expo start --dev-client --tunnel` on the first free port from 8081.
3. **Builds:** for each platform, the latest finished development build (`development-simulator` on iOS, `development` on Android) that matches the local fingerprint. With no match, it uses the latest one and prints `fingerprint:compare`. Override with `IOS_BUILD_ID` / `ANDROID_BUILD_ID`.
4. **Sessions:** `simulator:start --type agent-device --out-config-type env`. The agent-device config (daemon URL and token) goes to `.expo/eas-sim/pair/<platform>.env`, not `.env.eas-simulator`, so the two sessions stay separate. The token is private: the folder is mode 700 and gitignored.
5. **Attach:** opens the app on iOS. On Android, the dev server link does not always connect (ENG-26652): when the development launcher shows, the script enters the dev server URL and taps Connect, then closes the development menu's first-run screen.

It prints each session's browser preview link. Give them to the user.

`MAX_MINUTES` sets the session limit (default 60).

## Drive a session

```bash
.agents/skills/eas-sim-pair/ad.sh ios snapshot -i
.agents/skills/eas-sim-pair/ad.sh android press 'label="Play"' --settle
```

`ad.sh` loads only that platform's config and adds `--platform`. Do not use `simulator:exec` for these sessions: it reads `.env.eas-simulator`, which they do not use.

On Android, React Native `testID`s do not show up as agent-device ids; use labels or refs there.

## Stop

```bash
.agents/skills/eas-sim-pair/stop.sh            # both
.agents/skills/eas-sim-pair/stop.sh android    # or one
```

This stops the sessions by id and deletes their config. It stops the dev server only if `start.sh` started it and no session is left.

## Files

`.expo/eas-sim/pair/`: `<platform>.env` (agent-device config), `<platform>.id` (session id), `<platform>.log` (start output, with the session and preview links), `<platform>.build`, `dev-server`, and `metro.port` / `metro.log` when the script started the dev server.
