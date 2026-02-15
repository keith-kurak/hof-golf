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

/** Per-season batting stats grouped by year+team. Returns all stat columns. */
export const SEASON_BATTING_QUERY = `
  SELECT yearID, teamID, ${sumSelect(BATTING_COLUMNS)}
  FROM Batting WHERE playerID = ?
  GROUP BY yearID, teamID ORDER BY yearID`;

/** Per-season pitching stats grouped by year+team. Returns all stat columns. */
export const SEASON_PITCHING_QUERY = `
  SELECT yearID, teamID, ${sumSelect(PITCHING_COLUMNS)}
  FROM Pitching WHERE playerID = ?
  GROUP BY yearID, teamID ORDER BY yearID`;

export type SeasonBatting = BattingStats & { yearID: number; teamID: string };
export type SeasonPitching = PitchingStats & { yearID: number; teamID: string };

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
// Stat column definitions — declarative formatters that can be selected from.
// Each column knows its header label and how to format a value from the full
// stats row. Use `pickColumns` to extract formatted cells from a stats object.
// ---------------------------------------------------------------------------

export type StatColumn<T> = {
  label: string;
  format: (s: T) => string;
};

/** All available batting columns. */
export const BATTING_STAT_COLUMNS: StatColumn<BattingStats>[] = [
  { label: "G",   format: (s) => statVal(s.G) },
  { label: "AB",  format: (s) => statVal(s.AB) },
  { label: "R",   format: (s) => statVal(s.R) },
  { label: "H",   format: (s) => statVal(s.H) },
  { label: "2B",  format: (s) => statVal(s["2B"]) },
  { label: "3B",  format: (s) => statVal(s["3B"]) },
  { label: "HR",  format: (s) => statVal(s.HR) },
  { label: "RBI", format: (s) => statVal(s.RBI) },
  { label: "BB",  format: (s) => statVal(s.BB) },
  { label: "SO",  format: (s) => statVal(s.SO) },
  { label: "SB",  format: (s) => statVal(s.SB) },
  { label: "AVG", format: (s) => formatAvg(s.H, s.AB) },
  { label: "OBP", format: (s) => formatObp(s) },
  { label: "SLG", format: (s) => formatSlg(s) },
  { label: "OPS", format: (s) => formatOps(s) },
];

/** All available pitching columns. */
export const PITCHING_STAT_COLUMNS: StatColumn<PitchingStats>[] = [
  { label: "W",   format: (s) => statVal(s.W) },
  { label: "L",   format: (s) => statVal(s.L) },
  { label: "ERA", format: (s) => formatEra(s.ER, s.IPouts) },
  { label: "G",   format: (s) => statVal(s.G) },
  { label: "GS",  format: (s) => statVal(s.GS) },
  { label: "SV",  format: (s) => statVal(s.SV) },
  { label: "IP",  format: (s) => formatIP(s.IPouts) },
  { label: "SO",  format: (s) => statVal(s.SO) },
  { label: "BB",  format: (s) => statVal(s.BB) },
  { label: "H",   format: (s) => statVal(s.H) },
  { label: "HR",  format: (s) => statVal(s.HR) },
];

/** Pick a subset of columns by label. */
export function pickColumns<T>(
  all: StatColumn<T>[],
  labels: string[],
): StatColumn<T>[] {
  return labels.map((l) => all.find((c) => c.label === l)!);
}

/** Format a stats row through a set of columns into string cells. */
export function formatCells<T>(columns: StatColumn<T>[], stats: T): string[] {
  return columns.map((c) => c.format(stats));
}

/** Extract just the header labels from a set of columns. */
export function columnHeaders<T>(columns: StatColumn<T>[]): string[] {
  return columns.map((c) => c.label);
}

// ---------------------------------------------------------------------------
// Formatted stat rows — { label, year, career } for comparing two data sets.
// Used by the PlayerSeasonCard component.
// ---------------------------------------------------------------------------

export type StatRow = { label: string; year: string; career: string };

export function formatBattingRows(
  year: BattingStats | null | undefined,
  career: BattingStats | null | undefined,
): StatRow[] {
  return BATTING_STAT_COLUMNS.map((col) => ({
    label: col.label,
    year: year ? col.format(year) : "—",
    career: career ? col.format(career) : "—",
  }));
}

export function formatPitchingRows(
  year: PitchingStats | null | undefined,
  career: PitchingStats | null | undefined,
): StatRow[] {
  return PITCHING_STAT_COLUMNS.map((col) => ({
    label: col.label,
    year: year ? col.format(year) : "—",
    career: career ? col.format(career) : "—",
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function hasData(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  return Object.values(row).some((v) => v != null && v !== 0);
}
