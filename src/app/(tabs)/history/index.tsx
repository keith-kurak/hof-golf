import { useSelector } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { SymbolView } from "expo-symbols";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { game$, type SavedGame } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = gameModes as GameMode[];
const FILTER_ALL = "all";
type FilterValue = typeof FILTER_ALL | string;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(startedAt: number, finishedAt: number): string {
  const totalSec = Math.floor((finishedAt - startedAt) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function GameCard({ game }: { game: SavedGame }) {
  const router = useRouter();
  const theme = useTheme();
  const startingRound = game.rounds[0];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/game/history-detail",
          params: { gameId: game.id },
        })
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(game.finishedAt)} · {formatDuration(game.startedAt, game.finishedAt)}
          </ThemedText>
          {startingRound && (
            <ThemedText style={styles.startTeam} numberOfLines={1}>
              {startingRound.yearID} {startingRound.teamName}
            </ThemedText>
          )}
        </View>
        <View style={styles.points}>
          <Text style={[styles.pointsValue, { color: theme.tint }]}>
            {game.totalPoints}
          </Text>
          <ThemedText type="tiny" themeColor="textSecondary">
            PTS
          </ThemedText>
        </View>
      </View>
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: theme.fill }]}>
          <SymbolView
            name={
              game.timed
                ? { ios: "timer", android: "timer", web: "timer" }
                : { ios: "infinity", android: "all_inclusive", web: "all_inclusive" }
            }
            size={12}
            tintColor={theme.textSecondary}
            fallback={null}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <ThemedText type="tiny" themeColor="textSecondary">
            {game.timed ? "Timed" : "Untimed"}
          </ThemedText>
        </View>
        {game.bonusPoints > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.successMuted }]}>
            <Text style={[styles.bonusText, { color: theme.success }]}>
              +{game.bonusPoints} bonus
            </Text>
          </View>
        )}
        <View style={styles.flex} />
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          size={13}
          weight="semibold"
          tintColor={theme.textSecondary}
          fallback={null}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  const history = useSelector(() => game$.history.get() ?? []);
  const [filter, setFilter] = useState<FilterValue>(
    activeModes[0]?.id ?? FILTER_ALL,
  );

  const filtered = useMemo(
    () =>
      filter === FILTER_ALL
        ? history
        : history.filter((g) => g.modeId === filter),
    [history, filter],
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          history.length > 0 ? (
            <View style={styles.filter}>
              <SegmentedControl
                selected={filter}
                onSelect={setFilter}
                options={activeModes.map((m) => ({
                  value: m.id,
                  label: `${m.emoji} ${m.shortName}`,
                }))}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => <GameCard game={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <SymbolView
              name={{ ios: "clock.arrow.circlepath", android: "history", web: "history" }}
              size={44}
              tintColor={theme.textSecondary}
              fallback={null}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <ThemedText style={styles.emptyTitle}>No games yet</ThemedText>
            <ThemedText themeColor="textSecondary">
              Play a game to see your results here.
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  filter: {
    marginBottom: Spacing.one,
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  cardTitle: {
    flex: 1,
    gap: 2,
  },
  startTeam: {
    fontSize: 17,
    fontWeight: "600",
  },
  points: {
    alignItems: "center",
    minWidth: 48,
  },
  pointsValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  bonusText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  flex: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});
