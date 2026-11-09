import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  /** testID for the segment (regression scripts tap segments by id) */
  testID?: string;
};

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
};

/**
 * iOS-style segmented control: a grey track with a raised pill on the
 * selected segment. Each segment is its own pressable so it can carry a
 * testID, which a native SwiftUI/Compose picker cannot do per segment.
 */
export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: Props<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: theme.fill }]}
    >
      {options.map((option) => {
        const isActive = option.value === selected;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (isActive) return;
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onSelect(option.value);
            }}
            style={[
              styles.segment,
              isActive && [
                styles.segmentActive,
                { backgroundColor: theme.segmentSelected },
              ],
            ]}
          >
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.label,
                { color: theme.text },
                isActive && styles.labelActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: Radius.small,
    borderCurve: "continuous",
    padding: 2,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.small - 2,
    borderCurve: "continuous",
  },
  segmentActive: {
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.04)",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  labelActive: {
    fontWeight: "600",
  },
});
