import { StyleSheet, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  emoji?: string;
  name: string;
  points: number;
  /** Small label/value pairs under the score (round, time, W-L) */
  stats: { label: string; value: string }[];
  footnote?: string;
};

/** Score card at the top of the game summary and game details screens. */
export function GameScoreHeader({ emoji, name, points, stats, footnote }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.top}>
        <View style={[styles.emojiTile, { backgroundColor: theme.tintMuted }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <ThemedText style={styles.name}>{name}</ThemedText>
        <View style={styles.score}>
          <Text style={[styles.points, { color: theme.tint }]}>{points}</Text>
          <ThemedText type="tiny" themeColor="textSecondary">
            PTS
          </ThemedText>
        </View>
      </View>
      <View style={[styles.stats, { borderTopColor: theme.separator }]}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <ThemedText type="tiny" themeColor="textSecondary">
              {s.label.toUpperCase()}
            </ThemedText>
            <ThemedText style={styles.statValue}>{s.value}</ThemedText>
          </View>
        ))}
      </View>
      {footnote && (
        <ThemedText type="small" themeColor="textSecondary">
          {footnote}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: Spacing.three,
    gap: Spacing.three,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  emojiTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 24,
  },
  name: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  score: {
    alignItems: "center",
  },
  points: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  stats: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
