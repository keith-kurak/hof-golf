import { useSelector } from "@legendapp/state/react";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import gameModes from "@/metadata/game-modes.json";
import { game$, isGameActive$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

export default function GameScreen() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const bestScores = useSelector(() => game$.bestScores.get() ?? {});

  // When this tab gains focus, check for an active game and show resume modal
  useFocusEffect(
    useCallback(() => {
      if (isGameActive$.get()) {
        router.push("/game/resume");
      }
    }, [router]),
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: top }]}
      >
        <ThemedText style={styles.heading}>Choose a game...</ThemedText>

        {activeModes.map((mode) => {
          const bestScore = bestScores[mode.id];
          return (
            <Pressable
              key={mode.id}
              onPress={() =>
                router.push({
                  pathname: "/game/[modeId]",
                  params: { modeId: mode.id },
                })
              }
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="subtitle">
                  {mode.name} {mode.emoji}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  v.{mode.version}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.overview}>
                  {mode.info.overview}
                </ThemedText>
                {bestScore != null && bestScore > 0 && (
                  <View style={styles.scoreRow}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Best: {bestScore}
                    </ThemedText>
                  </View>
                )}
              </ThemedView>
            </Pressable>
          );
        })}
      </ScrollView>
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
  },
  heading: {
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  overview: {
    lineHeight: 22,
  },
  scoreRow: {
    flexDirection: "row",
  },
  pressed: {
    opacity: 0.7,
  },
});
