import { useSelector } from "@legendapp/state/react";
import { useIsFocused, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ResumeGameDialog } from "@/components/resume-game-dialog";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { game$, isGameActive$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

function ModeCard({ mode, bestScore }: { mode: GameMode; bestScore?: number }) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      testID={`mode-${mode.id}`}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/game/[modeId]",
          params: { modeId: mode.id },
        })
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.emojiTile, { backgroundColor: theme.tintMuted }]}>
          <Text style={styles.emoji}>{mode.emoji}</Text>
        </View>
        <View style={styles.titleBlock}>
          <ThemedText style={styles.modeName}>{mode.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {mode.rounds} rounds · v.{mode.version}
          </ThemedText>
        </View>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          size={14}
          weight="semibold"
          tintColor={theme.textSecondary}
          fallback={null}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
      <ThemedText themeColor="textSecondary" style={styles.overview}>
        {mode.info.overview}
      </ThemedText>
      {bestScore != null && bestScore > 0 && (
        <View style={[styles.bestPill, { backgroundColor: theme.successMuted }]}>
          <SymbolView
            name={{ ios: "trophy.fill", android: "trophy", web: "trophy" }}
            size={12}
            tintColor={theme.success}
            fallback={null}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={[styles.bestText, { color: theme.success }]}>
            Best {bestScore}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function GameScreen() {
  const bestScores = useSelector(() => game$.bestScores.get() ?? {});

  // While this tab is focused, an active game shows the resume dialog
  const hasActiveGame = useSelector(isGameActive$);
  const isFocused = useIsFocused();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.heading}
        >
          Choose a game...
        </ThemedText>

        {activeModes.map((mode) => (
          <ModeCard key={mode.id} mode={mode} bestScore={bestScores[mode.id]} />
        ))}
      </ScrollView>
      <ResumeGameDialog visible={hasActiveGame && isFocused} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  heading: {
    marginLeft: Spacing.one,
    marginBottom: -Spacing.one,
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
  emojiTile: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 26,
  },
  titleBlock: {
    flex: 1,
  },
  modeName: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
  },
  overview: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
  },
  bestPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  bestText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});
