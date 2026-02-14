import { Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { YearPicker } from "@/components/year-picker";
import { Spacing } from "@/constants/theme";
import {
  type BattingStats,
  type PitchingStats,
  type StatRow,
  battingQuery,
  formatBattingRows,
  formatPitchingRows,
  hasData,
  pitchingQuery,
  YEAR_RANGE_QUERY,
} from "@/util/stats";

type Bio = {
  nameFirst: string;
  nameLast: string;
  bats: string | null;
  throws: string | null;
  debut: string | null;
  finalGame: string | null;
};

type YearRange = { minYear: number; maxYear: number };
type HofStatus = { yearid: number; category: string };

function StatSection({
  title,
  yearLabel,
  yearTeams,
  rows,
}: {
  title: string;
  yearLabel: string;
  yearTeams: string[];
  rows: StatRow[];
}) {
  return (
    <View style={statStyles.section}>
      <ThemedText type="smallBold" style={statStyles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedView style={statStyles.table}>
        <View style={statStyles.row}>
          <ThemedText
            type="mediumBold"
            themeColor="textSecondary"
            style={[statStyles.labelCell, { paddingVertical: 0 }]}
          />
          <ThemedText
            type="mediumBold"
            themeColor="textSecondary"
            style={[statStyles.valueCell, { paddingVertical: 0 }]}
          >
            {yearTeams.length > 0 ? yearTeams.join(", ") : ""}
          </ThemedText>
          <ThemedText
            type="mediumBold"
            themeColor="textSecondary"
            style={[statStyles.valueCell, { paddingVertical: 0 }]}
          />
        </View>
        <View style={statStyles.row}>
          <ThemedText
            type="mediumBold"
            themeColor="textSecondary"
            style={statStyles.labelCell}
          />
          <ThemedText
            type="mediumBold"
            themeColor="textSecondary"
            style={statStyles.valueCell}
          >
            {yearLabel}
          </ThemedText>
          <ThemedText
            type="mediumBold"
            themeColor="textSecondary"
            style={statStyles.valueCell}
          >
            Career
          </ThemedText>
        </View>
        {rows.map((row) => (
          <View key={row.label} style={statStyles.row}>
            <ThemedText
              type="mediumBold"
              themeColor="textSecondary"
              style={statStyles.labelCell}
            >
              {row.label}
            </ThemedText>
            <ThemedText type="medium" style={statStyles.valueCell}>
              {row.year}
            </ThemedText>
            <ThemedView type="backgroundElement" style={{ flex: 1 }}>
              <ThemedText type="medium" style={statStyles.valueCell}>
                {row.career}
              </ThemedText>
            </ThemedView>
          </View>
        ))}
      </ThemedView>
    </View>
  );
}

export default function PlayerDetailScreen() {
  const {
    playerID,
    playerName,
    year: yearParam,
  } = useLocalSearchParams<{
    playerID: string;
    playerName?: string;
    year?: string;
  }>();
  const db = useSQLiteContext();
  const [year, setYear] = useState(yearParam ? Number(yearParam) : 2025);
  const [bio, setBio] = useState<Bio | null>(null);
  const [yearRange, setYearRange] = useState<YearRange | null>(null);
  const [hofStatus, setHofStatus] = useState<HofStatus | null>(null);
  const [yearTeams, setYearTeams] = useState<string[]>([]);
  const [allStar, setAllStar] = useState(false);
  const [yearBatting, setYearBatting] = useState<BattingStats | null>(null);
  const [yearPitching, setYearPitching] = useState<PitchingStats | null>(null);
  const [careerBatting, setCareerBatting] = useState<BattingStats | null>(null);
  const [careerPitching, setCareerPitching] = useState<PitchingStats | null>(
    null,
  );

  useEffect(() => {
    db.getFirstAsync<Bio>(
      `SELECT nameFirst, nameLast, bats, throws, debut, finalGame FROM People WHERE playerID = ?`,
      [playerID],
    ).then(setBio);

    db.getFirstAsync<YearRange>(YEAR_RANGE_QUERY, [playerID, playerID]).then(
      (r) => r && setYearRange(r),
    );

    db.getFirstAsync<HofStatus>(
      `SELECT yearid, category FROM HallOfFame WHERE playerID = ? AND inducted = 'Y'`,
      [playerID],
    ).then(setHofStatus);

    db.getFirstAsync<BattingStats>(battingQuery(), [playerID]).then((r) =>
      setCareerBatting(hasData(r) ? r : null),
    );
    db.getFirstAsync<PitchingStats>(pitchingQuery(), [playerID]).then((r) =>
      setCareerPitching(hasData(r) ? r : null),
    );
  }, [db, playerID]);

  useEffect(() => {
    db.getAllAsync<{ teamID: string }>(
      `SELECT DISTINCT teamID FROM Appearances WHERE playerID = ? AND yearID = ? ORDER BY G_all DESC`,
      [playerID, year],
    ).then((rows) => setYearTeams(rows.map((r) => r.teamID)));

    db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM AllstarFull WHERE playerID = ? AND yearID = ?`,
      [playerID, year],
    ).then((r) => setAllStar((r?.c ?? 0) > 0));

    db.getFirstAsync<BattingStats>(battingQuery(true), [playerID, year]).then(
      (r) => setYearBatting(hasData(r) ? r : null),
    );
    db.getFirstAsync<PitchingStats>(pitchingQuery(true), [playerID, year]).then(
      (r) => setYearPitching(hasData(r) ? r : null),
    );
  }, [db, playerID, year]);

  const displayName =
    playerName ?? (bio ? `${bio.nameFirst} ${bio.nameLast}` : playerID);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: displayName }} />
      <ScrollView contentContainerStyle={styles.content}>
        <YearPicker
          year={year}
          onYearChange={setYear}
          minYear={yearRange?.minYear}
          maxYear={yearRange?.maxYear}
        />

        {bio && (
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
            {allStar && (
              <ThemedText type="small">
                {year} All-Star
              </ThemedText>
            )}
          </View>
        )}

        {careerBatting && (
          <StatSection
            title="Batting"
            yearTeams={yearTeams}
            yearLabel={String(year)}
            rows={formatBattingRows(yearBatting, careerBatting)}
          />
        )}

        {careerPitching && (
          <StatSection
            title="Pitching"
            yearTeams={yearTeams}
            yearLabel={String(year)}
            rows={formatPitchingRows(yearPitching, careerPitching)}
          />
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
});

const statStyles = StyleSheet.create({
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  table: {
    padding: Spacing.three,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelCell: {
    width: 48,
    paddingVertical: Spacing.one,
  },
  valueCell: {
    flex: 1,
    textAlign: "center",
    paddingVertical: Spacing.one,
  },
});
