import { computed, observable } from "@legendapp/state";
import { configureSynced, syncObservable } from "@legendapp/state/sync";
//import { observablePersistSqlite  } from "@legendapp/state/persist-plugins/expo-sqlite";
import { observablePersistAsyncStorage } from "@legendapp/state/persist-plugins/async-storage";
//import Storage from "expo-sqlite/kv-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import gameModes from "@/metadata/game-modes.json";

import type { RosterTarget } from "./roster-targets";
import type { GameMode, StartingTeam } from "./starting-pools";

// ---------------------------------------------------------------------------
// Persistence setup
// ---------------------------------------------------------------------------

const persistOptions = configureSynced({
  persist: {
    plugin: observablePersistAsyncStorage({ AsyncStorage }),
  },
});

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
  teamW: number;
  teamL: number;
  timedOut: boolean;
};

export type ActiveGame = {
  id: string;
  modeId: string;
  startedAt: number;
  rounds: GameRound[];
  seenTargets: string[];
  totalPoints: number;
  finished: boolean;
  timed: boolean;
  bonusPoints: number;
};

export type SavedGame = {
  id: string;
  modeId: string;
  startedAt: number;
  finishedAt: number;
  totalPoints: number;
  rounds: GameRound[];
  timed: boolean;
  bonusPoints: number;
};

// ---------------------------------------------------------------------------
// Observable store
// ---------------------------------------------------------------------------

export const game$ = observable({
  active: null as ActiveGame | null,
  history: [] as SavedGame[],
  bestScores: {} as Record<string, number>,
});

syncObservable(
  game$.active,
  persistOptions({ persist: { name: "active-game" } }),
);
syncObservable(
  game$.history,
  persistOptions({ persist: { name: "game-history" } }),
);
syncObservable(
  game$.bestScores,
  persistOptions({ persist: { name: "best-scores" } }),
);

// ---------------------------------------------------------------------------
// Ephemeral observables (not persisted)
// ---------------------------------------------------------------------------

export const pendingTeamPick$ = observable<StartingTeam | null>(null);
export const roundTimedOut$ = observable(false);
export const roundStartedAt$ = observable(0);

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

export const isGameActive$ = computed(() => {
  const active = game$.active.get();
  return (
    active !== null &&
    !active.finished &&
    Array.isArray(active.rounds) &&
    active.rounds.length > 0
  );
});

export const currentRound$ = computed(
  () => (game$.active.rounds.get()?.length ?? 0) - 1,
);

export const cumulativeWL$ = computed(() => {
  const active = game$.active.get();
  if (!active) return { w: 0, l: 0 };
  let w = 0;
  let l = 0;
  for (const round of active.rounds) {
    w += round.teamW ?? 0;
    l += round.teamL ?? 0;
  }
  return { w, l };
});

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
  options: { timed: boolean; teamW: number; teamL: number },
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
    teamW: options.teamW,
    teamL: options.teamL,
    timedOut: false,
  };

  const active: ActiveGame = {
    id: `${mode.id}-${Date.now()}`,
    modeId: mode.id,
    startedAt: Date.now(),
    rounds: [round0],
    seenTargets,
    totalPoints: pointsEarned,
    finished: false,
    timed: options.timed,
    bonusPoints: 0,
  };

  game$.active.set(active);
  roundStartedAt$.set(Date.now());
}

export function pickPlayer(playerID: string, playerName: string) {
  const active = game$.active.get();
  if (!active || active.finished) return;

  const roundIdx = active.rounds.length - 1;
  game$.active.rounds[roundIdx].pickedPlayerID.set(playerID);
  game$.active.rounds[roundIdx].pickedPlayerName.set(playerName);

  // Auto-finish if this is the last round
  const mode = currentMode();
  if (mode && active.rounds.length >= mode.rounds) {
    game$.active.finished.set(true);
  }
}

export function navigateToTeam(
  teamID: string,
  yearID: number,
  teamName: string,
  targets: RosterTarget[],
  options: { teamW: number; teamL: number; timedOut?: boolean },
) {
  const active = game$.active.get();
  if (!active || active.finished) return;

  const timedOut = options.timedOut ?? false;
  const seenSet = new Set(active.seenTargets);

  let pointsEarned: number;
  let updatedSeen: string[];

  if (timedOut) {
    // Timed out: score 0 and do NOT mark targets as seen (collectible later)
    pointsEarned = 0;
    updatedSeen = active.seenTargets;
  } else {
    // Only score targets not already seen
    const newTargets = targets.filter((t) => !seenSet.has(t.playerID));
    pointsEarned = newTargets.reduce((sum, t) => sum + t.points, 0);
    updatedSeen = [...active.seenTargets, ...newTargets.map((t) => t.playerID)];
  }

  const newRound: GameRound = {
    teamID,
    teamName,
    yearID,
    pickedPlayerID: null,
    pickedPlayerName: null,
    targetsFound: targets, // all targets on roster (for display)
    pointsEarned, // only new ones count
    teamW: options.teamW,
    teamL: options.teamL,
    timedOut,
  };

  game$.active.rounds.push(newRound);
  game$.active.seenTargets.set(updatedSeen);
  game$.active.totalPoints.set(active.totalPoints + pointsEarned);
  roundStartedAt$.set(Date.now());
}

export function endGame() {
  const active = game$.active.get();
  if (!active) return;

  game$.active.finished.set(true);

  // Evaluate game bonus
  const mode = (gameModes as GameMode[]).find((m) => m.id === active.modeId);
  let bonusPoints = 0;
  if (mode?.bonuses?.gameBonus) {
    const bonus = mode.bonuses.gameBonus;
    if (bonus.condition === "cumulative-losing-record") {
      const { w, l } = cumulativeWL$.get();
      if (l > w) {
        bonusPoints = bonus.points;
      }
    }
  }

  const finalTotal = active.totalPoints + bonusPoints;

  const saved: SavedGame = {
    id: active.id,
    modeId: active.modeId,
    startedAt: active.startedAt,
    finishedAt: Date.now(),
    totalPoints: finalTotal,
    rounds: active.rounds,
    timed: active.timed,
    bonusPoints,
  };

  // Add to history
  const history = game$.history.get() ?? [];
  game$.history.set([saved, ...history]);

  // Update best score
  const bestScores = game$.bestScores.get() ?? {};
  const prev = bestScores[active.modeId] ?? 0;
  if (finalTotal > prev) {
    game$.bestScores[active.modeId].set(finalTotal);
  }

  // Clear active game
  game$.active.set(null);
}

export function abandonGame() {
  game$.active.set(null);
}
