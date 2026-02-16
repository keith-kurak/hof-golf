import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { GameStatusBar } from "@/components/game-status-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
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
  yearID: number | null;
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
  seasons: (T & { yearID: number; teamID: string })[],
  career: T | null,
  columns: StatColumn<T>[],
): RowData[] {
  const rows: RowData[] = seasons.map((s) => ({
    key: `${s.yearID}-${s.teamID}`,
    year: String(s.yearID),
    teamID: s.teamID,
    yearID: s.yearID,
    cells: formatCells(columns, s),
    isCareer: false,
  }));
  if (career && hasData(career as Record<string, unknown>)) {
    rows.push({
      key: "career",
      year: "TOT",
      teamID: "",
      yearID: null,
      cells: formatCells(columns, career),
      isCareer: true,
    });
  }
  return rows;
}

export default function PlayerDetailScreen() {
  const { playerID, playerName } = useLocalSearchParams<{
    playerID: string;
    playerName?: string;
    year?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [bio, setBio] = useState<Bio | null>(null);
  const [hofStatus, setHofStatus] = useState<HofStatus | null>(null);
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

  const active = useSelector(() => game$.active.get());
  const isActiveGame = active && !active.finished;
  const currentTeamID =
    active && !active.finished
      ? active.rounds[active.rounds.length - 1]?.teamID
      : null;

  const isRowDisabled = (row: RowData) =>
    active && !active.finished && row.teamID === currentTeamID;

  const navigateToTeam = async (row: RowData) => {
    if (row.isCareer || row.yearID == null) return;
    if (isRowDisabled(row)) return;

    if (active && !active.finished) {
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
            Year
          </ThemedText>
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.labelCol}
          >
            Team
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
                onPress={() => navigateToTeam(row)}
                disabled={isRowDisabled(row)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView
                  type="backgroundElement"
                  style={[
                    styles.yearTeamButton,
                    isRowDisabled(row) && styles.disabledRow,
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={[
                      styles.labelCol,
                      { marginLeft: Spacing.one },
                      isRowDisabled(row) && styles.disabledText,
                    ]}
                  >
                    {row.year}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={[
                      styles.labelCol,
                      isRowDisabled(row) && styles.disabledText,
                    ]}
                  >
                    {row.teamID}
                  </ThemedText>
                </ThemedView>
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
                <ThemedText key={i} type="small" style={statStyle}>
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
          <ThemedText type="smallBold">{title}</ThemedText>
          <Pressable onPress={onToggle} hitSlop={8}>
            <MaterialCommunityIcons
              name={
                expanded
                  ? "arrow-collapse-horizontal"
                  : "arrow-expand-horizontal"
              }
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        </View>
        <View style={styles.tableContainer}>
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
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: displayName }} />
      <GameStatusBar hint="Pick your next team." />
      <ScrollView contentContainerStyle={styles.content}>
        {bio && !isActiveGame ? (
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
      </ScrollView>
    </ThemedView>
  );
}

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
  },
  tableContainer: {
    flexDirection: "row",
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
    borderRadius: Spacing.two,
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
    opacity: 0.35,
  },
  disabledText: {
    textDecorationLine: "line-through",
  },
});
