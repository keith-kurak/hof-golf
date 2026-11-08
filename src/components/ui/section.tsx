import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import {
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
  /** Small uppercase label above the card */
  title?: string;
  /** Small text below the card */
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Inset grouped section: an optional header, a rounded card, an optional footer. */
export function Section({ title, footer, children, style, contentStyle }: Props) {
  const theme = useTheme();
  return (
    <View style={style}>
      {title && (
        <Text style={[styles.header, { color: theme.textSecondary }]}>
          {title}
        </Text>
      )}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement },
          contentStyle,
        ]}
      >
        {children}
      </View>
      {footer && (
        <Text style={[styles.footer, { color: theme.textSecondary }]}>
          {footer}
        </Text>
      )}
    </View>
  );
}

/** Hairline between rows in a Section, inset from the leading edge. */
export function Separator({ inset = Spacing.three }: { inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        marginLeft: inset,
        backgroundColor: theme.separator,
      }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginLeft: Spacing.three,
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  rowSeparator: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  listHeader: {
    marginTop: Spacing.four,
  },
  footer: {
    fontSize: 13,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
});

/**
 * Corner radius for a row in an inset grouped list (SectionList / FlatList),
 * where each row is its own view: round the first and the last row.
 */
export function groupedRowCorners(index: number, count: number): ViewStyle {
  const r = Radius.card;
  return {
    borderTopLeftRadius: index === 0 ? r : 0,
    borderTopRightRadius: index === 0 ? r : 0,
    borderBottomLeftRadius: index === count - 1 ? r : 0,
    borderBottomRightRadius: index === count - 1 ? r : 0,
    borderCurve: "continuous",
  };
}

/** Section header text for inset grouped lists. */
export function GroupedHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text
      style={[styles.header, styles.listHeader, { color: theme.textSecondary }]}
    >
      {title}
    </Text>
  );
}

type GroupedRowProps = {
  index: number;
  count: number;
  onPress?: () => void;
  testID?: string;
  /** Show a trailing chevron (navigation rows) */
  chevron?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Leading inset of the separator below this row */
  separatorInset?: number;
};

/** A pressable row in an inset grouped list, with a separator below it. */
export function GroupedRow({
  index,
  count,
  onPress,
  testID,
  chevron = false,
  children,
  style,
  separatorInset = Spacing.three,
}: GroupedRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        groupedRowCorners(index, count),
        {
          backgroundColor: pressed
            ? theme.backgroundSelected
            : theme.backgroundElement,
        },
        style,
      ]}
    >
      {children}
      {chevron && (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          size={13}
          weight="semibold"
          tintColor={theme.textSecondary}
          fallback={null}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      {index < count - 1 && (
        <View
          style={[
            styles.rowSeparator,
            { left: separatorInset, backgroundColor: theme.separator },
          ]}
        />
      )}
    </Pressable>
  );
}
