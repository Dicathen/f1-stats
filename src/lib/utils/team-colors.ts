// Team colors based on 2025 F1 team colors
export const teamColors: Record<string, string> = {
  mercedes: "rgb(0, 215, 182)",
  "red bull": "rgb(71, 129, 215)",
  ferrari: "rgb(237, 17, 49)",
  mclaren: "rgb(244, 118, 0)",
  alpine: "rgb(0, 161, 232)",
  rb: "rgb(108, 152, 255)", // Racing Bulls
  "racing bulls": "rgb(108, 152, 255)",
  "aston martin": "rgb(34, 153, 113)",
  williams: "rgb(24, 104, 219)",
  "kick sauber": "rgb(1, 192, 14)",
  sauber: "rgb(1, 192, 14)",
  haas: "rgb(156, 159, 162)",
};

export function getTeamColor(constructorName?: string): string | undefined {
  if (!constructorName) return undefined;

  const normalizedName = constructorName.toLowerCase();

  // Direct match
  if (teamColors[normalizedName]) {
    return teamColors[normalizedName];
  }

  // Partial match (e.g., "Mercedes-AMG" matches "mercedes")
  for (const [key, color] of Object.entries(teamColors)) {
    if (normalizedName.includes(key)) {
      return color;
    }
  }

  return undefined;
}
