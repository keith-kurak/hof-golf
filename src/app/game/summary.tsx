import { useSelector } from "@legendapp/state/react";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { GameRoundsTimeline } from "@/components/game-rounds-timeline";
import { GameScoreHeader } from "@/components/game-score-header";
import { SheetCloseButton } from "@/components/sheet-close-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import gameModes from "@/metadata/game-modes.json";
import { cumulativeWL$, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";
import { useHeaderInset } from "@/hooks/use-header-inset";

const activeModes = gameModes as GameMode[];

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function GameSummaryScreen() {
  const headerInset = useHeaderInset();
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
      <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
        <Stack.Screen options={{ title: "Game Summary" }} />
        <ThemedText style={styles.empty}>No active game.</ThemedText>
      </ThemedView>
    );
  }

  const mode = activeModes.find((m) => m.id === active.modeId);

  return (
    <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
      <Stack.Screen options={{ title: "Game Summary" }} />
      <SheetCloseButton />
      <ScrollView contentContainerStyle={styles.content}>
        <GameScoreHeader
          emoji={mode?.emoji}
          name={mode?.name ?? "Game"}
          points={active.totalPoints}
          stats={[
            {
              label: "Round",
              value:
                active.rounds.length <= (mode?.rounds ?? 0)
                  ? `${active.rounds.length}/${mode?.rounds ?? 0}`
                  : "Final",
            },
            { label: "Time", value: formatDuration(elapsed) },
            { label: "W-L", value: `${cumWL.w}-${cumWL.l}` },
          ]}
        />

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
});
