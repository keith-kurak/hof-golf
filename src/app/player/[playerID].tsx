import { useLocalSearchParams, Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { YearPicker } from "@/components/year-picker";
import { Spacing } from "@/constants/theme";

type Bio = {
  nameFirst: string;
  nameLast: string;
  bats: string | null;
  throws: string | null;
  debut: string | null;
  finalGame: string | null;
};

type BattingStats = {
  G: number | null;
  AB: number | null;
  R: number | null;
  H: number | null;
  "2B": number | null;
  "3B": number | null;
  HR: number | null;
  RBI: number | null;
  BB: number | null;
  SO: number | null;
  SB: number | null;
};

type PitchingStats = {
  W: number | null;
  L: number | null;
  G: number | null;
  GS: number | null;
  SV: number | null;
  IPouts: number | null;
  SO: number | null;
  BB: number | null;
  H: number | null;
  HR: number | null;
  ER: number | null;
};

const BATTING_QUERY = `SELECT SUM(G) as G, SUM(AB) as AB, SUM(R) as R, SUM(H) as H,
  SUM("2B") as "2B", SUM("3B") as "3B", SUM(HR) as HR, SUM(RBI) as RBI,
  SUM(BB) as BB, SUM(SO) as SO, SUM(SB) as SB
  FROM Batting WHERE playerID = ?`;

const PITCHING_QUERY = `SELECT SUM(W) as W, SUM(L) as L, SUM(G) as G, SUM(GS) as GS,
  SUM(SV) as SV, SUM(IPouts) as IPouts, SUM(SO) as SO, SUM(BB) as BB,
  SUM(H) as H, SUM(HR) as HR, SUM(ER) as ER
  FROM Pitching WHERE playerID = ?`;

function formatAvg(h: number | null, ab: number | null): string {
  if (!ab) return "—";
  return (h! / ab).toFixed(3).replace(/^0/, "");
}

function formatEra(er: number | null, ipouts: number | null): string {
  if (!ipouts) return "—";
  return ((er! * 9) / (ipouts / 3)).toFixed(2);
}

function formatIP(ipouts: number | null): string {
  if (ipouts == null) return "—";
  const full = Math.floor(ipouts / 3);
  const remainder = ipouts % 3;
  return remainder === 0 ? `${full}` : `${full}.${remainder}`;
}

function statVal(v: number | null): string {
  return v != null ? String(v) : "—";
}

function StatTable({
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

function battingHeaders(): string[] {
  return ["G", "AB", "R", "H", "2B", "3B", "HR", "RBI", "BB", "SO", "SB", "AVG"];
}

function battingValues(s: BattingStats): string[] {
  return [
    statVal(s.G), statVal(s.AB), statVal(s.R), statVal(s.H),
    statVal(s["2B"]), statVal(s["3B"]), statVal(s.HR), statVal(s.RBI),
    statVal(s.BB), statVal(s.SO), statVal(s.SB), formatAvg(s.H, s.AB),
  ];
}

function pitchingHeaders(): string[] {
  return ["W", "L", "ERA", "G", "GS", "SV", "IP", "SO", "BB", "H", "HR"];
}

function pitchingValues(s: PitchingStats): string[] {
  return [
    statVal(s.W), statVal(s.L), formatEra(s.ER, s.IPouts),
    statVal(s.G), statVal(s.GS), statVal(s.SV), formatIP(s.IPouts),
    statVal(s.SO), statVal(s.BB), statVal(s.H), statVal(s.HR),
  ];
}

function hasData(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  return Object.values(row).some((v) => v != null && v !== 0);
}

export default function PlayerDetailScreen() {
  const {
    playerID,
    playerName,
    year: yearParam,
  } = useLocalSearchParams<{
    playerID: string;
    playerName?: string;
    year?: string;
  }>();
  const db = useSQLiteContext();
  const [year, setYear] = useState(yearParam ? Number(yearParam) : 2025);
  const [bio, setBio] = useState<Bio | null>(null);
  const [yearBatting, setYearBatting] = useState<BattingStats | null>(null);
  const [yearPitching, setYearPitching] = useState<PitchingStats | null>(null);
  const [careerBatting, setCareerBatting] = useState<BattingStats | null>(null);
  const [careerPitching, setCareerPitching] = useState<PitchingStats | null>(null);

  useEffect(() => {
    db.getFirstAsync<Bio>(
      `SELECT nameFirst, nameLast, bats, throws, debut, finalGame FROM People WHERE playerID = ?`,
      [playerID]
    ).then(setBio);

    db.getFirstAsync<BattingStats>(BATTING_QUERY, [playerID]).then((r) =>
      setCareerBatting(hasData(r) ? r : null)
    );
    db.getFirstAsync<PitchingStats>(PITCHING_QUERY, [playerID]).then((r) =>
      setCareerPitching(hasData(r) ? r : null)
    );
  }, [db, playerID]);

  useEffect(() => {
    db.getFirstAsync<BattingStats>(BATTING_QUERY + " AND yearID = ?", [
      playerID,
      year,
    ]).then((r) => setYearBatting(hasData(r) ? r : null));

    db.getFirstAsync<PitchingStats>(PITCHING_QUERY + " AND yearID = ?", [
      playerID,
      year,
    ]).then((r) => setYearPitching(hasData(r) ? r : null));
  }, [db, playerID, year]);

  const displayName =
    playerName ?? (bio ? `${bio.nameFirst} ${bio.nameLast}` : playerID);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: displayName }} />
      <ScrollView contentContainerStyle={styles.content}>
        <YearPicker year={year} onYearChange={setYear} />

        {bio && (
          <View style={styles.bioSection}>
            <ThemedText type="default">
              B/T: {bio.bats ?? "—"}/{bio.throws ?? "—"}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Debut: {bio.debut ?? "—"}
              {"  "}Final: {bio.finalGame ?? "—"}
            </ThemedText>
          </View>
        )}

        {yearBatting && (
          <StatTable
            title={`${year} Batting`}
            headers={battingHeaders()}
            values={battingValues(yearBatting)}
          />
        )}

        {yearPitching && (
          <StatTable
            title={`${year} Pitching`}
            headers={pitchingHeaders()}
            values={pitchingValues(yearPitching)}
          />
        )}

        {careerBatting && (
          <StatTable
            title="Career Batting"
            headers={battingHeaders()}
            values={battingValues(careerBatting)}
          />
        )}

        {careerPitching && (
          <StatTable
            title="Career Pitching"
            headers={pitchingHeaders()}
            values={pitchingValues(careerPitching)}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  bioSection: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
});

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
