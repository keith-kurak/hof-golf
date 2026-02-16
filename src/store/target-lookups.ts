import hallOfFamers from "@/metadata/hall-of-famers.json";
import allStars from "@/metadata/all-stars.json";
import managersWhoPlayed from "@/metadata/managers-who-played.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TargetLookup = {
  has: (playerID: string) => boolean;
  pointsFor: (playerID: string) => number;
  label: string;
};

type HofEntry = {
  playerID: string;
  category: string;
};

type AllStarEntry = {
  playerID: string;
  allStarSelections: number;
};

type ManagerEntry = {
  playerID: string;
};

// ---------------------------------------------------------------------------
// Lazy-cached lookups
// ---------------------------------------------------------------------------

let hofLookup: TargetLookup | null = null;
let allStarLookup: TargetLookup | null = null;
let managerLookup: TargetLookup | null = null;

export function buildHofLookup(): TargetLookup {
  if (hofLookup) return hofLookup;

  // HOF players (category "Player") who appear in Batting/Pitching tables
  const hofPlayerIDs = new Set(
    (hallOfFamers as HofEntry[])
      .filter((h) => h.category === "Player")
      .map((h) => h.playerID),
  );

  // Also include managers-who-played that are in the HOF
  const managerIDs = new Set(
    (managersWhoPlayed as ManagerEntry[]).map((m) => m.playerID),
  );
  for (const id of managerIDs) {
    // Cross-reference: if a manager-who-played is also in the HOF list
    // (any category), include them as a collectible HOF target
    if (
      (hallOfFamers as HofEntry[]).some(
        (h) => h.playerID === id && h.category !== "Player",
      )
    ) {
      hofPlayerIDs.add(id);
    }
  }

  hofLookup = {
    has: (id) => hofPlayerIDs.has(id),
    pointsFor: (id) => (hofPlayerIDs.has(id) ? 1 : 0),
    label: "Hall of Famer",
  };
  return hofLookup;
}

export function buildAllStarLookup(): TargetLookup {
  if (allStarLookup) return allStarLookup;

  const map = new Map<string, number>();
  for (const entry of allStars as AllStarEntry[]) {
    map.set(entry.playerID, entry.allStarSelections);
  }

  allStarLookup = {
    has: (id) => map.has(id),
    pointsFor: (id) => map.get(id) ?? 0,
    label: "All-Star",
  };
  return allStarLookup;
}

export function buildManagerLookup(): TargetLookup {
  if (managerLookup) return managerLookup;

  const ids = new Set(
    (managersWhoPlayed as ManagerEntry[]).map((m) => m.playerID),
  );

  managerLookup = {
    has: (id) => ids.has(id),
    pointsFor: (id) => (ids.has(id) ? 1 : 0),
    label: "Manager",
  };
  return managerLookup;
}

// ---------------------------------------------------------------------------
// Mode → lookup resolver
// ---------------------------------------------------------------------------

export function getLookupForMode(scoringType: string): TargetLookup {
  switch (scoringType) {
    case "hof":
      return buildHofLookup();
    case "all-star":
      return buildAllStarLookup();
    case "manager":
      return buildManagerLookup();
    default:
      throw new Error(`Unknown scoring type: ${scoringType}`);
  }
}
