---
name: eas-sim-dev
description: Start this app on an EAS iOS cloud simulator with the dev client connected to a local Metro dev server (Expo tunnel), then drive it with agent-device. Use when asked to run, test, screenshot, or verify a change on iOS from this machine (Linux, no local simulator), or to start/stop the cloud simulator and dev server for this project.
---

# EAS cloud simulator + Metro dev server

Runs the HOF Golf dev client on a remote EAS iOS simulator. The dev client loads JS from local Metro through the Expo tunnel (`*.on.expo.app`), so code edits show with Fast Refresh. EAS Simulator is a paid service. Stop the session when you are done.

For general EAS Simulator details, load the `expo:eas-simulator` skill. For agent-device verbs, see the `agent-device` skill.

## Start

```bash
.agents/skills/eas-sim-dev/start.sh
```

The script:

1. Checks `eas whoami` and `simulator:availability`. It stops if `.env.eas-simulator` already records a session.
2. Selects the latest finished `development-simulator` iOS build, and prints `fingerprint:compare` against local source. Override with `BUILD_ID=<id>`.
3. Starts Metro on the first free port from 8091: `EXPO_UNSTABLE_TUNNEL_V2=1 npx expo start --dev-client --tunnel`. Log, port, and tunnel host go to `.expo/eas-sim/`.
4. Runs `simulator:start` with `--build-id`, the dev-menu launch args, and `--open-url hofgolf://expo-development-client/?url=https://<host>`. Metro must be up first, because the URL opens during startup.
5. Waits for `iOS Bundled` in the Metro log, then attaches agent-device with `open com.keithkurak.hofgolf --foreground`.

The script prints a `webPreviewUrl`. Give it to the user to watch in a browser. Never open it on the simulator.

If the fingerprint compare shows native changes (new native module, `app.json` plugin change, and so on), make a new dev build first:

```bash
npx --yes eas-cli@latest build --platform ios --profile development-simulator --non-interactive
```

A `.gitignore`-only difference is not a native change. Ignore it.

## Drive the app

Run every agent-device verb through `simulator:exec`. This loads `.env.eas-simulator`:

```bash
AD="npx --yes eas-cli@latest simulator:exec npx agent-device@latest"
$AD snapshot -i
$AD press 'label="business"' --settle   # Browse tab
$AD fill @e2 "Gossage" --settle
$AD screenshot ./.expo/eas-sim/shot.png
```

Confirm the remote simulator: the "Session state:" path must be under `/Users/expo/`. A local path means agent-device fell back to a local device.

Metro output (JS errors, `console.log`) is in `.expo/eas-sim/metro.log`.

## Known issues (seen 2026-10-02, eas-cli 24.8.0, agent-device 0.21)

- **`agent-device metro reload` fails** with `fetch failed`. The remote side cannot reach `localhost` Metro. To reload, relaunch with the dev client URL, then tap the server entry if the launcher shows:
  ```bash
  $AD open com.keithkurak.hofgolf "hofgolf://expo-development-client/?url=https%3A%2F%2F$(cat .expo/eas-sim/metro.host)" --platform ios --relaunch
  $AD snapshot -i   # if the launcher shows, press the "HOF Golf, https://…on.expo.app" button
  ```
- **Refs change after each action.** A ref like `@e14` can point to a different element after the screen changes. Run `snapshot -i` before `fill` or `press` with a ref, or use `label="…"` selectors.
- **Local egress (`--egress local`) is not enabled** for the `keithco` account. It would let the simulator reach `127.0.0.1:<port>` through this machine instead of a public tunnel. If Expo enables it, start Metro with `--localhost`, pass `--egress local --egress-allow localhost:<port>` to `simulator:start`, and run `eas simulator:egress` while the session is live.
- **The dev menu opens after `--relaunch`.** The launch args from `simulator:start` do not apply to a relaunch. Press `label="Reload"` or close the menu.
- **A "Game in Progress" dialog blocks the tab bar** when a game is active. Press `label="Continue"` or `label="Abandon Game"` first.
- **Do not set `CI=1`** for Metro. CI mode turns off Fast Refresh.

## Stop

```bash
.agents/skills/eas-sim-dev/stop.sh
```

This runs `simulator:stop`, resets `.env.eas-simulator`, and stops the Metro process on the port in `.expo/eas-sim/metro.port`.
