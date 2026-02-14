import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { YearPicker } from "@/components/year-picker";
import { Spacing } from "@/constants/theme";

type Player = {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  bats: string | null;
  throws: string | null;
  G_all: number;
  positions: string;
};

function formatPositions(row: Player): string {
  return row.positions || "—";
}

export default function TeamRosterScreen() {
  const { teamID, teamName, year: yearParam } = useLocalSearchParams<{
    teamID: string;
    teamName?: string;
    year?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [year, setYear] = useState(yearParam ? Number(yearParam) : 2025);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    db.getAllAsync<Player>(
      `SELECT
         a.playerID,
         p.nameFirst,
         p.nameLast,
         p.bats,
         p.throws,
         a.G_all,
         CASE
           WHEN COALESCE(a.G_p, 0) >= COALESCE(a.G_c, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_1b, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_2b, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_3b, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_ss, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_lf, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_cf, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_p, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_p, 0) > 0 THEN 'P'
           WHEN COALESCE(a.G_c, 0) >= COALESCE(a.G_1b, 0)
             AND COALESCE(a.G_c, 0) >= COALESCE(a.G_2b, 0)
             AND COALESCE(a.G_c, 0) >= COALESCE(a.G_3b, 0)
             AND COALESCE(a.G_c, 0) >= COALESCE(a.G_ss, 0)
             AND COALESCE(a.G_c, 0) >= COALESCE(a.G_lf, 0)
             AND COALESCE(a.G_c, 0) >= COALESCE(a.G_cf, 0)
             AND COALESCE(a.G_c, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_c, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_c, 0) > 0 THEN 'C'
           WHEN COALESCE(a.G_1b, 0) >= COALESCE(a.G_2b, 0)
             AND COALESCE(a.G_1b, 0) >= COALESCE(a.G_3b, 0)
             AND COALESCE(a.G_1b, 0) >= COALESCE(a.G_ss, 0)
             AND COALESCE(a.G_1b, 0) >= COALESCE(a.G_lf, 0)
             AND COALESCE(a.G_1b, 0) >= COALESCE(a.G_cf, 0)
             AND COALESCE(a.G_1b, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_1b, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_1b, 0) > 0 THEN '1B'
           WHEN COALESCE(a.G_2b, 0) >= COALESCE(a.G_3b, 0)
             AND COALESCE(a.G_2b, 0) >= COALESCE(a.G_ss, 0)
             AND COALESCE(a.G_2b, 0) >= COALESCE(a.G_lf, 0)
             AND COALESCE(a.G_2b, 0) >= COALESCE(a.G_cf, 0)
             AND COALESCE(a.G_2b, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_2b, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_2b, 0) > 0 THEN '2B'
           WHEN COALESCE(a.G_3b, 0) >= COALESCE(a.G_ss, 0)
             AND COALESCE(a.G_3b, 0) >= COALESCE(a.G_lf, 0)
             AND COALESCE(a.G_3b, 0) >= COALESCE(a.G_cf, 0)
             AND COALESCE(a.G_3b, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_3b, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_3b, 0) > 0 THEN '3B'
           WHEN COALESCE(a.G_ss, 0) >= COALESCE(a.G_lf, 0)
             AND COALESCE(a.G_ss, 0) >= COALESCE(a.G_cf, 0)
             AND COALESCE(a.G_ss, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_ss, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_ss, 0) > 0 THEN 'SS'
           WHEN COALESCE(a.G_lf, 0) >= COALESCE(a.G_cf, 0)
             AND COALESCE(a.G_lf, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_lf, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_lf, 0) > 0 THEN 'LF'
           WHEN COALESCE(a.G_cf, 0) >= COALESCE(a.G_rf, 0)
             AND COALESCE(a.G_cf, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_cf, 0) > 0 THEN 'CF'
           WHEN COALESCE(a.G_rf, 0) >= COALESCE(a.G_dh, 0)
             AND COALESCE(a.G_rf, 0) > 0 THEN 'RF'
           WHEN COALESCE(a.G_dh, 0) > 0 THEN 'DH'
           ELSE '—'
         END as positions
       FROM Appearances a
       JOIN People p ON a.playerID = p.playerID
       WHERE a.yearID = ? AND a.teamID = ?
       ORDER BY a.G_all DESC`,
      [year, teamID]
    ).then(setPlayers);
  }, [db, teamID, year]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: teamName ?? teamID }} />
      <FlatList
        data={players}
        keyExtractor={(item) => item.playerID}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
          <YearPicker year={year} onYearChange={setYear} />
          <View style={styles.headerRow}>
            <ThemedText type="smallBold" style={styles.posCol}>
              POS
            </ThemedText>
            <ThemedText type="smallBold" style={styles.nameCol}>
              Player
            </ThemedText>
            <ThemedText type="smallBold" style={styles.statCol}>
              G
            </ThemedText>
            <ThemedText type="smallBold" style={styles.statCol}>
              B/T
            </ThemedText>
          </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/player/[playerID]",
                params: {
                  playerID: item.playerID,
                  playerName: `${item.nameFirst} ${item.nameLast}`,
                  year: String(year),
                },
              })
            }
          >
            <ThemedView type="backgroundElement" style={styles.playerRow}>
              <ThemedText
                type="code"
                themeColor="textSecondary"
                style={styles.posCol}
              >
                {formatPositions(item)}
              </ThemedText>
              <ThemedText style={styles.nameCol}>
                {item.nameFirst} {item.nameLast}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small" style={styles.statCol}>
                {item.G_all}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small" style={styles.statCol}>
                {item.bats ?? "—"}/{item.throws ?? "—"}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.one,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginVertical: Spacing.half,
  },
  posCol: {
    width: 36,
  },
  nameCol: {
    flex: 1,
  },
  statCol: {
    width: 40,
    textAlign: "center",
  },
});
