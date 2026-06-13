// ─────────────────────────────────────────────────────────────────────────
// Source of truth: C:\Users\ASUS\OneDrive\Desktop\plate_mapping.csv
// Imported by:
//   • /calculator (size dropdown)
//   • /dashboard/products (subscriber picks allowed sizes per product)
//   • /products/[slug]  (customer sees only product's allowed sizes)
// ─────────────────────────────────────────────────────────────────────────

export interface FinalSize {
  id: string;
  group: string;
  label: string;
  w: number;
  h: number;
  plateSize: string;
}

export const FINAL_SIZES: FinalSize[] = [
  // A Series
  { id: 'a2', group: 'A Series', label: 'A2 (16.5 x 23.4")', w: 16.5,  h: 23.4,  plateSize: '18×25"' },
  { id: 'a3', group: 'A Series', label: 'A3 (11.7 x 16.5")', w: 11.69, h: 16.54, plateSize: '18×25"' },
  { id: 'a4', group: 'A Series', label: 'A4 (8.3 x 11.7")',  w: 8.27,  h: 11.69, plateSize: '18×25"' },
  { id: 'a5', group: 'A Series', label: 'A5 (5.8 x 8.3")',   w: 5.83,  h: 8.27,  plateSize: '18×25"' },
  { id: 'a6', group: 'A Series', label: 'A6 (4.1 x 5.8")',   w: 4.13,  h: 5.83,  plateSize: '18×25"' },
  { id: 'a7', group: 'A Series', label: 'A7 (2.9 x 4.1")',   w: 2.91,  h: 4.13,  plateSize: '18×25"' },

  // American Standard
  { id: 'am1', group: 'American Standard', label: '4.25 x 5.5"',        w: 4.25, h: 5.5,  plateSize: '18×23"' },
  { id: 'am2', group: 'American Standard', label: '5.5 x 8.5"',         w: 5.5,  h: 8.5,  plateSize: '18×23"' },
  { id: 'am3', group: 'American Standard', label: 'Letter (8.5 x 11")', w: 8.5,  h: 11,   plateSize: '18×23"' },
  { id: 'am4', group: 'American Standard', label: 'Legal (8.5 x 14")',  w: 8.5,  h: 14,   plateSize: '15×20"' },
  { id: 'am5', group: 'American Standard', label: 'Tabloid (11 x 17")', w: 11,   h: 17,   plateSize: '18×23"' },
  { id: 'am6', group: 'American Standard', label: '18 x 23"',           w: 18,   h: 23,   plateSize: '18×23"' },

  // Square / Tall
  { id: 'sq1', group: 'Square / Tall', label: '8 x 8" (Square)', w: 8, h: 8,  plateSize: '18×25"' },
  { id: 'tl1', group: 'Square / Tall', label: '8 x 24" (Tall)',  w: 8, h: 24, plateSize: '18×25"' },

  // B Series — uses 20×29 plate
  { id: 'b2', group: 'B Series', label: 'B2 (19 x 29")',  w: 19,   h: 29,  plateSize: '20×29"' },
  { id: 'b3', group: 'B Series', label: 'B3 (14 x 19")',  w: 14,   h: 19,  plateSize: '20×29"' },
  { id: 'b4', group: 'B Series', label: 'B4 (9.5 x 14")', w: 9.5,  h: 14,  plateSize: '20×29"' },
  { id: 'b5', group: 'B Series', label: 'B5 (7 x 9.5")',  w: 7,    h: 9.5, plateSize: '20×29"' },
  { id: 'b6', group: 'B Series', label: 'B6 (4.75 x 7")', w: 4.75, h: 7,   plateSize: '20×29"' },

  // Cards
  { id: 'vc',    group: 'Cards', label: 'Visiting Card (3.5 x 2")',      w: 3.5,   h: 2,     plateSize: '18×25"' },
  { id: 'vc_eu', group: 'Cards', label: 'Visiting Card EU (85 x 55 mm)', w: 3.346, h: 2.165, plateSize: '18×25"' },
  { id: 'vc_uk', group: 'Cards', label: 'Visiting Card UK (90 x 55 mm)', w: 3.543, h: 2.165, plateSize: '18×25"' },
  { id: 'pc4x6', group: 'Cards', label: 'Postcard 4 x 6"',               w: 4,     h: 6,     plateSize: '18×25"' },
  { id: 'pc5x7', group: 'Cards', label: 'Postcard 5 x 7"',               w: 5,     h: 7,     plateSize: '18×23"' },
  { id: 'gc5x7', group: 'Cards', label: 'Greeting Card 5 x 7"',          w: 5,     h: 7,     plateSize: '18×23"' },
  { id: 'wc5x7', group: 'Cards', label: 'Wedding Card 5 x 7"',           w: 5,     h: 7,     plateSize: '18×23"' },
  { id: 'rack',  group: 'Cards', label: 'Rack Card 4 x 9"',              w: 4,     h: 9,     plateSize: '20×29"' },
  { id: 'bkmk',  group: 'Cards', label: 'Bookmark 2 x 7"',               w: 2,     h: 7,     plateSize: '20×29"' },
  { id: 'dh',    group: 'Cards', label: 'Door Hanger 4.25 x 11"',        w: 4.25,  h: 11,    plateSize: '18×23"' },

  // Stationery
  { id: 'dl',    group: 'Stationery', label: 'DL Envelope (4.33 x 8.66")',    w: 4.33,  h: 8.66,  plateSize: '18×25"' },
  { id: 'c5',    group: 'Stationery', label: 'C5 Envelope (6.38 x 9.02")',    w: 6.38,  h: 9.02,  plateSize: '18×25"' },
  { id: 'c4',    group: 'Stationery', label: 'C4 Envelope (9.02 x 12.76")',   w: 9.02,  h: 12.76, plateSize: '18×25"' },
  { id: 'no10',  group: 'Stationery', label: 'No.10 Envelope (4.125 x 9.5")', w: 4.125, h: 9.5,   plateSize: '18×25"' },
  { id: 'lh_a4', group: 'Stationery', label: 'Letterhead A4 (8.27 x 11.69")', w: 8.27,  h: 11.69, plateSize: '18×25"' },
  { id: 'np_a5', group: 'Stationery', label: 'Notepad A5 (5.83 x 8.27")',     w: 5.83,  h: 8.27,  plateSize: '18×25"' },
  { id: 'np_a6', group: 'Stationery', label: 'Notepad A6 (4.13 x 5.83")',     w: 4.13,  h: 5.83,  plateSize: '18×25"' },

  // Folder
  { id: 'fold', group: 'Folder', label: 'Presentation Folder 9 x 12"', w: 9, h: 12, plateSize: '18×23"' },

  // Wall calendars / large format — recommended sizes for wall calendar products
  { id: 'wc11x17', group: 'Wall Calendar', label: 'Wall Calendar 11 x 17"', w: 11, h: 17, plateSize: '18×23"' },
  { id: 'wc12x18', group: 'Wall Calendar', label: 'Wall Calendar 12 x 18"', w: 12, h: 18, plateSize: '20×29"' },
  { id: 'wc14x22', group: 'Wall Calendar', label: 'Wall Calendar 14 x 22"', w: 14, h: 22, plateSize: '20×29"' },
  { id: 'wc16x20', group: 'Wall Calendar', label: 'Wall Calendar 16 x 20"', w: 16, h: 20, plateSize: '18×25"' },
];

export const SIZE_GROUPS = [
  'A Series',
  'American Standard',
  'Square / Tall',
  'B Series',
  'Cards',
  'Stationery',
  'Folder',
  'Wall Calendar',
];

export function getSizeById(id: string | null | undefined): FinalSize | undefined {
  if (!id) return undefined;
  return FINAL_SIZES.find((s) => s.id === id);
}
