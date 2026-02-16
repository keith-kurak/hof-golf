import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import { GameStatusBar } from "@/components/game-status-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { YearPicker } from "@/components/year-picker";
import { Spacing } from "@/constants/theme";
import { useRoundTimer } from "@/hooks/use-round-timer";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import twoWayPlayers from "@/metadata/two-way-players.json";
import { endGame, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";
import { divisionName } from "@/util/divisions";
import { formatAvg, formatEra, formatIP, statVal } from "@/util/stats";

const TWO_WAY_SET = new Set(twoWayPlayers);
const activeModes = gameModes as GameMode[];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RawBatter = {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  G: number;
  HR: number | null;
  RBI: number | null;
  SB: number | null;
  H: number | null;
  AB: number | null;
  G_c: number;
  G_1b: number;
  G_2b: number;
  G_3b: number;
  G_ss: number;
  G_lf: number;
  G_cf: number;
  G_rf: number;
  G_dh: number;
};

type Batter = RawBatter & { position: string };

type Pitcher = {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  G: number;
  GS: number | null;
  ER: number | null;
  IPouts: number | null;
  SO: number | null;
  SV: number | null;
};

type RosterPlayer = Batter | Pitcher;
type Section = { title: string; data: RosterPlayer[] };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const BATTERS_QUERY = `SELECT
  bat.playerID, p.nameFirst, p.nameLast, bat.G,
  COALESCE(a.G_c, 0) as G_c, COALESCE(a.G_1b, 0) as G_1b,
  COALESCE(a.G_2b, 0) as G_2b, COALESCE(a.G_3b, 0) as G_3b,
  COALESCE(a.G_ss, 0) as G_ss, COALESCE(a.G_lf, 0) as G_lf,
  COALESCE(a.G_cf, 0) as G_cf, COALESCE(a.G_rf, 0) as G_rf,
  COALESCE(a.G_dh, 0) as G_dh,
  bat.HR, bat.RBI, bat.SB, bat.H, bat.AB
FROM (
  SELECT playerID, teamID, yearID,
    SUM(G) as G, SUM(HR) as HR, SUM(RBI) as RBI,
    SUM(SB) as SB, SUM(H) as H, SUM(AB) as AB
  FROM Batting GROUP BY playerID, teamID, yearID
) bat
JOIN People p ON bat.playerID = p.playerID
LEFT JOIN Appearances a ON a.playerID = bat.playerID
  AND a.yearID = bat.yearID AND a.teamID = bat.teamID
WHERE bat.yearID = ? AND bat.teamID = ?
ORDER BY bat.G DESC`;

const PITCHERS_QUERY = `SELECT
  pit.playerID, p.nameFirst, p.nameLast, pit.G,
  pit.GS, pit.ER, pit.IPouts, pit.SO, pit.SV
FROM (
  SELECT playerID, teamID, yearID,
    SUM(G) as G, SUM(GS) as GS, SUM(ER) as ER,
    SUM(IPouts) as IPouts, SUM(SO) as SO, SUM(SV) as SV
  FROM Pitching GROUP BY playerID, teamID, yearID
) pit
JOIN People p ON pit.playerID = p.playerID
WHERE pit.yearID = ? AND pit.teamID = ?
ORDER BY pit.G DESC`;

type TeamInfo = {
  W: number;
  L: number;
  R: number;
  RA: number;
  Rank: number | null;
  DivWin: string | null;
  WCWin: string | null;
  lgID: string | null;
  divID: string | null;
  manager: string;
};

const TEAM_INFO_QUERY = `SELECT t.W, t.L, CAST(t.R AS INTEGER) as R, CAST(t.RA AS INTEGER) as RA,
  t.Rank, t.DivWin, t.WCWin, t.lgID, t.divID,
  GROUP_CONCAT(p.nameFirst || ' ' || p.nameLast, ' / ') as manager
FROM Teams t
LEFT JOIN Managers m ON t.yearID = m.yearID AND t.teamID = m.teamID
LEFT JOIN People p ON m.playerID = p.playerID
WHERE t.yearID = ? AND t.teamID = ?
GROUP BY t.yearID, t.teamID`;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatStanding(info: TeamInfo): string {
  const div = divisionName(info.lgID, info.divID);
  const parts: string[] = [];
  if (info.Rank != null && div) {
    parts.push(`${ordinal(info.Rank)} place in ${div}`);
  }
  if (info.WCWin === "Y") {
    parts.push("(Wild Card)");
  }
  return parts.join(" ");
}

function pythagWL(r: number, ra: number): string {
  if (r === 0 && ra === 0) return "—";
  const exp = 1.83;
  const wpct = r ** exp / (r ** exp + ra ** exp);
  const g = 162;
  const w = Math.round(wpct * g);
  return `${w}-${g - w}`;
}

// ---------------------------------------------------------------------------
// Position grouping logic
// ---------------------------------------------------------------------------

const STARTING_POSITIONS = [
  "C",
  "1B",
  "2B",
  "SS",
  "3B",
  "LF",
  "CF",
  "RF",
  "DH",
] as const;

const POS_KEY: Record<string, keyof RawBatter> = {
  C: "G_c",
  "1B": "G_1b",
  "2B": "G_2b",
  "3B": "G_3b",
  SS: "G_ss",
  LF: "G_lf",
  CF: "G_cf",
  RF: "G_rf",
  DH: "G_dh",
};

const IF_POSITIONS = new Set(["G_c", "G_1b", "G_2b", "G_3b", "G_ss"]);
const OF_POSITIONS = new Set(["G_lf", "G_cf", "G_rf"]);

function classifyBenchPosition(b: RawBatter): string {
  const fieldingKeys = Object.keys(POS_KEY) as (keyof typeof POS_KEY)[];
  const entries = fieldingKeys
    .map((pos) => ({ pos, g: b[POS_KEY[pos]] as number }))
    .filter((e) => e.g > 0);

  const totalFielding = entries.reduce((s, e) => s + e.g, 0);
  if (totalFielding === 0) return "";

  // Single position if 75%+ of time there
  const top = entries.reduce((a, e) => (e.g > a.g ? e : a), entries[0]);
  if (top.g / totalFielding >= 0.75) return top.pos;

  // Check if positions span IF and/or OF
  const hasIF = entries.some((e) => IF_POSITIONS.has(POS_KEY[e.pos]));
  const hasOF = entries.some((e) => OF_POSITIONS.has(POS_KEY[e.pos]));
  const hasDH = entries.some((e) => e.pos === "DH");

  // Only count non-DH positions for the IF/OF classification
  const nonDH = entries.filter((e) => e.pos !== "DH");
  if (nonDH.length === 0 && hasDH) return "DH";

  const allIF = nonDH.every((e) => IF_POSITIONS.has(POS_KEY[e.pos]));
  const allOF = nonDH.every((e) => OF_POSITIONS.has(POS_KEY[e.pos]));

  if (allIF) return "IF";
  if (allOF) return "OF";
  if (hasIF && hasOF) return "UT";

  return "";
}

function groupBatters(raw: RawBatter[]): {
  starters: Batter[];
  bench: Batter[];
} {
  const assigned = new Set<string>();
  const starters: Batter[] = [];

  for (const pos of STARTING_POSITIONS) {
    const key = POS_KEY[pos];
    // Find player with most games at this position, not already assigned
    let best: RawBatter | null = null;
    let bestG = 0;
    for (const p of raw) {
      if (assigned.has(p.playerID)) continue;
      const g = p[key] as number;
      if (g > bestG) {
        best = p;
        bestG = g;
      }
    }
    if (best && bestG > 0) {
      assigned.add(best.playerID);
      starters.push({ ...best, position: pos });
    }
  }

  const bench: Batter[] = raw
    .filter((p) => !assigned.has(p.playerID))
    .map((p) => ({ ...p, position: classifyBenchPosition(p) }));

  return { starters, bench };
}

function groupPitchers(raw: Pitcher[]): { sp: Pitcher[]; rp: Pitcher[] } {
  const sp = raw.filter((p) => (p.GS ?? 0) >= 10);
  const rp = raw.filter((p) => (p.GS ?? 0) < 10);
  return { sp, rp };
}

// ---------------------------------------------------------------------------
// Header configs
// ---------------------------------------------------------------------------

const BATTER_STAT_HEADERS = ["G", "HR", "RBI", "AVG", "SB"] as const;
const PITCHER_STAT_HEADERS = ["G", "ERA", "IP", "K", "SV"] as const;

function isBatterSection(title: string) {
  return title === "Lineup" || title === "Bench";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamRosterScreen() {
  const {
    teamID,
    teamName,
    year: yearParam,
  } = useLocalSearchParams<{
    teamID: string;
    teamName?: string;
    year?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [year, setYear] = useState(yearParam ? Number(yearParam) : 2025);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [rawBatters, setRawBatters] = useState<RawBatter[]>([]);
  const [rawPitchers, setRawPitchers] = useState<Pitcher[]>([]);

  // Game state
  const active = useSelector(() => game$.active.get());
  const theme = useTheme();
  const { timeLeft, isTimed } = useRoundTimer();
  const mode =
    active && !active.finished
      ? activeModes.find((m) => m.id === active.modeId)
      : null;
  const isFinalRound = !!(
    active &&
    !active.finished &&
    mode &&
    active.rounds.length > mode.rounds
  );

  useEffect(() => {
    db.getFirstAsync<TeamInfo>(TEAM_INFO_QUERY, [year, teamID]).then(
      setTeamInfo,
    );
    db.getAllAsync<RawBatter>(BATTERS_QUERY, [year, teamID]).then(
      setRawBatters,
    );
    db.getAllAsync<Pitcher>(PITCHERS_QUERY, [year, teamID]).then(
      setRawPitchers,
    );
  }, [db, teamID, year]);

  const sections: Section[] = useMemo(() => {
    // Pitchers always go in the pitchers group; exclude them from batters
    // unless they're on the two-way players list
    const pitcherIDs = new Set(rawPitchers.map((p) => p.playerID));
    const filteredBatters = rawBatters.filter(
      (b) => !pitcherIDs.has(b.playerID) || TWO_WAY_SET.has(b.playerID),
    );
    const { starters, bench } = groupBatters(filteredBatters);
    const { sp, rp } = groupPitchers(rawPitchers);
    const result: Section[] = [];
    if (starters.length > 0) result.push({ title: "Lineup", data: starters });
    if (bench.length > 0) result.push({ title: "Bench", data: bench });
    if (sp.length > 0) result.push({ title: "Starting Pitchers", data: sp });
    if (rp.length > 0) result.push({ title: "Relief Pitchers", data: rp });
    return result;
  }, [rawBatters, rawPitchers]);

  const navigateToPlayer = (playerID: string, name: string) => {
    if (isFinalRound) return;
    router.push({
      pathname: "/player/[playerID]",
      params: { playerID, playerName: name, year: String(year) },
    });
  };

  const handleContinue = () => {
    endGame();
    router.push("/game/complete");
  };

  // Build target sets for highlighting
  const isActiveGame = active && !active.finished;
  const currentRound = isActiveGame
    ? active.rounds[active.rounds.length - 1]
    : null;
  const targetIDs = useMemo(() => {
    if (!currentRound?.targetsFound) return new Set<string>();
    return new Set(currentRound.targetsFound.map((t) => t.playerID));
  }, [currentRound?.targetsFound]);
  const seenBeforeIDs = useMemo(() => {
    if (!isActiveGame) return new Set<string>();
    // seenTargets minus targets found this round = previously collected
    const thisRoundIDs = new Set(
      (currentRound?.targetsFound ?? []).map((t) => t.playerID),
    );
    return new Set(active.seenTargets.filter((id) => !thisRoundIDs.has(id)));
  }, [isActiveGame, active?.seenTargets, currentRound?.targetsFound]);

  const isNewTarget = (playerID: string) =>
    targetIDs.has(playerID) && !seenBeforeIDs.has(playerID);
  const isSeenTarget = (playerID: string) =>
    targetIDs.has(playerID) && seenBeforeIDs.has(playerID);

  // Points lookup for badges
  const targetPoints = useMemo(() => {
    if (!currentRound?.targetsFound) return new Map<string, number>();
    return new Map(
      currentRound.targetsFound.map((t) => [t.playerID, t.points]),
    );
  }, [currentRound?.targetsFound]);

  // Build game status bar hint with player names
  const gameHint = useMemo(() => {
    if (!isActiveGame) return "";

    const allTargets = currentRound?.targetsFound ?? [];

    if (isFinalRound) {
      const pts = currentRound?.pointsEarned ?? 0;
      if (allTargets.length > 0) {
        const names = allTargets.map((t) =>
          seenBeforeIDs.has(t.playerID)
            ? `${t.name} (+0)`
            : `${t.name} +${t.points}`,
        );
        return (
          <>
            <Text style={hintStyles.action}>
              +{pts} pts.{" "}
              <Text style={hintStyles.names}>({names.join(", ")})</Text>
            </Text>
            <Text style={hintStyles.action}>Game complete!</Text>
          </>
        );
      }
      return <Text style={hintStyles.action}>Game complete!</Text>;
    }

    if (timeLeft === 0 && isTimed)
      return "Time's up! Pick a player to continue.";

    if (allTargets.length > 0) {
      const names = allTargets.map((t) =>
        seenBeforeIDs.has(t.playerID)
          ? `${t.name} (+0)`
          : `${t.name} +${t.points}`,
      );
      return (
        <>
          <Text style={hintStyles.action}>
            +{currentRound?.pointsEarned ?? 0} pts.{" "}
            <Text style={hintStyles.names}>({names.join(", ")})</Text>
          </Text>
          <Text style={hintStyles.action}>Pick your next player</Text>
        </>
      );
    }
    return "No targets on this roster. Pick a player.";
  }, [
    isActiveGame,
    isFinalRound,
    isTimed,
    timeLeft,
    currentRound,
    seenBeforeIDs,
  ]);

  const timerTrailing =
    isTimed && isActiveGame && !isFinalRound ? (
      <Text style={[styles.timerBadge, timeLeft <= 10 && styles.timerBadgeRed]}>
        {timeLeft === 0 ? "0:00" : `0:${String(timeLeft).padStart(2, "0")}`}
      </Text>
    ) : null;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: isActiveGame
            ? `${year} ${currentRound?.teamName ?? teamName ?? teamID}`
            : (teamName ?? teamID),
        }}
      />
      <GameStatusBar hint={gameHint} trailing={timerTrailing} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.playerID}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={
          isActiveGame ? null : (
            <>
              <YearPicker year={year} onYearChange={setYear} />
              {teamInfo && (
                <View style={styles.teamInfo}>
                  <ThemedText type="default">
                    {teamInfo.W}-{teamInfo.L}
                    {"  "}
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatStanding(teamInfo)}
                    </ThemedText>
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Pythagorean W-L: {pythagWL(teamInfo.R, teamInfo.RA)},{" "}
                    {teamInfo.R} RS / {teamInfo.RA} RA
                  </ThemedText>
                  {teamInfo.manager && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Manager: {teamInfo.manager}
                    </ThemedText>
                  )}
                </View>
              )}
            </>
          )
        }
        renderSectionHeader={({ section }) => (
          <ThemedView style={styles.headerRow}>
            <ThemedText type="smallBold" style={styles.posCol} />
            <ThemedText type="smallBold" style={styles.nameCol}>
              {section.title}
            </ThemedText>
            {(isBatterSection(section.title)
              ? BATTER_STAT_HEADERS
              : PITCHER_STAT_HEADERS
            ).map((h) => (
              <ThemedText key={h} type="smallBold" style={styles.statCol}>
                {h}
              </ThemedText>
            ))}
          </ThemedView>
        )}
        renderItem={({ item, section }) => {
          const name = `${item.nameFirst} ${item.nameLast}`;
          const newTarget = isNewTarget(item.playerID);
          const seenTarget = isSeenTarget(item.playerID);
          const pts = targetPoints.get(item.playerID);
          if (isBatterSection(section.title)) {
            const b = item as Batter;
            return (
              <Pressable onPress={() => navigateToPlayer(b.playerID, name)}>
                <ThemedView
                  type="backgroundElement"
                  style={[
                    styles.playerRow,
                    newTarget && styles.targetRow,
                    seenTarget && styles.seenTargetRow,
                  ]}
                >
                  {pts != null && (
                    <View
                      style={[
                        styles.pointsBadge,
                        seenTarget && styles.pointsBadgeSeen,
                      ]}
                    >
                      <Text style={styles.pointsBadgeText}>
                        +{seenTarget ? 0 : pts}
                      </Text>
                    </View>
                  )}
                  <ThemedText
                    type="code"
                    themeColor="textSecondary"
                    style={styles.posCol}
                  >
                    {b.position}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.nameCol,
                      newTarget && styles.targetName,
                      seenTarget && styles.seenTargetName,
                    ]}
                  >
                    {name}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {b.G}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {statVal(b.HR)}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {statVal(b.RBI)}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {formatAvg(b.H, b.AB)}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {statVal(b.SB)}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          }
          const p = item as Pitcher;
          return (
            <Pressable onPress={() => navigateToPlayer(p.playerID, name)}>
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.playerRow,
                  newTarget && styles.targetRow,
                  seenTarget && styles.seenTargetRow,
                ]}
              >
                {pts != null && (
                  <View
                    style={[
                      styles.pointsBadge,
                      seenTarget && styles.pointsBadgeSeen,
                    ]}
                  >
                    <Text style={styles.pointsBadgeText}>
                      +{seenTarget ? 0 : pts}
                    </Text>
                  </View>
                )}
                <ThemedText
                  type="code"
                  themeColor="textSecondary"
                  style={styles.posCol}
                >
                  P
                </ThemedText>
                <ThemedText
                  style={[
                    styles.nameCol,
                    newTarget && styles.targetName,
                    seenTarget && styles.seenTargetName,
                  ]}
                >
                  {name}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {p.G}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {formatEra(p.ER, p.IPouts)}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {formatIP(p.IPouts)}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {statVal(p.SO)}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {statVal(p.SV)}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        }}
      />
      {isFinalRound ? (
        <View style={styles.continueSection}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="mediumBold" style={{ color: theme.background }}>
              Continue
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </ThemedView>
  );
}

const hintStyles = StyleSheet.create({
  action: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  names: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 12,
    fontWeight: "500",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  timerBadge: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  timerBadgeRed: {
    backgroundColor: "#E53935",
  },
  teamInfo: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.one,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginVertical: Spacing.half,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  targetRow: {
    borderLeftColor: "#22C55E",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  targetName: {
    color: "#22C55E",
    fontWeight: "700",
  },
  seenTargetRow: {
    borderLeftColor: "#EAB308",
    backgroundColor: "rgba(234, 179, 8, 0.08)",
  },
  seenTargetName: {
    color: "#EAB308",
    fontWeight: "700",
  },
  pointsBadge: {
    position: "absolute",
    top: 2,
    right: 4,
    backgroundColor: "#22C55E",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    zIndex: 1,
  },
  pointsBadgeSeen: {
    backgroundColor: "#EAB308",
  },
  pointsBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  posCol: {
    width: 36,
  },
  nameCol: {
    flex: 1,
  },
  statCol: {
    width: 40,
    textAlign: "center",
  },
  continueSection: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    alignItems: "center",
    marginHorizontal: Spacing.three,
  },
  continueButton: {
    width: "100%",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
