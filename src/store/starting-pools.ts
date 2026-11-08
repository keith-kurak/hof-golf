import type { SQLiteDatabase } from "expo-sqlite";

import hofFreeTeams from "@/metadata/hof-free-teams.json";

import type { TargetLookup } from "./target-lookups";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoringOverride = {
  when: "gte" | "eq" | "lte";
  threshold: number;
  points: number;
};

export type GameBonus = {
  label: string;
  description: string;
  points: number;
  condition: string;
};

export type GameMode = {
  id: string;
  name: string;
  shortName: string;
  label: string;
  emoji: string;
  version: string;
  active: boolean;
  rounds: number;
  scoring: {
    type: string;
    targetSet: string;
    pointsPer: number | string;
    uniqueOnly: boolean;
  };
  start: {
    pool: string;
    yearRange: [number, number];
    freebie?: boolean;
  };
  /** Seasons a pick can go to. Absent: any MLB season. */
  picks?: {
    yearRange: [number, number];
  };
  /** Show the player's awards (MVP, Cy Young, etc.) on the player screen during this game. Absent: hidden. */
  showAwards?: boolean;
  bonuses: {
    scoringOverrides: ScoringOverride[];
    gameBonus: GameBonus | null;
  } | null;
  info: {
    overview: string;
    overviewBrief: string;
    howToPlay: string[];
    bullets: string[];
  };
};

export type StartingTeam = {
  teamID: string;
  yearID: number;
  teamName: string;
};

type HofFreeEntry = {
  yearID: number;
  teamID: string;
  name: string;
};

type TeamRow = {
  teamID: string;
  yearID: number;
  name: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Pool builders — return full list of eligible starting teams
// ---------------------------------------------------------------------------

const TEAMS_QUERY = `
SELECT teamID, yearID, name FROM Teams WHERE yearID = ?
`;

function getHofPool(mode: GameMode): StartingTeam[] {
  const [minYear, maxYear] = mode.start.yearRange;
  return (hofFreeTeams as HofFreeEntry[])
    .filter((t) => t.yearID >= minYear && t.yearID <= maxYear)
    .map((t) => ({ teamID: t.teamID, yearID: t.yearID, teamName: t.name }));
}

// Teams with exactly one player selected to the 2025 All-Star Game. That
// player is the "freebie": every team has at least two career All-Stars.
const ONE_ALLSTAR_TEAMS_QUERY = `
SELECT t.teamID, t.yearID, t.name
FROM Teams t
JOIN AllstarFull a ON a.teamID = t.teamID AND a.yearID = t.yearID
WHERE t.yearID = ?
GROUP BY t.teamID
HAVING COUNT(DISTINCT a.playerID) = 1
`;

async function getAllStarPool(db: SQLiteDatabase): Promise<StartingTeam[]> {
  const teams = await db.getAllAsync<TeamRow>(ONE_ALLSTAR_TEAMS_QUERY, [2025]);
  if (teams.length === 0) {
    throw new Error("No 2025 teams found with exactly 1 All-Star");
  }
  return teams.map((t) => ({
    teamID: t.teamID,
    yearID: t.yearID,
    teamName: t.name,
  }));
}

async function getManagerPool(db: SQLiteDatabase): Promise<StartingTeam[]> {
  const teams = await db.getAllAsync<TeamRow>(TEAMS_QUERY, [2025]);
  if (teams.length === 0) {
    throw new Error("No 2025 teams found");
  }
  return teams.map((t) => ({
    teamID: t.teamID,
    yearID: t.yearID,
    teamName: t.name,
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getEligibleTeams(
  db: SQLiteDatabase,
  mode: GameMode,
  lookup: TargetLookup,
): Promise<StartingTeam[]> {
  switch (mode.start.pool) {
    case "hof-free-teams":
      return getHofPool(mode);
    case "one-allstar-2025-teams":
      return getAllStarPool(db);
    case "all-2025-teams":
      return getManagerPool(db);
    default:
      throw new Error(`Unknown starting pool: ${mode.start.pool}`);
  }
}

export async function getRandomStart(
  db: SQLiteDatabase,
  mode: GameMode,
  lookup: TargetLookup,
): Promise<StartingTeam> {
  const pool = await getEligibleTeams(db, mode, lookup);
  return randomPick(pool);
}
