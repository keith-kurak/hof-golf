import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { AwardKey, AwardSeason, PlayerAward } from "@/util/awards";

/** Accent color per award, used for the left bar and the count badge. */
const AWARD_COLORS: Record<AwardKey, string> = {
  MVP: "#8B5CF6",
  CY: "#3B82F6",
  ROY: "#10B981",
  GG: "#D4AF37",
  AS: "#E53935",
};

/** Awards with this many seasons or fewer show them on the title line. */
const MAX_INLINE_SEASONS = 2;

/** "1970", "1970 SS" (Gold Glove position), or "1960 ×2" (two All-Star games). */
function seasonLabel(s: AwardSeason) {
  return s.note ? `${s.yearID} ${s.note}` : String(s.yearID);
}

function SeasonChips({ seasons }: { seasons: AwardSeason[] }) {
  return (
    <View style={styles.chips}>
      {seasons.map((s) => (
        <ThemedView
          key={`${s.yearID}-${s.note ?? ""}`}
          type="backgroundElement"
          style={styles.chip}
        >
          <ThemedText type="tiny">{seasonLabel(s)}</ThemedText>
        </ThemedView>
      ))}
    </View>
  );
}

function AwardRow({ award }: { award: PlayerAward }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const color = AWARD_COLORS[award.key];
  const testID = `award-${award.key}`;

  if (award.seasons.length <= MAX_INLINE_SEASONS) {
    return (
      <View
        style={[styles.awardRow, styles.awardHeader, { borderLeftColor: color }]}
        testID={testID}
      >
        <ThemedText type="small">{award.label}</ThemedText>
        <SeasonChips seasons={award.seasons} />
      </View>
    );
  }

  return (
    <View style={[styles.awardRow, { borderLeftColor: color }]}>
      <Pressable
        testID={testID}
        onPress={() => setExpanded((v) => !v)}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${award.label}, ${award.seasons.length} times`}
        style={({ pressed }) => [styles.awardHeader, pressed && styles.pressed]}
      >
        <ThemedText type="small">{award.label}</ThemedText>
        <View style={[styles.countBadge, { backgroundColor: color }]}>
          <ThemedText type="tinyBold" style={styles.countText}>
            {award.seasons.length}×
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded && <SeasonChips seasons={award.seasons} />}
    </View>
  );
}

export function PlayerAwards({ awards }: { awards: PlayerAward[] }) {
  if (awards.length === 0) return null;

  return (
    <View style={styles.section} testID="player-awards">
      <ThemedText type="smallBold">Awards</ThemedText>
      {awards.map((award) => (
        <AwardRow key={award.key} award={award} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  awardRow: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.two,
    gap: Spacing.one,
  },
  awardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.two,
  },
  countBadge: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  countText: {
    color: "#ffffff",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  chip: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
