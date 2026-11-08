import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GameStatusBar } from "@/components/game-status-bar";
import { PlayerAwards } from "@/components/player-awards";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useHeaderInset } from "@/hooks/use-header-inset";
import { useRoundTimer } from "@/hooks/use-round-timer";
import { useTheme } from "@/hooks/use-theme";
import {
  currentMode,
  game$,
  pickPlayer,
  roundTimedOut$,
  navigateToTeam as storeNavigateToTeam,
} from "@/store/game-store";
import { getTargetsOnRoster } from "@/store/roster-targets";
import { getLookupForMode } from "@/store/target-lookups";
import {
  type BattingStats,
  type PitchingStats,
  type SeasonBatting,
  type SeasonPitching,
  type StatColumn,
  BATTING_STAT_COLUMNS,
  PITCHING_STAT_COLUMNS,
  SEASON_BATTING_QUERY,
  SEASON_PITCHING_QUERY,
  battingQuery,
  columnHeaders,
  formatCells,
  hasData,
  pickColumns,
  pitchingQuery,
} from "@/util/stats";
import { type PlayerAward, fetchPlayerAwards } from "@/util/awards";

type Bio = {
  nameFirst: string;
  nameLast: string;
  bats: string | null;
  throws: string | null;
  debut: string | null;
  finalGame: string | null;
};

type HofStatus = { yearid: number; category: string };

type RowData = {
  key: string;
  year: string;
  teamID: string;
  /** Display abbreviation (Baseball-Reference), e.g. NYY for NYA */
  teamAbbr: string;
  yearID: number | null;
  lgID: string | null;
  cells: string[];
  isCareer: boolean;
};

const battingColsCompact = pickColumns(BATTING_STAT_COLUMNS, [
  "G",
  "AB",
  "HR",
  "RBI",
  "SB",
  "AVG",
  "OBP",
  "SLG",
]);
const pitchingColsCompact = pickColumns(PITCHING_STAT_COLUMNS, [
  "W",
  "L",
  "ERA",
  "G",
  "IP",
  "SO",
  "SV",
]);

const STAT_COL_WIDTH = 38;
const LABEL_COL_WIDTH = 36;

function buildRows<T>(
  seasons: (T & {
    yearID: number;
    teamID: string;
    lgID: string;
    teamAbbr: string | null;
  })[],
  career: T | null,
  columns: StatColumn<T>[],
): RowData[] {
  const rows: RowData[] = seasons.map((s) => ({
    key: `${s.yearID}-${s.teamID}`,
    year: String(s.yearID),
    teamID: s.teamID,
    teamAbbr: s.teamAbbr ?? s.teamID,
    yearID: s.yearID,
    lgID: s.lgID,
    cells: formatCells(columns, s),
    isCareer: false,
  }));
  if (career && hasData(career as Record<string, unknown>)) {
    rows.push({
      key: "career",
      year: "TOT",
      teamID: "",
      teamAbbr: "",
      yearID: null,
      lgID: null,
      cells: formatCells(columns, career),
      isCareer: true,
    });
  }
  return rows;
}

export default function PlayerDetailScreen() {
  const { playerID, playerName, game } = useLocalSearchParams<{
    playerID: string;
    playerName?: string;
    year?: string;
    game?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const headerInset = useHeaderInset();
  const theme = useTheme();
  const { timeLeft, isTimed } = useRoundTimer();
  const [bio, setBio] = useState<Bio | null>(null);
  const [hofStatus, setHofStatus] = useState<HofStatus | null>(null);
  const [awards, setAwards] = useState<PlayerAward[]>([]);
  const [battingSeasons, setBattingSeasons] = useState<SeasonBatting[]>([]);
  const [battingCareer, setBattingCareer] = useState<BattingStats | null>(null);
  const [pitchingSeasons, setPitchingSeasons] = useState<SeasonPitching[]>([]);
  const [pitchingCareer, setPitchingCareer] = useState<PitchingStats | null>(
    null,
  );
  const [battingExpanded, setBattingExpanded] = useState(false);
  const [pitchingExpanded, setPitchingExpanded] = useState(false);

  useEffect(() => {
    db.getFirstAsync<Bio>(
      `SELECT nameFirst, nameLast, bats, throws, debut, finalGame FROM People WHERE playerID = ?`,
      [playerID],
    ).then(setBio);

    db.getFirstAsync<HofStatus>(
      `SELECT yearid, category FROM HallOfFame WHERE playerID = ? AND inducted = 'Y'`,
      [playerID],
    ).then(setHofStatus);

    fetchPlayerAwards(db, playerID).then(setAwards);

    Promise.all([
      db.getAllAsync<SeasonBatting>(SEASON_BATTING_QUERY, [playerID]),
      db.getFirstAsync<BattingStats>(battingQuery(), [playerID]),
    ]).then(([seasons, career]) => {
      setBattingSeasons(seasons);
      setBattingCareer(hasData(career) ? career : null);
    });

    Promise.all([
      db.getAllAsync<SeasonPitching>(SEASON_PITCHING_QUERY, [playerID]),
      db.getFirstAsync<PitchingStats>(pitchingQuery(), [playerID]),
    ]).then(([seasons, career]) => {
      setPitchingSeasons(seasons);
      setPitchingCareer(hasData(career) ? career : null);
    });
  }, [db, playerID]);

  const activeBattingCols = battingExpanded
    ? BATTING_STAT_COLUMNS
    : battingColsCompact;
  const activePitchingCols = pitchingExpanded
    ? PITCHING_STAT_COLUMNS
    : pitchingColsCompact;

  const battingRows = useMemo(
    () => buildRows(battingSeasons, battingCareer, activeBattingCols),
    [battingSeasons, battingCareer, activeBattingCols],
  );
  const pitchingRows = useMemo(
    () => buildRows(pitchingSeasons, pitchingCareer, activePitchingCols),
    [pitchingSeasons, pitchingCareer, activePitchingCols],
  );

  const displayName =
    playerName ?? (bio ? `${bio.nameFirst} ${bio.nameLast}` : playerID);

  // Only the game screen (opened with `game=1`) can advance the active game.
  // A player opened from Browse or History stays read-only.
  const storeActive = useSelector(() => game$.active.get());
  const active = game === "1" ? storeActive : null;
  // Blocks a second tap while the first pick is still loading
  const advancingRef = useRef(false);
  const gameMode = currentMode();
  const isFinalRound = !!(
    active &&
    !active.finished &&
    gameMode &&
    active.rounds &&
    active.rounds.length > gameMode.rounds
  );
  // The layout follows `inGame`, which stays true through the final pick, so
  // the screen does not swap the status bar for the bio while it goes back.
  const inGame = !!(active && active.rounds && !active.finished);
  // Browse always shows awards. A game shows them only if its mode turns them on.
  const showAwards = inGame ? !!gameMode?.showAwards : true;
  // Picks stop once the final round is reached
  const canPick = inGame && !isFinalRound;
  const currentTeamID = canPick
    ? (active?.rounds?.at(-1)?.teamID ?? null)
    : null;

  const isRowDisabled = (row: RowData) => {
    if (!inGame) return false;
    if (!canPick) return true;
    // Can't navigate to the current team
    if (row.teamID === currentTeamID) return true;
    // Enforce the mode's pick year range (allow non-MLB leagues like negro leagues)
    if (gameMode?.picks && row.yearID != null) {
      const [minYear, maxYear] = gameMode.picks.yearRange;
      const isMlb = row.lgID === "AL" || row.lgID === "NL";
      if (isMlb && (row.yearID < minYear || row.yearID > maxYear)) return true;
    }
    return false;
  };

  const navigateToTeam = async (row: RowData) => {
    if (row.isCareer || row.yearID == null) return;
    if (isRowDisabled(row)) return;

    if (inGame) {
      if (!canPick || advancingRef.current) return;
      advancingRef.current = true;

      // During an active game: wire through the game store
      pickPlayer(playerID, displayName);

      const mode = currentMode();
      if (mode) {
        const lookup = getLookupForMode(mode.scoring.type);
        const overrides = mode.bonuses?.scoringOverrides;
        const targets = await getTargetsOnRoster(
          db,
          row.teamID,
          row.yearID,
          lookup,
          overrides?.length ? overrides : undefined,
        );

        // Query team W/L and name
        const teamInfo = await db.getFirstAsync<{
          W: number;
          L: number;
          name: string;
        }>(`SELECT W, L, name FROM Teams WHERE yearID = ? AND teamID = ?`, [
          row.yearID,
          row.teamID,
        ]);

        const timedOut = roundTimedOut$.get();
        storeNavigateToTeam(
          row.teamID,
          row.yearID,
          teamInfo?.name ?? row.teamID,
          targets,
          {
            teamW: teamInfo?.W ?? 0,
            teamL: teamInfo?.L ?? 0,
            timedOut,
          },
        );
        roundTimedOut$.set(false);

        // The game team screen below follows the current round, so going
        // back shows the new roster and keeps the stack at tabs → team.
        // Go back on the next tick, after this screen has rendered the store
        // change. Going back in the same tick crashed Android's renderer on
        // the final pick ("The specified child already has a parent").
        setTimeout(() => router.back());
        return;
      }
    }

    router.push({
      pathname: "/team/[teamID]",
      params: { teamID: row.teamID, year: String(row.yearID) },
    });
  };

  const renderStatSection = (
    title: string,
    expanded: boolean,
    onToggle: () => void,
    columns: readonly StatColumn<unknown>[],
    rows: RowData[],
  ) => {
    if (rows.length === 0) return null;

    const statHeaders = columnHeaders(columns as StatColumn<unknown>[]);
    const statsWidth = columns.length * STAT_COL_WIDTH;
    const statStyle = expanded ? styles.statColFixed : styles.statCol;

    // Fixed left column: Year + Team labels for each row
    const fixedColumn = (
      <View>
        {/* Header labels */}
        <View style={styles.rowLeft}>
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.labelCol}
          >
            YR
          </ThemedText>
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.labelCol}
          >
            TM
          </ThemedText>
        </View>
        {/* Data rows */}
        {rows.map((row) =>
          row.isCareer ? (
            <View key={row.key}>
              <View style={styles.divider} />
              <View style={styles.rowLeftData}>
                <ThemedText
                  type="smallBold"
                  themeColor="textSecondary"
                  style={styles.labelCol}
                >
                  {row.year}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.labelCol}
                />
              </View>
            </View>
          ) : (
            <View key={row.key} style={styles.rowLeft}>
              <Pressable
                testID={`${title.toLowerCase()}-season-${row.yearID}-${row.teamID}`}
                onPress={() => navigateToTeam(row)}
                disabled={isRowDisabled(row)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View
                  style={[
                    styles.yearTeamButton,
                    isRowDisabled(row)
                      ? styles.disabledRow
                      : { backgroundColor: theme.tintMuted },
                  ]}
                >
                  <Text
                    style={[
                      styles.labelCol,
                      styles.yearText,
                      { color: isRowDisabled(row) ? theme.textSecondary : theme.tint },
                      isRowDisabled(row) && styles.disabledText,
                    ]}
                  >
                    {row.year}
                  </Text>
                  <Text
                    style={[
                      styles.labelCol,
                      styles.teamText,
                      { color: isRowDisabled(row) ? theme.textSecondary : theme.tint },
                      isRowDisabled(row) && styles.disabledText,
                    ]}
                  >
                    {row.teamAbbr}
                  </Text>
                </View>
              </Pressable>
            </View>
          ),
        )}
      </View>
    );

    // Right column: stat values
    const statsColumn = (
      <View style={expanded ? { width: statsWidth } : undefined}>
        {/* Header labels */}
        <View style={styles.rowRight}>
          {statHeaders.map((h) => (
            <ThemedText
              key={h}
              type="smallBold"
              themeColor="textSecondary"
              style={statStyle}
            >
              {h}
            </ThemedText>
          ))}
        </View>
        {/* Data rows */}
        {rows.map((row) =>
          row.isCareer ? (
            <View key={row.key}>
              <View style={styles.divider} />
              <View style={styles.rowRightData}>
                {row.cells.map((cell, i) => (
                  <ThemedText
                    key={i}
                    type="smallBold"
                    themeColor="textSecondary"
                    style={statStyle}
                  >
                    {cell}
                  </ThemedText>
                ))}
              </View>
            </View>
          ) : (
            <View key={row.key} style={styles.rowRightData}>
              {row.cells.map((cell, i) => (
                <ThemedText key={i} type="small" style={[statStyle, styles.num]}>
                  {cell}
                </ThemedText>
              ))}
            </View>
          ),
        )}
      </View>
    );

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {title}
          </Text>
          <Pressable
            onPress={onToggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Fewer stats" : "More stats"}
          >
            <MaterialCommunityIcons
              name={
                expanded
                  ? "arrow-collapse-horizontal"
                  : "arrow-expand-horizontal"
              }
              size={20}
              color={theme.tint}
            />
          </Pressable>
        </View>
        <View
          style={[
            styles.tableContainer,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          {fixedColumn}
          {expanded ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.statsScroll}
            >
              {statsColumn}
            </ScrollView>
          ) : (
            <View style={styles.statsScroll}>{statsColumn}</View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
      <Stack.Screen options={{ title: displayName }} />
      {inGame && (
        <GameStatusBar
          hint={
            <>
              <Text style={hintStyles.action}>
                {`Pick your next team to collect more ${currentMode()?.scoring.targetSet}.`}
              </Text>
              <Text style={hintStyles.sub}>
                You must pick a different franchise!
              </Text>
            </>
          }
          trailing={
            isTimed ? (
              <Text
                style={[
                  hintStyles.timerBadge,
                  timeLeft <= 10 && hintStyles.timerBadgeRed,
                ]}
              >
                {timeLeft === 0
                  ? "0:00"
                  : `0:${String(timeLeft).padStart(2, "0")}`}
              </Text>
            ) : undefined
          }
        />
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {bio && !inGame ? (
          <View style={styles.bioSection}>
            {hofStatus && (
              <ThemedText type="default">
                Hall of Fame, elected in {hofStatus.yearid}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              B/T: {bio.bats ?? "—"}/{bio.throws ?? "—"}
              {"  "}Debut: {bio.debut ?? "—"}
              {"  "}Final: {bio.finalGame ?? "—"}
            </ThemedText>
          </View>
        ) : null}
        {showAwards && <PlayerAwards awards={awards} />}

        {/* Show pitching first if 20+ games pitched, or if more games pitched than batted */}
        {(pitchingCareer?.G ?? 0) >= 20 ||
        (pitchingCareer?.G ?? 0) > (battingCareer?.G ?? 0) ? (
          <>
            {renderStatSection(
              "Pitching",
              pitchingExpanded,
              () => setPitchingExpanded((v) => !v),
              activePitchingCols,
              pitchingRows,
            )}
            {renderStatSection(
              "Batting",
              battingExpanded,
              () => setBattingExpanded((v) => !v),
              activeBattingCols,
              battingRows,
            )}
          </>
        ) : (
          <>
            {renderStatSection(
              "Batting",
              battingExpanded,
              () => setBattingExpanded((v) => !v),
              activeBattingCols,
              battingRows,
            )}
            {renderStatSection(
              "Pitching",
              pitchingExpanded,
              () => setPitchingExpanded((v) => !v),
              activePitchingCols,
              pitchingRows,
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const hintStyles = StyleSheet.create({
  action: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  sub: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 12,
    fontWeight: "500",
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  bioSection: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  sectionContainer: {
    marginTop: Spacing.three,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableContainer: {
    flexDirection: "row",
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.two,
    overflow: "hidden",
  },
  num: {
    fontVariant: ["tabular-nums"],
  },
  yearText: {
    width: LABEL_COL_WIDTH + 2,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    marginLeft: 2,
    fontVariant: ["tabular-nums"],
  },
  teamText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  rowLeftData: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  rowRightData: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  statsScroll: {
    flex: 1,
  },
  yearTeamButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    marginLeft: -Spacing.two,
    borderRadius: Radius.small,
    borderCurve: "continuous",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#60646C",
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  labelCol: {
    width: LABEL_COL_WIDTH,
  },
  statCol: {
    flex: 1,
    textAlign: "center",
  },
  statColFixed: {
    width: STAT_COL_WIDTH,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  disabledRow: {
    opacity: 0.5,
  },
  disabledText: {
    textDecorationLine: "line-through",
  },
});
