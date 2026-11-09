import { useSelector } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import gameModes from "@/metadata/game-modes.json";
import { currentRound$, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = gameModes as GameMode[];

type Props = {
  hint: React.ReactNode;
  /** Optional right-side content (e.g. timer) rendered after the stats */
  trailing?: React.ReactNode;
};

export function GameStatusBar({ hint, trailing }: Props) {
  const active = useSelector(() => game$.active.get());
  const roundIdx = useSelector(currentRound$);
  const router = useRouter();
  const theme = useTheme();

  if (!active || active.finished) return null;

  const mode = activeModes.find((m) => m.id === active.modeId);

  return (
    <Pressable
      testID="game-status-bar"
      onPress={() => router.push("/game/summary")}
      accessibilityHint="Shows the game summary"
      style={({ pressed }) => [
        styles.bar,
        { backgroundColor: theme.tint },
        pressed && styles.barPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.left}>
          <Text style={styles.emoji}>{mode?.emoji}</Text>
          <Text style={styles.label}>{mode?.name ?? "Game"}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.stat}>
            Rd {Math.min(roundIdx + 1, mode?.rounds ?? 0)}/{mode?.rounds ?? 0}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.stat}>{active.totalPoints} pts</Text>
          {trailing}
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
            size={11}
            weight="bold"
            tintColor="rgba(255, 255, 255, 0.7)"
            fallback={null}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      </View>
      {typeof hint === "string" ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : (
        <View style={styles.hintRow}>{hint}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    gap: 4,
    borderRadius: Radius.medium + 4,
    borderCurve: "continuous",
    boxShadow: "0 4px 14px rgba(40, 20, 120, 0.25)",
  },
  barPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stat: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  hint: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "500",
  },
  hintRow: {
    gap: 2,
  },
});
