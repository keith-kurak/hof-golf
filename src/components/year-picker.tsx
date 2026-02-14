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
          { backgroundColor: theme.backgroundElement },
          !canGoBack && styles.disabled,
          pressed && canGoBack && styles.pressed,
        ]}
        disabled={!canGoBack}
      >
        <ThemedText
          type="default"
          themeColor={canGoBack ? "text" : "textSecondary"}
        >
          {"<"}
        </ThemedText>
      </Pressable>
      <ThemedText type="subtitle" style={styles.year}>
        {year}
      </ThemedText>
      <Pressable
        onPress={() => canGoForward && onYearChange(year + 1)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.backgroundElement },
          !canGoForward && styles.disabled,
          pressed && canGoForward && styles.pressed,
        ]}
        disabled={!canGoForward}
      >
        <ThemedText
          type="default"
          themeColor={canGoForward ? "text" : "textSecondary"}
        >
          {">"}
        </ThemedText>
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
    minWidth: 80,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.7,
  },
});
