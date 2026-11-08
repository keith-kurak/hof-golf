import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "@legendapp/state/react";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, SectionList, StyleSheet, View } from "react-native";

import { SheetCloseButton } from "@/components/sheet-close-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GroupedHeader, GroupedRow } from "@/components/ui/section";
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
  const pendingPick = useSelector(() => pendingTeamPick$.get());

  useEffect(() => {
    if (!mode) return;
    const lookup = getLookupForMode(mode.scoring.type);
    getEligibleTeams(db, mode, lookup)
      .then(setTeams)
      .catch((e) => console.error("Failed to load eligible teams:", e))
      .finally(() => setLoading(false));
  }, [db, mode]);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = q
      ? teams.filter(
          (t) =>
            t.teamName.toLowerCase().includes(q) ||
            String(t.yearID).includes(q),
        )
      : teams;
    const byYear = new Map<number, StartingTeam[]>();
    for (const t of matches) {
      const list = byYear.get(t.yearID) ?? [];
      list.push(t);
      byYear.set(t.yearID, list);
    }
    return [...byYear].map(([year, data]) => ({ title: String(year), data }));
  }, [teams, search]);

  const handlePick = (team: StartingTeam) => {
    pendingTeamPick$.set(team);
    router.back();
  };

  if (!mode) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.emptyText}>Mode not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Choose Starting Team" }} />
      <SheetCloseButton />
      <Stack.SearchBar
        placeholder="Team or year"
        hideWhenScrolling={false}
        autoCapitalize="none"
        tintColor={theme.tint}
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch("")}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => `${item.yearID}-${item.teamID}`}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <GroupedHeader title={section.title} />
          )}
          renderItem={({ item, index, section }) => (
            <GroupedRow
              testID={`pick-team-${item.yearID}-${item.teamID}`}
              index={index}
              count={section.data.length}
              onPress={() => handlePick(item)}
            >
              <ThemedText style={styles.teamName}>{item.teamName}</ThemedText>
              {pendingPick?.teamID === item.teamID &&
                pendingPick.yearID === item.yearID && (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check", web: "check" }}
                    size={16}
                    weight="semibold"
                    tintColor={theme.tint}
                    fallback={null}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                )}
            </GroupedRow>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  teamName: {
    flex: 1,
    fontWeight: "400",
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.four,
  },
});
