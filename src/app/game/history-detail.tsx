import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Platform, ScrollView, StyleSheet } from "react-native";

import { GameRoundsTimeline } from "@/components/game-rounds-timeline";
import { GameScoreHeader } from "@/components/game-score-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Spacing } from "@/constants/theme";
import gameModes from "@/metadata/game-modes.json";
import { game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";
import { useHeaderInset } from "@/hooks/use-header-inset";

const activeModes = gameModes as GameMode[];

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function HistoryDetailScreen() {
  const headerInset = useHeaderInset();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const history = useSelector(() => game$.history.get() ?? []);
  const router = useRouter();

  const game = history.find((g) => g.id === gameId);

  if (!game) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
        <Stack.Screen options={{ title: "Game Details" }} />
        <ThemedText style={styles.empty}>Game not found.</ThemedText>
      </ThemedView>
    );
  }

  const mode = activeModes.find((m) => m.id === game.modeId);
  const shareScore = () =>
    router.push({ pathname: "/game/share", params: { gameId: game.id } });
  const duration = formatDuration(game.finishedAt - game.startedAt);

  let w = 0;
  let l = 0;
  for (const round of game.rounds) {
    w += round.teamW ?? 0;
    l += round.teamL ?? 0;
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
      <Stack.Screen options={{ title: "Game Details" }} />
      {Platform.OS === "ios" && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="square.and.arrow.up"
            accessibilityLabel="Share score"
            onPress={shareScore}
          />
        </Stack.Toolbar>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        <GameScoreHeader
          emoji={mode?.emoji}
          name={mode?.name ?? "Game"}
          points={game.totalPoints}
          stats={[
            { label: "Rounds", value: String(mode?.rounds ?? 0) },
            { label: "Time", value: duration },
            { label: "W-L", value: `${w}-${l}` },
          ]}
          footnote={
            game.bonusPoints > 0
              ? `Includes +${game.bonusPoints} bonus points`
              : undefined
          }
        />

        {Platform.OS === "android" && (
          <Button
            testID="history-share"
            title="Share Score"
            variant="tinted"
            icon={{ android: "share" }}
            onPress={shareScore}
          />
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
});
