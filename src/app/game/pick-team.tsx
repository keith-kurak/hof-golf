import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { pendingTeamPick$ } from "@/store/game-store";
import {
  getEligibleTeams,
  type GameMode,
  type StartingTeam,
} from "@/store/starting-pools";
import { getLookupForMode } from "@/store/target-lookups";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

export default function PickTeamScreen() {
  const { modeId } = useLocalSearchParams<{ modeId: string }>();
  const mode = activeModes.find((m) => m.id === modeId);
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [teams, setTeams] = useState<StartingTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!mode) return;
    const lookup = getLookupForMode(mode.scoring.type);
    getEligibleTeams(db, mode, lookup)
      .then(setTeams)
      .catch((e) => console.error("Failed to load eligible teams:", e))
      .finally(() => setLoading(false));
  }, [db, mode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.teamName.toLowerCase().includes(q) ||
        String(t.yearID).includes(q),
    );
  }, [teams, search]);

  const handlePick = (team: StartingTeam) => {
    pendingTeamPick$.set(team);
    router.back();
  };

  if (!mode) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Mode not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Choose Starting Team" }} />
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, borderColor: theme.textSecondary },
          ]}
          placeholder="Search teams..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.yearID}-${item.teamID}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePick(item)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView type="backgroundElement" style={styles.teamRow}>
                <ThemedText type="smallBold" style={styles.yearText}>
                  {item.yearID}
                </ThemedText>
                <ThemedText style={styles.teamName}>{item.teamName}</ThemedText>
              </ThemedView>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No teams match your search.
            </ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginVertical: Spacing.half,
    gap: Spacing.two,
  },
  yearText: {
    width: 44,
  },
  teamName: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
