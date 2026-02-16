import { useSelector } from "@legendapp/state/react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import gameModes from "@/metadata/game-modes.json";
import { currentRound$, game$ } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const activeModes = gameModes as GameMode[];

const BAR_BG = "#2563EB";

type Props = {
  hint: React.ReactNode;
  /** Optional right-side content (e.g. timer) rendered after the stats */
  trailing?: React.ReactNode;
};

export function GameStatusBar({ hint, trailing }: Props) {
  const active = useSelector(() => game$.active.get());
  const roundIdx = useSelector(currentRound$);
  const router = useRouter();

  if (!active || active.finished) return null;

  const mode = activeModes.find((m) => m.id === active.modeId);

  return (
    <Pressable
      onPress={() => router.push("/game/summary")}
      style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.left}>
          <Text style={styles.emoji}>{mode?.emoji}</Text>
          <Text style={styles.label}>{mode?.name ?? "Game"}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.stat}>
            Rd {roundIdx + 1}/{mode?.rounds ?? 9}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.stat}>{active.totalPoints} pts</Text>
          {trailing}
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
    backgroundColor: BAR_BG,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 4,
  },
  barPressed: {
    opacity: 0.85,
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
    fontSize: 14,
    fontWeight: "700",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stat: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  hint: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13,
    fontWeight: "500",
  },
  hintRow: {
    gap: 2,
  },
});
