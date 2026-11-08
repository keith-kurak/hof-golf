import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import gameModes from "@/metadata/game-modes.json";
import type { SavedGame } from "@/store/game-store";
import type { GameMode } from "@/store/starting-pools";

const modes = gameModes as GameMode[];

/** Width of the card in points. The image is captured at the screen scale. */
export const SCORE_CARD_WIDTH = 360;

// Fixed colors: the shared image looks the same in light and dark mode.
const PURPLE = "#3F2F8F";
const PURPLE_LIGHT = "#5A49B8";
const GREEN = "#16A34A";
const INK = "#1C1C1E";
const MUTED = "#6C6C70";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The graphic for a shared score: the final score and a golf-style
 * scorecard with the points of each round ("hole").
 */
export function ScoreCard({ game }: { game: SavedGame }) {
  const mode = modes.find((m) => m.id === game.modeId);
  const totalRounds = mode?.rounds ?? game.rounds.length;
  const first = game.rounds[0];
  const last = game.rounds.at(-1);
  const wins = game.rounds.reduce((s, r) => s + (r.teamW ?? 0), 0);
  const losses = game.rounds.reduce((s, r) => s + (r.teamL ?? 0), 0);

  const holes = game.rounds.map((round, i) => ({
    label: i < totalRounds ? String(i + 1) : "F",
    points: round.timedOut ? 0 : round.pointsEarned,
  }));

  return (
    <View style={styles.card} collapsable={false}>
      {/* Decoration: two large soft circles, like a ball on the green */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      <View style={styles.brandRow}>
        <Image
          source={require("@/assets/ios-light.png")}
          style={styles.icon}
          contentFit="cover"
        />
        <View style={styles.brandText}>
          <Text style={styles.brand} numberOfLines={1}>
            {mode?.name ?? "HOF Golf"} {mode?.emoji}
          </Text>
          <Text style={styles.date}>{formatDate(game.finishedAt)}</Text>
        </View>
      </View>

      <View style={styles.scoreBlock}>
        <Text style={styles.score}>{game.totalPoints}</Text>
        <Text style={styles.pointsLabel}>
          POINTS{game.bonusPoints > 0 ? `  ·  +${game.bonusPoints} BONUS` : ""}
        </Text>
      </View>

      {first && last && (
        <Text style={styles.route} numberOfLines={2}>
          {first.yearID} {first.teamName} → {last.yearID} {last.teamName}
        </Text>
      )}

      <View style={styles.scorecard}>
        <View style={[styles.gridRow, styles.gridHeader]}>
          <Text style={[styles.gridLabel, styles.headerText]}>HOLE</Text>
          {holes.map((h, i) => (
            <Text key={i} style={[styles.cell, styles.headerText]}>
              {h.label}
            </Text>
          ))}
          <Text style={[styles.totalCell, styles.headerText]}>TOT</Text>
        </View>
        <View style={styles.gridRow}>
          <Text style={[styles.gridLabel, styles.labelText]}>PTS</Text>
          {holes.map((h, i) => (
            <View key={i} style={styles.cell}>
              <Text
                style={[styles.cellText, h.points > 0 && styles.cellScored]}
              >
                {h.points}
              </Text>
            </View>
          ))}
          <Text style={[styles.totalCell, styles.totalText]}>
            {game.totalPoints}
          </Text>
        </View>
      </View>

      <View>
        <Text style={styles.footer}>
          {game.timed ? "Timed" : "Untimed"} · {formatDuration(game.finishedAt - game.startedAt)} · W-L {wins}-{losses}
        </Text>
        <Text style={styles.appName}>HOF GOLF</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCORE_CARD_WIDTH,
    backgroundColor: PURPLE,
    borderRadius: 28,
    borderCurve: "continuous",
    padding: 20,
    gap: 18,
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: PURPLE_LIGHT,
    opacity: 0.45,
  },
  circleTop: {
    width: 260,
    height: 260,
    top: -120,
    right: -90,
  },
  circleBottom: {
    width: 200,
    height: 200,
    bottom: -110,
    left: -70,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  brand: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  date: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  scoreBlock: {
    alignItems: "center",
  },
  brandText: {
    flex: 1,
  },
  appName: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 4,
  },
  score: {
    color: "#ffffff",
    fontSize: 104,
    lineHeight: 112,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  pointsLabel: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  route: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  scorecard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  gridHeader: {
    backgroundColor: GREEN,
  },
  gridLabel: {
    width: 38,
  },
  headerText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  labelText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    textAlign: "center",
  },
  cellText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  cellScored: {
    color: INK,
    fontWeight: "800",
  },
  totalCell: {
    width: 36,
    textAlign: "center",
  },
  totalText: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  footer: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
