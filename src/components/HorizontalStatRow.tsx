import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

export function HorizontalStatRow({
  title,
  headers,
  values,
}: {
  title: string;
  headers: string[];
  values: string[];
}) {
  return (
    <View style={statStyles.section}>
      <ThemedText type="smallBold" style={statStyles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedView type="backgroundElement" style={statStyles.table}>
        <View style={statStyles.row}>
          {headers.map((h) => (
            <ThemedText
              key={h}
              type="smallBold"
              themeColor="textSecondary"
              style={statStyles.cell}
            >
              {h}
            </ThemedText>
          ))}
        </View>
        <View style={statStyles.row}>
          {values.map((v, i) => (
            <ThemedText key={i} type="code" style={statStyles.cell}>
              {v}
            </ThemedText>
          ))}
        </View>
      </ThemedView>
    </View>
  );
}

const statStyles = StyleSheet.create({
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  table: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    textAlign: "center",
    paddingVertical: Spacing.one,
  },
});
