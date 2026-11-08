import { useSelector } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { abandonGame, currentRound$, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

type Props = {
  visible: boolean;
};

/**
 * Shown over the home tab while a game is in progress. This is a native modal
 * (not a route) so Continue can push the game screen onto a clean stack.
 */
export function ResumeGameDialog({ visible }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const active = useSelector(() => game$.active.get());
  const roundIdx = useSelector(currentRound$);

  if (!active || !active.rounds?.length) {
    return null;
  }

  const mode = activeModes.find((m) => m.id === active.modeId);
  const currentRound = active.rounds[active.rounds.length - 1];
  const totalRounds = mode?.rounds ?? 0;
  // After the last pick the game is at the end of the last round, not a new
  // round: show "9 of 9", and the button finishes the game.
  const isFinalRound = roundIdx + 1 > totalRounds;

  const handleContinue = () => {
    router.push({
      pathname: "/team/[teamID]",
      params: {
        teamID: currentRound.teamID,
        teamName: currentRound.teamName,
        year: String(currentRound.yearID),
        game: "1",
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.modal, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={[styles.emojiTile, { backgroundColor: theme.tintMuted }]}>
            <Text style={styles.emoji}>{mode?.emoji}</Text>
          </View>
          <ThemedText type="mediumBold" style={styles.title}>
            Game in Progress
          </ThemedText>

          <ThemedText type="smallBold" themeColor="textSecondary">
            {mode?.name ?? "Game"}
            {active.timed ? " (Timed)" : ""}
          </ThemedText>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <ThemedText type="subtitle" style={styles.statValue}>
                {Math.min(roundIdx + 1, totalRounds)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                of {totalRounds}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            <View style={styles.stat}>
              <ThemedText type="subtitle" style={styles.statValue}>
                {active.totalPoints}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                points
              </ThemedText>
            </View>
          </View>

          <ThemedText themeColor="textSecondary" style={styles.teamLabel}>
            {currentRound.yearID} {currentRound.teamName}
          </ThemedText>

          <Button
            testID="resume-continue"
            title={isFinalRound ? "Finish" : "Continue"}
            onPress={handleContinue}
            style={styles.continueButton}
          />

          <Pressable
            testID="resume-abandon"
            accessibilityRole="button"
            onPress={abandonGame}
            style={({ pressed }) => [
              styles.abandonButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.abandonText, { color: theme.danger }]}>
              Abandon Game
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 32,
    borderCurve: "continuous",
    padding: Spacing.four,
    alignItems: "center",
    gap: Spacing.two,
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
  },
  emojiTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
  },
  emoji: {
    fontSize: 30,
  },
  title: {
    marginBottom: -Spacing.one,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.five,
    marginVertical: Spacing.two,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
  },
  teamLabel: {
    marginBottom: Spacing.two,
  },
  continueButton: {
    alignSelf: "stretch",
    borderRadius: Radius.pill,
  },
  abandonButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  abandonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.6,
  },
});
