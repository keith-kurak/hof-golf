import { useSelector } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { game$, type SavedGame } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const mode = activeModes.find((m) => m.id === game.modeId);
  const startingRound = game.rounds[0];

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/game/history-detail",
          params: { gameId: game.id },
        })
      }
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="mediumBold">
            {mode?.emoji} {mode?.name ?? game.modeId}
          </ThemedText>
          <View style={styles.badges}>
            {game.timed && (
              <ThemedView type="backgroundSelected" style={styles.badge}>
                <ThemedText type="small">Timed</ThemedText>
              </ThemedView>
            )}
            {!game.timed && (
              <ThemedView type="backgroundSelected" style={styles.badge}>
                <ThemedText type="small" themeColor="textSecondary">
                  Untimed
                </ThemedText>
              </ThemedView>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.pointsRow}>
            <ThemedText type="subtitle">{game.totalPoints}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {" "}
              pts
              {game.bonusPoints > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  {" "}
                  (includes +{game.bonusPoints} bonus)
                </ThemedText>
              )}
            </ThemedText>
          </View>

          {startingRound && (
            <ThemedText type="small" themeColor="textSecondary">
              Started: {startingRound.yearID} {startingRound.teamName}
            </ThemedText>
          )}

          <View style={styles.footerRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(game.finishedAt)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDuration(game.startedAt, game.finishedAt)}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function SegmentedControl({
  selected,
  onSelect,
}: {
  selected: FilterValue;
  onSelect: (v: FilterValue) => void;
}) {
  const theme = useTheme();
  const segments: { value: FilterValue; label: string }[] = activeModes.map(
    (m) => ({ value: m.id, label: `${m.emoji} ${m.shortName}` }),
  );

  return (
    <View style={styles.segmentRow}>
      {segments.map((seg) => {
        const isActive = seg.value === selected;
        return (
          <Pressable
            key={seg.value}
            onPress={() => onSelect(seg.value)}
            style={[
              styles.segment,
              {
                backgroundColor: isActive
                  ? theme.text
                  : theme.backgroundElement,
              },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color: isActive ? theme.background : theme.textSecondary,
              }}
            >
              {seg.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function HistoryScreen() {
  const history = useSelector(() => game$.history.get() ?? []);
  const [filter, setFilter] = useState<FilterValue>(
    activeModes[0]?.id ?? FILTER_ALL,
  );
  const insets = useSafeAreaInsets();

  const filtered = useMemo(
    () =>
      filter === FILTER_ALL
        ? history
        : history.filter((g) => g.modeId === filter),
    [history, filter],
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          history.length > 0 ? (
            <SegmentedControl selected={filter} onSelect={setFilter} />
          ) : null
        }
        renderItem={({ item }) => <GameCard game={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText type="subtitle" themeColor="textSecondary">
              No games yet
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Play this mode to see results here.
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
    gap: Spacing.two,
  },
  segmentRow: {
    flexDirection: "row",
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  badge: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  cardBody: {
    gap: Spacing.one,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
});
