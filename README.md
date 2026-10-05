# HOF Golf

A baseball trivia game played over 9 rounds. Jump from roster to roster through shared players, and collect Hall of Famers, All-Stars, or future managers on the teams you land on.

## Start the dev server

```bash
bun install
bun start
```

Open the app in the development build (`HOF-DEV`). If you do not have one, run the `Development builds` workflow:

```bash
npx eas-cli@latest workflow:run .eas/workflows/dev-builds.yaml
```

## Features

- Three modes: HOF, All-Star, Manager Golf
- Random or chosen starting team
- Timed or untimed rounds
- Resume a game in progress
- Game history with round details
- Browse team rosters by year
- Search players and view career stats
- Offline Lahman database (SQLite)

## TODO

- Filter for history and results
- Haptics
