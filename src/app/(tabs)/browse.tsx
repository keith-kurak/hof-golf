import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
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
  const { top } = useSafeAreaInsets();
  const [year, setYear] = useState(2025);
  const [sections, setSections] = useState<Section[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const inputRef = useRef<TextInput>(null);

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

  const cancelSearch = useCallback(() => {
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
  }, []);

  return (
    <ThemedView style={[styles.container, { paddingTop: top }]}>
      <View style={styles.searchRow}>
        <TextInput
          ref={inputRef}
          style={[
            styles.searchInput,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
          placeholder="Search players..."
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
        {searching && (
          <Pressable onPress={cancelSearch} style={styles.cancelButton}>
            <ThemedText type="link">Cancel</ThemedText>
          </Pressable>
        )}
      </View>

      {searching ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.playerID}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.trim().length > 0 ? (
              <ThemedText
                themeColor="textSecondary"
                style={styles.emptyText}
              >
                No players found
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                cancelSearch();
                router.push({
                  pathname: "/player/[playerID]",
                  params: {
                    playerID: item.playerID,
                    playerName: `${item.nameFirst} ${item.nameLast}`,
                    year: String(item.lastYear),
                  },
                });
              }}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundElement" style={styles.resultRow}>
                <ThemedText>
                  {item.nameFirst} {item.nameLast}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {item.lastYear > 0 ? item.lastYear : "—"}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.teamID}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <YearPicker year={year} onYearChange={setYear} />
          }
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <Pressable
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
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundElement" style={styles.teamRow}>
                <ThemedText style={styles.teamName}>{item.name}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {item.W}-{item.L}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
          renderSectionFooter={() => <View style={styles.sectionFooter} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: Spacing.one,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginVertical: Spacing.half,
  },
  emptyText: {
    textAlign: "center",
    paddingTop: Spacing.four,
  },
  sectionHeader: {
    textTransform: "uppercase",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  sectionFooter: {
    height: Spacing.two,
  },
  teamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginVertical: Spacing.half,
  },
  teamName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
