import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

type Team = {
  teamID: string;
  name: string;
  lgID: string;
  divID: string;
  W: number;
  L: number;
};

type Section = {
  title: string;
  data: Team[];
};

const DIVISION_LABELS: Record<string, string> = {
  "AL-E": "AL East",
  "AL-C": "AL Central",
  "AL-W": "AL West",
  "NL-E": "NL East",
  "NL-C": "NL Central",
  "NL-W": "NL West",
};

const DIVISION_ORDER = ["AL-E", "AL-C", "AL-W", "NL-E", "NL-C", "NL-W"];

export default function TeamsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    db.getAllAsync<Team>(
      `SELECT teamID, name, lgID, divID, W, L
       FROM Teams
       WHERE yearID = 2025
       ORDER BY lgID, divID, W DESC`
    ).then((teams) => {
      const grouped: Record<string, Team[]> = {};
      for (const team of teams) {
        const key = `${team.lgID}-${team.divID}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(team);
      }
      setSections(
        DIVISION_ORDER
          .filter((key) => grouped[key])
          .map((key) => ({
            title: DIVISION_LABELS[key] ?? key,
            data: grouped[key],
          }))
      );
    });
  }, [db]);

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.teamID}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" style={styles.sectionHeader}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/team/[teamID]",
                params: { teamID: item.teamID, teamName: item.name },
              })
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedView type="backgroundElement" style={styles.teamRow}>
              <ThemedText style={styles.teamName}>{item.name}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {item.W}-{item.L}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  sectionHeader: {
    textTransform: "uppercase",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  sectionFooter: {
    height: Spacing.two,
  },
  teamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginVertical: Spacing.half,
  },
  teamName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
