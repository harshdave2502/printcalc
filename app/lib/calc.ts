// ─────────────────────────────────────────────────────────────────────────
// Shared calculation library — single source of truth for all calculators.
//
// Same formulas as the existing /calculator page. Used by:
//   • /products/[slug]/page.tsx
//   • /quote/[slug]/page.tsx
//   • /projects/[id]/page.tsx
//
// Goal: NO price fluctuation across screens for same inputs.
// ─────────────────────────────────────────────────────────────────────────

import { FINAL_SIZES } from './sizes';

// ─── Plate dimensions (usable area after gripper margin) ─────────────────
export const PLATE_DIMS: Record<string, { w: number; h: number }> = {
  '15×20"': { w: 14.5, h: 19.5 },
  '18×23"': { w: 17.5, h: 22.5 },
  '18×25"': { w: 17.5, h: 24.5 },
  '20×28"': { w: 19.5, h: 27.5 },
  '20×29"': { w: 19.0, h: 29.0 },  // B-series plate (different gripper rule)
  '20×30"': { w: 19.5, h: 29.5 },
  '25×36"': { w: 24.5, h: 35.5 },
};

// ─── Parent (paper) sheet specs per plate ─────────────────────────────────
// cuts = how many plate-size sheets fit in one parent sheet
export const PARENT_SHEETS: Record<string, { parentW: number; parentH: number; cuts: number }> = {
  '15×20"': { parentW: 20, parentH: 30, cuts: 2 },
  '18×23"': { parentW: 23, parentH: 36, cuts: 2 },
  '18×25"': { parentW: 25, parentH: 36, cuts: 2 },
  '20×28"': { parentW: 20, parentH: 30, cuts: 1 },
  '20×29"': { parentW: 20, parentH: 30, cuts: 1 },
  '20×30"': { parentW: 20, parentH: 30, cuts: 1 },
  '25×36"': { parentW: 25, parentH: 36, cuts: 1 },
};

// ─── Board paper categories — cannot Work & Turn (rough/smooth sides) ────
export const BOARD_PAPER_CATS = ['SBS', 'FBB', 'Duplex Grey Back', 'Duplex White Back'];

// ─────────────────────────────────────────────────────────────────────────
// Size → (plate, ups) mapping from harshdave's plate_mapping.csv
// Keys: "{smaller}x{larger}" — auto-canonicalized regardless of input order
// ─────────────────────────────────────────────────────────────────────────
export const SIZE_PLATE_MAP: Record<string, { plate: string; ups: number }> = {
  // ── A Series ─────────────────────────────────────────────────────────
  '16.5x23.4': { plate: '18×25"', ups: 1 },     // A2
  '11.69x16.54': { plate: '18×25"', ups: 2 },   // A3
  '8.27x11.69': { plate: '18×25"', ups: 4 },    // A4
  '5.83x8.27': { plate: '18×25"', ups: 8 },     // A5
  '4.13x5.83': { plate: '18×25"', ups: 16 },    // A6
  '2.91x4.13': { plate: '18×25"', ups: 32 },    // A7

  // ── American ─────────────────────────────────────────────────────────
  '4.25x5.5': { plate: '18×23"', ups: 16 },
  '5.5x8.5': { plate: '18×23"', ups: 8 },
  '8.5x11': { plate: '18×23"', ups: 4 },        // Letter
  '8.5x14': { plate: '15×20"', ups: 2 },        // Legal
  '11x17': { plate: '18×23"', ups: 2 },         // Tabloid
  '18x23': { plate: '18×23"', ups: 1 },

  // ── Square / Tall ────────────────────────────────────────────────────
  '8x8': { plate: '18×25"', ups: 6 },
  '8x24': { plate: '18×25"', ups: 2 },

  // ── B Series ─────────────────────────────────────────────────────────
  '19x29': { plate: '20×29"', ups: 1 },         // B2
  '14x19': { plate: '20×29"', ups: 2 },         // B3
  '9.5x14': { plate: '20×29"', ups: 4 },        // B4
  '7x9.5': { plate: '20×29"', ups: 8 },         // B5
  '4.75x7': { plate: '20×29"', ups: 16 },       // B6

  // ── Cards ────────────────────────────────────────────────────────────
  '2x3.5': { plate: '18×25"', ups: 60 },        // Visiting Card (US 3.5×2")
  '2.165x3.346': { plate: '18×25"', ups: 48 },  // VC EU 85×55 mm
  '2.165x3.543': { plate: '18×25"', ups: 48 },  // VC UK 90×55 mm
  '4x6': { plate: '18×25"', ups: 16 },          // Postcard 4×6
  '5x7': { plate: '18×23"', ups: 8 },           // Postcard / Greeting / Wedding 5×7
  '4x9': { plate: '20×29"', ups: 14 },          // Rack Card
  '2x7': { plate: '20×29"', ups: 36 },          // Bookmark
  '4.25x11': { plate: '18×23"', ups: 8 },       // Door Hanger

  // ── Stationery / Envelopes ───────────────────────────────────────────
  '4.33x8.66': { plate: '18×25"', ups: 4 },     // DL Envelope
  '6.38x9.02': { plate: '18×25"', ups: 2 },     // C5 Envelope
  '9.02x12.76': { plate: '18×25"', ups: 1 },    // C4 Envelope
  '4.125x9.5': { plate: '18×25"', ups: 4 },     // US No.10

  // ── Folder ───────────────────────────────────────────────────────────
  '9x12': { plate: '18×23"', ups: 1 },          // Presentation Folder
};

// ─── Canonical lookup helpers ─────────────────────────────────────────────
function canonicalKey(w: number, h: number): string {
  const a = Math.min(w, h);
  const b = Math.max(w, h);
  return `${Math.round(a * 1000) / 1000}x${Math.round(b * 1000) / 1000}`;
}

// Lookup with small tolerance (±0.05 in) to absorb rounding from CSV inputs
function lookupSizeMap(w: number, h: number): { plate: string; ups: number } | null {
  const a = Math.min(w, h);
  const b = Math.max(w, h);
  for (const [key, value] of Object.entries(SIZE_PLATE_MAP)) {
    const [keyA, keyB] = key.split('x').map(Number);
    if (Math.abs(keyA - a) < 0.05 && Math.abs(keyB - b) < 0.05) return value;
  }
  return null;
}

// ─── Geometric ups calculator (best of 2 orientations) ───────────────────
export function calcUps(w: number, h: number, plateKey: string): number {
  const p = PLATE_DIMS[plateKey];
  if (!p || !w || !h) return 1;
  return Math.max(
    Math.floor(p.w / w) * Math.floor(p.h / h),
    Math.floor(p.w / h) * Math.floor(p.h / w),
    1,
  );
}

// ─── Auto plate selection ─────────────────────────────────────────────────
// 1. First try the SIZE_PLATE_MAP (harshdave's confirmed mappings)
// 2. Else fall back to default 18×25" if piece fits
// 3. Else use larger plates in order
export function autoSelectPlate(w: number, h: number): { plate: string; ups: number; fromMap: boolean } {
  const mapped = lookupSizeMap(w, h);
  if (mapped) return { ...mapped, fromMap: true };

  // Fallback: try plates in order of preference (smallest cost-effective first)
  const preferenceOrder = ['18×25"', '18×23"', '15×20"', '20×29"', '20×28"', '20×30"', '25×36"'];
  for (const plate of preferenceOrder) {
    const ups = calcUps(w, h, plate);
    if (ups >= 1) {
      // Check piece actually fits (calcUps returns 1 minimum even if it doesn't fit perfectly)
      const p = PLATE_DIMS[plate];
      const fitsNatural = w <= p.w && h <= p.h;
      const fitsRotated = h <= p.w && w <= p.h;
      if (fitsNatural || fitsRotated) {
        return { plate, ups, fromMap: false };
      }
    }
  }
  return { plate: '25×36"', ups: 1, fromMap: false };
}

// ─────────────────────────────────────────────────────────────────────────
// Custom-size fit analysis.
// Used when the customer enters arbitrary W × H. We test every plate in
// both orientations, score for max ups (prefer EVEN ups when the job is
// both-sides + non-board, so W&T can apply), and report paper wastage.
// ─────────────────────────────────────────────────────────────────────────
export interface SizeSuggestion {
  id: string;
  label: string;
  w: number;
  h: number;
  plate: string;
  ups: number;
  wastagePercent: number;
  similarityPercent: number;   // 100 = identical, 0 = totally different
}

export interface FitResult {
  plate: string;
  ups: number;
  orientation: 'natural' | 'rotated';
  preferEvenUps: boolean;
  wastagePercent: number;        // (1 - used / plateArea) × 100
  hasHighWastage: boolean;       // true when wastagePercent > 50 AND ups < 4
  warnings: string[];
  suggestions?: SizeSuggestion[];  // populated when hasHighWastage
  explanation?: string;            // plain-language "why your size is worse"
}

// Only warn when the fit is genuinely poor.
//   • Up to 50% wastage is normal for custom sizes (pieces never tile a plate
//     perfectly — the press still pays for the full plate run).
//   • Ups ≥ 4 means the piece tiles well — silence the warning even if the
//     theoretical wastage looks high.
const WASTAGE_THRESHOLD = 50;
const QUIET_IF_UPS_AT_LEAST = 4;

export function fitCustomSize(
  w: number,
  h: number,
  opts: { preferEvenUps?: boolean } = {},
): FitResult {
  const preferEvenUps = !!opts.preferEvenUps;
  const warnings: string[] = [];

  if (!w || !h) {
    return {
      plate: '18×25"', ups: 1, orientation: 'natural',
      preferEvenUps, wastagePercent: 100, hasHighWastage: true,
      warnings: ['Enter both width and height to compute fit.'],
    };
  }

  // Score every plate + orientation. Higher ups is better. Ties broken by
  // (a) when preferEvenUps, prefer even ups; (b) smaller plate area; (c) less wastage.
  type Candidate = { plate: string; ups: number; orientation: 'natural' | 'rotated'; plateArea: number; wastage: number; usedArea: number };
  const candidates: Candidate[] = [];

  for (const plate of Object.keys(PLATE_DIMS)) {
    const p = PLATE_DIMS[plate];
    const plateArea = p.w * p.h;
    // natural: piece w × h
    const upsNat = Math.floor(p.w / w) * Math.floor(p.h / h);
    if (upsNat >= 1) {
      const usedArea = upsNat * w * h;
      candidates.push({ plate, ups: upsNat, orientation: 'natural', plateArea, wastage: 1 - usedArea / plateArea, usedArea });
    }
    // rotated 90°: piece h × w
    const upsRot = Math.floor(p.w / h) * Math.floor(p.h / w);
    if (upsRot >= 1) {
      const usedArea = upsRot * w * h;
      candidates.push({ plate, ups: upsRot, orientation: 'rotated', plateArea, wastage: 1 - usedArea / plateArea, usedArea });
    }
  }

  if (candidates.length === 0) {
    // Doesn't fit any plate, even rotated. Use largest plate, 1 up, full wastage.
    return {
      plate: '25×36"', ups: 1, orientation: 'natural',
      preferEvenUps, wastagePercent: 100, hasHighWastage: true,
      warnings: ['This size does not fit any plate. Confirm dimensions.'],
    };
  }

  const score = (c: Candidate): number => {
    // Higher is better.
    // Base: ups (weight 1000)
    // Even-ups bonus (when requested): +500
    // Less wastage: +(1 - wastage) * 100
    // Smaller plate area when ups tied: marginal effect
    let s = c.ups * 1000;
    if (preferEvenUps && c.ups % 2 === 0 && c.ups >= 2) s += 500;
    s += (1 - c.wastage) * 100;
    s -= c.plateArea * 0.001; // slight preference for smaller plate
    return s;
  };

  candidates.sort((a, b) => score(b) - score(a));
  const best = candidates[0];

  if (preferEvenUps && best.ups % 2 !== 0) {
    warnings.push(
      'No orientation gives even ups — Work & Turn won\'t apply. Job will run as 2 separate plate setups (more expensive).',
    );
  }

  const wastagePercent = Math.round(best.wastage * 1000) / 10;
  // Wastage only counts as "high" when BOTH:
  //   (a) the % of plate left empty exceeds the threshold, AND
  //   (b) ups is below the quiet bar — i.e. the piece doesn't tile well.
  // This silences warnings for legitimate custom sizes that pack 4+ up.
  const hasHighWastage = wastagePercent > WASTAGE_THRESHOLD && best.ups < QUIET_IF_UPS_AT_LEAST;

  let suggestions: SizeSuggestion[] | undefined;
  let explanation: string | undefined;
  if (hasHighWastage) {
    suggestions = suggestNearbySizes(w, h);
    warnings.push(
      `Significant paper waste at this size: ${wastagePercent}% of the plate is unused at ${best.ups} up${best.ups === 1 ? '' : 's'}.`,
    );
    if (suggestions.length > 0) {
      const top = suggestions[0];
      const upsDelta = top.ups - best.ups;
      if (upsDelta > 0) {
        explanation =
          `Your size fits ${best.ups} up${best.ups === 1 ? '' : 's'} on a ${best.plate} plate. ` +
          `A close standard size — ${top.label} — fits ${top.ups} ups on a ${top.plate} plate (only ${top.wastagePercent}% waste). ` +
          `More pieces per sheet means cheaper paper and printing per piece.`;
      } else {
        explanation =
          `Your size leaves ${wastagePercent}% of the plate unused. ` +
          `${top.label} fits ${top.ups} ups with only ${top.wastagePercent}% waste — cheaper per piece.`;
      }
    }
  }

  return {
    plate: best.plate,
    ups: best.ups,
    orientation: best.orientation,
    preferEvenUps,
    wastagePercent,
    hasHighWastage,
    warnings,
    suggestions,
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Suggest nearby standard sizes from FINAL_SIZES that would fit better.
// Used when the customer's custom W × H triggers a wastage warning.
//
// Algorithm:
//   1. Compare each FINAL_SIZES row to the input (orientation-agnostic).
//   2. Keep rows within ±15% on each dimension AND ≤15% averaged — so we
//      suggest VISUALLY similar sizes (no "use Tabloid instead of 7×10").
//   3. Compute each candidate's own fit (plate + ups + wastage).
//   4. Rank: closest size wins first, then lower wastage breaks ties.
//   5. Return top 3.
// ─────────────────────────────────────────────────────────────────────────
// Calibrated against the user's explicit ask: for 7×10",
//   • B5 7×9.5 (avg diff 2.5%) — MUST suggest
//   • Letter 8.5×11 (avg diff 15.7%) — MUST suggest
//   • Tabloid 11×17 (avg diff 63.5%) — MUST NOT suggest
const SUGGESTION_MAX_DIM_DIFF = 0.22;   // each side must be within ±22%
const SUGGESTION_MAX_AVG_DIFF = 0.18;   // average diff must also be ≤18%

export function suggestNearbySizes(w: number, h: number, max: number = 3): SizeSuggestion[] {
  if (!w || !h) return [];

  const a = Math.min(w, h);
  const b = Math.max(w, h);

  type Cand = SizeSuggestion & { _avgDiff: number };
  const cands: Cand[] = [];

  for (const s of FINAL_SIZES) {
    if (!s.w || !s.h) continue;                     // skip placeholder rows
    const sa = Math.min(s.w, s.h);
    const sb = Math.max(s.w, s.h);

    // Both dimensions must be close — no single-side runaway match.
    const aDiff = Math.abs(sa - a) / a;
    const bDiff = Math.abs(sb - b) / b;
    if (aDiff > SUGGESTION_MAX_DIM_DIFF) continue;
    if (bDiff > SUGGESTION_MAX_DIM_DIFF) continue;

    const avgDiff = (aDiff + bDiff) / 2;
    if (avgDiff > SUGGESTION_MAX_AVG_DIFF) continue;

    const fit = fitCustomSize(s.w, s.h, {});
    const similarity = Math.round((1 - avgDiff) * 100);

    cands.push({
      id: s.id,
      label: s.label,
      w: s.w,
      h: s.h,
      plate: fit.plate,
      ups: fit.ups,
      wastagePercent: fit.wastagePercent,
      similarityPercent: similarity,
      _avgDiff: avgDiff,
    });
  }

  // Rank: closest match first, then lower wastage breaks ties, then more ups.
  cands.sort(
    (x, y) =>
      x._avgDiff - y._avgDiff ||
      x.wastagePercent - y.wastagePercent ||
      y.ups - x.ups,
  );

  return cands.slice(0, max).map(({ _avgDiff: _drop, ...rest }) => rest);
}

// ─── Find printing rate by plate match ────────────────────────────────────
// Old calc uses plate-name patterns like "Small Plate (15×20, 18×23, 18×25)".
// We match by checking if any of the auto-selected plate's dimensions appear in plate_name.
export interface PrintingRate {
  id: string;
  plate_name: string;
  color_option: string;
  fixed_charge: number;
  per_1000_impression: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Rate selection — must MIRROR /calculator Full Job exactly so that
// product page and calculator never diverge for the same inputs.
//
// Full Job picks: plateRates.find(r => r.plate_name === selPlate &&
//                                       r.color_option === selColor)
// where selPlate = first unique plate_name by sort_order (plateNames[0]).
//
// We replicate that here.
// ─────────────────────────────────────────────────────────────────────────
export function findPrintingRate(
  rates: PrintingRate[],
  _plateKey: string,        // kept for backward compat — not used; FullJob ignores it too
  colorLabel: string,
): PrintingRate | undefined {
  if (!rates.length) return undefined;

  // Unique plate names in DB sort_order (rates is assumed already ordered).
  const plateNames: string[] = [];
  for (const r of rates) {
    if (!plateNames.includes(r.plate_name)) plateNames.push(r.plate_name);
  }
  const firstPlate = plateNames[0];

  // 1. Exact match: first plate name + requested color  (Full Job's pick)
  const exact = rates.find(
    (r) => r.plate_name === firstPlate && r.color_option === colorLabel,
  );
  if (exact) return exact;

  // 2. Any rate with the requested color
  const anyColor = rates.find((r) => r.color_option === colorLabel);
  if (anyColor) return anyColor;

  // 3. First rate row (last resort)
  return rates[0];
}

// Full Job's printCost (calculator/page.tsx:402), exposed for reuse.
// Returns ₹0 if any required input is missing — same null-safety as FullJob.
export function printCost(
  rate: PrintingRate | undefined,
  numPlates: number,
  impressions: number,
): number {
  if (!rate || !numPlates || !impressions) return 0;
  const fixed = Number(rate.fixed_charge) || 0;
  const per1000 = Number(rate.per_1000_impression) || 0;
  const pf = fixed * numPlates;
  const fi = 1000 * numPlates;
  const ei = Math.max(0, impressions - fi);
  const er = Math.ceil(ei / 1000) * 1000;
  return pf + (er / 1000) * per1000;
}

// ─── Get paper rate per kg from category (not stock) ─────────────────────
// Old calc uses paper_categories.rate_per_kg, NOT paper_stocks.rate_per_kg.
// This matters because the two can drift apart in the database.
export interface PaperCategory { category: string; rate_per_kg: number; }
export interface PaperStock { id: string; label: string; gsm: number; rate_per_kg: number; category: string; }

export function getRatePerKg(
  paperCategories: PaperCategory[],
  stock: PaperStock,
): number {
  const cat = paperCategories.find((c) => c.category === stock.category);
  if (cat && Number(cat.rate_per_kg) > 0) return Number(cat.rate_per_kg);
  return Number(stock.rate_per_kg) || 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Main price calculation
// ─────────────────────────────────────────────────────────────────────────

export interface ComputePriceArgs {
  qty: number;
  w: number;                  // piece width in inches
  h: number;                  // piece height in inches
  stock: PaperStock;
  paperCategories: PaperCategory[];
  printingRates: PrintingRate[];
  sides: 'one' | 'both';
  color: 'four_color' | 'two_color' | 'single_color' | 'bw';
  markupPercent: number;
  taxPercent: number;
  /** If true, force using the SIZE_PLATE_MAP even if no exact match (use auto fallback) */
  preferMap?: boolean;
}

export interface ComputePriceResult {
  ready: boolean;
  qty: number;
  plateKey: string;
  ups: number;
  fromMap: boolean;
  orientation?: 'natural' | 'rotated';
  wastagePercent?: number;
  hasHighWastage?: boolean;
  warnings?: string[];
  suggestions?: SizeSuggestion[];
  wastageExplanation?: string;
  ws: number;                 // working sheets (plate-size)
  imp: number;                // impressions
  numPlates: number;          // plate setups (1 for W&T or single side, 2 for sheetwise)
  useWorkAndTurn: boolean;
  useDoublePlate: boolean;
  paperCost: number;
  printCost: number;
  printBreakdown: Array<{ label: string; value: number }>;
  subtotal: number;
  withMarkup: number;
  markupAmount: number;
  tax: number;
  total: number;
  perUnit: number;
  ratePerKg: number;          // for debug/display
}

const COLOR_LABEL: Record<string, string> = {
  four_color: 'Four Color CMYK',
  two_color: 'Two Color',
  single_color: 'Single Color',
  bw: 'Single Color',
};

// ─────────────────────────────────────────────────────────────────────────
// NEW (preferred) — pass plate + ups EXPLICITLY from master_products row.
// Use this anywhere we have a master_products row to bypass auto-lookup.
// ─────────────────────────────────────────────────────────────────────────
export interface ComputeForProductArgs {
  qty: number;
  plate: string;          // explicit, from master_products.plate
  totalUps: number;       // explicit, from master_products.total_ups
  stock: PaperStock;
  paperCategories: PaperCategory[];
  printingRates: PrintingRate[];
  sides: 'one' | 'both';
  color: 'four_color' | 'two_color' | 'single_color' | 'bw';
  markupPercent: number;
  taxPercent: number;
}

export function computePriceForProduct(args: ComputeForProductArgs): ComputePriceResult | { ready: false } {
  const { qty, plate, totalUps, stock, paperCategories, printingRates, sides, color, markupPercent, taxPercent } = args;

  if (!qty || !plate || !totalUps || !stock) return { ready: false };

  const ups = Math.max(1, totalUps);
  const ws = Math.ceil(qty / ups);

  const isBoardPaper = BOARD_PAPER_CATS.includes(stock.category);
  const isBothSides = sides === 'both';
  const canUseWT = isBothSides && !isBoardPaper && ups % 2 === 0 && ups >= 2;
  const useDoublePlate = isBothSides && (isBoardPaper || !canUseWT);
  const useWorkAndTurn = isBothSides && canUseWT;
  const imp = useWorkAndTurn ? ws * 2 : ws;
  const numPlates = useDoublePlate ? 2 : 1;

  const parent = PARENT_SHEETS[plate] || { parentW: 25, parentH: 36, cuts: 2 };
  const f = (parent.parentW * parent.parentH * 0.2666) / 828;
  const ratePerKg = getRatePerKg(paperCategories, stock);
  const paperCost = ((f * stock.gsm * ratePerKg) / 500) * (ws / parent.cuts);

  const colorLabel = COLOR_LABEL[color] || 'Single Color';
  const matchingRate = findPrintingRate(printingRates, plate, colorLabel);

  // Same shape as Full Job:
  //   W&T or single side  → printCost(rate, 1, imp)
  //   Sheetwise           → printCost(rate, 1, ws) twice (Full Job calls it twice)
  let printCostVal = 0;
  const printBreakdown: Array<{ label: string; value: number }> = [];
  if (matchingRate) {
    if (useDoublePlate) {
      const front = printCost(matchingRate, 1, ws);
      const back = printCost(matchingRate, 1, ws);
      printCostVal = front + back;
      printBreakdown.push({ label: `Front (${colorLabel})`, value: front });
      printBreakdown.push({ label: `Back (${colorLabel})`, value: back });
    } else {
      printCostVal = printCost(matchingRate, 1, imp);
      const label = useWorkAndTurn ? `Printing W&T (${colorLabel})` : `Printing (${colorLabel})`;
      printBreakdown.push({ label, value: printCostVal });
    }
  }

  const subtotal = paperCost + printCostVal;
  const markupAmount = subtotal * (markupPercent / 100);
  const withMarkup = subtotal + markupAmount;
  const tax = withMarkup * (taxPercent / 100);
  const total = withMarkup + tax;
  const perUnit = qty > 0 ? total / qty : 0;

  return {
    ready: true,
    qty,
    plateKey: plate,
    ups,
    fromMap: true,
    ws,
    imp,
    numPlates,
    useWorkAndTurn,
    useDoublePlate,
    paperCost,
    printCost: printCostVal,
    printBreakdown,
    subtotal,
    withMarkup,
    markupAmount,
    tax,
    total,
    perUnit,
    ratePerKg,
  };
}

export function computePrice(args: ComputePriceArgs): ComputePriceResult | { ready: false } {
  const { qty, w, h, stock, paperCategories, printingRates, sides, color, markupPercent, taxPercent } = args;

  if (!qty || !w || !h || !stock) return { ready: false };

  // ─ Plate + ups: prefer SIZE_PLATE_MAP (CSV-confirmed). If not in map,
  //   run the smart fit (tries both orientations, prefers EVEN ups when
  //   sides='both' + non-board so W&T can apply, returns wastage %).
  const isBoardPaper = BOARD_PAPER_CATS.includes(stock.category);
  const isBothSides = sides === 'both';
  const preferEvenUps = isBothSides && !isBoardPaper;

  const mapped = lookupSizeMap(w, h);
  let plateKey: string;
  let ups: number;
  let fromMap: boolean;
  let orientation: 'natural' | 'rotated' = 'natural';
  let wastagePercent: number | undefined;
  let hasHighWastage: boolean | undefined;
  let fitWarnings: string[] = [];
  let fitSuggestions: SizeSuggestion[] | undefined;
  let fitExplanation: string | undefined;

  if (mapped) {
    plateKey = mapped.plate;
    ups = mapped.ups;
    fromMap = true;
  } else {
    const fit = fitCustomSize(w, h, { preferEvenUps });
    plateKey = fit.plate;
    ups = fit.ups;
    fromMap = false;
    orientation = fit.orientation;
    wastagePercent = fit.wastagePercent;
    hasHighWastage = fit.hasHighWastage;
    fitWarnings = fit.warnings;
    fitSuggestions = fit.suggestions;
    fitExplanation = fit.explanation;
  }

  // ─ Working sheets at plate size
  const ws = Math.ceil(qty / Math.max(ups, 1));

  // W&T requires EVEN ups (we need to split half front, half back)
  // If ups is odd and both-sides regular paper, fall back to sheetwise (2 plates)
  const canUseWT = isBothSides && !isBoardPaper && ups % 2 === 0 && ups >= 2;

  const useDoublePlate = isBothSides && (isBoardPaper || !canUseWT);
  const useWorkAndTurn = isBothSides && canUseWT;

  // Impressions: W&T doubles (run sheet through press twice with same plate)
  // Sheetwise: each plate sees `ws` impressions (sheet through press for plate A, then for plate B)
  const imp = useWorkAndTurn ? ws * 2 : ws;
  const numPlates = useDoublePlate ? 2 : 1;

  // ─ Paper cost (uses parent sheet area + category rate)
  const parent = PARENT_SHEETS[plateKey] || { parentW: 25, parentH: 36, cuts: 2 };
  const f = (parent.parentW * parent.parentH * 0.2666) / 828;
  const ratePerKg = getRatePerKg(paperCategories, stock);
  const paperCost = ((f * stock.gsm * ratePerKg) / 500) * (ws / parent.cuts);

  // ─ Printing cost — uses the SAME printCost helper as /calculator Full Job
  const colorLabel = COLOR_LABEL[color] || 'Single Color';
  const matchingRate = findPrintingRate(printingRates, plateKey, colorLabel);

  let printCostVal = 0;
  const printBreakdown: Array<{ label: string; value: number }> = [];
  if (matchingRate) {
    if (useDoublePlate) {
      // Sheetwise — 2 separate plate runs (Full Job does this with two printCost(...,1,ws) calls)
      const front = printCost(matchingRate, 1, ws);
      const back = printCost(matchingRate, 1, ws);
      printCostVal = front + back;
      printBreakdown.push({ label: `Front (${colorLabel})`, value: front });
      printBreakdown.push({ label: `Back (${colorLabel})`, value: back });
    } else {
      // Single side OR W&T: one plate setup, impressions = imp
      printCostVal = printCost(matchingRate, 1, imp);
      const label = useWorkAndTurn ? `Printing W&T (${colorLabel})` : `Printing (${colorLabel})`;
      printBreakdown.push({ label, value: printCostVal });
    }
  }

  // ─ Totals
  const subtotal = paperCost + printCostVal;
  const markupAmount = subtotal * (markupPercent / 100);
  const withMarkup = subtotal + markupAmount;
  const tax = withMarkup * (taxPercent / 100);
  const total = withMarkup + tax;
  const perUnit = qty > 0 ? total / qty : 0;

  return {
    ready: true,
    qty,
    plateKey,
    ups,
    fromMap,
    orientation,
    wastagePercent,
    hasHighWastage,
    warnings: fitWarnings.length > 0 ? fitWarnings : undefined,
    suggestions: fitSuggestions,
    wastageExplanation: fitExplanation,
    ws,
    imp,
    numPlates,
    useWorkAndTurn,
    useDoublePlate,
    paperCost,
    printCost: printCostVal,
    printBreakdown,
    subtotal,
    withMarkup,
    markupAmount,
    tax,
    total,
    perUnit,
    ratePerKg,
  };
}
