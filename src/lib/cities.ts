export const CITY_OPTIONS = [
  "Szczecin",
  "Toruń",
  "Stargard",
  "Choszczno",
  "Drezdenko",
] as const;

export function isValidCity(value: unknown): value is (typeof CITY_OPTIONS)[number] {
  return typeof value === "string" && (CITY_OPTIONS as readonly string[]).includes(value);
}
