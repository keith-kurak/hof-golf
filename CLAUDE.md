# CLAUDE.md - hof-golf

## Project Overview

Baseball Hall of Fame guessing/trivia game built with Expo and React Native. Early stage — currently has the default Expo template scaffolding with a Lahman Baseball Database ingestion pipeline.

## Tech Stack

- **Framework**: Expo SDK 58 (preview) with Expo Router (file-based routing)
- **Language**: TypeScript (strict mode)
- **UI**: React Native 0.88, React 19.3, react-native-reanimated, react-native-gesture-handler
- **Data**: Lahman Baseball Database (CSV files converted to SQLite via Python/pandas)
- **Package Manager**: Bun (`bun.lock` present)

## Project Structure

```
src/
  app/              # Expo Router file-based routes
    _layout.tsx     # Root layout with ThemeProvider and tab navigation
    index.tsx       # Home screen
    explore.tsx     # Explore screen (template example)
  components/       # Reusable UI components
  constants/
    theme.ts        # Colors, Fonts, Spacing constants
  hooks/            # Custom hooks (useColorScheme, useTheme)
  global.css        # Web font CSS variables
lahman/
  install.sh        # Setup script (installs python3, pandas)
  csv-to-sqlite.py  # Converts CSV files in csvs/ to db/database.sqlite
  csvs/             # Lahman CSV data files
  db/               # SQLite database output
assets/             # Images, icons, splash screen
```

## Commands

```bash
bun start           # Start Expo dev server
bun run lint        # Run ESLint (expo lint)
bun run ios         # Start on iOS
bun run android     # Start on Android
bun run web         # Start on web
```

## App variants

`APP_VARIANT` selects the variant: unset = development (`HOF-DEV`), `preview`, `production`.
EAS gets it from the EAS environment of the build profile. Do not add it to `eas.json`.
Runtime version policy: `appVersion`.

## Cloud simulator skills

- `eas-sim-dev`: run and drive the app on an iOS cloud simulator with Metro.
- `eas-sim-verify-pr-ios` / `eas-sim-verify-pr-android`: validate a PR and comment the result.
- `eas-sim-preview-link`: post an iOS web preview link on a PR.

EAS project owner: `keithco`.

## E2E tests

[e2e](https://e2e.tester.army/docs) (TesterArmy) runs `tests/*.e2e.ts` through agent-device. `tests/hof-golf-regression.e2e.ts` plays a fixed HOF Golf route and checks the score.

- `e2e-regression-local`: local iOS Simulator or Android Emulator, with a video. Needs a release build of the preview variant.
- `e2e-regression-cloud-ios`: EAS cloud iOS Simulator. Needs an `e2e-ios-simulator` build of the current commit.
- `.eas/workflows/e2e-regression.yaml`: runs on the EAS macOS worker when a PR gets the `e2e-regression` label.
- Model: Claude through a GitHub Copilot login (`npx e2e login github-copilot`). On EAS, the `E2E_OAUTH_CREDENTIALS` secret (preview environment) holds a copy of `~/.config/e2e/oauth.json`. `ANTHROPIC_API_KEY`, if set, wins.
- `.e2e/cache` is committed: recorded agent steps replay without a model call. Commit changes to it.
- `tests/agent-device/hof-golf-regression.ad`: the same route as a deterministic agent-device script (no model). `.eas/workflows/agent-device-regression.yaml` runs it on an EAS Simulator session when a PR gets the `agent-device-regression` label. Roster rows are matched by their full label, so a change to a row's text or stats needs a script update.

## README

Keep `README.md` in this order: description, start the dev server, Features (short bullets), TODO (next major goals).
When a change adds a feature or completes a goal, update Features and TODO in the same change.

## Key Conventions

- Path aliases: `@/*` maps to `./src/*`, `@/assets/*` maps to `./assets/*`
- Light/dark theme support via `Colors.light` / `Colors.dark` in `src/constants/theme.ts`
- Spacing system uses a scale: `Spacing.one` (4px) through `Spacing.six` (64px)
- Platform-specific files use `.web.tsx` suffix
- React Compiler and typed routes are enabled (`app.json` experiments)
- Import React Navigation APIs from `expo-router/react-navigation`, not `@react-navigation/*`
- ESLint uses `eslint-config-expo/flat`
