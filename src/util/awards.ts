import type { SQLiteDatabase } from "expo-sqlite";

export type AwardKey = "MVP" | "CY" | "ROY" | "GG" | "AS";

export type AwardSeason = {
  yearID: number;
  lgID: string | null;
  /** Gold Glove position (e.g. "SS"), or "×2" for years with two All-Star games */
  note: string | null;
};

export type PlayerAward = {
  key: AwardKey;
  label: string;
  seasons: AwardSeason[];
};

/** Display order and labels. `awardID` is the AwardsPlayers value. */
const AWARDS: { key: AwardKey; label: string; awardID: string | null }[] = [
  { key: "MVP", label: "MVP", awardID: "Most Valuable Player" },
  { key: "CY", label: "Cy Young", awardID: "Cy Young Award" },
  { key: "ROY", label: "Rookie of the Year", awardID: "Rookie of the Year" },
  { key: "GG", label: "Gold Glove", awardID: "Gold Glove" },
  { key: "AS", label: "All-Star", awardID: null },
];

type AwardRow = {
  awardID: string;
  yearID: number;
  lgID: string | null;
  note: string | null;
};

// All-Star selections come from AllstarFull (one row per game). Years with
// two games (1959–1962) collapse to one season with a "×2" note.
const PLAYER_AWARDS_QUERY = `
  SELECT awardID, yearID, lgID, notes AS note
  FROM AwardsPlayers
  WHERE playerID = ?
    AND awardID IN ('Most Valuable Player', 'Cy Young Award', 'Rookie of the Year', 'Gold Glove')
  UNION ALL
  SELECT 'All-Star' AS awardID, yearID, MIN(lgID) AS lgID,
         CASE WHEN COUNT(*) > 1 THEN '×' || COUNT(*) END AS note
  FROM AllstarFull
  WHERE playerID = ?
  GROUP BY yearID
  ORDER BY yearID
`;

export async function fetchPlayerAwards(
  db: SQLiteDatabase,
  playerID: string,
): Promise<PlayerAward[]> {
  const rows = await db.getAllAsync<AwardRow>(PLAYER_AWARDS_QUERY, [
    playerID,
    playerID,
  ]);
  return AWARDS.map(({ key, label, awardID }) => ({
    key,
    label,
    seasons: rows
      .filter((r) => r.awardID === (awardID ?? "All-Star"))
      .map(({ yearID, lgID, note }) => ({ yearID, lgID, note })),
  })).filter((a) => a.seasons.length > 0);
}
