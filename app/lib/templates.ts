// ─────────────────────────────────────────────────────────────────────
// Product Templates — the 7 calculation patterns that cover ~95% of
// print products. Templates are SYSTEM-DEFINED in code (immutable math).
// Subscribers create custom-named products from these templates.
// ─────────────────────────────────────────────────────────────────────

export type FieldType = 'number' | 'select' | 'toggle' | 'segment' | 'sizes' | 'paper' | 'fold' | 'binding' | 'page_count';

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  optional?: boolean;
  helpText?: string;
  defaultOptions?: Array<{ value: string; label: string; meta?: Record<string, unknown> }>;
}

export interface ProductTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  accent: string;
  defaultProducts: Array<{
    slug: string;
    name: string;
    description: string;
    icon: string;
    defaultSize?: { label: string; w: number; h: number };
    countryNames?: Record<string, string>;
  }>;
  fields: TemplateField[];
}

// ─── Common option pools ────────────────────────────────────────────────

const SIZE_PRESETS_CARD = [
  { value: '3.5x2', label: '3.5 × 2 in (US Business Card)', meta: { w: 3.5, h: 2 } },
  { value: '85x55mm', label: '85 × 55 mm (Standard EU/IN)', meta: { w: 3.346, h: 2.165 } },
  { value: '90x55mm', label: '90 × 55 mm (UK)', meta: { w: 3.543, h: 2.165 } },
  { value: '4x6', label: '4 × 6 in (Postcard)', meta: { w: 4, h: 6 } },
  { value: '5x7', label: '5 × 7 in (Greeting Card)', meta: { w: 5, h: 7 } },
  { value: 'A6', label: 'A6 (105 × 148 mm)', meta: { w: 4.13, h: 5.83 } },
  { value: 'A7', label: 'A7 (74 × 105 mm)', meta: { w: 2.91, h: 4.13 } },
  { value: 'custom', label: 'Custom size…', meta: { w: 0, h: 0 } },
];

const SIZE_PRESETS_SHEET = [
  { value: 'A6', label: 'A6 (105 × 148 mm)', meta: { w: 4.13, h: 5.83 } },
  { value: 'A5', label: 'A5 (148 × 210 mm)', meta: { w: 5.83, h: 8.27 } },
  { value: 'A4', label: 'A4 (210 × 297 mm)', meta: { w: 8.27, h: 11.69 } },
  { value: 'A3', label: 'A3 (297 × 420 mm)', meta: { w: 11.69, h: 16.54 } },
  { value: 'A2', label: 'A2 (420 × 594 mm)', meta: { w: 16.54, h: 23.39 } },
  { value: 'letter', label: 'Letter (8.5 × 11 in)', meta: { w: 8.5, h: 11 } },
  { value: 'tabloid', label: 'Tabloid (11 × 17 in)', meta: { w: 11, h: 17 } },
  { value: '5.5x8.5', label: 'Half Letter (5.5 × 8.5 in)', meta: { w: 5.5, h: 8.5 } },
  { value: 'custom', label: 'Custom size…', meta: { w: 0, h: 0 } },
];

const SIZE_PRESETS_LETTERHEAD = [
  { value: 'A4', label: 'A4 (210 × 297 mm)', meta: { w: 8.27, h: 11.69 } },
  { value: 'letter', label: 'Letter (8.5 × 11 in)', meta: { w: 8.5, h: 11 } },
  { value: 'legal', label: 'Legal (8.5 × 14 in)', meta: { w: 8.5, h: 14 } },
];

const SIZE_PRESETS_NOTEPAD = [
  { value: 'A4', label: 'A4 (210 × 297 mm)', meta: { w: 8.27, h: 11.69 } },
  { value: 'A5', label: 'A5 (148 × 210 mm)', meta: { w: 5.83, h: 8.27 } },
  { value: 'A6', label: 'A6 (105 × 148 mm)', meta: { w: 4.13, h: 5.83 } },
  { value: 'letter', label: 'Letter (8.5 × 11 in)', meta: { w: 8.5, h: 11 } },
  { value: 'half-letter', label: 'Half Letter (5.5 × 8.5 in)', meta: { w: 5.5, h: 8.5 } },
];

const SIZE_PRESETS_ENVELOPE = [
  { value: 'DL', label: 'DL (110 × 220 mm)', meta: { w: 4.33, h: 8.66 } },
  { value: 'C5', label: 'C5 (162 × 229 mm)', meta: { w: 6.38, h: 9.02 } },
  { value: 'C4', label: 'C4 (229 × 324 mm)', meta: { w: 9.02, h: 12.76 } },
  { value: 'no10', label: 'No.10 (4.125 × 9.5 in)', meta: { w: 4.125, h: 9.5 } },
  { value: '6x9', label: '6 × 9 in', meta: { w: 6, h: 9 } },
  { value: '9x12', label: '9 × 12 in', meta: { w: 9, h: 12 } },
];

const SIDES = [
  { value: 'one', label: 'Single Side (1)' },
  { value: 'both', label: 'Both Sides (2)' },
];

const COLORS = [
  { value: 'four_color', label: 'Full Color (CMYK)' },
  { value: 'two_color', label: '2 Colors' },
  { value: 'single_color', label: '1 Color' },
  { value: 'bw', label: 'Black & White' },
];

const FOLD_TYPES = [
  { value: 'half', label: 'Half Fold (1 fold, 2 panels)' },
  { value: 'tri', label: 'Tri-Fold (2 folds, 3 panels)' },
  { value: 'z', label: 'Z-Fold (zigzag, 3 panels)' },
  { value: 'gate', label: 'Gate Fold (4 panels)' },
  { value: 'double_parallel', label: 'Double Parallel Fold' },
  { value: 'roll', label: 'Roll Fold (4+ panels)' },
];

const BINDINGS = [
  { value: 'saddle_stitch', label: 'Saddle Stitch (stapled spine)' },
  { value: 'perfect_bound', label: 'Perfect Bound (glued spine)' },
  { value: 'spiral', label: 'Spiral / Coil Bound' },
  { value: 'wire_o', label: 'Wire-O Bound' },
  { value: 'hardcover', label: 'Hardcover (Case Bound)' },
  { value: 'gum_top', label: 'Gum Top Pad (notepad)' },
];

// ─── Templates ──────────────────────────────────────────────────────────

export const TEMPLATES: ProductTemplate[] = [
  // ─── 1. CARD ──────────────────────────────────────────────────────────
  {
    id: 'card',
    label: 'Card',
    description: 'Small flat printed cards on cardstock. Single sheet, no folds.',
    icon: '🪪',
    accent: '#7C3AED',
    defaultProducts: [
      {
        slug: 'business-card',
        name: 'Business Card',
        description: 'Standard 3.5×2" professional card',
        icon: '💼',
        defaultSize: { label: '3.5 × 2 in', w: 3.5, h: 2 },
        countryNames: { US: 'Business Card', UK: 'Business Card', IN: 'Visiting Card', AU: 'Business Card', CA: 'Business Card' },
      },
      {
        slug: 'postcard',
        name: 'Postcard',
        description: 'Mailable promotional card, typically 4×6"',
        icon: '📮',
        defaultSize: { label: '4 × 6 in', w: 4, h: 6 },
      },
      {
        slug: 'greeting-card',
        name: 'Greeting Card',
        description: 'Personal/celebration card, often folded',
        icon: '🎉',
        defaultSize: { label: '5 × 7 in', w: 5, h: 7 },
      },
      {
        slug: 'rack-card',
        name: 'Rack Card',
        description: 'Slim card sized for display racks',
        icon: '🗂️',
        defaultSize: { label: '4 × 9 in', w: 4, h: 9 },
      },
      {
        slug: 'bookmark',
        name: 'Bookmark',
        description: 'Long narrow card for books',
        icon: '🔖',
        defaultSize: { label: '2 × 7 in', w: 2, h: 7 },
      },
      {
        slug: 'door-hanger',
        name: 'Door Hanger',
        description: 'Hanging promotional card with cutout',
        icon: '🚪',
        defaultSize: { label: '4.25 × 11 in', w: 4.25, h: 11 },
      },
    ],
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, helpText: 'Number of cards to print' },
      { key: 'size', label: 'Size', type: 'sizes', required: true, defaultOptions: SIZE_PRESETS_CARD },
      { key: 'paper', label: 'Paper / GSM', type: 'paper', required: true },
      { key: 'sides', label: 'Print Sides', type: 'segment', required: true, defaultOptions: SIDES },
      { key: 'color', label: 'Color', type: 'segment', required: true, defaultOptions: COLORS },
      { key: 'lamination', label: 'Lamination', type: 'select', optional: true, helpText: 'Matte or gloss film coating' },
      { key: 'uv', label: 'UV Coating', type: 'select', optional: true, helpText: 'Glossy varnish (full or spot)' },
      { key: 'rounded_corners', label: 'Rounded Corners', type: 'toggle', optional: true },
      { key: 'foiling', label: 'Foil Stamping', type: 'select', optional: true },
      { key: 'embossing', label: 'Embossing', type: 'select', optional: true },
      { key: 'spot_uv', label: 'Spot UV', type: 'toggle', optional: true },
    ],
  },

  // ─── 2. SHEET ─────────────────────────────────────────────────────────
  {
    id: 'sheet',
    label: 'Sheet',
    description: 'Single-sheet printed materials. No folds, no binding.',
    icon: '📄',
    accent: '#9461FB',
    defaultProducts: [
      {
        slug: 'flyer',
        name: 'Flyer',
        description: 'Promotional single-sheet handout',
        icon: '📢',
        defaultSize: { label: 'A4 (210 × 297 mm)', w: 8.27, h: 11.69 },
        countryNames: { US: 'Flyer', UK: 'Leaflet', IN: 'Pamphlet', AU: 'Flyer', CA: 'Flyer' },
      },
      {
        slug: 'poster',
        name: 'Poster',
        description: 'Large display sheet',
        icon: '🖼️',
        defaultSize: { label: 'A3 (297 × 420 mm)', w: 11.69, h: 16.54 },
      },
      {
        slug: 'sell-sheet',
        name: 'Sell Sheet',
        description: 'One-page sales/product info sheet',
        icon: '📋',
        defaultSize: { label: '8.5 × 11 in', w: 8.5, h: 11 },
      },
      {
        slug: 'newsletter',
        name: 'Newsletter',
        description: 'Multi-section single-sheet newsletter',
        icon: '📰',
        defaultSize: { label: '11 × 17 in', w: 11, h: 17 },
      },
    ],
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'size', label: 'Size', type: 'sizes', required: true, defaultOptions: SIZE_PRESETS_SHEET },
      { key: 'paper', label: 'Paper / GSM', type: 'paper', required: true },
      { key: 'sides', label: 'Print Sides', type: 'segment', required: true, defaultOptions: SIDES },
      { key: 'color', label: 'Color', type: 'segment', required: true, defaultOptions: COLORS },
      { key: 'lamination', label: 'Lamination', type: 'select', optional: true },
      { key: 'uv', label: 'UV Coating', type: 'select', optional: true },
    ],
  },

  // ─── 3. FOLDED ────────────────────────────────────────────────────────
  {
    id: 'folded',
    label: 'Folded',
    description: 'Single-sheet products with folds (brochures, leaflets).',
    icon: '📰',
    accent: '#A78BFA',
    defaultProducts: [
      {
        slug: 'brochure',
        name: 'Brochure',
        description: 'Folded promotional sheet, multiple panels',
        icon: '📑',
        defaultSize: { label: '8.5 × 11 in', w: 8.5, h: 11 },
      },
      {
        slug: 'rack-brochure',
        name: 'Rack Brochure',
        description: 'Tall folded sheet sized for display racks',
        icon: '🗃️',
        defaultSize: { label: '4 × 9 in (folded)', w: 8.5, h: 11 },
      },
      {
        slug: 'menu',
        name: 'Menu',
        description: 'Folded restaurant/cafe menu',
        icon: '🍽️',
        defaultSize: { label: '11 × 17 in', w: 11, h: 17 },
      },
    ],
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'size', label: 'Flat Size', type: 'sizes', required: true, defaultOptions: SIZE_PRESETS_SHEET },
      { key: 'fold_type', label: 'Fold Type', type: 'fold', required: true, defaultOptions: FOLD_TYPES },
      { key: 'paper', label: 'Paper / GSM', type: 'paper', required: true },
      { key: 'sides', label: 'Print Sides', type: 'segment', required: true, defaultOptions: SIDES },
      { key: 'color', label: 'Color', type: 'segment', required: true, defaultOptions: COLORS },
      { key: 'lamination', label: 'Lamination', type: 'select', optional: true },
    ],
  },

  // ─── 4. BOOKLET ───────────────────────────────────────────────────────
  {
    id: 'booklet',
    label: 'Booklet / Book',
    description: 'Multi-page bound publications (booklets, books, magazines).',
    icon: '📚',
    accent: '#D946EF',
    defaultProducts: [
      {
        slug: 'booklet',
        name: 'Booklet',
        description: 'Short multi-page publication',
        icon: '📒',
        defaultSize: { label: '5.5 × 8.5 in', w: 5.5, h: 8.5 },
      },
      {
        slug: 'catalog',
        name: 'Catalog',
        description: 'Product catalog with many pages',
        icon: '📕',
        countryNames: { UK: 'Catalogue', IN: 'Catalogue', AU: 'Catalogue', CA: 'Catalogue', US: 'Catalog' },
        defaultSize: { label: '8.5 × 11 in', w: 8.5, h: 11 },
      },
      {
        slug: 'magazine',
        name: 'Magazine',
        description: 'Periodical publication',
        icon: '📰',
        defaultSize: { label: '8.375 × 10.875 in', w: 8.375, h: 10.875 },
      },
      {
        slug: 'book',
        name: 'Book',
        description: 'Standard book (any genre — comic, children, novel, etc.)',
        icon: '📘',
        defaultSize: { label: '6 × 9 in', w: 6, h: 9 },
      },
      {
        slug: 'program',
        name: 'Program',
        description: 'Event program booklet',
        icon: '🎭',
        defaultSize: { label: '5.5 × 8.5 in', w: 5.5, h: 8.5 },
      },
    ],
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'size', label: 'Page Size', type: 'sizes', required: true, defaultOptions: SIZE_PRESETS_SHEET },
      { key: 'page_count', label: 'Page Count', type: 'page_count', required: true, helpText: 'Total pages including front/back cover' },
      { key: 'binding', label: 'Binding', type: 'binding', required: true, defaultOptions: BINDINGS },
      { key: 'cover_paper', label: 'Cover Paper', type: 'paper', required: true },
      { key: 'inside_paper', label: 'Inside Paper', type: 'paper', required: true },
      { key: 'color', label: 'Color', type: 'segment', required: true, defaultOptions: COLORS },
      { key: 'sides', label: 'Print Sides', type: 'segment', required: true, defaultOptions: SIDES },
      { key: 'cover_lamination', label: 'Cover Lamination', type: 'select', optional: true },
      { key: 'cover_uv', label: 'Cover UV', type: 'select', optional: true },
    ],
  },

  // ─── 5. CALENDAR ──────────────────────────────────────────────────────
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Wall, desk, or table calendars with monthly pages.',
    icon: '📅',
    accent: '#06B6D4',
    defaultProducts: [
      {
        slug: 'wall-calendar',
        name: 'Wall Calendar',
        description: 'Hangable wall calendar',
        icon: '📆',
        defaultSize: { label: '11 × 17 in', w: 11, h: 17 },
      },
      {
        slug: 'desk-calendar',
        name: 'Desk Calendar',
        description: 'Tabletop standing calendar',
        icon: '🗓️',
        defaultSize: { label: '8 × 6 in', w: 8, h: 6 },
      },
    ],
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'size', label: 'Size', type: 'sizes', required: true, defaultOptions: SIZE_PRESETS_SHEET },
      { key: 'page_count', label: 'Pages', type: 'page_count', required: true, helpText: 'Typically 12-13 (one per month + cover)' },
      { key: 'binding', label: 'Binding', type: 'binding', required: true, defaultOptions: BINDINGS.filter(b => ['spiral', 'wire_o', 'saddle_stitch'].includes(b.value)) },
      { key: 'paper', label: 'Paper / GSM', type: 'paper', required: true },
      { key: 'color', label: 'Color', type: 'segment', required: true, defaultOptions: COLORS },
    ],
  },

  // ─── 6. STATIONERY ────────────────────────────────────────────────────
  {
    id: 'stationery',
    label: 'Stationery',
    description: 'Letterheads, notepads, envelopes — daily business stationery.',
    icon: '✉️',
    accent: '#F59E0B',
    defaultProducts: [
      {
        slug: 'letterhead',
        name: 'Letterhead',
        description: 'Branded business letter paper',
        icon: '📜',
        countryNames: { US: 'Letterhead', UK: 'Letterhead', IN: 'Letter Pad', AU: 'Letterhead', CA: 'Letterhead' },
        defaultSize: { label: 'A4 / Letter', w: 8.5, h: 11 },
      },
      {
        slug: 'notepad',
        name: 'Notepad',
        description: 'Tear-off pad, gum-bound at top',
        icon: '🗒️',
        defaultSize: { label: 'A5 (148 × 210 mm)', w: 5.83, h: 8.27 },
      },
      {
        slug: 'envelope',
        name: 'Envelope',
        description: 'Business envelopes with optional window',
        icon: '✉️',
        defaultSize: { label: 'DL (110 × 220 mm)', w: 4.33, h: 8.66 },
      },
    ],
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'size', label: 'Size', type: 'sizes', required: true, defaultOptions: SIZE_PRESETS_LETTERHEAD },
      { key: 'paper', label: 'Paper / GSM', type: 'paper', required: true },
      { key: 'color', label: 'Color', type: 'segment', required: true, defaultOptions: COLORS },
      { key: 'sides', label: 'Print Sides', type: 'segment', optional: true, defaultOptions: SIDES },
      { key: 'window', label: 'Window (envelopes)', type: 'toggle', optional: true },
      { key: 'sheets_per_pad', label: 'Sheets per Pad', type: 'number', optional: true, helpText: 'For notepads only' },
      { key: 'pad_binding', label: 'Pad Binding', type: 'select', optional: true, helpText: 'Gum top, spiral, etc.' },
    ],
  },

  // ─── 7. FOLDER ────────────────────────────────────────────────────────
  {
    id: 'folder',
    label: 'Folder',
    description: 'Presentation folders, document folders, files.',
    icon: '📁',
    accent: '#10B981',
    defaultProducts: [
      {
        slug: 'presentation-folder',
        name: 'Presentation Folder',
        description: 'Branded folder with inside pockets',
        icon: '📂',
        countryNames: { US: 'Presentation Folder', UK: 'Folder', IN: 'File / Folder', AU: 'Folder', CA: 'Folder' },
        defaultSize: { label: '9 × 12 in (closed)', w: 9, h: 12 },
      },
    ],
    fields: [
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'size', label: 'Closed Size', type: 'sizes', required: true, defaultOptions: SIZE_PRESETS_SHEET },
      { key: 'paper', label: 'Paper / GSM (heavy)', type: 'paper', required: true },
      { key: 'pockets', label: 'Inside Pockets', type: 'select', required: true, defaultOptions: [
        { value: '0', label: 'No pockets' },
        { value: '1', label: '1 pocket' },
        { value: '2', label: '2 pockets (standard)' },
      ]},
      { key: 'color', label: 'Color', type: 'segment', required: true, defaultOptions: COLORS },
      { key: 'lamination', label: 'Lamination', type: 'select', optional: true },
      { key: 'uv', label: 'UV Coating', type: 'select', optional: true },
      { key: 'foiling', label: 'Foil Stamping', type: 'select', optional: true },
      { key: 'embossing', label: 'Embossing', type: 'select', optional: true },
      { key: 'die_cut', label: 'Custom Die Cut', type: 'toggle', optional: true },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

export function getTemplate(id: string): ProductTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getDefaultProductsForTemplate(templateId: string) {
  const t = getTemplate(templateId);
  return t ? t.defaultProducts : [];
}

export function localizeProductName(
  baseName: string,
  countryNames: Record<string, string> | undefined,
  countryCode: string = 'US'
): string {
  if (!countryNames) return baseName;
  return countryNames[countryCode] || baseName;
}
