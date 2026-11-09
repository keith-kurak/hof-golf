import { useSelector } from "@legendapp/state/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeOut, Keyframe } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Section, Separator } from "@/components/ui/section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { game$, pendingTeamPick$, startGame } from "@/store/game-store";
import { getTargetsOnRoster } from "@/store/roster-targets";
import { getRandomStart, type GameMode } from "@/store/starting-pools";
import { getLookupForMode } from "@/store/target-lookups";
import { useHeaderInset } from "@/hooks/use-header-inset";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

// Countdown digits: a short fade with a small scale change, no bounce
const countdownEnter = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
}).duration(220);

export default function ModeDetailScreen() {
  const headerInset = useHeaderInset();
  const { modeId } = useLocalSearchParams<{ modeId: string }>();
  const mode = activeModes.find((m) => m.id === modeId);
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const db = useSQLiteContext();
  const router = useRouter();
  const bestScores = useSelector(() => game$.bestScores.get() ?? {});
  const pendingPick = useSelector(() => pendingTeamPick$.get());
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [chooseTeam, setChooseTeam] = useState(false);
  const [timed, setTimed] = useState(false);

  // Clear pending team pick on unmount or when switching to Random
  useEffect(() => {
    if (!chooseTeam) pendingTeamPick$.set(null);
    return () => {
      pendingTeamPick$.set(null);
    };
  }, [chooseTeam]);

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
            game: "1",
          },
        });
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  const insets = useSafeAreaInsets();

  const handlePlay = useCallback(async () => {
    if (loading || !mode) return;
    setLoading(true);
    try {
      const lookup = getLookupForMode(mode.scoring.type);
      const overrides = mode.bonuses?.scoringOverrides;

      // Use chosen team or random
      const startingTeam =
        chooseTeam && pendingPick
          ? pendingPick
          : await getRandomStart(db, mode, lookup);

      const targets = await getTargetsOnRoster(
        db,
        startingTeam.teamID,
        startingTeam.yearID,
        lookup,
        overrides?.length ? overrides : undefined,
      );

      // Query team W/L
      const teamWL = await db.getFirstAsync<{ W: number; L: number }>(
        `SELECT W, L FROM Teams WHERE yearID = ? AND teamID = ?`,
        [startingTeam.yearID, startingTeam.teamID],
      );

      startGame(mode, startingTeam, targets, {
        timed,
        teamW: teamWL?.W ?? 0,
        teamL: teamWL?.L ?? 0,
      });
      pendingTeamPick$.set(null);
      setCountdown(3);
    } catch (e) {
      console.error("Failed to start game:", e);
      setLoading(false);
    }
  }, [db, mode, loading, chooseTeam, pendingPick, timed]);

  if (!mode) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
        <ThemedText>Mode not found.</ThemedText>
      </ThemedView>
    );
  }

  const { info } = mode;
  const bestScore = bestScores[mode.id];

  const pickLabel = pendingPick
    ? `${pendingPick.yearID} ${pendingPick.teamName}`
    : "Select Team...";

  return (
    <ThemedView style={[styles.container, { paddingTop: headerInset }]}>
      <Stack.Screen options={{ headerTitle: mode.name }} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottom + Spacing.six },
        ]}
      >
        {/* Overview */}
        <View style={styles.hero}>
          <View style={[styles.emojiTile, { backgroundColor: theme.tintMuted }]}>
            <Text style={styles.emoji}>{mode.emoji}</Text>
          </View>
          <ThemedText style={styles.overviewText}>
            {info.overviewBrief}
          </ThemedText>
          {bestScore != null && bestScore > 0 && (
            <View
              style={[styles.bestPill, { backgroundColor: theme.successMuted }]}
            >
              <SymbolView
                name={{ ios: "trophy.fill", android: "trophy", web: "trophy" }}
                size={12}
                tintColor={theme.success}
                fallback={null}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              <Text style={[styles.bestText, { color: theme.success }]}>
                Best score: {bestScore}
              </Text>
            </View>
          )}
        </View>

        {/* Game options */}
        <Section title="Options">
          <View style={styles.optionRow}>
            <ThemedText style={styles.optionLabel}>Starting team</ThemedText>
            <View style={styles.segmentWrap}>
              <SegmentedControl
                selected={chooseTeam ? "choose" : "random"}
                onSelect={(v) => setChooseTeam(v === "choose")}
                options={[
                  { value: "random", label: "Random", testID: "start-random" },
                  { value: "choose", label: "Choose", testID: "start-choose" },
                ]}
              />
            </View>
          </View>

          {chooseTeam && (
            <>
              <Separator />
              <Pressable
                testID="select-team"
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/game/pick-team",
                    params: { modeId: mode.id },
                  })
                }
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText style={styles.optionLabel}>Team</ThemedText>
                <View style={styles.pickValue}>
                  <ThemedText
                    numberOfLines={1}
                    style={[
                      styles.pickValueText,
                      { color: pendingPick ? theme.text : theme.tint },
                    ]}
                  >
                    {pickLabel}
                  </ThemedText>
                  <SymbolView
                    name={{
                      ios: "chevron.right",
                      android: "chevron_right",
                      web: "chevron_right",
                    }}
                    size={13}
                    weight="semibold"
                    tintColor={theme.textSecondary}
                    fallback={null}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                </View>
              </Pressable>
            </>
          )}

          <Separator />
          <View style={styles.optionRow}>
            <ThemedText style={styles.optionLabel}>Timer</ThemedText>
            <View style={styles.segmentWrap}>
              <SegmentedControl
                selected={timed ? "timed" : "untimed"}
                onSelect={(v) => setTimed(v === "timed")}
                options={[
                  { value: "untimed", label: "Untimed", testID: "timer-untimed" },
                  { value: "timed", label: "Timed", testID: "timer-timed" },
                ]}
              />
            </View>
          </View>
        </Section>

        {/* How to play */}
        <Section title="How to play" contentStyle={styles.sectionBody}>
          {info.howToPlay.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: theme.tint }]}>
                <Text style={styles.stepBadgeText}>{i + 1}</Text>
              </View>
              <ThemedText style={styles.stepText}>{step}</ThemedText>
            </View>
          ))}
        </Section>

        {/* Extra details */}
        {info.bullets.length > 0 && (
          <Section title="Details" contentStyle={styles.sectionBody}>
            {info.bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <View
                  style={[styles.bulletDot, { backgroundColor: theme.tint }]}
                />
                <ThemedText themeColor="textSecondary" style={styles.stepText}>
                  {b}
                </ThemedText>
              </View>
            ))}
          </Section>
        )}

      </ScrollView>

      {/* Play button */}
      <View
        style={[
          styles.playBar,
          { paddingBottom: insets.bottom + Spacing.two },
        ]}
      >
        <Button
          testID="play"
          title="Play"
          icon={{ ios: "play.fill", android: "play_arrow", web: "play_arrow" }}
          onPress={handlePlay}
          disabled={countdown !== null}
          loading={loading && countdown === null}
        />
      </View>

      {/* Countdown overlay */}
      {countdown !== null && countdown > 0 && (
        <View style={styles.countdownOverlay}>
          <Animated.View
            key={countdown}
            entering={countdownEnter}
            exiting={FadeOut.duration(150)}
          >
            <Text style={styles.countdownNumber}>{countdown}</Text>
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
    rowGap: Spacing.four,
  },
  hero: {
    alignItems: "center",
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  emojiTile: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 40,
  },
  overviewText: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "500",
    textAlign: "center",
  },
  bestPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  bestText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionBody: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginHorizontal: 8,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "400",
  },
  segmentWrap: {
    width: 190,
  },
  pickValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.two,
  },
  pickValueText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "400",
  },
  playBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 130,
    fontVariant: ["tabular-nums"],
  },
});
