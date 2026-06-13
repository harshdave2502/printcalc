// ─────────────────────────────────────────────────────────────────────────
// Plate print areas — WORK-AND-TURN mode.
//
// Numbers from subscriber (verified for 18×23, 18×25, 20×29, 15×20).
// 20×28, 20×30, 25×36 extrapolated to the same −0.6 / −0.5 pattern.
//
// For SHORT-TURN (sheetwise) mode, the short axis loses another 0.65"
// for the second gripper. Use plateUsable() in lib/paper-cutting.ts.
// ─────────────────────────────────────────────────────────────────────────

export const PLATE_DIMS: Record<string, { w: number; h: number }> = {
  '15×20"': { w: 14.4, h: 19.5 },
  '18×23"': { w: 17.4, h: 22.5 },
  '18×25"': { w: 17.4, h: 24.5 },
  '20×28"': { w: 19.4, h: 27.5 },
  '20×29"': { w: 19.4, h: 28.5 },
  '20×30"': { w: 19.4, h: 29.5 },
  '25×36"': { w: 24.4, h: 35.5 },
};

// Parent (paper) sheet specs per plate — used by the STANDARD-SIZE path
// (lookupSizeMap hits). Mode B (paper cutting) ignores this and chooses
// its own parent from the per-category pool.
export const PARENT_SHEETS: Record<string, { parentW: number; parentH: number; cuts: number }> = {
  '15×20"': { parentW: 20, parentH: 30, cuts: 2 },
  '18×23"': { parentW: 23, parentH: 36, cuts: 2 },
  '18×25"': { parentW: 25, parentH: 36, cuts: 2 },
  '20×28"': { parentW: 20, parentH: 30, cuts: 1 },
  '20×29"': { parentW: 20, parentH: 30, cuts: 1 },
  '20×30"': { parentW: 20, parentH: 30, cuts: 1 },
  '25×36"': { parentW: 25, parentH: 36, cuts: 1 },
};
