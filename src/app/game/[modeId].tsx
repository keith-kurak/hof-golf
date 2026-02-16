import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { game$, startGame } from "@/store/game-store";
import { getTargetsOnRoster } from "@/store/roster-targets";
import { getRandomStart, type GameMode } from "@/store/starting-pools";
import { getLookupForMode } from "@/store/target-lookups";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

export default function ModeDetailScreen() {
  const { modeId } = useLocalSearchParams<{ modeId: string }>();
  const mode = activeModes.find((m) => m.id === modeId);
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const db = useSQLiteContext();
  const router = useRouter();
  const bestScores = useSelector(() => game$.bestScores.get() ?? {});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown timer: 3 → 2 → 1 → 0 → navigate
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const active = game$.active.get();
      if (active) {
        const currentRound = active.rounds[active.rounds.length - 1];
        router.replace({
          pathname: "/team/[teamID]",
          params: {
            teamID: currentRound.teamID,
            teamName: currentRound.teamName,
            year: String(currentRound.yearID),
          },
        });
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  const handlePlay = useCallback(async () => {
    if (loading || !mode) return;
    setLoading(true);
    try {
      const lookup = getLookupForMode(mode.scoring.type);
      const startingTeam = await getRandomStart(db, mode, lookup);
      const targets = await getTargetsOnRoster(
        db,
        startingTeam.teamID,
        startingTeam.yearID,
        lookup,
      );
      startGame(mode, startingTeam, targets);
      setCountdown(3);
    } catch (e) {
      console.error("Failed to start game:", e);
      setLoading(false);
    }
  }, [db, mode, loading]);

  if (!mode) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Mode not found.</ThemedText>
      </ThemedView>
    );
  }

  const { info } = mode;
  const bestScore = bestScores[mode.id];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerTitle: mode.name }} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottom + Spacing.six },
        ]}
      >
        {/* Overview */}
        <ThemedView type="backgroundSelected" style={styles.card}>
          <ThemedText style={styles.overviewText}>
            {info.overviewBrief}
          </ThemedText>
          {bestScore != null && bestScore > 0 && (
            <ThemedText type="smallBold" themeColor="textSecondary">
              Best score: {bestScore}
            </ThemedText>
          )}
        </ThemedView>

        {/* How to play */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            How to play
          </ThemedText>
          {info.howToPlay.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.stepNumber}
              >
                {i + 1}.
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.stepText}>
                {step}
              </ThemedText>
            </View>
          ))}
        </ThemedView>

        {/* Extra details */}
        {info.bullets.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.card}>
            {info.bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <ThemedText themeColor="textSecondary" style={styles.bulletDot}>
                  {"\u2022"}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  style={styles.bulletText}
                >
                  {b}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        )}
      </ScrollView>

      {/* Play button */}
      <Pressable
        onPress={handlePlay}
        disabled={loading || countdown !== null}
        style={({ pressed }) => [
          styles.playButton,
          { backgroundColor: theme.text },
          pressed && styles.pressed,
        ]}
      >
        {loading && countdown === null ? (
          <ActivityIndicator size="small" color={theme.background} />
        ) : (
          <ThemedText type="mediumBold" style={{ color: theme.background }}>
            Play
          </ThemedText>
        )}
      </Pressable>

      {/* Countdown overlay */}
      {countdown !== null && countdown > 0 && (
        <View style={styles.countdownOverlay}>
          <Animated.View
            key={countdown}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          >
            <ThemedText style={styles.countdownNumber}>{countdown}</ThemedText>
          </Animated.View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    rowGap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    rowGap: Spacing.two,
  },
  overviewText: {
    lineHeight: 22,
  },
  sectionLabel: {
    textTransform: "uppercase",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  stepNumber: {
    width: 20,
    lineHeight: 22,
  },
  stepText: {
    flex: 1,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  bulletDot: {
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
  playButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
    margin: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: "700",
    color: "#ffffff",
  },
});
