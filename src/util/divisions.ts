const DIVISION_LABELS: Record<string, string> = {
  "AL-E": "AL East",
  "AL-C": "AL Central",
  "AL-W": "AL West",
  "NL-E": "NL East",
  "NL-C": "NL Central",
  "NL-W": "NL West",
};

export const DIVISION_ORDER = [
  "AL-E", "AL-C", "AL-W", "NL-E", "NL-C", "NL-W",
];

export function divisionName(lgID: string | null, divID: string | null): string {
  if (!lgID || !divID) return "";
  return DIVISION_LABELS[`${lgID}-${divID}`] ?? `${lgID} ${divID}`;
}
