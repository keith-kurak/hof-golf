import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GameStatusBar } from "@/components/game-status-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { YearPicker } from "@/components/year-picker";
import { Button } from "@/components/ui/button";
import { GroupedRow } from "@/components/ui/section";
import { Fonts, Radius, Spacing } from "@/constants/theme";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useRoundTimer } from "@/hooks/use-round-timer";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import twoWayPlayers from "@/metadata/two-way-players.json";
import { endGame, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";
import { divisionName } from "@/util/divisions";
import { formatAvg, formatEra, formatIP, statVal } from "@/util/stats";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TWO_WAY_SET = new Set(twoWayPlayers);
/** Width of the position column in roster rows */
const POS_WIDTH = 30;
const NO_BATTERS: RawBatter[] = [];
const NO_PITCHERS: Pitcher[] = [];

type LoadedRoster = {
  key: string;
  teamInfo: TeamInfo | null;
  batters: RawBatter[];
  pitchers: Pitcher[];
};
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
  name: string;
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

const TEAM_INFO_QUERY = `SELECT t.name, t.W, t.L, CAST(t.R AS INTEGER) as R, CAST(t.RA AS INTEGER) as RA,
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
    teamID: teamIDParam,
    teamName,
    year: yearParam,
    game,
  } = useLocalSearchParams<{
    teamID: string;
    teamName?: string;
    year?: string;
    game?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const headerInset = useHeaderInset();
  const [browseYear, setYear] = useState(yearParam ? Number(yearParam) : 2025);
  const [roster, setRoster] = useState<LoadedRoster | null>(null);

  const insets = useSafeAreaInsets();

  // Game state. Only the game screen (opened with `game=1`) follows the
  // active game. A roster opened from Browse or History stays read-only.
  const storeActive = useSelector(() => game$.active.get());
  const active = game === "1" ? storeActive : null;
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
    active.rounds &&
    active.rounds.length > mode.rounds
  );

  // The game screen always shows the current round's roster. Picking a new
  // team on the player screen updates the store and goes back to this screen.
  const gameRound =
    active && !active.finished ? active.rounds?.at(-1) : undefined;
  const teamID = gameRound?.teamID ?? teamIDParam;
  const year = gameRound?.yearID ?? browseYear;

  // The roster for another team (the previous round, or the previous year)
  // is never shown: it stays empty until this team's roster has loaded.
  const rosterKey = `${year}-${teamID}`;
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      db.getFirstAsync<TeamInfo>(TEAM_INFO_QUERY, [year, teamID]),
      db.getAllAsync<RawBatter>(BATTERS_QUERY, [year, teamID]),
      db.getAllAsync<Pitcher>(PITCHERS_QUERY, [year, teamID]),
    ]).then(([teamInfo, batters, pitchers]) => {
      if (!cancelled) {
        setRoster({ key: `${year}-${teamID}`, teamInfo, batters, pitchers });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db, teamID, year]);
  const currentRoster = roster?.key === rosterKey ? roster : null;
  const teamInfo = currentRoster?.teamInfo ?? null;
  const rawBatters = currentRoster?.batters ?? NO_BATTERS;
  const rawPitchers = currentRoster?.pitchers ?? NO_PITCHERS;

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
      params: {
        playerID,
        playerName: name,
        year: String(year),
        ...(isActiveGame ? { game: "1" } : {}),
      },
    });
  };

  const handleContinue = () => {
    endGame();
    router.replace("/game/complete");
  };

  // Build target sets for highlighting
  const isActiveGame = active && active.rounds && !active.finished;
  const currentRound = isActiveGame ? (active.rounds?.at(-1) ?? null) : null;
  const targetIDs = useMemo(() => {
    if (!currentRound?.targetsFound) return new Set<string>();
    return new Set(currentRound.targetsFound.map((t) => t.playerID));
  }, [currentRound?.targetsFound]);
  // The store pushes rounds onto the same array, so the memo also keys on
  // the round count.
  const roundCount = active?.rounds?.length ?? 0;
  const seenBeforeIDs = useMemo(() => {
    const seen = new Set<string>();
    if (!isActiveGame) return seen;
    // Targets collected in earlier rounds. A timed-out round collects nothing.
    for (const round of active.rounds.slice(0, roundCount - 1)) {
      if (round.timedOut) continue;
      for (const t of round.targetsFound) seen.add(t.playerID);
    }
    return seen;
  }, [isActiveGame, active?.rounds, roundCount]);

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
    <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
      <Stack.Screen
        options={{
          title: isActiveGame
            ? `${year} ${currentRound?.teamName ?? teamName ?? teamID}`
            : (teamInfo?.name ?? teamName ?? teamID),
        }}
      />
      {isActiveGame && (
        <GameStatusBar hint={gameHint} trailing={timerTrailing} />
      )}
      <SectionList
        key={`${teamID}-${year}`}
        // Set once this team's roster has loaded (tests wait for it)
        testID={currentRoster ? `roster-${rosterKey}` : undefined}
        sections={sections}
        keyExtractor={(item) => item.playerID}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={
          isActiveGame ? undefined : (
            <>
              <YearPicker year={year} onYearChange={setYear} />
              {teamInfo && (
                <View style={styles.teamInfo}>
                  <ThemedText style={styles.teamRecord}>
                    {teamInfo.W}-{teamInfo.L}
                  </ThemedText>
                  {formatStanding(teamInfo) !== "" && (
                    <ThemedText type="small">
                      {formatStanding(teamInfo)}
                    </ThemedText>
                  )}
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
          <View style={[styles.headerRow, { backgroundColor: theme.background }]}>
            <Text
              style={[styles.headerTitle, { color: theme.textSecondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {section.title}
            </Text>
            {(isBatterSection(section.title)
              ? BATTER_STAT_HEADERS
              : PITCHER_STAT_HEADERS
            ).map((h) => (
              <Text
                key={h}
                style={[
                  styles.statCol,
                  styles.headerStat,
                  { color: theme.textSecondary },
                ]}
              >
                {h}
              </Text>
            ))}
          </View>
        )}
        renderItem={({ item, section, index }) => {
          const name = `${item.nameFirst} ${item.nameLast}`;
          const newTarget = isNewTarget(item.playerID);
          const seenTarget = isSeenTarget(item.playerID);
          const pts = targetPoints.get(item.playerID);
          const isBatter = isBatterSection(section.title);
          const b = item as Batter;
          const p = item as Pitcher;
          const stats = isBatter
            ? [
                String(b.G),
                statVal(b.HR),
                statVal(b.RBI),
                formatAvg(b.H, b.AB),
                statVal(b.SB),
              ]
            : [
                String(p.G),
                formatEra(p.ER, p.IPouts),
                formatIP(p.IPouts),
                statVal(p.SO),
                statVal(p.SV),
              ];
          const accent = newTarget
            ? theme.success
            : seenTarget
              ? theme.warning
              : undefined;
          return (
            <GroupedRow
              testID={`player-${item.playerID}`}
              index={index}
              count={section.data.length}
              onPress={() => navigateToPlayer(item.playerID, name)}
              style={[
                styles.playerRow,
                newTarget && { backgroundColor: theme.successMuted },
                seenTarget && { backgroundColor: theme.warningMuted },
              ]}
              separatorInset={Spacing.three + POS_WIDTH}
            >
              <Text
                style={[styles.posCol, { color: theme.textSecondary }]}
                allowFontScaling={false}
              >
                {isBatter ? b.position : "P"}
              </Text>
              <View style={styles.nameCol}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[
                    styles.nameText,
                    { color: accent ?? theme.text },
                    accent && styles.targetName,
                  ]}
                >
                  {name}
                </Text>
                {pts != null && (
                  <View
                    style={[
                      styles.pointsBadge,
                      { backgroundColor: accent ?? theme.success },
                    ]}
                  >
                    <Text style={styles.pointsBadgeText}>
                      +{seenTarget ? 0 : pts}
                    </Text>
                  </View>
                )}
              </View>
              {stats.map((value, i) => (
                <Text
                  key={i}
                  allowFontScaling={false}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.statCol, styles.statText, { color: theme.textSecondary }]}
                >
                  {value}
                </Text>
              ))}
            </GroupedRow>
          );
        }}
      />
      {isFinalRound ? (
        <View
          style={[
            styles.continueSection,
            { paddingBottom: insets.bottom + Spacing.two },
          ]}
        >
          <Button
            testID="game-complete-continue"
            title="Continue"
            onPress={handleContinue}
          />
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
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  teamRecord: {
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  headerStat: {
    fontSize: 12,
    fontWeight: "600",
  },
  playerRow: {
    minHeight: 44,
    paddingVertical: 10,
    gap: 0,
  },
  posCol: {
    width: POS_WIDTH,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Fonts?.mono,
  },
  nameCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: Spacing.one,
  },
  nameText: {
    flexShrink: 1,
    fontSize: 15,
  },
  targetName: {
    fontWeight: "700",
  },
  pointsBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pointsBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  // paddingLeft keeps a gap between right-aligned numbers
  statCol: {
    width: 40,
    paddingLeft: 4,
    textAlign: "right",
  },
  statText: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  continueSection: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
