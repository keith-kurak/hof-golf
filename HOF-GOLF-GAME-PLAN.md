# HOF Golf — Game Plan

## Concept

A family of baseball trivia/strategy games played over 9 rounds. You navigate between teams and years, trying to land on rosters loaded with notable players. Like golf, 9 "holes" make a game — but here you *want* a high score.

Multiple game variants share the same core mechanic (pick a player → jump to another team+year → score) but differ in what you're collecting and where you start.

## Game Variants

Game variants are defined in `src/metadata/game-modes.json`. Each entry describes a variant's rules, scoring targets, and starting conditions. Variants are versioned by year (e.g., "HOF Golf (2026)") so old versions can be deactivated when new data is added.

```json
[
  {
    "id": "hof-golf-2026",
    "name": "HOF Golf (2026)",
    "description": "Collect Hall of Famers across 9 rounds",
    "active": true,
    "rounds": 9,
    "scoring": {
      "type": "hof",
      "targetSet": "hall-of-famers",
      "pointsPer": 1,
      "uniqueOnly": true
    },
    "start": {
      "pool": "hof-free-teams",
      "yearRange": [1947, 2025]
    }
  },
  {
    "id": "all-star-golf-2026",
    "name": "All-Star Golf (2026)",
    "description": "Start on a 2025 team with one All-Star and collect All-Star appearances",
    "active": true,
    "rounds": 9,
    "scoring": {
      "type": "all-star",
      "targetSet": "all-stars",
      "pointsPer": "selections",
      "uniqueOnly": true
    },
    "start": {
      "pool": "one-allstar-2025-teams",
      "yearRange": [2025, 2025],
      "freebie": true
    }
  },
  {
    "id": "manager-golf-2026",
    "name": "Manager Golf (2026)",
    "description": "Start on a 2025 team and collect players who became managers",
    "active": true,
    "rounds": 9,
    "scoring": {
      "type": "manager",
      "targetSet": "managers-who-played",
      "pointsPer": 1,
      "uniqueOnly": true
    },
    "start": {
      "pool": "all-2025-teams",
      "yearRange": [2025, 2025]
    }
  }
]
```

### Variant Details

**HOF Golf** — The original. Start on a random team+year with zero Hall of Famers (from `hof-free-teams.json`, years 1947+). Score 1 point per HOFer on each roster you land on. Each HOFer scores once per game. ~301 collectible HOFers.

**All-Star Golf** — Start on a random 2025 team that has exactly one All-Star on its roster (you get that one for free). Score based on All-Star *appearances* (a player with 12 selections is worth 12 points). Each player scores once per game. ~2,308 collectible All-Stars.

**Manager Golf** — Start on a random 2025 team. Score 1 point per player on each roster who later became a manager. Each manager-player scores once per game. ~766 collectible manager-players.

## Rules (Generic)

1. **Start**: You begin on a team+year drawn from the variant's starting pool.
2. **Each round**: You're looking at a team roster. You pick any player on that roster, then pick a *different team* (not just a different year) that player also played for. That becomes your next roster.
3. **Scoring**: When you arrive at a new roster, you score points based on the variant's target set. Each individual target player only counts once per game.
4. **9 rounds**: After arriving at 9 rosters (start roster + 8 navigations = 9 scored rosters), the game ends.
5. **Target eligibility** varies by variant (see above).

## Data

Already available:
- **`hof-free-teams.json`** — 490 team+year combos with zero HOFers (starting pool for HOF Golf)
- **`hall-of-famers.json`** — 353 HOF inductees (players, managers, executives, umpires, pioneers)
- **`managers-who-played.json`** — 766 managers who had playing careers
- **`all-stars.json`** — 2,308 players with All-Star selections
- **Lahman SQLite DB** — Batting, Pitching, Appearances, People, Teams tables

Needs to be generated:
- **`one-allstar-2025-teams.json`** — 2025 teams with exactly one All-Star (starting pool for All-Star Golf)
- **`all-2025-teams.json`** — all 2025 teams (starting pool for Manager Golf)
- **`game-modes.json`** — variant definitions (see above)

Derived at app-load time:
- **Target player ID sets** — per variant, the set of playerIDs that count for scoring
- **Per-team target counts** — for each team+year, how many target players are on the roster

## Architecture

### State Management — Legend State + expo-sqlite/kv-store

Game state is managed with **Legend State** observables, persisted to **expo-sqlite/kv-store**.

Legend State already installed (`@legendapp/state@3.0.0-beta.43`). We'll use:
- `@legendapp/state` — observables, computed values
- `@legendapp/state/react` — `observer`, `useObservable`
- `expo-sqlite/kv-store` — persistence backend (key-value on top of SQLite)

```ts
import { observable, computed } from "@legendapp/state";
import { ObservablePersistExpoSQLiteKVStore } from "@legendapp/state/persist-plugins/expo-sqlite";
import { configureSynced, synced } from "@legendapp/state/sync";

// Configure persistence once
configureSynced({
  persist: {
    plugin: ObservablePersistExpoSQLiteKVStore,
  },
});
```

#### Game Store (`src/store/game-store.ts`)

```ts
type GameRound = {
  teamID: string;
  teamName: string;
  yearID: number;
  pickedPlayerID: string | null;
  pickedPlayerName: string | null;
  targetsFound: { playerID: string; name: string; points: number }[];
  pointsEarned: number; // targetsFound minus already-seen
};

type ActiveGame = {
  id: string;
  modeId: string;            // references game-modes.json
  startedAt: number;
  rounds: GameRound[];
  seenTargets: string[];     // playerIDs already scored (array for serialization)
  totalPoints: number;
  finished: boolean;
};

type SavedGame = {
  id: string;
  modeId: string;
  startedAt: number;
  finishedAt: number;
  totalPoints: number;
  rounds: GameRound[];
};

// Observable store
const game$ = observable({
  active: synced<ActiveGame | null>({
    initial: null,
    persist: { name: "active-game" },
  }),
  history: synced<SavedGame[]>({
    initial: [],
    persist: { name: "game-history" },
  }),
});
```

Actions are plain functions that operate on the observable:

```ts
function startGame(mode: GameMode, startingTeam: StartTeam) { ... }
function pickPlayer(playerID: string, playerName: string) { ... }
function navigateToTeam(teamID: string, yearID: number, teamName: string, db: SQLiteDatabase) { ... }
function endGame() { ... }

// Computed
const isGameActive$ = computed(() => game$.active.get() !== null && !game$.active.finished.get());
const currentRound$ = computed(() => game$.active.rounds.get()?.length ?? 0);
```

### Target Lookups (`src/store/target-lookups.ts`)

Each variant needs a fast way to check "is this player a target?" and "how many points is this player worth?":

```ts
type TargetLookup = {
  has: (playerID: string) => boolean;
  pointsFor: (playerID: string) => number;
  label: string; // "Hall of Famer", "All-Star", "Manager"
};
```

Built at app load from the JSON metadata files:
- **HOF**: `hall-of-famers.json` (category "Player") + `managers-who-played.json` cross-referenced → 1 point each
- **All-Star**: `all-stars.json` → points = `allStarSelections`
- **Manager**: `managers-who-played.json` → 1 point each

### Screen Flow

The game **reuses the existing team and player screens** from Browse. The difference is that when a game is active, an overlay/banner appears showing game status and providing action buttons.

#### Game Tab (`(tabs)/index.tsx`)

**When no game is active:**
- List of active game modes from `game-modes.json`
- Tapping a mode starts a new game of that type
- Best score per mode displayed
- Brief rules for each variant

**When a game is active:**
- Redirects to / shows the current team roster (the same `team/[teamID]` screen)

#### Team Roster Screen (`team/[teamID].tsx`) — during a game

The existing roster screen, but with game-aware additions:
- **Game status banner** (sticky top or bottom overlay):
  - Round number: "Round 3 of 9"
  - Current score: "Score: 7"
  - Target players on this roster are **highlighted** (gold star, different background, etc.)
- **Player rows become "Pick" targets**: tapping a player during a game means "I want to use this player to jump to another team." This navigates to the player detail screen where you pick the destination team+year.
- Targets already scored in a previous round could be shown with a checkmark or dimmed indicator

#### Player Detail Screen (`player/[playerID].tsx`) — during a game

The existing season-by-season player view, but:
- **Season rows become "Jump" targets**: tapping a year+team row finalizes your pick — you're choosing to go to that team in that year.
- The currently viewed team+year is disabled (can't jump to where you already are)
- A confirmation step or the tap itself triggers `navigateToTeam()`, which:
  1. Records the pick on the current round
  2. Computes targets on the destination roster
  3. Updates score
  4. Pushes the new team roster screen

#### After Round 9

- A results/summary screen appears showing:
  - Final score
  - Game mode name
  - Each round: team visited, targets found, player used to jump
  - Total unique targets collected
- Button to save and return to Game tab
- Game is saved to history

### Game Overlay Component

A floating overlay component (`GameOverlay`) rendered at the root layout level (above Stack navigator) when a game is active. It shows:

- **Collapsed state** (small pill/bar at bottom above tab bar):
  - "Round 3/9 — Score: 7"
  - Tap to expand

- **Expanded state** (bottom sheet or modal):
  - Full round-by-round summary so far
  - Current roster's targets highlighted
  - "End Game Early" option

This overlay is visible on both the team and player screens during a game, providing persistent context without modifying the underlying screen logic heavily.

### History Tab (`(tabs)/history.tsx`)

- Lists completed games, most recent first
- Filterable by game mode
- Each row shows: date, mode name, final score, starting team
- Tapping a game shows the full round-by-round detail:
  - Each round: team+year, targets scored, player used to navigate away
  - Total score

### Storage

All persistence uses **expo-sqlite/kv-store** via Legend State's persistence plugin:

| Key | Data | Description |
|-----|------|-------------|
| `active-game` | `ActiveGame \| null` | In-progress game (survives app restart) |
| `game-history` | `SavedGame[]` | All completed games |
| `best-scores` | `Record<modeId, number>` | Best score per game mode |

No AsyncStorage dependency needed — expo-sqlite/kv-store handles all key-value storage.

## Implementation Phases

### Phase 1 — Game Data Layer
- Create `game-modes.json` with the three variant definitions
- Generate `one-allstar-2025-teams.json` and `all-2025-teams.json` starting pools
- Build target lookups for each variant (HOF set, All-Star set, Manager set)
- Build `getTargetsOnRoster(db, teamID, yearID, lookup)` — queries roster and cross-references the target set
- Set up Legend State store with persistence to expo-sqlite/kv-store
- Export game actions (startGame, pickPlayer, navigateToTeam, endGame)

### Phase 2 — Game Tab & Starting a Game
- List active game modes on Game tab
- Tapping a mode starts a new game: random starting team from that mode's pool
- Navigate to team roster with game active
- Basic game status display

### Phase 3 — Game-Aware Team Screen
- Detect active game via Legend State observable
- Highlight target players on the roster (gold/special styling)
- Show round/score info
- Player taps during game = "pick this player to jump"

### Phase 4 — Game-Aware Player Screen
- Detect active game via Legend State observable
- Season row taps during game = "jump to this team+year"
- Disable current team+year row
- On tap: finalize round, score destination, push new team screen

### Phase 5 — Game Overlay
- Floating overlay component showing game progress
- Collapsed pill / expanded detail
- Renders above navigation stack

### Phase 6 — End Game & Results
- After round 9, show results summary screen
- Save completed game to Legend State history (auto-persisted)
- Update best score for the mode
- Navigate back to Game tab

### Phase 7 — History Tab
- Read saved games from Legend State history observable
- List view with mode, score, date, starting team
- Filter by game mode
- Detail view showing full round-by-round breakdown

### Phase 8 — Polish
- Animations for scoring (target found celebration)
- Best score tracking per mode on Game tab
- Share results
- Collection progress per variant (e.g., X/301 HOFers found across all games)

## Resolved Questions

1. **Round counting**: Start at round 0 (no score), make 9 jumps total, scoring each destination — 9 scored rosters.

2. **Same-team restriction**: You must jump to a **different team**. Same team + different year is not allowed.

3. **Managers on rosters**: They count if they appear as a *player* on the roster (have Batting or Pitching entries for that team+year). Managing doesn't count.

4. **Navigation UX**: There **will be** a confirmation dialog ("Jump to 1975 Red Sox?") before finalizing a jump.

5. **Single-team players**: You can tap on them and see their career stats, but no teams/years will be selectable as jump targets (since they only played for the current team). The player screen is still viewable — just no actionable rows.

6. **All-Star Golf starting roster scoring**: Everyone starts with 1 point (the freebie All-Star is auto-scored on arrival). This is fun because you discover who the All-Star is.

7. **Manager Golf / jumping logic**: Navigation works the same as HOF Golf — any year is fine, the player just needs to be on the roster.
