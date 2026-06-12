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

export function findPrintingRate(
  rates: PrintingRate[],
  plateKey: string,
  colorLabel: string,
): PrintingRate | undefined {
  if (!rates.length) return undefined;

  // Extract dimensions from plateKey like "18×25\""
  const dims = plateKey.replace(/["]/g, '').replace(/×/g, 'x');
  const [w, h] = dims.split('x').map((s) => Number(s) || 0);

  const colorMatches = rates.filter((r) => r.color_option === colorLabel);
  if (!colorMatches.length) return rates[0];

  // 1. Plate name contains both dimensions e.g. "18×25" or "18x25"
  for (const r of colorMatches) {
    const n = r.plate_name.toLowerCase();
    if (n.includes(`${w}×${h}`) || n.includes(`${w}x${h}`) ||
        n.includes(`${w} × ${h}`) || n.includes(`${w} x ${h}`)) {
      return r;
    }
  }

  // 2. Plate name contains either dimension
  for (const r of colorMatches) {
    const n = r.plate_name.toLowerCase();
    if (n.includes(String(w)) || n.includes(String(h))) {
      return r;
    }
  }

  // 3. First color match (fallback)
  return colorMatches[0];
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

export function computePrice(args: ComputePriceArgs): ComputePriceResult | { ready: false } {
  const { qty, w, h, stock, paperCategories, printingRates, sides, color, markupPercent, taxPercent } = args;

  if (!qty || !w || !h || !stock) return { ready: false };

  // ─ Plate + ups (use SIZE_PLATE_MAP, fallback to auto)
  const { plate: plateKey, ups, fromMap } = autoSelectPlate(w, h);

  // ─ Working sheets at plate size
  const ws = Math.ceil(qty / Math.max(ups, 1));

  // ─ Both-sides handling (W&T vs sheetwise)
  const isBoardPaper = BOARD_PAPER_CATS.includes(stock.category);
  const isBothSides = sides === 'both';

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

  // ─ Printing cost
  const colorLabel = COLOR_LABEL[color] || 'Single Color';
  const matchingRate = findPrintingRate(printingRates, plateKey, colorLabel);

  function computeRunCost(rate: PrintingRate | undefined, impressions: number): number {
    if (!rate) return 0;
    const fixed = Number(rate.fixed_charge) || 0;
    const per1000 = Number(rate.per_1000_impression) || 0;
    const free = 1000;
    const extra = Math.max(0, impressions - free);
    const rounded = Math.ceil(extra / 1000) * 1000;
    return fixed + (rounded / 1000) * per1000;
  }

  let printCost = 0;
  const printBreakdown: Array<{ label: string; value: number }> = [];
  if (matchingRate) {
    if (useDoublePlate) {
      // Sheetwise — 2 separate plate runs, each sees `ws` impressions
      const front = computeRunCost(matchingRate, ws);
      const back = computeRunCost(matchingRate, ws);
      printCost = front + back;
      printBreakdown.push({ label: `Front (${colorLabel})`, value: front });
      printBreakdown.push({ label: `Back (${colorLabel})`, value: back });
    } else {
      // Single side OR W&T: one plate setup, impressions = imp
      printCost = computeRunCost(matchingRate, imp);
      const label = useWorkAndTurn ? `Printing W&T (${colorLabel})` : `Printing (${colorLabel})`;
      printBreakdown.push({ label, value: printCost });
    }
  }

  // ─ Totals
  const subtotal = paperCost + printCost;
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
    ws,
    imp,
    numPlates,
    useWorkAndTurn,
    useDoublePlate,
    paperCost,
    printCost,
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
