import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { GameRound } from "@/store/game-store";

type Props = {
  rounds: GameRound[];
  targetSet: string;
  totalRounds: number;
};

export function GameRoundsTimeline({ rounds, targetSet, totalRounds }: Props) {
  const seenBefore = new Set<string>();

  return (
    <>
      {rounds.map((round, i) => {
        const newTargets = round.targetsFound.filter(
          (t) => !seenBefore.has(t.playerID),
        );
        const seenTargets = round.targetsFound.filter((t) =>
          seenBefore.has(t.playerID),
        );

        for (const t of round.targetsFound) {
          if (!round.timedOut) seenBefore.add(t.playerID);
        }

        const label = i >= totalRounds ? "Final Team" : `Round ${i + 1}`;

        return (
          <ThemedView
            key={i}
            type="backgroundElement"
            style={styles.roundCard}
          >
            <View style={styles.roundHeader}>
              <ThemedText type="smallBold">{label}</ThemedText>
              <ThemedText type="smallBold">
                {round.timedOut ? "0" : `+${round.pointsEarned}`} pts
              </ThemedText>
            </View>

            <View style={styles.teamRow}>
              <ThemedText>
                {round.yearID} {round.teamName}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {round.teamW}-{round.teamL}
              </ThemedText>
            </View>

            {round.pickedPlayerName ? (
              <ThemedText type="small" themeColor="textSecondary">
                Picked: {round.pickedPlayerName}
              </ThemedText>
            ) : i < rounds.length - 1 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No player picked
              </ThemedText>
            ) : null}

            {round.timedOut && (
              <ThemedText type="small" style={styles.timedOut}>
                Timed out — 0 pts
              </ThemedText>
            )}

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
                No {targetSet}
              </ThemedText>
            )}
          </ThemedView>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
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
