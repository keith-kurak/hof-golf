import { useSelector } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import gameModes from "@/metadata/game-modes.json";
import { abandonGame, currentRound$, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = (gameModes as GameMode[]).filter((m) => m.active);

export default function ResumeModal() {
  const theme = useTheme();
  const router = useRouter();
  const active = useSelector(() => game$.active.get());
  const roundIdx = useSelector(currentRound$);

  if (!active) {
    return null;
  }

  if (!active.rounds) {
    return null;
  }

  const mode = activeModes.find((m) => m.id === active.modeId);
  const currentRound = active.rounds[active.rounds.length - 1];

  const handleContinue = () => {
    router.back();
    // Small delay so the modal dismisses before pushing the new route
    setTimeout(() => {
      router.push({
        pathname: "/team/[teamID]",
        params: {
          teamID: currentRound.teamID,
          teamName: currentRound.teamName,
          year: String(currentRound.yearID),
        },
      });
    }, 100);
  };

  const handleAbandon = () => {
    abandonGame();
    router.back();
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.modal, { backgroundColor: theme.background }]}>
        <ThemedText type="mediumBold" style={styles.title}>
          Game in Progress
        </ThemedText>

        <ThemedText type="smallBold" themeColor="textSecondary">
          {mode?.name ?? "Game"}
          {active.timed ? " (Timed)" : ""}
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText type="subtitle">{roundIdx + 1}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              of {mode?.rounds ?? 9}
            </ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <ThemedText type="subtitle">{active.totalPoints}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              points
            </ThemedText>
          </View>
        </View>

        <ThemedText themeColor="textSecondary" style={styles.teamLabel}>
          {currentRound.yearID} {currentRound.teamName}
        </ThemedText>

        <Pressable
          onPress={handleContinue}
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
          onPress={handleAbandon}
          style={({ pressed }) => [
            styles.abandonButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="small" themeColor="textSecondary">
            Abandon Game
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: "center",
    gap: Spacing.two,
  },
  title: {
    marginBottom: Spacing.one,
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
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(128, 128, 128, 0.3)",
  },
  teamLabel: {
    marginBottom: Spacing.two,
  },
  continueButton: {
    width: "100%",
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  abandonButton: {
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
