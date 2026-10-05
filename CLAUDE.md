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
