---
name: eas-sim-dev
description: Start this app on an EAS iOS cloud simulator with the development build connected to a local Metro dev server (Expo tunnel), then drive it with agent-device. Use when asked to run, test, screenshot, or verify a change on iOS from a machine with no local simulator, or to start/stop the cloud simulator and dev server for this project.
---

# EAS cloud simulator + Metro dev server

Runs the development build on a remote EAS iOS simulator. The build loads JS from local Metro through the Expo tunnel (`*.on.expo.app`), so code edits show with Fast Refresh. EAS Simulator is a paid service. Stop the session when you are done.

For general EAS Simulator details, load the `expo:eas-simulator` skill. For agent-device verbs, see the `agent-device` skill.

The scripts read the scheme, bundle ID, and project ID from the development app config (`APP_VARIANT` unset). They need no per-project edits.

## Start

```bash
.agents/skills/eas-sim-dev/start.sh
```

The script:

1. Checks `eas whoami` and `simulator:availability`. It stops if `.env.eas-simulator` already records a session.
2. Computes the local iOS fingerprint and selects the latest finished `development-simulator` build with that fingerprint. If none matches, it uses the latest `development-simulator` build and prints `fingerprint:compare`. Override with `BUILD_ID=<id>`.
3. Starts Metro on the first free port from 8091: `EXPO_UNSTABLE_TUNNEL_V2=1 npx expo start --dev-client --tunnel`. Log, port, and tunnel host go to `.expo/eas-sim/`.
4. Runs `simulator:start` with `--build-id`, the dev-menu launch args, and `--open-url <scheme>://expo-development-client/?url=https://<host>`. Metro must be up first, because the URL opens during startup.
5. Waits for `iOS Bundled` in the Metro log, then attaches agent-device with `open <bundle-id> --foreground`.

The script prints a web preview URL and the session page URL. Give them to the user. Never open the web preview URL on the simulator.

If no build matches the fingerprint and the compare shows native changes (new native module, config plugin change, and so on), make a new development build first:

```bash
npx --yes eas-cli@latest workflow:run .eas/workflows/dev-builds.yaml
# or only the simulator build:
npx --yes eas-cli@latest build --platform ios --profile development-simulator --non-interactive
```

Builds cost money. Ask the user before you start one, unless they already asked for it. A `.gitignore`-only difference is not a native change. Ignore it.

## Drive the app

Run every agent-device verb through `simulator:exec`. This loads `.env.eas-simulator`:

```bash
AD="npx --yes eas-cli@latest simulator:exec npx agent-device@latest"
$AD snapshot -i
$AD press 'label="Continue"' --settle
$AD fill @e14 "some text"
$AD screenshot ./.expo/eas-sim/shot.png
```

Confirm the remote simulator: the "Session state:" path must be under `/Users/expo/`. A local path means agent-device fell back to a local device.

Metro output (JS errors, `console.log`) is in `.expo/eas-sim/metro.log`.

## Put a test image in Photos

agent-device cannot add media directly. Metro serves project files, so open the image in Safari and save it:

```bash
$AD open com.apple.mobilesafari "https://$(cat .expo/eas-sim/metro.host)/assets/<path/in/repo>.png?platform=ios" --platform ios
$AD snapshot -i                    # close the first-run Safari popup if it shows
$AD longpress @<image-ref> 2000    # long-press the image element by ref (coordinates do not open the menu)
$AD press 'label="Save to Photos"'
```

Files in the gitignored `.expo/` folder work too. The simulator has no camera. Use the photo picker to test camera flows.

## Known issues (seen 2026-10, eas-cli 24.8.0, agent-device 0.21)

- **`agent-device metro reload` fails** with `fetch failed`. The remote side cannot reach `localhost` Metro. To reload, relaunch with the dev client URL (the script prints it), then tap the server entry if the launcher shows:
  ```bash
  $AD open <bundle-id> "<dev client URL>" --platform ios --relaunch
  $AD snapshot -i   # if the launcher shows, press the "<app name>, https://…on.expo.app" button
  ```
- **Refs change after each action.** A ref like `@e14` can point to a different element after the screen changes. Run `snapshot -i` before `fill` or `press` with a ref, or use `label="…"` selectors.
- **Native crash at launch:** the app opens and closes, Metro gets no bundle request, and `snapshot` says the app is not running. Crash reports stay on the remote VM. Usual cause: the build does not match the native code. Check the fingerprint, run `npx expo install --fix`, and make a new development build.
- **Do not set `CI=1`** for Metro. CI mode turns off Fast Refresh.
- **Do not set `APP_VARIANT`** for Metro. The development build expects the development config.

## HOF Golf notes

- Bundle ID of the development build: `com.keithkurak.hofgolf.dev`. Scheme: `hofgolf`.
- **A "Game in Progress" dialog covers the tab bar** while a game is active. Press `label="Continue"` or `label="Abandon Game"` first.
- **The dev menu opens after `--relaunch`.** The launch args from `simulator:start` do not apply to a relaunch. Press `label="Reload"` or close the menu.
- Example: `$AD press 'label="business"' --settle` opens the Browse tab, then `$AD fill @e2 "Gossage" --settle` searches.

## Stop

```bash
.agents/skills/eas-sim-dev/stop.sh
```

This runs `simulator:stop`, resets `.env.eas-simulator`, and stops the Metro process on the port in `.expo/eas-sim/metro.port`.

## Shared scripts

The other `eas-sim-*` skills use these files:

- `lib.sh`: project config, fingerprint, build lookup, session helpers.
- `start-update-session.sh`: starts a session that runs a published update group (no Metro).
- `stop.sh`: stops any session that these scripts started.
- `references/pr-validation.md`: the PR validation procedure.
