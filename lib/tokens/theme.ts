/**
 * Archival Slate & Vellum Theme Tokens
 *
 * Distinct palette inspired by physical archival vaults, printmaker ink,
 * unbleached cotton rag paper, and library card catalogs.
 */

export interface NoteSwatch {
  id: string;
  name: string;
  /** Background hex in light mode */
  lightBg: string;
  /** Background hex in dark mode */
  darkBg: string;
  /** Subtle border in light mode */
  lightBorder: string;
  /** Subtle border in dark mode */
  darkBorder: string;
  /** Accent dot / swatch indicator */
  swatchDot: string;
  /** Historical/material description */
  description: string;
}

export const ARCHIVAL_NOTE_SWATCHES: NoteSwatch[] = [
  {
    id: "default",
    name: "Alabaster Paper",
    lightBg: "#FCFBF9",
    darkBg: "#181C20",
    lightBorder: "#E2E0D8",
    darkBorder: "#2E353D",
    swatchDot: "#E8E6DE",
    description: "Pure unprinted cotton rag",
  },
  {
    id: "parchment",
    name: "Parchment Ochre",
    lightBg: "#F9F4E6",
    darkBg: "#2B2516",
    lightBorder: "#E8DDBF",
    darkBorder: "#453A23",
    swatchDot: "#D8C594",
    description: "Aged document & golden birch",
  },
  {
    id: "sage",
    name: "Sage Lichen",
    lightBg: "#EFF5EE",
    darkBg: "#1B291D",
    lightBorder: "#D3E4D1",
    darkBorder: "#2D4230",
    swatchDot: "#A6C7A2",
    description: "Pressed herbarium leaf",
  },
  {
    id: "celadon",
    name: "Washed Celadon",
    lightBg: "#EDF6F5",
    darkBg: "#172A29",
    lightBorder: "#CEE5E3",
    darkBorder: "#284542",
    swatchDot: "#99C9C5",
    description: "Glazed porcelain & mineral spring",
  },
  {
    id: "slate",
    name: "Dusk Slate",
    lightBg: "#F0F3F7",
    darkBg: "#1B2430",
    lightBorder: "#D4DEE8",
    darkBorder: "#2E3C4E",
    swatchDot: "#A4B8CE",
    description: "Library catalog drawer & slate tile",
  },
  {
    id: "heather",
    name: "Heather Iris",
    lightBg: "#F4F1F7",
    darkBg: "#271F32",
    lightBorder: "#E0D7E8",
    darkBorder: "#403352",
    swatchDot: "#B8A7CE",
    description: "Soft thistle & bookbinder ribbon",
  },
  {
    id: "terracotta",
    name: "Terracotta Silt",
    lightBg: "#FBF1EC",
    darkBg: "#301F19",
    lightBorder: "#EED3C6",
    darkBorder: "#4F3227",
    swatchDot: "#CCA08D",
    description: "Warm river silt & earthen pottery",
  },
  {
    id: "madder",
    name: "Rose Madder",
    lightBg: "#F9EFEF",
    darkBg: "#2E1B1E",
    lightBorder: "#ECCECE",
    darkBorder: "#4B2A30",
    swatchDot: "#C99195",
    description: "Natural mineral blush & edge stain",
  },
];

/**
 * Resolves a note background color string to its current theme background and border
 */
export function resolveNoteColors(
  savedColor: string | undefined,
  isDark: boolean
): { background: string; border: string } {
  if (!savedColor || savedColor === "#ffffff" || savedColor === "default") {
    const defaultSwatch = ARCHIVAL_NOTE_SWATCHES[0];
    return {
      background: isDark ? defaultSwatch.darkBg : defaultSwatch.lightBg,
      border: isDark ? defaultSwatch.darkBorder : defaultSwatch.lightBorder,
    };
  }

  // Check if it matches any known swatch by lightBg, darkBg, or id
  const matched = ARCHIVAL_NOTE_SWATCHES.find(
    (s) =>
      s.id === savedColor.toLowerCase() ||
      s.lightBg.toLowerCase() === savedColor.toLowerCase() ||
      s.darkBg.toLowerCase() === savedColor.toLowerCase()
  );

  if (matched) {
    return {
      background: isDark ? matched.darkBg : matched.lightBg,
      border: isDark ? matched.darkBorder : matched.lightBorder,
    };
  }

  // Fallback for legacy hex codes: if dark mode, soften/darken slightly, else return as-is
  return {
    background: savedColor,
    border: isDark ? "#2E353D" : "#E2E0D8",
  };
}

/**
 * Folder Accent Colors (Milled archival tones)
 */
export const FOLDER_ACCENTS = [
  { id: "spruce", name: "Archival Spruce", hex: "#2A4B45", darkHex: "#4E877D" },
  { id: "slate", name: "Dusk Slate", hex: "#3B5266", darkHex: "#6B8FA8" },
  { id: "amber", name: "Amber Resin", hex: "#9A671C", darkHex: "#D99B38" },
  { id: "silt", name: "Terracotta", hex: "#8A4529", darkHex: "#BA6F52" },
  { id: "carmine", name: "Carmine Wax", hex: "#8F2C2C", darkHex: "#C45252" },
  { id: "heather", name: "Thistle Iris", hex: "#5C4673", darkHex: "#8D73AA" },
];
