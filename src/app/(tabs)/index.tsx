import { observer, useSelector } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import {
  game$,
  isGameActive$,
  currentRound$,
  startGame,
  abandonGame,
} from "@/store/game-store";
import { getTargetsOnRoster } from "@/store/roster-targets";
import { getRandomStart, type GameMode } from "@/store/starting-pools";
import { getLookupForMode } from "@/store/target-lookups";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

const GameScreen = observer(function GameScreen() {
  const isActive = useSelector(isGameActive$);

  return isActive ? <ActiveGameView /> : <ModeListView />;
});

export default GameScreen;

// ---------------------------------------------------------------------------
// Mode List — shown when no game is active
// ---------------------------------------------------------------------------

const ModeListView = observer(function ModeListView() {
  const { top } = useSafeAreaInsets();
  const theme = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const bestScores = useSelector(() => game$.bestScores.get() ?? {});
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  const mode = activeModes[selectedIdx];
  const { info } = mode;
  const bestScore = bestScores[mode.id];

  const handlePlay = useCallback(async () => {
    if (loading) return;
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
      router.push({
        pathname: "/team/[teamID]",
        params: {
          teamID: startingTeam.teamID,
          teamName: startingTeam.teamName,
          year: String(startingTeam.yearID),
        },
      });
    } catch (e) {
      console.error("Failed to start game:", e);
    } finally {
      setLoading(false);
    }
  }, [db, mode, router, loading]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: top }]}
      >
        <ThemedText type="subtitle" style={styles.heading}>
          HOF Golf
        </ThemedText>

        {/* Segmented picker */}
        <View
          style={[
            styles.picker,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          {activeModes.map((m, i) => (
            <Pressable
              key={m.id}
              onPress={() => setSelectedIdx(i)}
              style={[
                styles.pickerTab,
                selectedIdx === i && {
                  backgroundColor: theme.background,
                },
              ]}
            >
              <ThemedText
                type={selectedIdx === i ? "smallBold" : "small"}
                themeColor={selectedIdx === i ? "text" : "textSecondary"}
              >
                {m.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Overview */}
        <ThemedView type="backgroundSelected" style={styles.card}>
          <ThemedText type="mediumBold">{mode.name}</ThemedText>
          <ThemedText style={styles.overviewText}>
            {info.overview}
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
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.stepNumber}>
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
                <ThemedText themeColor="textSecondary" style={styles.bulletText}>
                  {b}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        )}

        {/* Play button */}
        <Pressable
          onPress={handlePlay}
          disabled={loading}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.background} />
          ) : (
            <ThemedText type="mediumBold" style={{ color: theme.background }}>
              Play
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
});

// ---------------------------------------------------------------------------
// Active Game View — shown when a game is in progress
// ---------------------------------------------------------------------------

const ActiveGameView = observer(function ActiveGameView() {
  const { top } = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const active = useSelector(() => game$.active.get());
  const round = useSelector(currentRound$);

  if (!active) return null;

  const mode = activeModes.find((m) => m.id === active.modeId);
  const currentRound = active.rounds[active.rounds.length - 1];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: top }]}
      >
        <ThemedText type="subtitle" style={styles.heading}>
          {mode?.name ?? "Game"}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <ThemedText type="title" style={styles.statusNumber}>
                {round + 1}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                of {mode?.rounds ?? 9}
              </ThemedText>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <ThemedText type="title" style={styles.statusNumber}>
                {active.totalPoints}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                points
              </ThemedText>
            </View>
          </View>

          {currentRound && (
            <View style={styles.currentTeam}>
              <ThemedText themeColor="textSecondary" type="small">
                Currently viewing
              </ThemedText>
              <ThemedText type="mediumBold">
                {currentRound.yearID} {currentRound.teamName}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/team/[teamID]",
              params: {
                teamID: currentRound.teamID,
                teamName: currentRound.teamName,
                year: String(currentRound.yearID),
              },
            })
          }
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="mediumBold" style={{ color: theme.background }}>
            Continue
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => abandonGame()}
          style={({ pressed }) => [
            styles.abandonButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="small" themeColor="textSecondary">
            Abandon Game
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  heading: {
    marginBottom: Spacing.three,
  },
  picker: {
    flexDirection: "row",
    borderRadius: Spacing.two,
    padding: Spacing.half,
    marginBottom: Spacing.three,
  },
  pickerTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.two,
    borderRadius: 6,
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.two,
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
  },
  pressed: {
    opacity: 0.7,
  },
  // Active game styles
  statusCard: {
    borderRadius: Spacing.two,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.five,
    marginBottom: Spacing.four,
  },
  statusItem: {
    alignItems: "center",
  },
  statusNumber: {
    fontSize: 48,
    lineHeight: 52,
  },
  statusDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(128, 128, 128, 0.3)",
  },
  currentTeam: {
    alignItems: "center",
    gap: Spacing.one,
  },
  continueButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  abandonButton: {
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
});
