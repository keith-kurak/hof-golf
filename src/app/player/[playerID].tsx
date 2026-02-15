import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
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

const battingCols = pickColumns(BATTING_STAT_COLUMNS, [
  "G",
  "AB",
  "HR",
  "RBI",
  "SB",
  "AVG",
  "OBP",
  "SLG",
]);
const pitchingCols = pickColumns(PITCHING_STAT_COLUMNS, [
  "W",
  "L",
  "ERA",
  "G",
  "IP",
  "SO",
  "SV",
]);

const BATTING_HEADERS = ["Year", "Team", ...columnHeaders(battingCols)];
const PITCHING_HEADERS = ["Year", "Team", ...columnHeaders(pitchingCols)];

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
  const [bio, setBio] = useState<Bio | null>(null);
  const [hofStatus, setHofStatus] = useState<HofStatus | null>(null);
  const [battingRows, setBattingRows] = useState<RowData[]>([]);
  const [pitchingRows, setPitchingRows] = useState<RowData[]>([]);

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
    ]).then(([seasons, career]) =>
      setBattingRows(buildRows(seasons, career, battingCols)),
    );

    Promise.all([
      db.getAllAsync<SeasonPitching>(SEASON_PITCHING_QUERY, [playerID]),
      db.getFirstAsync<PitchingStats>(pitchingQuery(), [playerID]),
    ]).then(([seasons, career]) =>
      setPitchingRows(buildRows(seasons, career, pitchingCols)),
    );
  }, [db, playerID]);

  const displayName =
    playerName ?? (bio ? `${bio.nameFirst} ${bio.nameLast}` : playerID);

  const navigateToTeam = (row: RowData) => {
    if (row.isCareer) return;
    router.push({
      pathname: "/team/[teamID]",
      params: { teamID: row.teamID, year: String(row.yearID) },
    });
  };

  const renderHeader = (headers: string[]) => (
    <View style={styles.tableRow}>
      {headers.map((h) => (
        <ThemedText
          key={h}
          type="smallBold"
          themeColor="textSecondary"
          style={
            h === "Year" || h === "Team" ? styles.labelCol : styles.statCol
          }
        >
          {h}
        </ThemedText>
      ))}
    </View>
  );

  const renderRow = (row: RowData) => {
    const content = (
      <ThemedView
        type={row.isCareer ? "backgroundElement" : undefined}
        style={[styles.tableRow, row.isCareer && styles.careerRow]}
      >
        <ThemedText
          type={row.isCareer ? "smallBold" : "small"}
          style={styles.labelCol}
        >
          {row.year}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.labelCol}
        >
          {row.teamID}
        </ThemedText>
        {row.cells.map((cell, i) => (
          <ThemedText
            key={i}
            type={row.isCareer ? "smallBold" : "small"}
            style={styles.statCol}
          >
            {cell}
          </ThemedText>
        ))}
      </ThemedView>
    );

    if (row.isCareer) return content;

    return (
      <Pressable
        onPress={() => navigateToTeam(row)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  };

  type ListItem =
    | { type: "bio" }
    | { type: "sectionHeader"; title: string; headers: string[] }
    | { type: "row"; row: RowData };

  const listData: ListItem[] = [];
  listData.push({ type: "bio" });

  if (battingRows.length > 0) {
    listData.push({
      type: "sectionHeader",
      title: "Batting",
      headers: BATTING_HEADERS,
    });
    for (const row of battingRows) {
      listData.push({ type: "row", row });
    }
  }

  if (pitchingRows.length > 0) {
    listData.push({
      type: "sectionHeader",
      title: "Pitching",
      headers: PITCHING_HEADERS,
    });
    for (const row of pitchingRows) {
      listData.push({ type: "row", row });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: displayName }} />
      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.type === "bio") return "bio";
          if (item.type === "sectionHeader") return `header-${item.title}`;
          return `${item.row.key}-${index}`;
        }}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          if (item.type === "bio") {
            return bio ? (
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
            ) : null;
          }
          if (item.type === "sectionHeader") {
            return (
              <View style={styles.sectionHeaderContainer}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  {item.title}
                </ThemedText>
                {renderHeader(item.headers)}
              </View>
            );
          }
          return renderRow(item.row);
        }}
      />
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
  sectionHeaderContainer: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  careerRow: {
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
  labelCol: {
    width: 36,
  },
  statCol: {
    flex: 1,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
