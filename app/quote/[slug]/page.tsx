'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { getTemplate, ProductTemplate } from '../../lib/templates';
import { TOKENS } from '../../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Quick Quote — customer-friendly view.
// Single page, plain language, smart defaults, no jargon, mobile-first.
// Same calculation engine as /products/[slug] but UI optimized for end users.
// ─────────────────────────────────────────────────────────────────────────

interface SubscriberProduct {
  id: string;
  template_id: string;
  slug: string;
  display_name: string;
  description: string;
  icon: string;
  default_size_label: string | null;
  default_size_w_inch: number | null;
  default_size_h_inch: number | null;
}
interface PaperStock { id: string; label: string; gsm: number; rate_per_kg: number; category: string; }
interface PrintingRate { id: string; plate_name: string; color_option: string; fixed_charge: number; per_1000_impression: number; }
interface SubscriberInfo { id: string; business_name: string; email: string; }

const PLATE_DIMS: Record<string, { w: number; h: number }> = {
  '15×20"': { w: 14.5, h: 19.5 }, '18×23"': { w: 17.5, h: 22.5 }, '18×25"': { w: 17.5, h: 24.5 },
  '20×28"': { w: 19.5, h: 27.5 }, '20×30"': { w: 19.5, h: 29.5 }, '25×36"': { w: 24.5, h: 35.5 },
};
const PARENT_SHEETS: Record<string, { parentW: number; parentH: number; cuts: number }> = {
  '15×20"': { parentW: 20, parentH: 30, cuts: 2 }, '18×23"': { parentW: 23, parentH: 36, cuts: 2 },
  '18×25"': { parentW: 25, parentH: 36, cuts: 2 }, '20×28"': { parentW: 20, parentH: 30, cuts: 1 },
  '20×30"': { parentW: 20, parentH: 30, cuts: 1 }, '25×36"': { parentW: 25, parentH: 36, cuts: 1 },
};
const BOARD_PAPER_CATS = ['SBS', 'FBB', 'Duplex Grey Back', 'Duplex White Back'];

function calcUps(w: number, h: number, plateKey: string): number {
  const p = PLATE_DIMS[plateKey]; if (!p || !w || !h) return 1;
  return Math.max(Math.floor(p.w / w) * Math.floor(p.h / h), Math.floor(p.w / h) * Math.floor(p.h / w), 1);
}
function autoSelectPlate(w: number, h: number): string {
  let best = '18×25"'; let bestUps = 0;
  for (const pk of Object.keys(PLATE_DIMS)) {
    const p = PLATE_DIMS[pk];
    const ups = Math.max(Math.floor(p.w / w) * Math.floor(p.h / h), Math.floor(p.w / h) * Math.floor(p.h / w), 1);
    if (ups > bestUps || (ups === bestUps && p.w * p.h < PLATE_DIMS[best].w * PLATE_DIMS[best].h)) { bestUps = ups; best = pk; }
  }
  return best;
}

// Plain-language helpers
function thicknessLabel(gsm: number): { label: string; example: string } {
  if (gsm < 100) return { label: 'Light', example: 'like a flyer' };
  if (gsm < 170) return { label: 'Medium', example: 'like a magazine' };
  if (gsm < 280) return { label: 'Thick', example: 'like a postcard' };
  return { label: 'Extra Thick', example: 'like a business card' };
}

// ─────────────────────────────────────────────────────────────────────────

export default function QuickQuotePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<SubscriberProduct | null>(null);
  const [template, setTemplate] = useState<ProductTemplate | null>(null);
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([]);
  const [printingRates, setPrintingRates] = useState<PrintingRate[]>([]);
  const [subscriberInfo, setSubscriberInfo] = useState<SubscriberInfo>({ id: '', business_name: '', email: '' });
  const [currency, setCurrency] = useState('$');
  const [markupPercent, setMarkupPercent] = useState(25);
  const [taxPercent, setTaxPercent] = useState(0);

  // Form state — pre-filled with smart defaults
  const [qty, setQty] = useState(500);
  const [customQty, setCustomQty] = useState(false);
  const [paperId, setPaperId] = useState<string>('');
  const [sides, setSides] = useState<'one' | 'both'>('both');
  const [color, setColor] = useState<'four_color' | 'single_color' | 'bw'>('four_color');
  const [lamination, setLamination] = useState<string>('');

  // Request quote modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [savedFlash, setSavedFlash] = useState('');

  // ─── Load product + reference data ─────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
      setHasSession(true);
      const userId = session.user.id;

      const [prodRes, paperRes, rateRes, subRes] = await Promise.all([
        supabase.from('subscriber_products').select('*').eq('subscriber_id', userId).eq('slug', slug).maybeSingle(),
        supabase.from('paper_stocks').select('id, label, gsm, rate_per_kg, category').eq('subscriber_id', userId).order('gsm'),
        supabase.from('printing_rates').select('id, plate_name, color_option, fixed_charge, per_1000_impression').eq('subscriber_id', userId),
        supabase.from('subscribers').select('id, currency_symbol, markup_percent, tax_percent, business_name, email').eq('id', userId).maybeSingle(),
      ]);
      if (!mounted) return;

      const prod = prodRes.data as SubscriberProduct | null;
      if (!prod) { setLoading(false); return; }
      setProduct(prod);
      setTemplate(getTemplate(prod.template_id) || null);
      setPaperStocks(paperRes.data || []);
      setPrintingRates(rateRes.data || []);
      if (subRes.data) {
        setCurrency(subRes.data.currency_symbol || '$');
        setMarkupPercent(Number(subRes.data.markup_percent) || 25);
        setTaxPercent(Number(subRes.data.tax_percent) || 0);
        setSubscriberInfo({
          id: subRes.data.id,
          business_name: subRes.data.business_name || '',
          email: subRes.data.email || '',
        });
      }

      // Pick smart default paper — pick the most common thickness for the product type
      const papers = paperRes.data || [];
      if (papers.length > 0) {
        let defaultGsm = 170; // medium default
        if (prod.template_id === 'card' || prod.template_id === 'folder') defaultGsm = 350;
        if (prod.template_id === 'sheet' || prod.template_id === 'folded') defaultGsm = 130;
        if (prod.template_id === 'stationery' || prod.template_id === 'booklet') defaultGsm = 100;
        const closest = papers.reduce((a, b) => Math.abs(b.gsm - defaultGsm) < Math.abs(a.gsm - defaultGsm) ? b : a);
        setPaperId(closest.id);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [slug]);

  // ─── Calculate price ───────────────────────────────────────────────────
  const calc = useMemo(() => {
    if (!product || !template) return null;
    const w = Number(product.default_size_w_inch) || 3.5;
    const h = Number(product.default_size_h_inch) || 2;
    const stock = paperStocks.find((p) => p.id === paperId);
    if (!qty || !stock) return null;

    const plateKey = autoSelectPlate(w, h);
    const ups = calcUps(w, h, plateKey);
    const ws = Math.ceil(qty / ups);
    const isBoardPaper = BOARD_PAPER_CATS.includes(stock.category);
    const useDoublePlate = isBoardPaper && sides === 'both';
    const imp = useDoublePlate ? ws : (sides === 'both' ? ws * 2 : ws);
    const numPlates = useDoublePlate ? 2 : 1;

    // Paper cost
    const parent = PARENT_SHEETS[plateKey];
    const f = (parent.parentW * parent.parentH * 0.2666) / 828;
    const paperCost = ((f * stock.gsm * stock.rate_per_kg) / 500) * (ws / parent.cuts);

    // Printing cost
    const colorMap: Record<string, string> = { four_color: 'Four Color CMYK', single_color: 'Single Color', bw: 'Single Color' };
    const colorLabel = colorMap[color] || 'Single Color';
    const matchingRate = printingRates.find((r) => r.color_option === colorLabel) || printingRates[0];
    let printCost = 0;
    if (matchingRate) {
      const fixedCharge = Number(matchingRate.fixed_charge) || 0;
      const per1000 = Number(matchingRate.per_1000_impression) || 0;
      const pf = fixedCharge * numPlates;
      const fi = 1000 * numPlates;
      const ei = Math.max(0, imp - fi);
      const er = Math.ceil(ei / 1000) * 1000;
      printCost = pf + (er / 1000) * per1000;
    }

    // Lamination add-on (flat estimate — proper integration with lamination_rates can come later)
    let lamCost = 0;
    if (lamination) {
      // Estimate: small flat fee per impression
      lamCost = Math.max(100, ws * 0.5);
    }

    const subtotal = paperCost + printCost + lamCost;
    const withMarkup = subtotal * (1 + markupPercent / 100);
    const tax = withMarkup * (taxPercent / 100);
    const total = withMarkup + tax;
    const perUnit = total / qty;
    return { qty, ws, ups, plateKey, paperCost, printCost, lamCost, subtotal, withMarkup, tax, total, perUnit };
  }, [product, template, qty, paperId, sides, color, lamination, paperStocks, printingRates, markupPercent, taxPercent]);

  // ─── Render ────────────────────────────────────────────────────────────
  if (loading) return <FullPageLoading />;
  if (hasSession === false) return <NeedSignIn />;
  if (!product || !template) return <NotFound slug={slug} />;

  const fmt = (n: number) => `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // Smart paper grouping by thickness
  const paperGroups: Record<string, PaperStock[]> = { Light: [], Medium: [], Thick: [], 'Extra Thick': [] };
  paperStocks.forEach((p) => {
    const tl = thicknessLabel(p.gsm).label;
    if (paperGroups[tl]) paperGroups[tl].push(p);
  });
  const visibleGroups = Object.entries(paperGroups).filter(([_, items]) => items.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body, position: 'relative' }}>
      <PageStyles />
      <Ambient accent={template.accent} />

      {/* Top bar — subscriber's brand */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10, 8, 21, 0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: TOKENS.colors.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
              {(subscriberInfo.business_name || 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 15, fontWeight: 700 }}>{subscriberInfo.business_name || 'Print Shop'}</div>
              <div style={{ fontSize: 11, color: TOKENS.colors.textDim }}>Instant quotes</div>
            </div>
          </div>
          <Link href={`/products/${product.slug}`} style={{ fontSize: 12, color: TOKENS.colors.textMuted, textDecoration: 'none', padding: '6px 12px', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 6 }}>
            🔧 Switch to Full Calculator
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 180px', position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '20px 0 28px', animation: 'pc-fade-up 0.5s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, background: `${template.accent}22`, border: `1px solid ${template.accent}55`, borderRadius: 20, fontSize: 40, marginBottom: 14 }}>
            {product.icon || template.icon}
          </div>
          <h1 style={{ fontFamily: TOKENS.fonts.display, fontSize: 'clamp(28px, 6vw, 38px)', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, marginBottom: 8 }}>
            {product.display_name}
          </h1>
          <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
            {product.description || 'Get an instant price — answer 4 quick questions below.'}
          </p>
        </section>

        {/* Step 1: Quantity */}
        <Step number={1} title="How many do you need?" accent={template.accent}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: customQty ? 12 : 0 }}>
            {[100, 250, 500, 1000, 2500, 5000].map((q) => (
              <QtyButton key={q} active={!customQty && qty === q} onClick={() => { setQty(q); setCustomQty(false); }} accent={template.accent}>
                {q.toLocaleString()}
              </QtyButton>
            ))}
          </div>
          <QtyButton active={customQty} onClick={() => setCustomQty(true)} accent={template.accent} style={{ width: '100%', marginTop: 8 }}>
            ✏️ Custom amount
          </QtyButton>
          {customQty && (
            <input
              type="number"
              autoFocus
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 0))}
              placeholder="Enter exact quantity"
              style={{ ...inputStyle(), marginTop: 10 }}
            />
          )}
        </Step>

        {/* Step 2: Paper feel */}
        <Step number={2} title="Pick your paper feel" accent={template.accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleGroups.map(([groupName, items]) => (
              <div key={groupName}>
                <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, marginTop: 4 }}>
                  {groupName} · {thicknessLabel(items[0].gsm).example}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {items.map((p) => (
                    <PaperButton key={p.id} active={paperId === p.id} onClick={() => setPaperId(p.id)} accent={template.accent} stock={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Step>

        {/* Step 3: Print sides */}
        <Step number={3} title="Print on" accent={template.accent}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <BigChoice active={sides === 'one'} onClick={() => setSides('one')} accent={template.accent}
              icon="📄" title="Front only" sub="One side printed" />
            <BigChoice active={sides === 'both'} onClick={() => setSides('both')} accent={template.accent}
              icon="📑" title="Front AND back" sub="Both sides printed" />
          </div>
        </Step>

        {/* Step 4: Color */}
        <Step number={4} title="What look do you want?" accent={template.accent}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <BigChoice active={color === 'four_color'} onClick={() => setColor('four_color')} accent={template.accent}
              icon="🌈" title="Full color" sub="Any design, photos" />
            <BigChoice active={color === 'single_color'} onClick={() => setColor('single_color')} accent={template.accent}
              icon="🎨" title="1 Color" sub="Single ink color" />
            <BigChoice active={color === 'bw'} onClick={() => setColor('bw')} accent={template.accent}
              icon="⚫" title="Black & White" sub="No color" />
          </div>
        </Step>

        {/* Step 5: Optional finishing (only show for templates that support it) */}
        {(template.id === 'card' || template.id === 'folded' || template.id === 'folder') && (
          <Step number={5} title="Add finishing? (optional)" accent={template.accent} optional>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FinishingOption active={lamination === ''} onClick={() => setLamination('')} accent={template.accent}
                icon="⬜" title="No finishing" sub="Plain paper finish" />
              <FinishingOption active={lamination === 'matte'} onClick={() => setLamination('matte')} accent={template.accent}
                icon="⬛" title="Matte lamination" sub="Soft, premium feel · +small fee" />
              <FinishingOption active={lamination === 'gloss'} onClick={() => setLamination('gloss')} accent={template.accent}
                icon="✨" title="Glossy lamination" sub="Shiny, vibrant · +small fee" />
            </div>
          </Step>
        )}

        {/* Reassurance */}
        <div style={{ marginTop: 30, padding: '16px 18px', background: 'rgba(124,58,237,0.06)', border: `1px dashed ${TOKENS.colors.borderStrong}`, borderRadius: 14, fontSize: 13, color: TOKENS.colors.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
          💬 Not sure about something? <strong style={{ color: '#fff' }}>Request a quote</strong> and we&apos;ll get back with the best option for you.
        </div>
      </main>

      {/* Sticky bottom price bar — mobile & desktop */}
      <StickyPriceBar
        calc={calc}
        currency={currency}
        product={product}
        accent={template.accent}
        onRequest={() => calc && setShowRequestModal(true)}
        fmt={fmt}
      />

      {showRequestModal && calc && (
        <RequestQuoteModal
          calc={calc}
          product={product}
          template={template}
          subscriberId={subscriberInfo.id}
          paperStocks={paperStocks}
          paperId={paperId}
          sides={sides}
          color={color}
          lamination={lamination}
          qty={qty}
          markupPercent={markupPercent}
          taxPercent={taxPercent}
          currency={currency}
          accent={template.accent}
          onClose={() => setShowRequestModal(false)}
          onSaved={() => { setShowRequestModal(false); setSavedFlash('✓ Quote request sent! We\'ll get back within 24 hours.'); setTimeout(() => setSavedFlash(''), 5000); }}
        />
      )}

      {savedFlash && <Toast text={savedFlash} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Reusable components
// ──────────────────────────────────────────────────────────────────────

function Step({ number, title, accent, optional, children }: { number: number; title: string; accent: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <section style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 20, marginBottom: 14, animation: 'pc-fade-up 0.5s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${accent}22`, border: `1px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: accent, fontFamily: TOKENS.fonts.display }}>{number}</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', flex: 1 }}>{title}</h2>
        {optional && <span style={{ fontSize: 10, color: TOKENS.colors.textDim, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Optional</span>}
      </div>
      {children}
    </section>
  );
}

function QtyButton({ active, onClick, children, accent, style }: { active: boolean; onClick: () => void; children: React.ReactNode; accent: string; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{
      padding: '14px 10px',
      borderRadius: 12,
      border: `1.5px solid ${active ? accent : TOKENS.colors.border}`,
      background: active ? `${accent}22` : 'rgba(0,0,0,0.2)',
      color: '#fff',
      fontSize: 15,
      fontWeight: active ? 700 : 500,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.15s ease',
      ...style,
    }}>{children}</button>
  );
}

function PaperButton({ active, onClick, accent, stock }: { active: boolean; onClick: () => void; accent: string; stock: PaperStock }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px 10px',
      borderRadius: 10,
      border: `1.5px solid ${active ? accent : TOKENS.colors.border}`,
      background: active ? `${accent}22` : 'rgba(0,0,0,0.2)',
      color: '#fff',
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: 'inherit',
      textAlign: 'left',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ fontWeight: 600 }}>{stock.label}</div>
      <div style={{ fontSize: 11, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono, marginTop: 2 }}>{stock.gsm}gsm</div>
    </button>
  );
}

function BigChoice({ active, onClick, accent, icon, title, sub }: { active: boolean; onClick: () => void; accent: string; icon: string; title: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '14px 12px',
      borderRadius: 12,
      border: `1.5px solid ${active ? accent : TOKENS.colors.border}`,
      background: active ? `${accent}22` : 'rgba(0,0,0,0.2)',
      color: '#fff',
      cursor: 'pointer',
      fontFamily: 'inherit',
      textAlign: 'center',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 11, color: TOKENS.colors.textMuted, marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function FinishingOption({ active, onClick, accent, icon, title, sub }: { active: boolean; onClick: () => void; accent: string; icon: string; title: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      borderRadius: 12,
      border: `1.5px solid ${active ? accent : TOKENS.colors.border}`,
      background: active ? `${accent}22` : 'rgba(0,0,0,0.2)',
      color: '#fff',
      cursor: 'pointer',
      fontFamily: 'inherit',
      textAlign: 'left',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2 }}>{sub}</div>
      </div>
      {active && <div style={{ color: accent, fontSize: 18 }}>✓</div>}
    </button>
  );
}

function StickyPriceBar({ calc, currency, product, accent, onRequest, fmt }: { calc: any; currency: string; product: SubscriberProduct; accent: string; onRequest: () => void; fmt: (n: number) => string }) {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(10,8,21,0.95)', backdropFilter: 'blur(24px)', borderTop: `1px solid ${accent}55`, padding: '14px 20px', zIndex: 40, boxShadow: '0 -10px 40px rgba(0,0,0,0.4)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {calc ? (
            <>
              <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', background: `linear-gradient(135deg, #fff 0%, ${accent} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>
                {fmt(calc.total)}
              </div>
              <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 4 }}>
                {fmt(calc.perUnit)} per piece · all taxes included
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: TOKENS.colors.textMuted }}>Pick your options to see price</div>
          )}
        </div>
        <button
          onClick={onRequest}
          disabled={!calc}
          style={{
            padding: '14px 22px',
            background: calc ? `linear-gradient(135deg, ${accent}, ${TOKENS.colors.pink})` : 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: TOKENS.fonts.display,
            borderRadius: 12,
            border: 'none',
            cursor: calc ? 'pointer' : 'not-allowed',
            boxShadow: calc ? `0 6px 20px ${accent}55` : 'none',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          Request Quote →
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Request Quote Modal — simple lead-capture form
// ──────────────────────────────────────────────────────────────────────

function RequestQuoteModal({
  calc, product, template, subscriberId, paperStocks, paperId, sides, color, lamination, qty, markupPercent, taxPercent, currency, accent, onClose, onSaved,
}: {
  calc: any; product: SubscriberProduct; template: ProductTemplate; subscriberId: string; paperStocks: PaperStock[];
  paperId: string; sides: string; color: string; lamination: string; qty: number;
  markupPercent: number; taxPercent: number; currency: string; accent: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setErr('');
    if (!name.trim()) { setErr('Please enter your name'); return; }
    if (!email.trim() && !phone.trim()) { setErr('Please enter email or phone so we can reach you'); return; }
    setSaving(true);
    const stock = paperStocks.find((p) => p.id === paperId);
    const colorMap: Record<string, string> = { four_color: 'Full Color', single_color: '1 Color', bw: 'Black & White' };
    const d = new Date(); d.setDate(d.getDate() + 30);
    const payload = {
      subscriber_id: subscriberId,
      quote_number: `Q${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      customer_company: '',
      job_title: product.display_name,
      job_size: product.default_size_label || '',
      paper_type: stock ? `${stock.label} ${stock.gsm}gsm` : '',
      quantity: qty,
      sides: sides === 'both' ? 'Both Sides' : 'Single Side',
      color_option: colorMap[color] || 'Full Color',
      finishing: lamination ? `${lamination} lamination` : '',
      lamination: lamination ? `${lamination} lamination` : '',
      subtotal: Number(calc.subtotal) || 0,
      markup_amount: Number(calc.withMarkup - calc.subtotal) || 0,
      markup_percent: markupPercent,
      tax_amount: Number(calc.tax) || 0,
      tax_percent: taxPercent,
      total_amount: Number(calc.total) || 0,
      currency_symbol: currency,
      notes,
      status: 'Draft',
      valid_until: d.toISOString().split('T')[0],
      subscriber_product_id: product.id,
      template_id: template.id,
      product_data: { values: { qty, paperId, sides, color, lamination }, source: 'quick-quote' },
    };
    const { error } = await supabase.from('quotes').insert(payload);
    setSaving(false);
    if (error) { setErr('Could not send request: ' + error.message); return; }
    onSaved();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'pc-fade-in 0.2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: TOKENS.colors.bgPanel, border: `1px solid ${accent}55`, borderRadius: 18, padding: 24, maxWidth: 460, width: '100%', maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 4 }}>Request your quote</h2>
            <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, margin: 0 }}>We&apos;ll get back to you within 24 hours.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TOKENS.colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {/* Quick summary */}
        <div style={{ background: `${accent}11`, border: `1px solid ${accent}44`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: TOKENS.colors.textDim, marginBottom: 4 }}>YOUR ORDER</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{qty.toLocaleString()} × {product.display_name}</div>
          <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 24, fontWeight: 800, marginTop: 6, background: `linear-gradient(135deg, #fff 0%, ${accent} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {currency}{Number(calc.total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ModalField label="Your name *">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={inputStyle()} />
          </ModalField>
          <ModalField label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle()} />
          </ModalField>
          <ModalField label="Phone">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." style={inputStyle()} />
          </ModalField>
          <ModalField label="Anything we should know? (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery address, special instructions, deadline…" rows={3} style={{ ...inputStyle(), fontFamily: 'inherit' }} />
          </ModalField>
          {err && <div style={{ color: '#EF4444', fontSize: 13 }}>{err}</div>}
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '14px 24px',
              background: `linear-gradient(135deg, ${accent}, ${TOKENS.colors.pink})`,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              fontFamily: TOKENS.fonts.display,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 6px 20px ${accent}55`,
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {saving ? 'Sending…' : 'Send Quote Request →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Toast({ text }: { text: string }) {
  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'rgba(16,185,129,0.95)', color: '#fff', padding: '14px 22px', borderRadius: 12, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 24px rgba(16,185,129,0.4)', zIndex: 110, animation: 'pc-fade-up 0.3s ease both', textAlign: 'center', maxWidth: 'calc(100% - 32px)' }}>
      {text}
    </div>
  );
}

function Ambient({ accent }: { accent: string }) {
  return (
    <>
      <div style={{ position: 'fixed', top: -200, left: '50%', transform: 'translateX(-50%)', width: 1000, height: 600, background: `radial-gradient(ellipse, ${accent}25 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function FullPageLoading() {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.textMuted, fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${TOKENS.colors.border}`, borderTopColor: TOKENS.colors.primary, animation: 'pc-spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 14 }}>Loading…</div>
      </div>
    </div>
  );
}

function NeedSignIn() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 36, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>Sign in required</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>Please sign in to view this quote tool.</p>
        <button onClick={() => router.push('/login')} style={{ padding: '11px 22px', background: TOKENS.colors.gradient, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontFamily: TOKENS.fonts.display }}>
          Sign In →
        </button>
      </div>
    </div>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 36, textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>Product not found</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>
          We couldn&apos;t find <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>{slug}</code> in your catalog.
        </p>
        <Link href="/products" style={{ padding: '11px 22px', background: TOKENS.colors.gradient, color: '#fff', borderRadius: 10, fontWeight: 600, textDecoration: 'none', display: 'inline-block', fontFamily: TOKENS.fonts.display }}>
          ← Browse Products
        </Link>
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    background: 'rgba(0,0,0,0.25)',
    color: '#fff',
    border: `1px solid ${TOKENS.colors.border}`,
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  };
}

function PageStyles() {
  return (
    <style>{`
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pc-spin { to { transform: rotate(360deg); } }
      input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
      input:focus, textarea:focus { border-color: rgba(148,97,251,0.6) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
      *::-webkit-scrollbar { width: 6px; }
      *::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
      *::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 3px; }
      button:hover:not(:disabled) { filter: brightness(1.08); }
      button:active:not(:disabled) { transform: scale(0.98); }
    `}</style>
  );
}
