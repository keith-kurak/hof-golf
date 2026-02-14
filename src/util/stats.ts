// ---------------------------------------------------------------------------
// Stat column definitions — the single source of truth for which stats we
// query from the Lahman database and how we display them.
// ---------------------------------------------------------------------------

/** Columns we SUM from the Batting table. */
export const BATTING_COLUMNS = [
  "G", "AB", "R", "H", "2B", "3B", "HR", "RBI", "BB", "SO", "SB", "HBP", "SF",
] as const;

/** Columns we SUM from the Pitching table. */
export const PITCHING_COLUMNS = [
  "W", "L", "G", "GS", "SV", "IPouts", "SO", "BB", "H", "HR", "ER",
] as const;

// ---------------------------------------------------------------------------
// Types — derived from the column arrays so they stay in sync automatically.
// ---------------------------------------------------------------------------

export type BattingStats = { [K in (typeof BATTING_COLUMNS)[number]]: number | null };
export type PitchingStats = { [K in (typeof PITCHING_COLUMNS)[number]]: number | null };

// ---------------------------------------------------------------------------
// Query builders
// ---------------------------------------------------------------------------

function sumSelect(columns: readonly string[]): string {
  return columns.map((c) => `SUM("${c}") as "${c}"`).join(", ");
}

export function battingQuery(yearFilter?: boolean): string {
  const where = yearFilter
    ? "playerID = ? AND yearID = ?"
    : "playerID = ?";
  return `SELECT ${sumSelect(BATTING_COLUMNS)} FROM Batting WHERE ${where}`;
}

export function pitchingQuery(yearFilter?: boolean): string {
  const where = yearFilter
    ? "playerID = ? AND yearID = ?"
    : "playerID = ?";
  return `SELECT ${sumSelect(PITCHING_COLUMNS)} FROM Pitching WHERE ${where}`;
}

export const YEAR_RANGE_QUERY = `SELECT MIN(yearID) as minYear, MAX(yearID) as maxYear FROM (
  SELECT yearID FROM Batting WHERE playerID = ?
  UNION
  SELECT yearID FROM Pitching WHERE playerID = ?
)`;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function statVal(v: number | null | undefined): string {
  return v != null ? String(v) : "—";
}

export function formatAvg(h: number | null | undefined, ab: number | null | undefined): string {
  if (!ab) return "—";
  return ((h ?? 0) / ab).toFixed(3).replace(/^0/, "");
}

export function formatObp(s: BattingStats | null | undefined): string {
  if (!s) return "—";
  const num = (s.H ?? 0) + (s.BB ?? 0) + (s.HBP ?? 0);
  const denom = (s.AB ?? 0) + (s.BB ?? 0) + (s.HBP ?? 0) + (s.SF ?? 0);
  if (!denom) return "—";
  return (num / denom).toFixed(3).replace(/^0/, "");
}

export function formatSlg(s: BattingStats | null | undefined): string {
  if (!s || !s.AB) return "—";
  const singles = (s.H ?? 0) - (s["2B"] ?? 0) - (s["3B"] ?? 0) - (s.HR ?? 0);
  const totalBases = singles + 2 * (s["2B"] ?? 0) + 3 * (s["3B"] ?? 0) + 4 * (s.HR ?? 0);
  return (totalBases / s.AB).toFixed(3).replace(/^0/, "");
}

export function formatOps(s: BattingStats | null | undefined): string {
  if (!s || !s.AB) return "—";
  const num = (s.H ?? 0) + (s.BB ?? 0) + (s.HBP ?? 0);
  const denom = (s.AB ?? 0) + (s.BB ?? 0) + (s.HBP ?? 0) + (s.SF ?? 0);
  if (!denom) return "—";
  const obp = num / denom;
  const singles = (s.H ?? 0) - (s["2B"] ?? 0) - (s["3B"] ?? 0) - (s.HR ?? 0);
  const totalBases = singles + 2 * (s["2B"] ?? 0) + 3 * (s["3B"] ?? 0) + 4 * (s.HR ?? 0);
  const slg = totalBases / s.AB;
  return (obp + slg).toFixed(3).replace(/^0/, "");
}

export function formatEra(er: number | null | undefined, ipouts: number | null | undefined): string {
  if (!ipouts) return "—";
  return (((er ?? 0) * 9) / (ipouts / 3)).toFixed(2);
}

export function formatIP(ipouts: number | null | undefined): string {
  if (ipouts == null) return "—";
  const full = Math.floor(ipouts / 3);
  const remainder = ipouts % 3;
  return remainder === 0 ? `${full}` : `${full}.${remainder}`;
}

// ---------------------------------------------------------------------------
// Formatted stat rows — { label, value } for a single data set, or
// { label, year, career } when comparing two.
// ---------------------------------------------------------------------------

export type StatRow = { label: string; year: string; career: string };

export function formatBattingRows(
  year: BattingStats | null | undefined,
  career: BattingStats | null | undefined,
): StatRow[] {
  return [
    { label: "G",   year: statVal(year?.G),   career: statVal(career?.G) },
    { label: "AB",  year: statVal(year?.AB),  career: statVal(career?.AB) },
    { label: "R",   year: statVal(year?.R),   career: statVal(career?.R) },
    { label: "H",   year: statVal(year?.H),   career: statVal(career?.H) },
    { label: "2B",  year: statVal(year?.["2B"]),  career: statVal(career?.["2B"]) },
    { label: "3B",  year: statVal(year?.["3B"]),  career: statVal(career?.["3B"]) },
    { label: "HR",  year: statVal(year?.HR),  career: statVal(career?.HR) },
    { label: "RBI", year: statVal(year?.RBI), career: statVal(career?.RBI) },
    { label: "BB",  year: statVal(year?.BB),  career: statVal(career?.BB) },
    { label: "SO",  year: statVal(year?.SO),  career: statVal(career?.SO) },
    { label: "SB",  year: statVal(year?.SB),  career: statVal(career?.SB) },
    { label: "AVG", year: formatAvg(year?.H, year?.AB), career: formatAvg(career?.H, career?.AB) },
    { label: "OBP", year: formatObp(year),    career: formatObp(career) },
    { label: "SLG", year: formatSlg(year),    career: formatSlg(career) },
    { label: "OPS", year: formatOps(year),    career: formatOps(career) },
  ];
}

export function formatPitchingRows(
  year: PitchingStats | null | undefined,
  career: PitchingStats | null | undefined,
): StatRow[] {
  return [
    { label: "W",   year: statVal(year?.W),   career: statVal(career?.W) },
    { label: "L",   year: statVal(year?.L),   career: statVal(career?.L) },
    { label: "ERA", year: formatEra(year?.ER, year?.IPouts), career: formatEra(career?.ER, career?.IPouts) },
    { label: "G",   year: statVal(year?.G),   career: statVal(career?.G) },
    { label: "GS",  year: statVal(year?.GS),  career: statVal(career?.GS) },
    { label: "SV",  year: statVal(year?.SV),  career: statVal(career?.SV) },
    { label: "IP",  year: formatIP(year?.IPouts), career: formatIP(career?.IPouts) },
    { label: "SO",  year: statVal(year?.SO),  career: statVal(career?.SO) },
    { label: "BB",  year: statVal(year?.BB),  career: statVal(career?.BB) },
    { label: "H",   year: statVal(year?.H),   career: statVal(career?.H) },
    { label: "HR",  year: statVal(year?.HR),  career: statVal(career?.HR) },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function hasData(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  return Object.values(row).some((v) => v != null && v !== 0);
}
