import { Stack, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { FlatList, SectionList, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GroupedHeader, GroupedRow } from "@/components/ui/section";
import { YearPicker } from "@/components/year-picker";
import { Spacing } from "@/constants/theme";
import { DIVISION_ORDER, divisionName } from "@/util/divisions";
import { useTheme } from "@/hooks/use-theme";

type Team = {
  teamID: string;
  name: string;
  lgID: string;
  divID: string;
  W: number;
  L: number;
};

type Section = {
  title: string;
  data: Team[];
};

type PlayerResult = {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  lastYear: number;
};

const SEARCH_QUERY = `
  SELECT p.playerID, p.nameFirst, p.nameLast,
    MAX(COALESCE(a.yearID, 0)) as lastYear
  FROM People p
  LEFT JOIN Appearances a ON a.playerID = p.playerID
  WHERE p.nameFirst || ' ' || p.nameLast LIKE ?
  GROUP BY p.playerID
  ORDER BY lastYear DESC
  LIMIT 20
`;

export default function BrowseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [year, setYear] = useState(2025);
  const [sections, setSections] = useState<Section[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);

  useEffect(() => {
    db.getAllAsync<Team>(
      `SELECT teamID, name, lgID, divID, W, L
       FROM Teams
       WHERE yearID = ?
       ORDER BY lgID, divID, W DESC`,
      [year],
    ).then((teams) => {
      const grouped: Record<string, Team[]> = {};
      for (const team of teams) {
        const key = `${team.lgID}-${team.divID}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(team);
      }
      setSections(
        DIVISION_ORDER.filter((key) => grouped[key]).map((key) => ({
          title: divisionName(key.split("-")[0], key.split("-")[1]) || key,
          data: grouped[key],
        })),
      );
    });
  }, [db, year]);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }
    db.getAllAsync<PlayerResult>(SEARCH_QUERY, [`%${query.trim()}%`]).then(
      setResults,
    );
  }, [db, query]);

  const searching = focused || query.length > 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.SearchBar
        placeholder="Search players"
        autoCapitalize="words"
        tintColor={theme.tint}
        onChangeText={(e) => setQuery(e.nativeEvent.text)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onCancelButtonPress={() => {
          setQuery("");
          setFocused(false);
        }}
      />

      {searching ? (
        <FlatList
          data={results}
          contentInsetAdjustmentBehavior="automatic"
          keyExtractor={(item) => item.playerID}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.trim().length > 0 ? (
              <ThemedText
                themeColor="textSecondary"
                style={styles.emptyText}
              >
                No players found
              </ThemedText>
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <GroupedRow
              index={index}
              count={results.length}
              chevron
              onPress={() =>
                router.push({
                  pathname: "/player/[playerID]",
                  params: {
                    playerID: item.playerID,
                    playerName: `${item.nameFirst} ${item.nameLast}`,
                    year: String(item.lastYear),
                  },
                })
              }
            >
              <ThemedText style={styles.rowTitle}>
                {item.nameFirst} {item.nameLast}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {item.lastYear > 0 ? item.lastYear : "—"}
              </ThemedText>
            </GroupedRow>
          )}
        />
      ) : (
        <SectionList
          sections={sections}
          contentInsetAdjustmentBehavior="automatic"
          keyExtractor={(item) => item.teamID}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <YearPicker year={year} onYearChange={setYear} />
          }
          renderSectionHeader={({ section }) => (
            <GroupedHeader title={section.title} />
          )}
          renderItem={({ item, index, section }) => (
            <GroupedRow
              index={index}
              count={section.data.length}
              chevron
              onPress={() =>
                router.push({
                  pathname: "/team/[teamID]",
                  params: {
                    teamID: item.teamID,
                    teamName: item.name,
                    year: String(year),
                  },
                })
              }
            >
              <ThemedText style={styles.rowTitle}>{item.name}</ThemedText>
              <ThemedText
                themeColor="textSecondary"
                type="small"
                style={styles.record}
              >
                {item.W}-{item.L}
              </ThemedText>
            </GroupedRow>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  emptyText: {
    textAlign: "center",
    paddingTop: Spacing.four,
  },
  rowTitle: {
    flex: 1,
    fontWeight: "400",
  },
  record: {
    fontVariant: ["tabular-nums"],
  },
});
