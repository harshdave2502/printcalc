'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import { TOKENS } from '../../lib/design';
import {
  ResoldRate,
  ResoldExtra,
  ResoldExtraSelection,
  computeResoldPrice,
} from '../../lib/resold';

// ─────────────────────────────────────────────────────────────────────────
// Reseller-mode product page.
// Used when subscriber_products.product_type === 'resold'.
//
// Flow:
//   1. Customer picks size + thickness + finish + sides from the variant
//      axes (derived from the vendor rate table).
//   2. Customer picks qty (any number — we slab it to nearest vendor tier).
//   3. Customer ticks optional extras (clip / pouch / etc).
//   4. PrintCalc: vendor rate × markup → per piece × qty → add extras → GST.
//
// Internal numbers (vendor rate, slab name, markup) are hidden behind the
// "Show calculation details" toggle just like the manufactured flow.
// ─────────────────────────────────────────────────────────────────────────

const FONT_DISPLAY = TOKENS.fonts.display;
const FONT_BODY = TOKENS.fonts.body;

export interface ResoldFlowProduct {
  id: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  vendor_name: string | null;
  vendor_markup_percent: number | null;
  vendor_gst_percent: number | null;
  default_qty: number | null;
}

interface Props {
  product: ResoldFlowProduct;
  currency: string;
}

export default function ResoldFlow({ product, currency }: Props) {
  const [rates, setRates] = useState<ResoldRate[]>([]);
  const [extras, setExtras] = useState<ResoldExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Customer selections
  const [size, setSize] = useState<string>('');
  const [thickness, setThickness] = useState<string>('');
  const [finish, setFinish] = useState<string>('');
  const [sides, setSides] = useState<string>('');
  const [qty, setQty] = useState<number>(product.default_qty || 1000);
  const [selectedExtras, setSelectedExtras] = useState<ResoldExtraSelection[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [rRes, eRes] = await Promise.all([
        supabase.from('subscriber_product_resold_rates').select('*').eq('subscriber_product_id', product.id).order('sort_order'),
        supabase.from('subscriber_product_resold_extras').select('*').eq('subscriber_product_id', product.id).order('sort_order'),
      ]);
      if (!mounted) return;
      setRates((rRes.data || []) as ResoldRate[]);
      setExtras((eRes.data || []) as ResoldExtra[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [product.id]);

  // Variant axes — built from the rate table.
  const axes = useMemo(() => {
    const sizes = new Set<string>(), thicknesses = new Set<string>(), finishes = new Set<string>(), sidesSet = new Set<string>();
    for (const r of rates) {
      if (r.size_label) sizes.add(r.size_label);
      if (r.thickness) thicknesses.add(r.thickness);
      if (r.finish) finishes.add(r.finish);
      if (r.sides) sidesSet.add(r.sides);
    }
    return {
      sizes: [...sizes],
      thicknesses: [...thicknesses],
      finishes: [...finishes],
      sides: [...sidesSet],
    };
  }, [rates]);

  // Pre-select first option of each axis on first load.
  useEffect(() => {
    if (loading) return;
    if (!size && axes.sizes.length) setSize(axes.sizes[0]);
    if (!thickness && axes.thicknesses.length) setThickness(axes.thicknesses[0]);
    if (!finish && axes.finishes.length) setFinish(axes.finishes[0]);
    if (!sides && axes.sides.length) setSides(axes.sides[0]);
  }, [loading, axes, size, thickness, finish, sides]);

  const calc = useMemo(() => {
    return computeResoldPrice({
      qty,
      variant: { size_label: size, thickness, finish, sides },
      rates,
      markupPercent: product.vendor_markup_percent || 30,
      gstPercent: product.vendor_gst_percent || 18,
      extras,
      extraSelections: selectedExtras,
    });
  }, [qty, size, thickness, finish, sides, rates, extras, selectedExtras, product]);

  function toggleExtra(eId: string) {
    setSelectedExtras(prev =>
      prev.some(x => x.extra_id === eId)
        ? prev.filter(x => x.extra_id !== eId)
        : [...prev, { extra_id: eId, quantity: 1 }],
    );
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: TOKENS.colors.textMuted, fontWeight: 600 }}>Loading vendor rates…</div>;
  }
  if (rates.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, color: '#92400E', fontWeight: 600 }}>
        ⚠️ No vendor rates set up yet for this product. The owner needs to add them in Dashboard → Products → Edit.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', fontFamily: FONT_BODY, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 400px', gap: 32 }}>
      <div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>{product.icon || '📦'}</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{product.display_name}</h1>
          {product.description && <p style={{ fontSize: 14, color: TOKENS.colors.textMuted, marginTop: 6, fontWeight: 500 }}>{product.description}</p>}
        </div>

        {axes.sizes.length > 0 && (
          <AxisPicker label="Size" options={axes.sizes} value={size} setValue={setSize} />
        )}
        {axes.thicknesses.length > 0 && (
          <AxisPicker label="Thickness" options={axes.thicknesses} value={thickness} setValue={setThickness} />
        )}
        {axes.finishes.length > 0 && (
          <AxisPicker label="Finish" options={axes.finishes} value={finish} setValue={setFinish} />
        )}
        {axes.sides.length > 0 && (
          <AxisPicker label="Sides" options={axes.sides} value={sides} setValue={setSides} />
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 6 }}>Quantity</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value) || 0)}
            style={{ width: 200, padding: '10px 13px', fontSize: 15, fontWeight: 700, border: `1.5px solid ${TOKENS.colors.border}`, borderRadius: 9, outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        {extras.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 6 }}>Optional add-ons</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {extras.map(e => {
                const active = selectedExtras.some(s => s.extra_id === e.id);
                return (
                  <button key={e.id} type="button" onClick={() => toggleExtra(e.id)} style={chipBtn(active)}>
                    {active ? '✓ ' : '+ '}{e.extra_name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Price card */}
      <div style={{ position: 'sticky', top: 90, alignSelf: 'flex-start' }}>
        <div style={{ background: '#fff', border: `1.5px solid ${TOKENS.colors.borderStrong}`, borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.colors.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Estimate</div>

          {!calc.ready ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }}>🧮</div>
              <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 600 }}>
                {calc.warning || 'Pick options to see your price'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 800, color: TOKENS.colors.text, letterSpacing: '-0.025em', lineHeight: 1 }}>
                {currency}{(calc.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginTop: 4, fontWeight: 600 }}>
                {currency}{(calc.perUnit || 0).toFixed(2)} each · {calc.qty.toLocaleString()} pcs
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 14, borderTop: `1px solid ${TOKENS.colors.border}`, marginTop: 14 }}>
                {(calc.extrasBreakdown || []).map((b, i) => (
                  <PriceRow key={i} label={b.name} value={`${currency}${b.value.toFixed(2)}`} />
                ))}
                {(calc.gst || 0) > 0 && <PriceRow label="GST" value={`${currency}${(calc.gst || 0).toFixed(2)}`} />}
                <PriceRow label="Total" value={`${currency}${(calc.total || 0).toFixed(2)}`} />
              </div>

              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{ marginTop: 14, width: '100%', padding: '8px 12px', background: 'transparent', border: `1px dashed ${TOKENS.colors.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: TOKENS.colors.textMuted, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {showDetails ? '▾ Hide calculation details' : '▸ Show calculation details (subscriber only)'}
              </button>

              {showDetails && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${TOKENS.colors.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: TOKENS.colors.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    🔒 Internal — keep off-screen
                  </div>
                  <PriceRow label="Vendor" value={product.vendor_name || '—'} />
                  <PriceRow label="Slab matched" value={calc.slabLabel || '—'} />
                  <PriceRow label="Vendor / piece" value={`${currency}${(calc.vendorPerPiece || 0).toFixed(2)}`} />
                  <PriceRow label={`Markup ${product.vendor_markup_percent ?? 30}%`} value={`${currency}${((calc.retailPerPiece || 0) - (calc.vendorPerPiece || 0)).toFixed(2)} / pc`} />
                  <PriceRow label="Retail / piece" value={`${currency}${(calc.retailPerPiece || 0).toFixed(2)}`} />
                  <PriceRow label="Items subtotal" value={`${currency}${(calc.itemSubtotal || 0).toFixed(2)}`} />
                  <PriceRow label="Extras subtotal" value={`${currency}${(calc.extrasTotal || 0).toFixed(2)}`} />
                  <PriceRow label="Pre-GST subtotal" value={`${currency}${(calc.subtotal || 0).toFixed(2)}`} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AxisPicker({ label, options, value, setValue }: { label: string; options: string[]; value: string; setValue: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => (
          <button key={o} type="button" onClick={() => setValue(o)} style={chipBtn(value === o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: TOKENS.colors.textMuted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: TOKENS.colors.text, fontWeight: 700, fontFamily: TOKENS.fonts.mono }}>{value}</span>
    </div>
  );
}

function chipBtn(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 100,
    border: `1.5px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
    background: active ? 'rgba(124,58,237,0.10)' : '#fff',
    color: active ? TOKENS.colors.primary : TOKENS.colors.textMuted,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  };
}
