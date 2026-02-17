import { useSelector } from "@legendapp/state/react";
import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
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

export default function GameCompleteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const history = useSelector(() => game$.history.get());
  const bestScores = useSelector(() => game$.bestScores.get());

  const game = history?.[0];
  if (!game) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{ title: "Game Complete", headerBackVisible: false }}
        />
        <ThemedText style={styles.empty}>No game data.</ThemedText>
      </ThemedView>
    );
  }

  const mode = activeModes.find((m) => m.id === game.modeId);
  const isNewBest = game.totalPoints === (bestScores?.[game.modeId] ?? 0);
  const duration = formatDuration(game.finishedAt - game.startedAt);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ title: "Game Complete", headerBackVisible: false }}
      />
      <View style={styles.content}>
        <ThemedText style={styles.emoji}>{mode?.emoji}</ThemedText>
        <ThemedText type="subtitle">{mode?.name ?? "Game"}</ThemedText>

        <View style={styles.scoreSection}>
          <ThemedText style={styles.scoreValue}>{game.totalPoints}</ThemedText>
          <ThemedText themeColor="textSecondary">points</ThemedText>
          {game.bonusPoints > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              (includes +{game.bonusPoints} bonus)
            </ThemedText>
          )}
        </View>

        {isNewBest && game.totalPoints > 0 && (
          <ThemedText style={styles.newBest}>New Best!</ThemedText>
        )}

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {mode?.rounds ?? game.rounds.length} rounds
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {duration}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {game.timed ? "Timed" : "Untimed"}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => router.dismissAll()}
          style={({ pressed }) => [
            styles.doneButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="mediumBold" style={{ color: theme.background }}>
            Done
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    gap: Spacing.two,
  },
  empty: {
    padding: Spacing.three,
  },
  emoji: {
    fontSize: 48,
  },
  scoreSection: {
    alignItems: "center",
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: "800",
    lineHeight: 64,
    marginBottom: Spacing.three,
  },
  newBest: {
    color: "#22C55E",
    fontSize: 18,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  doneButton: {
    width: "100%",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
