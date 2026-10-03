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

## Running on iOS from Linux

Use the `eas-sim-dev` skill (`.agents/skills/eas-sim-dev/`). It starts an EAS cloud iOS simulator with the `development-simulator` dev build, connects it to local Metro through the Expo tunnel, and drives the app with agent-device. EAS project owner: `keithco`.

## Key Conventions

- Path aliases: `@/*` maps to `./src/*`, `@/assets/*` maps to `./assets/*`
- Light/dark theme support via `Colors.light` / `Colors.dark` in `src/constants/theme.ts`
- Spacing system uses a scale: `Spacing.one` (4px) through `Spacing.six` (64px)
- Platform-specific files use `.web.tsx` suffix
- React Compiler and typed routes are enabled (`app.json` experiments)
- Import React Navigation APIs from `expo-router/react-navigation`, not `@react-navigation/*`
- ESLint uses `eslint-config-expo/flat`
