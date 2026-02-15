import { computed, observable } from "@legendapp/state";
import { synced } from "@legendapp/state/sync";
import { observablePersistSqlite } from "@legendapp/state/persist-plugins/expo-sqlite";
import Storage from "expo-sqlite/kv-store";

import gameModes from "@/metadata/game-modes.json";

import type { GameMode, StartingTeam } from "./starting-pools";
import type { RosterTarget } from "./roster-targets";

// ---------------------------------------------------------------------------
// Persistence setup
// ---------------------------------------------------------------------------

const plugin = observablePersistSqlite(Storage);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameRound = {
  teamID: string;
  teamName: string;
  yearID: number;
  pickedPlayerID: string | null;
  pickedPlayerName: string | null;
  targetsFound: RosterTarget[];
  pointsEarned: number;
};

export type ActiveGame = {
  id: string;
  modeId: string;
  startedAt: number;
  rounds: GameRound[];
  seenTargets: string[];
  totalPoints: number;
  finished: boolean;
};

export type SavedGame = {
  id: string;
  modeId: string;
  startedAt: number;
  finishedAt: number;
  totalPoints: number;
  rounds: GameRound[];
};

// ---------------------------------------------------------------------------
// Observable store
// ---------------------------------------------------------------------------

export const game$ = observable({
  active: synced<ActiveGame | null>({
    initial: null,
    persist: { name: "active-game", plugin },
  }),
  history: synced<SavedGame[]>({
    initial: [],
    persist: { name: "game-history", plugin },
  }),
  bestScores: synced<Record<string, number>>({
    initial: {},
    persist: { name: "best-scores", plugin },
  }),
});

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

export const isGameActive$ = computed(
  () => game$.active.get() !== null && !game$.active.finished.get(),
);

export const currentRound$ = computed(
  () => (game$.active.rounds.get()?.length ?? 0) - 1,
);

export function currentMode(): GameMode | undefined {
  const active = game$.active.get();
  if (!active) return undefined;
  return (gameModes as GameMode[]).find((m) => m.id === active.modeId);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function startGame(
  mode: GameMode,
  startingTeam: StartingTeam,
  targets: RosterTarget[],
) {
  const seenTargets = targets.map((t) => t.playerID);
  const pointsEarned = targets.reduce((sum, t) => sum + t.points, 0);

  const round0: GameRound = {
    teamID: startingTeam.teamID,
    teamName: startingTeam.teamName,
    yearID: startingTeam.yearID,
    pickedPlayerID: null,
    pickedPlayerName: null,
    targetsFound: targets,
    pointsEarned,
  };

  const active: ActiveGame = {
    id: `${mode.id}-${Date.now()}`,
    modeId: mode.id,
    startedAt: Date.now(),
    rounds: [round0],
    seenTargets,
    totalPoints: pointsEarned,
    finished: false,
  };

  game$.active.set(active);
}

export function pickPlayer(playerID: string, playerName: string) {
  const active = game$.active.get();
  if (!active || active.finished) return;

  const roundIdx = active.rounds.length - 1;
  game$.active.rounds[roundIdx].pickedPlayerID.set(playerID);
  game$.active.rounds[roundIdx].pickedPlayerName.set(playerName);
}

export function navigateToTeam(
  teamID: string,
  yearID: number,
  teamName: string,
  targets: RosterTarget[],
) {
  const active = game$.active.get();
  if (!active || active.finished) return;

  const seenSet = new Set(active.seenTargets);

  // Only score targets not already seen
  const newTargets = targets.filter((t) => !seenSet.has(t.playerID));
  const pointsEarned = newTargets.reduce((sum, t) => sum + t.points, 0);

  const newRound: GameRound = {
    teamID,
    teamName,
    yearID,
    pickedPlayerID: null,
    pickedPlayerName: null,
    targetsFound: targets, // all targets on roster (for display)
    pointsEarned, // only new ones count
  };

  // Update seen targets with all targets on this roster
  const updatedSeen = [
    ...active.seenTargets,
    ...targets
      .filter((t) => !seenSet.has(t.playerID))
      .map((t) => t.playerID),
  ];

  game$.active.rounds.push(newRound);
  game$.active.seenTargets.set(updatedSeen);
  game$.active.totalPoints.set(active.totalPoints + pointsEarned);

  // Auto-finish if we've completed all rounds
  const mode = currentMode();
  if (mode && active.rounds.length + 1 >= mode.rounds) {
    game$.active.finished.set(true);
  }
}

export function endGame() {
  const active = game$.active.get();
  if (!active) return;

  game$.active.finished.set(true);

  const saved: SavedGame = {
    id: active.id,
    modeId: active.modeId,
    startedAt: active.startedAt,
    finishedAt: Date.now(),
    totalPoints: active.totalPoints,
    rounds: active.rounds,
  };

  // Add to history
  const history = game$.history.get() ?? [];
  game$.history.set([saved, ...history]);

  // Update best score
  const bestScores = game$.bestScores.get() ?? {};
  const prev = bestScores[active.modeId] ?? 0;
  if (active.totalPoints > prev) {
    game$.bestScores[active.modeId].set(active.totalPoints);
  }

  // Clear active game
  game$.active.set(null);
}

export function abandonGame() {
  game$.active.set(null);
}
