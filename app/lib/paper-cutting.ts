// ─────────────────────────────────────────────────────────────────────────
// Mode B — paper cutting fit for CUSTOM piece sizes.
//
// Idea: a custom piece doesn't have to fit on a fixed plate "as-is".
// We can cut the PARENT paper sheet into non-standard press sheets that
// pack the piece more efficiently. The plate is chosen to fit the press
// sheet (not the piece directly).
//
// Algorithm:
//   for each parent in (parents available for this paper category)
//     for each plate in PLATE_DIMS
//       for ups_w in 1..8
//         for ups_h in 1..8
//           for piece_orientation in {natural, rotated}
//             press_sheet_w = ups_w × piece_w
//             press_sheet_h = ups_h × piece_h
//             (no gutter — printer absorbs trim via plate-maker)
//
//             # press sheet must fit on plate (try both orientations)
//             # plate area depends on print mode:
//             #   W&T eligible  → W&T print area
//             #   sheetwise     → short-turn print area
//
//             cuts_per_parent = floor(parent_w / press_w) × floor(parent_h / press_h)
//                               (try the rotated tiling too)
//             if cuts_per_parent == 0: skip
//
//             ups_per_parent = cuts_per_parent × (ups_w × ups_h)
//             score = ups_per_parent × 1000
//                     + (W&T bonus if upsPerCut is even and both-sides)
//                     - paper_waste × 100
//             keep best
//
// Used by lib/calc.computePrice when piece size is NOT in SIZE_PLATE_MAP.
// ─────────────────────────────────────────────────────────────────────────

import { PLATE_DIMS } from './plates';

export interface ParentSheet {
  w: number;
  h: number;
  label: string;
}

// Parent sheets available to every paper category (Art Paper, Maplitho,
// Art Card, Heavy Art Card, Extra Heavy Art Card, SBS, FBB, Duplex…).
export const PARENT_SHEETS_COMMON: ParentSheet[] = [
  { w: 23, h: 36, label: '23 × 36"' },
  { w: 25, h: 36, label: '25 × 36"' },
  { w: 30, h: 40, label: '30 × 40"' },
];

// Extra parent sheets only stocked for board papers (SBS, FBB, Duplex).
export const PARENT_SHEETS_BOARD_EXTRA: ParentSheet[] = [
  { w: 22, h: 28, label: '22 × 28"' },
  { w: 25, h: 38, label: '25 × 38"' },
  { w: 31.5, h: 41.5, label: '31.5 × 41.5"' },
];

export const BOARD_PAPER_CATS = ['SBS', 'FBB', 'Duplex Grey Back', 'Duplex White Back'];

export function parentSheetsFor(category: string, subscriberSheets: ParentSheet[] = []): ParentSheet[] {
  const base = [...PARENT_SHEETS_COMMON];
  if (BOARD_PAPER_CATS.includes(category)) {
    base.push(...PARENT_SHEETS_BOARD_EXTRA);
  }
  // Subscriber-stocked custom sheet sizes (from `sheet_sizes` table)
  base.push(...subscriberSheets);
  // Dedupe by w×h
  const seen = new Set<string>();
  return base.filter(p => {
    const k = `${p.w}x${p.h}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Short-turn print area:  W&T print area minus 0.65" on the SHORT axis
// (subscriber's number: 17.4 → 16.75 for the 18×23 plate).
// W&T print area:  user-given numbers in PLATE_DIMS.
// ─────────────────────────────────────────────────────────────────────────
const SHORT_TURN_GRIPPER_LOSS = 0.65;

export function plateUsable(plateKey: string, mode: 'wt' | 'short'): { w: number; h: number } | null {
  const p = PLATE_DIMS[plateKey];
  if (!p) return null;
  if (mode === 'wt') return { w: p.w, h: p.h };
  // Short-turn: lose 0.65" on the shorter axis
  if (p.w <= p.h) return { w: Math.max(0, p.w - SHORT_TURN_GRIPPER_LOSS), h: p.h };
  return { w: p.w, h: Math.max(0, p.h - SHORT_TURN_GRIPPER_LOSS) };
}

// ─────────────────────────────────────────────────────────────────────────

export interface FitWithCuttingResult {
  parent: ParentSheet;
  plate: string;
  pressSheet: { w: number; h: number };
  upsPerCutW: number;
  upsPerCutH: number;
  upsPerCutSheet: number;
  cutsPerParent: number;
  upsPerParent: number;
  pieceOrientation: 'natural' | 'rotated';
  pressOrientation: 'natural' | 'rotated';   // how the press sheet sits in the parent
  paperWastePercent: number;                  // (1 − cuts×press_area / parent_area) × 100
  pieceWastePercent: number;                  // (1 − ups×piece_area / press_area) × 100
  isWTEligible: boolean;                      // upsPerCut even + non-board + both sides asked
  warnings: string[];
}

export interface FitWithCuttingArgs {
  pieceW: number;
  pieceH: number;
  paperCategory: string;
  isBothSides: boolean;
  subscriberSheets?: ParentSheet[];
  /** Max ups per axis on a press sheet — bound the search */
  maxUpsPerAxis?: number;
}

export function fitWithPaperCutting(args: FitWithCuttingArgs): FitWithCuttingResult | null {
  const { pieceW, pieceH, paperCategory, isBothSides } = args;
  if (!pieceW || !pieceH) return null;

  const maxUps = args.maxUpsPerAxis ?? 8;
  const parents = parentSheetsFor(paperCategory, args.subscriberSheets ?? []);
  const isBoard = BOARD_PAPER_CATS.includes(paperCategory);
  const wantsWT = isBothSides && !isBoard;

  interface Candidate extends FitWithCuttingResult { score: number; }
  let best: Candidate | null = null;

  for (const parent of parents) {
    for (const plate of Object.keys(PLATE_DIMS)) {
      // Try both print modes against this plate.
      // If W&T is requested, also evaluate sheetwise as a fallback when
      // ups per cut sheet ends up odd.
      const modes: Array<'wt' | 'short'> = wantsWT ? ['wt', 'short'] : ['short'];

      for (const mode of modes) {
        const usable = plateUsable(plate, mode);
        if (!usable) continue;

        // Try piece in both orientations.
        const pieceOpts: Array<{ w: number; h: number; orient: 'natural' | 'rotated' }> = [
          { w: pieceW, h: pieceH, orient: 'natural' },
          { w: pieceH, h: pieceW, orient: 'rotated' },
        ];

        for (const { w: pw, h: ph, orient: pieceOrient } of pieceOpts) {
          for (let ups_w = 1; ups_w <= maxUps; ups_w++) {
            for (let ups_h = 1; ups_h <= maxUps; ups_h++) {
              const pressW = ups_w * pw;
              const pressH = ups_h * ph;

              // Press sheet must fit on the plate's usable area (in either
              // plate-feed orientation).
              const fitsPlateNatural  = pressW <= usable.w && pressH <= usable.h;
              const fitsPlateRotated  = pressH <= usable.w && pressW <= usable.h;
              if (!fitsPlateNatural && !fitsPlateRotated) continue;

              // Cuts per parent — try both press-sheet orientations inside parent.
              const cutsNatural = Math.floor(parent.w / pressW) * Math.floor(parent.h / pressH);
              const cutsRotated = Math.floor(parent.w / pressH) * Math.floor(parent.h / pressW);
              const cuts = Math.max(cutsNatural, cutsRotated);
              if (cuts <= 0) continue;
              const pressOrient: 'natural' | 'rotated' = cutsRotated > cutsNatural ? 'rotated' : 'natural';

              const upsPerCut = ups_w * ups_h;
              const upsPerParent = cuts * upsPerCut;

              const paperUsed = cuts * pressW * pressH;
              const paperWastePct = (1 - paperUsed / (parent.w * parent.h)) * 100;

              const pieceUsedOnSheet = upsPerCut * pw * ph;
              const pieceWastePct = (1 - pieceUsedOnSheet / (pressW * pressH)) * 100;

              const isEven = upsPerCut % 2 === 0 && upsPerCut >= 2;
              const isWT = isEven && wantsWT && mode === 'wt';

              // Scoring:
              //   + ups per parent dominates (more pieces per parent = cheap)
              //   + bonus when W&T can apply (even ups + non-board + both sides)
              //   − small penalty for paper waste so cleaner cuts break ties
              let score = upsPerParent * 1000;
              if (isWT) score += 200;
              score -= paperWastePct * 0.5;
              score -= Object.keys(PLATE_DIMS).indexOf(plate) * 0.001; // light preference for first-listed plates

              if (!best || score > best.score) {
                best = {
                  parent,
                  plate,
                  pressSheet: { w: pressW, h: pressH },
                  upsPerCutW: ups_w,
                  upsPerCutH: ups_h,
                  upsPerCutSheet: upsPerCut,
                  cutsPerParent: cuts,
                  upsPerParent,
                  pieceOrientation: pieceOrient,
                  pressOrientation: pressOrient,
                  paperWastePercent: Math.round(paperWastePct * 10) / 10,
                  pieceWastePercent: Math.round(pieceWastePct * 10) / 10,
                  isWTEligible: isWT,
                  warnings: [],
                  score,
                };
              }
            }
          }
        }
      }
    }
  }

  if (!best) return null;

  // Warnings
  const w: string[] = [];
  if (best.upsPerCutSheet === 1) {
    w.push('Only 1 piece fits per press sheet — for both-sides this needs 2 plate setups (no W&T).');
  }
  if (best.paperWastePercent > 35) {
    w.push(`Paper waste at parent level: ${best.paperWastePercent}%. Consider a custom-cut sheet stocked locally.`);
  }
  const { score: _drop, ...result } = best;
  return { ...result, warnings: w };
}
