import * as Haptics from "expo-haptics";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  title: string;
  onPress: () => void;
  testID?: string;
  /** "filled" uses the tint color; "plain" is a text-only button */
  variant?: "filled" | "tinted" | "plain";
  icon?: SymbolViewProps["name"];
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Large capsule button for primary actions (Play, Continue, Done). */
export function Button({
  title,
  onPress,
  testID,
  variant = "filled",
  icon,
  loading = false,
  disabled = false,
  style,
}: Props) {
  const theme = useTheme();
  const filled = variant === "filled";
  const tinted = variant === "tinted";
  const color = filled ? "#ffffff" : theme.tint;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        variant === "plain" ? styles.plain : styles.large,
        filled && { backgroundColor: theme.tint },
        tinted && { backgroundColor: theme.tintMuted },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* The label keeps its place while loading so the button keeps its size */}
      <View style={[styles.content, loading && styles.hidden]}>
        {icon && (
          <SymbolView
            name={icon}
            size={18}
            weight="semibold"
            tintColor={color}
            fallback={null}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}
        <Text
          style={[
            variant === "plain" ? styles.plainLabel : styles.label,
            { color },
          ]}
        >
          {title}
        </Text>
      </View>
      {loading && (
        <View style={styles.spinner}>
          <ActivityIndicator color={color} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  large: {
    minHeight: 54,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
  plain: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  label: {
    fontSize: 17,
    fontWeight: "600",
  },
  plainLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  hidden: {
    opacity: 0,
  },
  spinner: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
