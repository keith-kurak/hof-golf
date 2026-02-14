import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { YearPicker } from "@/components/year-picker";
import { Spacing } from "@/constants/theme";
import { formatAvg, formatEra, formatIP, statVal } from "@/util/stats";

type Batter = {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  position: string;
  G: number;
  HR: number | null;
  RBI: number | null;
  SB: number | null;
  H: number | null;
  AB: number | null;
};

type Pitcher = {
  playerID: string;
  nameFirst: string;
  nameLast: string;
  G: number;
  ER: number | null;
  IPouts: number | null;
  SO: number | null;
  SV: number | null;
};

type RosterPlayer = Batter | Pitcher;
type Section = { title: string; data: RosterPlayer[] };

const POSITION_CASE = `CASE
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
END`;

const BATTERS_QUERY = `SELECT
  a.playerID, p.nameFirst, p.nameLast, a.G_all as G,
  ${POSITION_CASE} as position,
  b.HR, b.RBI, b.SB, b.H, b.AB
FROM Appearances a
JOIN People p ON a.playerID = p.playerID
LEFT JOIN (
  SELECT playerID, teamID, yearID,
    SUM(HR) as HR, SUM(RBI) as RBI, SUM(SB) as SB, SUM(H) as H, SUM(AB) as AB
  FROM Batting GROUP BY playerID, teamID, yearID
) b ON a.playerID = b.playerID AND a.teamID = b.teamID AND a.yearID = b.yearID
WHERE a.yearID = ? AND a.teamID = ?
  AND COALESCE(a.G_p, 0) < COALESCE(a.G_all, 0) - COALESCE(a.G_p, 0)
ORDER BY a.G_all DESC`;

const PITCHERS_QUERY = `SELECT
  a.playerID, p.nameFirst, p.nameLast, a.G_all as G,
  pi.ER, pi.IPouts, pi.SO, pi.SV
FROM Appearances a
JOIN People p ON a.playerID = p.playerID
LEFT JOIN (
  SELECT playerID, teamID, yearID,
    SUM(ER) as ER, SUM(IPouts) as IPouts, SUM(SO) as SO, SUM(SV) as SV
  FROM Pitching GROUP BY playerID, teamID, yearID
) pi ON a.playerID = pi.playerID AND a.teamID = pi.teamID AND a.yearID = pi.yearID
WHERE a.yearID = ? AND a.teamID = ?
  AND COALESCE(a.G_p, 0) >= COALESCE(a.G_all, 0) - COALESCE(a.G_p, 0)
  AND COALESCE(a.G_p, 0) > 0
ORDER BY a.G_all DESC`;

const BATTER_HEADERS = ["", "", "G", "HR", "RBI", "AVG", "SB"] as const;
const PITCHER_HEADERS = ["", "", "G", "ERA", "IP", "K", "SV"] as const;

export default function TeamRosterScreen() {
  const {
    teamID,
    teamName,
    year: yearParam,
  } = useLocalSearchParams<{
    teamID: string;
    teamName?: string;
    year?: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [year, setYear] = useState(yearParam ? Number(yearParam) : 2025);
  const [batters, setBatters] = useState<Batter[]>([]);
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);

  useEffect(() => {
    db.getAllAsync<Batter>(BATTERS_QUERY, [year, teamID]).then(setBatters);
    db.getAllAsync<Pitcher>(PITCHERS_QUERY, [year, teamID]).then(setPitchers);
  }, [db, teamID, year]);

  const sections: Section[] = [
    { title: "Batters", data: batters },
    { title: "Pitchers", data: pitchers },
  ];

  const navigateToPlayer = (playerID: string, name: string) =>
    router.push({
      pathname: "/player/[playerID]",
      params: { playerID, playerName: name, year: String(year) },
    });

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: teamName ?? teamID }} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.playerID}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={<YearPicker year={year} onYearChange={setYear} />}
        renderSectionHeader={({ section }) => (
          <>
            <ThemedView style={styles.headerRow}>
              <ThemedText type="smallBold" style={styles.posCol}></ThemedText>
              <ThemedText type="smallBold" style={styles.nameCol}></ThemedText>
              {(section.title === "Batters" ? BATTER_HEADERS : PITCHER_HEADERS)
                .slice(2)
                .map((h) => (
                  <ThemedText key={h} type="smallBold" style={styles.statCol}>
                    {h}
                  </ThemedText>
                ))}
            </ThemedView>
          </>
        )}
        renderItem={({ item, section }) => {
          const name = `${item.nameFirst} ${item.nameLast}`;
          if (section.title === "Batters") {
            const b = item as Batter;
            return (
              <Pressable onPress={() => navigateToPlayer(b.playerID, name)}>
                <ThemedView type="backgroundElement" style={styles.playerRow}>
                  <ThemedText
                    type="code"
                    themeColor="textSecondary"
                    style={styles.posCol}
                  >
                    {b.position}
                  </ThemedText>
                  <ThemedText style={styles.nameCol}>{name}</ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {b.G}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {statVal(b.HR)}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {statVal(b.RBI)}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {formatAvg(b.H, b.AB)}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.statCol}
                  >
                    {statVal(b.SB)}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          }
          const p = item as Pitcher;
          return (
            <Pressable onPress={() => navigateToPlayer(p.playerID, name)}>
              <ThemedView type="backgroundElement" style={styles.playerRow}>
                <ThemedText
                  type="code"
                  themeColor="textSecondary"
                  style={styles.posCol}
                >
                  P
                </ThemedText>
                <ThemedText style={styles.nameCol}>{name}</ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {p.G}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {formatEra(p.ER, p.IPouts)}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {formatIP(p.IPouts)}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {statVal(p.SO)}
                </ThemedText>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.statCol}
                >
                  {statVal(p.SV)}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        }}
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
  sectionTitle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
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
    width: 28,
  },
  nameCol: {
    flex: 1,
  },
  statCol: {
    width: 40,
    textAlign: "center",
  },
});
