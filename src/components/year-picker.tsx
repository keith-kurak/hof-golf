import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type YearPickerProps = {
  year: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
};

export function YearPicker({
  year,
  onYearChange,
  minYear = 1871,
  maxYear = 2025,
}: YearPickerProps) {
  const theme = useTheme();
  const canGoBack = year > minYear;
  const canGoForward = year < maxYear;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => canGoBack && onYearChange(year - 1)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.tintMuted },
          !canGoBack && styles.disabled,
          pressed && canGoBack && styles.pressed,
        ]}
        disabled={!canGoBack}
        accessibilityRole="button"
        accessibilityLabel="Previous year"
      >
        <SymbolView
          name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }}
          size={16}
          weight="bold"
          tintColor={theme.tint}
          fallback={null}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      <ThemedText type="subtitle" style={styles.year} accessibilityRole="header">
        {year}
      </ThemedText>
      <Pressable
        onPress={() => canGoForward && onYearChange(year + 1)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.tintMuted },
          !canGoForward && styles.disabled,
          pressed && canGoForward && styles.pressed,
        ]}
        disabled={!canGoForward}
        accessibilityRole="button"
        accessibilityLabel="Next year"
      >
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          size={16}
          weight="bold"
          tintColor={theme.tint}
          fallback={null}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.three,
    gap: Spacing.four,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  year: {
    minWidth: 96,
    textAlign: "center",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  disabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.7,
  },
});
