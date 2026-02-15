import type { SQLiteDatabase } from "expo-sqlite";

import hofFreeTeams from "@/metadata/hof-free-teams.json";

import type { TargetLookup } from "./target-lookups";
import { getTargetsOnRoster } from "./roster-targets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameMode = {
  id: string;
  name: string;
  label: string;
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
  info: {
    overview: string;
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
// HOF Golf — pick from hof-free-teams.json (filtered by yearRange)
// ---------------------------------------------------------------------------

function getHofStart(mode: GameMode): StartingTeam {
  const [minYear, maxYear] = mode.start.yearRange;
  const pool = (hofFreeTeams as HofFreeEntry[]).filter(
    (t) => t.yearID >= minYear && t.yearID <= maxYear,
  );
  const pick = randomPick(pool);
  return { teamID: pick.teamID, yearID: pick.yearID, teamName: pick.name };
}

// ---------------------------------------------------------------------------
// All-Star Golf — 2025 teams with exactly 1 All-Star on roster
// ---------------------------------------------------------------------------

const TEAMS_QUERY = `
SELECT teamID, yearID, name FROM Teams WHERE yearID = ?
`;

async function getAllStarStart(
  db: SQLiteDatabase,
  lookup: TargetLookup,
): Promise<StartingTeam> {
  const teams = await db.getAllAsync<TeamRow>(TEAMS_QUERY, [2025]);
  const oneAllStarTeams: StartingTeam[] = [];

  for (const team of teams) {
    const targets = await getTargetsOnRoster(
      db,
      team.teamID,
      team.yearID,
      lookup,
    );
    if (targets.length === 1) {
      oneAllStarTeams.push({
        teamID: team.teamID,
        yearID: team.yearID,
        teamName: team.name,
      });
    }
  }

  if (oneAllStarTeams.length === 0) {
    throw new Error("No 2025 teams found with exactly 1 All-Star");
  }

  return randomPick(oneAllStarTeams);
}

// ---------------------------------------------------------------------------
// Manager Golf — any 2025 team
// ---------------------------------------------------------------------------

async function getManagerStart(db: SQLiteDatabase): Promise<StartingTeam> {
  const teams = await db.getAllAsync<TeamRow>(TEAMS_QUERY, [2025]);
  if (teams.length === 0) {
    throw new Error("No 2025 teams found");
  }
  const pick = randomPick(teams);
  return { teamID: pick.teamID, yearID: pick.yearID, teamName: pick.name };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getRandomStart(
  db: SQLiteDatabase,
  mode: GameMode,
  lookup: TargetLookup,
): Promise<StartingTeam> {
  switch (mode.start.pool) {
    case "hof-free-teams":
      return getHofStart(mode);
    case "one-allstar-2025-teams":
      return getAllStarStart(db, lookup);
    case "all-2025-teams":
      return getManagerStart(db);
    default:
      throw new Error(`Unknown starting pool: ${mode.start.pool}`);
  }
}
