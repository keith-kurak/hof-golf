import { useSelector } from "@legendapp/state/react";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
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

export default function GameCompleteScreen() {
  const headerInset = useHeaderInset();
  const router = useRouter();
  const theme = useTheme();
  const history = useSelector(() => game$.history.get());
  const bestScores = useSelector(() => game$.bestScores.get());

  const game = history?.[0];
  if (!game) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
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
    <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
      <Stack.Screen
        options={{ title: "Game Complete", headerBackVisible: false }}
      />
      <View style={styles.content}>
        <View style={[styles.emojiTile, { backgroundColor: theme.tintMuted }]}>
          <Text style={styles.emoji}>{mode?.emoji}</Text>
        </View>
        <ThemedText style={styles.modeName}>{mode?.name ?? "Game"}</ThemedText>

        <View style={styles.scoreSection}>
          <Text
            testID="final-score"
            style={[styles.scoreValue, { color: theme.tint }]}
          >
            {game.totalPoints}
          </Text>
          <ThemedText themeColor="textSecondary">points</ThemedText>
          {game.bonusPoints > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              (includes +{game.bonusPoints} bonus)
            </ThemedText>
          )}
        </View>

        {isNewBest && game.totalPoints > 0 && (
          <View style={[styles.newBest, { backgroundColor: theme.successMuted }]}>
            <SymbolView
              name={{ ios: "trophy.fill", android: "trophy", web: "trophy" }}
              size={14}
              tintColor={theme.success}
              fallback={null}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={[styles.newBestText, { color: theme.success }]}>
              New Best!
            </Text>
          </View>
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

        <View style={styles.actions}>
          <Button
            testID="game-complete-share"
            title="Share Score"
            variant="tinted"
            icon={{ ios: "square.and.arrow.up", android: "share", web: "share" }}
            onPress={() =>
              router.push({
                pathname: "/game/share",
                params: { gameId: game.id },
              })
            }
          />
          <Button
            testID="game-complete-done"
            title="Done"
            onPress={() => router.dismissAll()}
          />
        </View>
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
  emojiTile: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  emoji: {
    fontSize: 48,
  },
  modeName: {
    fontSize: 22,
    fontWeight: "700",
  },
  scoreSection: {
    alignItems: "center",
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  scoreValue: {
    fontSize: 88,
    fontWeight: "800",
    lineHeight: 96,
    fontVariant: ["tabular-nums"],
  },
  newBest: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    marginTop: Spacing.two,
  },
  newBestText: {
    fontSize: 16,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  actions: {
    alignSelf: "stretch",
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
});
