import { useSelector } from "@legendapp/state/react";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
  const seenBefore = new Set<string>();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Game Summary" }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
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

        {/* Rounds */}
        {active.rounds.map((round, i) => {
          // Determine which targets were new vs already seen this round
          const newTargets = round.targetsFound.filter(
            (t) => !seenBefore.has(t.playerID),
          );
          const seenTargets = round.targetsFound.filter((t) =>
            seenBefore.has(t.playerID),
          );

          // Mark these as seen for subsequent rounds
          for (const t of round.targetsFound) {
            if (!round.timedOut) seenBefore.add(t.playerID);
          }

          return (
            <ThemedView
              key={i}
              type="backgroundElement"
              style={styles.roundCard}
            >
              <View style={styles.roundHeader}>
                <ThemedText type="smallBold">Round {i + 1}</ThemedText>
                <ThemedText type="smallBold">
                  {round.timedOut ? "0" : `+${round.pointsEarned}`} pts
                </ThemedText>
              </View>

              {/* Team info */}
              <View style={styles.teamRow}>
                <ThemedText>
                  {round.yearID} {round.teamName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {round.teamW}-{round.teamL}
                </ThemedText>
              </View>

              {/* Player picked */}
              {round.pickedPlayerName ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Picked: {round.pickedPlayerName}
                </ThemedText>
              ) : i < active.rounds.length - 1 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No player picked
                </ThemedText>
              ) : null}

              {/* Timed out indicator */}
              {round.timedOut && (
                <ThemedText type="small" style={styles.timedOut}>
                  Timed out — 0 pts
                </ThemedText>
              )}

              {/* Targets found */}
              {newTargets.length > 0 && (
                <View style={styles.targetList}>
                  {newTargets.map((t) => (
                    <View key={t.playerID} style={styles.targetRow}>
                      <View style={styles.dot} />
                      <ThemedText type="small" style={styles.targetName}>
                        {t.name}
                      </ThemedText>
                      <ThemedText type="smallBold" style={styles.targetPoints}>
                        +{t.points}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {/* Already-seen targets */}
              {seenTargets.length > 0 && (
                <View style={styles.targetList}>
                  {seenTargets.map((t) => (
                    <View key={t.playerID} style={styles.targetRow}>
                      <View style={[styles.dot, styles.dotSeen]} />
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        style={styles.targetName}
                      >
                        {t.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        +0
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {round.targetsFound.length === 0 && !round.timedOut && (
                <ThemedText type="small" themeColor="textSecondary">
                  No {mode?.scoring.targetSet}
                </ThemedText>
              )}
            </ThemedView>
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
  roundCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  roundHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timedOut: {
    color: "#E53935",
    fontWeight: "600",
  },
  targetList: {
    gap: Spacing.one,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  dotSeen: {
    backgroundColor: "#EAB308",
  },
  targetName: {
    flex: 1,
  },
  targetPoints: {
    color: "#22C55E",
  },
});
