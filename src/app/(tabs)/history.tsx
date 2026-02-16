import { useSelector } from "@legendapp/state/react";
import { FlatList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import gameModes from "@/metadata/game-modes.json";
import { game$, type SavedGame } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = gameModes as GameMode[];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GameCard({ game }: { game: SavedGame }) {
  const mode = activeModes.find((m) => m.id === game.modeId);
  const startingRound = game.rounds[0];

  return (
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

        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(game.finishedAt)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function HistoryScreen() {
  const history = useSelector(() => game$.history.get() ?? []);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <GameCard game={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText type="subtitle" themeColor="textSecondary">
              No games yet
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Complete a game to see your history.
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
