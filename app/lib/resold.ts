// ─────────────────────────────────────────────────────────────────────────
// Reseller-mode pricing.
//
// For products that the subscriber RESELLS from a vendor (e.g. PP Files
// bought from Gandhi Card, marked up, and resold), the calc is:
//
//   per_piece = vendor_rate(variant, qty_slab) × (1 + markup%)
//   total     = per_piece × qty + sum(extras)
//   with_gst  = total × (1 + gst%)
//
// No paper/printing math. The vendor's rate sheet IS the input.
// ─────────────────────────────────────────────────────────────────────────

export interface ResoldRate {
  id: string;
  subscriber_product_id: string;
  size_label: string | null;
  thickness: string | null;
  finish: string | null;
  sides: string | null;
  rate_1k: number | null;
  rate_2k: number | null;
  rate_3k: number | null;
  rate_5k: number | null;
  rate_10k: number | null;
  notes: string | null;
  sort_order: number;
}

export interface ResoldExtra {
  id: string;
  subscriber_product_id: string;
  extra_name: string;
  rate: number;
  unit: 'per_piece' | 'per_side' | 'per_clip' | 'per_order';
  is_optional: boolean;
  sort_order: number;
}

export interface ResoldVariant {
  size_label?: string;
  thickness?: string;
  finish?: string;
  sides?: string;
}

export interface ResoldExtraSelection {
  extra_id: string;
  quantity?: number;     // e.g. number of clips when unit=per_clip
}

// ─────────────────────────────────────────────────────────────────────────
// Variant matching — case-insensitive, ignores empty strings.
// ─────────────────────────────────────────────────────────────────────────
function eqv(a: string | null | undefined, b: string | null | undefined): boolean {
  const aa = (a || '').trim().toLowerCase();
  const bb = (b || '').trim().toLowerCase();
  return aa === bb || aa === '' || bb === '';
}

export function findResoldRate(rates: ResoldRate[], v: ResoldVariant): ResoldRate | undefined {
  return rates.find(r =>
    eqv(r.size_label, v.size_label) &&
    eqv(r.thickness, v.thickness) &&
    eqv(r.finish, v.finish) &&
    eqv(r.sides, v.sides),
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Slab selection — pick the highest slab ≤ qty (so 4000 picks the 3k slab,
// 6000 picks the 5k slab). For qty above 10k we extrapolate using the 10k
// rate (still cheapest). For qty below 1k we use 1k rate.
// ─────────────────────────────────────────────────────────────────────────
export interface SlabPick {
  slabLabel: '1k' | '2k' | '3k' | '5k' | '10k';
  perPiece: number;          // raw vendor rate
}

const SLABS: Array<{ label: SlabPick['slabLabel']; min: number; field: keyof ResoldRate }> = [
  { label: '1k',  min: 0,     field: 'rate_1k'  },
  { label: '2k',  min: 2000,  field: 'rate_2k'  },
  { label: '3k',  min: 3000,  field: 'rate_3k'  },
  { label: '5k',  min: 5000,  field: 'rate_5k'  },
  { label: '10k', min: 10000, field: 'rate_10k' },
];

export function pickSlab(rate: ResoldRate, qty: number): SlabPick | null {
  // Walk slabs in descending min; first one whose min ≤ qty AND has a rate wins.
  for (let i = SLABS.length - 1; i >= 0; i--) {
    const s = SLABS[i];
    if (qty >= s.min) {
      const v = rate[s.field];
      if (typeof v === 'number' && v > 0) {
        return { slabLabel: s.label, perPiece: v };
      }
    }
  }
  // Fallback: lowest filled slab.
  for (const s of SLABS) {
    const v = rate[s.field];
    if (typeof v === 'number' && v > 0) return { slabLabel: s.label, perPiece: v };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Full price calc
// ─────────────────────────────────────────────────────────────────────────
export interface ComputeResoldArgs {
  qty: number;
  variant: ResoldVariant;
  rates: ResoldRate[];
  markupPercent: number;
  gstPercent: number;
  extras: ResoldExtra[];                 // all extras for the product
  extraSelections: ResoldExtraSelection[]; // which extras the customer ticked
}

export interface ResoldComputeResult {
  ready: boolean;
  qty: number;
  slabLabel?: string;
  vendorPerPiece?: number;       // vendor rate per piece (no markup)
  retailPerPiece?: number;       // vendor × (1 + markup%)
  itemSubtotal?: number;         // retailPerPiece × qty
  extrasTotal?: number;
  extrasBreakdown?: Array<{ name: string; value: number }>;
  subtotal?: number;             // itemSubtotal + extrasTotal
  gst?: number;
  total?: number;
  perUnit?: number;
  warning?: string;
}

export function computeResoldPrice(args: ComputeResoldArgs): ResoldComputeResult {
  const { qty, variant, rates, markupPercent, gstPercent, extras, extraSelections } = args;
  if (!qty || qty <= 0) return { ready: false, qty: 0 };

  const rate = findResoldRate(rates, variant);
  if (!rate) {
    return { ready: false, qty, warning: 'No vendor rate found for this combination.' };
  }
  const slab = pickSlab(rate, qty);
  if (!slab) {
    return { ready: false, qty, warning: 'Vendor rate exists but no slab is filled.' };
  }

  const vendorPerPiece = slab.perPiece;
  const retailPerPiece = vendorPerPiece * (1 + (markupPercent || 0) / 100);
  const itemSubtotal = retailPerPiece * qty;

  // Extras
  let extrasTotal = 0;
  const extrasBreakdown: Array<{ name: string; value: number }> = [];
  for (const sel of extraSelections) {
    const e = extras.find(x => x.id === sel.extra_id);
    if (!e) continue;
    let value = 0;
    if (e.unit === 'per_piece') value = e.rate * qty;
    else if (e.unit === 'per_side') value = e.rate * qty * 2;   // both sides default
    else if (e.unit === 'per_clip') value = e.rate * qty * (sel.quantity || 1);
    else if (e.unit === 'per_order') value = e.rate;
    extrasTotal += value;
    extrasBreakdown.push({ name: e.extra_name, value });
  }

  const subtotal = itemSubtotal + extrasTotal;
  const gst = subtotal * ((gstPercent || 0) / 100);
  const total = subtotal + gst;
  const perUnit = qty > 0 ? total / qty : 0;

  return {
    ready: true,
    qty,
    slabLabel: slab.slabLabel,
    vendorPerPiece,
    retailPerPiece,
    itemSubtotal,
    extrasTotal,
    extrasBreakdown,
    subtotal,
    gst,
    total,
    perUnit,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// CSV paste helper — lets the subscriber paste a vendor rate table from
// Excel directly. Expected columns (header optional, tab or comma sep):
//   size | thickness | finish | sides | 1000 | 2000 | 3000 | 5000 | 10000
// Empty cells become null. Skips lines that don't parse.
// ─────────────────────────────────────────────────────────────────────────
export interface ParsedRateRow {
  size_label: string | null;
  thickness: string | null;
  finish: string | null;
  sides: string | null;
  rate_1k: number | null;
  rate_2k: number | null;
  rate_3k: number | null;
  rate_5k: number | null;
  rate_10k: number | null;
}

export function parseRateCsv(text: string): ParsedRateRow[] {
  const out: ParsedRateRow[] = [];
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\t|,/).map(s => s.trim());
    if (parts.length < 5) continue;            // need at least size + 1 rate
    // Detect header — if line 0 looks like text headers, skip it.
    if (/^(size|finish|thickness)/i.test(parts[0])) continue;

    const numOrNull = (s: string): number | null => {
      const n = parseFloat(s.replace(/[^\d.]/g, ''));
      return isFinite(n) && n > 0 ? n : null;
    };

    // Variant fields first 4 cols (text), then up to 5 rate cols.
    out.push({
      size_label: parts[0] || null,
      thickness:  parts[1] || null,
      finish:     parts[2] || null,
      sides:      parts[3] || null,
      rate_1k:  numOrNull(parts[4] || ''),
      rate_2k:  numOrNull(parts[5] || ''),
      rate_3k:  numOrNull(parts[6] || ''),
      rate_5k:  numOrNull(parts[7] || ''),
      rate_10k: numOrNull(parts[8] || ''),
    });
  }
  return out;
}
