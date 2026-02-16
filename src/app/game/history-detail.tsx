import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { GameRoundsTimeline } from "@/components/game-rounds-timeline";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import gameModes from "@/metadata/game-modes.json";
import { game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = gameModes as GameMode[];

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function HistoryDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const history = useSelector(() => game$.history.get() ?? []);

  const game = history.find((g) => g.id === gameId);

  if (!game) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Game Details" }} />
        <ThemedText style={styles.empty}>Game not found.</ThemedText>
      </ThemedView>
    );
  }

  const mode = activeModes.find((m) => m.id === game.modeId);
  const duration = formatDuration(game.finishedAt - game.startedAt);

  let w = 0;
  let l = 0;
  for (const round of game.rounds) {
    w += round.teamW ?? 0;
    l += round.teamL ?? 0;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Game Details" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="mediumBold">
            {mode?.emoji} {mode?.name ?? "Game"}
          </ThemedText>
          <ThemedText type="mediumBold">{game.totalPoints} pts</ThemedText>
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {mode?.rounds ?? 0} rounds
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {duration}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            W-L: {w}-{l}
          </ThemedText>
        </View>

        {game.bonusPoints > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Includes +{game.bonusPoints} bonus points
          </ThemedText>
        )}

        <GameRoundsTimeline
          rounds={game.rounds}
          targetSet={mode?.scoring.targetSet ?? "targets"}
          totalRounds={mode?.rounds ?? 0}
        />
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
    gap: Spacing.three,
  },
  empty: {
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
