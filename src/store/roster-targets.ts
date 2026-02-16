import type { SQLiteDatabase } from "expo-sqlite";

import type { ScoringOverride } from "./starting-pools";
import type { TargetLookup } from "./target-lookups";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RosterTarget = {
  playerID: string;
  name: string;
  points: number;
};

type RosterRow = {
  playerID: string;
  nameFirst: string;
  nameLast: string;
};

// ---------------------------------------------------------------------------
// Query — all distinct players on a team+year roster (batters + pitchers)
// ---------------------------------------------------------------------------

const ROSTER_QUERY = `
SELECT DISTINCT b.playerID, p.nameFirst, p.nameLast
FROM Batting b
JOIN People p ON b.playerID = p.playerID
WHERE b.yearID = ? AND b.teamID = ?
UNION
SELECT DISTINCT pi.playerID, p.nameFirst, p.nameLast
FROM Pitching pi
JOIN People p ON pi.playerID = p.playerID
WHERE pi.yearID = ? AND pi.teamID = ?
`;

// ---------------------------------------------------------------------------
// Scoring overrides
// ---------------------------------------------------------------------------

function applyOverrides(
  rawPoints: number,
  overrides?: ScoringOverride[],
): number {
  if (!overrides || overrides.length === 0) return rawPoints;
  for (const rule of overrides) {
    switch (rule.when) {
      case "gte":
        if (rawPoints >= rule.threshold) return rule.points;
        break;
      case "eq":
        if (rawPoints === rule.threshold) return rule.points;
        break;
      case "lte":
        if (rawPoints <= rule.threshold) return rule.points;
        break;
    }
  }
  return rawPoints;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function getTargetsOnRoster(
  db: SQLiteDatabase,
  teamID: string,
  yearID: number,
  lookup: TargetLookup,
  scoringOverrides?: ScoringOverride[],
): Promise<RosterTarget[]> {
  const rows = await db.getAllAsync<RosterRow>(ROSTER_QUERY, [
    yearID,
    teamID,
    yearID,
    teamID,
  ]);

  const targets: RosterTarget[] = [];
  for (const row of rows) {
    if (lookup.has(row.playerID)) {
      const rawPoints = lookup.pointsFor(row.playerID);
      targets.push({
        playerID: row.playerID,
        name: `${row.nameFirst} ${row.nameLast}`,
        points: applyOverrides(rawPoints, scoringOverrides),
      });
    }
  }

  return targets;
}
