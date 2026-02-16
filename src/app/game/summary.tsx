import { useSelector } from "@legendapp/state/react";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { GameRoundsTimeline } from "@/components/game-rounds-timeline";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import gameModes from "@/metadata/game-modes.json";
import { cumulativeWL$, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = gameModes as GameMode[];

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function GameSummaryScreen() {
  const active = useSelector(() => game$.active.get());
  const cumWL = useSelector(cumulativeWL$);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = active?.startedAt;

  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsed(Date.now() - startedAt);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!active) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Game Summary" }} />
        <ThemedText style={styles.empty}>No active game.</ThemedText>
      </ThemedView>
    );
  }

  const mode = activeModes.find((m) => m.id === active.modeId);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Game Summary" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="mediumBold">
            {mode?.emoji} {mode?.name ?? "Game"}
          </ThemedText>
          <ThemedText type="mediumBold">{active.totalPoints} pts</ThemedText>
        </View>

        <View style={styles.metaRow}>
          {active.rounds.length <= (mode?.rounds ?? 0) ? (
            <ThemedText type="small" themeColor="textSecondary">
              Rd {active.rounds.length}/{mode?.rounds ?? 0}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Final team
            </ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {formatDuration(elapsed)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            W-L: {cumWL.w}-{cumWL.l}
          </ThemedText>
        </View>

        <GameRoundsTimeline
          rounds={active.rounds}
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
