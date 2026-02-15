import type { SQLiteDatabase } from "expo-sqlite";

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
// Main function
// ---------------------------------------------------------------------------

export async function getTargetsOnRoster(
  db: SQLiteDatabase,
  teamID: string,
  yearID: number,
  lookup: TargetLookup,
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
      targets.push({
        playerID: row.playerID,
        name: `${row.nameFirst} ${row.nameLast}`,
        points: lookup.pointsFor(row.playerID),
      });
    }
  }

  return targets;
}
