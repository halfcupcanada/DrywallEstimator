/**
 * Drywall Estimation Engine
 * All calculations follow standard contractor rules-of-thumb.
 *
 * Sheet sizes: 4×8 (32 ft²), 4×10 (40 ft²), 4×12 (48 ft²)
 * Waste factor: configurable, default 10%
 * Screws: ~32 per sheet (16" OC studs, 8' sheet)
 * Joint tape: 1 roll (500 ft) per ~400 ft² of drywall
 * Joint compound (mud): 1 bucket (4.5 gal) per ~200 ft² of drywall
 */

export type SheetSize = "4x8" | "4x10" | "4x12";

export interface EstimateInput {
  totalWallArea: number;   // ft²
  totalCeilingArea: number; // ft²
  sheetSize: SheetSize;
  wasteFactor: number;     // 0–1, e.g. 0.10 = 10%
  includeCeiling: boolean;
}

export interface EstimateResult {
  grossArea: number;        // ft² before waste
  adjustedArea: number;     // ft² after waste factor
  sheetArea: number;        // ft² per sheet
  sheetsRequired: number;   // rounded up
  screws: number;           // count
  tapeFt: number;           // linear feet of tape
  tapeRolls: number;        // 500 ft rolls
  mudGallons: number;       // gallons of joint compound
  mudBuckets: number;       // 4.5-gal buckets
  // Optimization
  bestSheetSize: SheetSize;
  sheetsBySize: Record<SheetSize, number>;
}

const SHEET_AREAS: Record<SheetSize, number> = {
  "4x8": 32,
  "4x10": 40,
  "4x12": 48,
};

const SCREWS_PER_SHEET = 32;
const TAPE_FT_PER_SHEET = 16; // ~16 linear ft of seams per sheet
const MUD_SQ_FT_PER_GALLON = 45; // 1 gal covers ~45 ft²

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const { totalWallArea, totalCeilingArea, sheetSize, wasteFactor, includeCeiling } = input;

  const grossArea = totalWallArea + (includeCeiling ? totalCeilingArea : 0);
  const adjustedArea = grossArea * (1 + wasteFactor);
  const sheetArea = SHEET_AREAS[sheetSize];
  const sheetsRequired = Math.ceil(adjustedArea / sheetArea);

  const screws = sheetsRequired * SCREWS_PER_SHEET;
  const tapeFt = sheetsRequired * TAPE_FT_PER_SHEET;
  const tapeRolls = Math.ceil(tapeFt / 500);
  const mudGallons = adjustedArea / MUD_SQ_FT_PER_GALLON;
  const mudBuckets = Math.ceil(mudGallons / 4.5);

  // Find best sheet size (fewest sheets = least waste)
  const sheetsBySize = Object.fromEntries(
    Object.entries(SHEET_AREAS).map(([size, area]) => [
      size,
      Math.ceil(adjustedArea / area),
    ])
  ) as Record<SheetSize, number>;

  // Best = size that minimizes leftover (adjustedArea % sheetArea closest to 0)
  const bestSheetSize = (Object.keys(SHEET_AREAS) as SheetSize[]).reduce(
    (best, s) => {
      const leftover = (SHEET_AREAS[s] - (adjustedArea % SHEET_AREAS[s])) % SHEET_AREAS[s];
      const bestLeftover = (SHEET_AREAS[best] - (adjustedArea % SHEET_AREAS[best])) % SHEET_AREAS[best];
      return leftover < bestLeftover ? s : best;
    },
    sheetSize
  );

  return {
    grossArea,
    adjustedArea,
    sheetArea,
    sheetsRequired,
    screws,
    tapeFt,
    tapeRolls,
    mudGallons,
    mudBuckets,
    bestSheetSize,
    sheetsBySize,
  };
}
