'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TEMPLATES, getTemplate, ProductTemplate } from '../../lib/templates';
import { TOKENS } from '../../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Project Editor — assemble multiple products into one quote.
// ─────────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  project_number: string;
  name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string;
  status: string;
  notes: string;
  subtotal: number;
  margin_percent: number;
  margin_amount: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  currency_symbol: string;
  valid_until: string | null;
}

interface ProjectItem {
  id: string;
  project_id: string;
  subscriber_product_id: string | null;
  template_id: string;
  display_name: string;
  icon: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_data: any;
  sort_order: number;
}

interface SubscriberProduct {
  id: string;
  template_id: string;
  slug: string;
  display_name: string;
  description: string;
  icon: string;
  is_enabled: boolean;
  default_size_label: string | null;
  default_size_w_inch: number | null;
  default_size_h_inch: number | null;
}

interface PaperStock { id: string; label: string; gsm: number; rate_per_kg: number; category: string; }
interface PrintingRate { id: string; plate_name: string; color_option: string; fixed_charge: number; per_1000_impression: number; }

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

function calcUps(w: number, h: number, pk: string): number {
  const p = PLATE_DIMS[pk]; if (!p || !w || !h) return 1;
  return Math.max(Math.floor(p.w / w) * Math.floor(p.h / h), Math.floor(p.w / h) * Math.floor(p.h / w), 1);
}
function autoSelectPlate(w: number, h: number): string {
  let best = '18×25"'; let bestUps = 0;
  for (const pk of Object.keys(PLATE_DIMS)) {
    const ups = calcUps(w, h, pk); const p = PLATE_DIMS[pk];
    if (ups > bestUps || (ups === bestUps && p.w * p.h < PLATE_DIMS[best].w * PLATE_DIMS[best].h)) { bestUps = ups; best = pk; }
  }
  return best;
}

// Computes line cost for one project item using same engine as /products/[slug]
function computeLineCost({
  qty, w, h, stock, sides, color, paperStocks, printingRates, markupPercent,
}: {
  qty: number; w: number; h: number; stock: PaperStock;
  sides: 'one' | 'both'; color: 'four_color' | 'single_color' | 'bw';
  paperStocks: PaperStock[]; printingRates: PrintingRate[]; markupPercent: number;
}): { lineTotal: number; unitPrice: number; sheets: number; ups: number; plate: string } | null {
  if (!qty || !stock) return null;
  const plateKey = autoSelectPlate(w, h);
  const ups = calcUps(w, h, plateKey);
  const ws = Math.ceil(qty / ups);
  const isBoard = BOARD_PAPER_CATS.includes(stock.category);
  const useDoublePlate = isBoard && sides === 'both';
  const imp = useDoublePlate ? ws : (sides === 'both' ? ws * 2 : ws);
  const numPlates = useDoublePlate ? 2 : 1;
  const parent = PARENT_SHEETS[plateKey];
  const f = (parent.parentW * parent.parentH * 0.2666) / 828;
  const paperCost = ((f * stock.gsm * stock.rate_per_kg) / 500) * (ws / parent.cuts);
  const colorMap: Record<string, string> = { four_color: 'Four Color CMYK', single_color: 'Single Color', bw: 'Single Color' };
  const colorLabel = colorMap[color] || 'Single Color';
  const rate = printingRates.find((r) => r.color_option === colorLabel) || printingRates[0];
  let printCost = 0;
  if (rate) {
    const fixed = Number(rate.fixed_charge) || 0;
    const per1000 = Number(rate.per_1000_impression) || 0;
    const pf = fixed * numPlates;
    const fi = 1000 * numPlates;
    const ei = Math.max(0, imp - fi);
    const er = Math.ceil(ei / 1000) * 1000;
    printCost = pf + (er / 1000) * per1000;
  }
  const subtotal = paperCost + printCost;
  const withMarkup = subtotal * (1 + markupPercent / 100);
  return { lineTotal: withMarkup, unitPrice: withMarkup / qty, sheets: ws, ups, plate: plateKey };
}

// ─────────────────────────────────────────────────────────────────────────

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [products, setProducts] = useState<SubscriberProduct[]>([]);
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([]);
  const [printingRates, setPrintingRates] = useState<PrintingRate[]>([]);
  const [currency, setCurrency] = useState('$');
  const [defaultMarkup, setDefaultMarkup] = useState(25);
  const [defaultTax, setDefaultTax] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
      setHasSession(true);
      const userId = session.user.id;

      const [prRes, itRes, prodRes, papRes, rateRes, subRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).eq('subscriber_id', userId).maybeSingle(),
        supabase.from('project_items').select('*').eq('project_id', id).order('sort_order'),
        supabase.from('subscriber_products').select('*').eq('subscriber_id', userId).eq('is_enabled', true).order('sort_order'),
        supabase.from('paper_stocks').select('id, label, gsm, rate_per_kg, category').eq('subscriber_id', userId).order('gsm'),
        supabase.from('printing_rates').select('id, plate_name, color_option, fixed_charge, per_1000_impression').eq('subscriber_id', userId),
        supabase.from('subscribers').select('currency_symbol, markup_percent, tax_percent').eq('id', userId).maybeSingle(),
      ]);

      if (!mounted) return;
      const proj = prRes.data;
      if (!proj) { setLoading(false); return; }
      setProject(proj);
      setItems((itRes.data || []) as ProjectItem[]);
      setProducts((prodRes.data || []) as SubscriberProduct[]);
      setPaperStocks(papRes.data || []);
      setPrintingRates(rateRes.data || []);
      if (subRes.data) {
        setCurrency(subRes.data.currency_symbol || '$');
        setDefaultMarkup(Number(subRes.data.markup_percent) || 25);
        setDefaultTax(Number(subRes.data.tax_percent) || 0);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  // Totals
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + (Number(it.line_total) || 0), 0);
    const marginPct = project ? Number(project.margin_percent) || 0 : 0;
    const taxPct = project ? Number(project.tax_percent) || 0 : 0;
    const marginAmt = subtotal * (marginPct / 100);
    const afterMargin = subtotal + marginAmt;
    const taxAmt = afterMargin * (taxPct / 100);
    const total = afterMargin + taxAmt;
    return { subtotal, marginAmt, afterMargin, taxAmt, total };
  }, [items, project]);

  function setProj<K extends keyof Project>(key: K, value: Project[K]) {
    setProject((p) => p ? { ...p, [key]: value } : p);
  }

  async function saveProject() {
    if (!project) return;
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({
        name: project.name,
        customer_name: project.customer_name,
        customer_email: project.customer_email,
        customer_phone: project.customer_phone,
        customer_company: project.customer_company,
        notes: project.notes,
        margin_percent: project.margin_percent,
        tax_percent: project.tax_percent,
        status: project.status,
        subtotal: totals.subtotal,
        margin_amount: totals.marginAmt,
        tax_amount: totals.taxAmt,
        total_amount: totals.total,
        currency_symbol: currency,
      })
      .eq('id', project.id);
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    setSavedFlash('✓ Project saved');
    setTimeout(() => setSavedFlash(''), 2500);
  }

  async function addItem(payload: Omit<ProjectItem, 'id' | 'project_id' | 'sort_order'>) {
    if (!project) return;
    const sort_order = items.length;
    const { data, error } = await supabase
      .from('project_items')
      .insert({ ...payload, project_id: project.id, sort_order })
      .select()
      .single();
    if (error) { alert('Could not add item: ' + error.message); return; }
    if (data) setItems((prev) => [...prev, data as ProjectItem]);
  }

  async function removeItem(itemId: string) {
    if (!confirm('Remove this item from the project?')) return;
    await supabase.from('project_items').delete().eq('id', itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function deleteProject() {
    if (!project) return;
    if (!confirm('Delete this entire project? This cannot be undone.')) return;
    await supabase.from('projects').delete().eq('id', project.id);
    router.push('/projects');
  }

  if (loading) return <LoadingScreen />;
  if (hasSession === false) return <NeedSignIn />;
  if (!project) return <NotFound />;

  const fmt = (n: number) => `${currency}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body, position: 'relative', overflow: 'hidden' }}>
      <PageStyles />
      <Ambient />
      <Header project={project} saving={saving} savedFlash={savedFlash} onSave={saveProject} onDelete={deleteProject} />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 32px 80px', position: 'relative', zIndex: 1 }}>

        {/* Project header */}
        <section style={{ marginBottom: 28, animation: 'pc-fade-up 0.5s ease both' }}>
          <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, color: TOKENS.colors.pink, marginBottom: 4 }}>{project.project_number}</div>
          <input
            value={project.name}
            onChange={(e) => setProj('name', e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontFamily: TOKENS.fonts.display, fontSize: 'clamp(28px, 3.8vw, 38px)', fontWeight: 800, letterSpacing: '-0.025em', outline: 'none', padding: '4px 0' }}
            placeholder="Project name…"
          />
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 28, alignItems: 'start' }} className="pc-project-grid">

          {/* LEFT: Customer + Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Customer card */}
            <SectionCard title="Customer" subtitle="Who this project is for">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pc-2col">
                <Field label="Name">
                  <input value={project.customer_name || ''} onChange={(e) => setProj('customer_name', e.target.value)} placeholder="Full name" style={inputStyle()} />
                </Field>
                <Field label="Company">
                  <input value={project.customer_company || ''} onChange={(e) => setProj('customer_company', e.target.value)} placeholder="Company / brand" style={inputStyle()} />
                </Field>
                <Field label="Email">
                  <input value={project.customer_email || ''} onChange={(e) => setProj('customer_email', e.target.value)} placeholder="email@example.com" style={inputStyle()} />
                </Field>
                <Field label="Phone">
                  <input value={project.customer_phone || ''} onChange={(e) => setProj('customer_phone', e.target.value)} placeholder="+91 …" style={inputStyle()} />
                </Field>
              </div>
            </SectionCard>

            {/* Items card */}
            <SectionCard
              title="Line Items"
              subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} in this project`}
              action={<button onClick={() => setShowAddItem(true)} style={primaryButton()}>➕ Add Item</button>}
            >
              {items.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', border: `1px dashed ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.lg, color: TOKENS.colors.textMuted }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🧺</div>
                  <p style={{ margin: 0, marginBottom: 16 }}>No items yet. Add your first product.</p>
                  <button onClick={() => setShowAddItem(true)} style={primaryButton()}>➕ Add First Item</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((item, idx) => (
                    <ItemRow key={item.id} item={item} fmt={fmt} onRemove={() => removeItem(item.id)} idx={idx} />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Notes */}
            <SectionCard title="Internal Notes" subtitle="Visible only to you">
              <textarea
                value={project.notes || ''}
                onChange={(e) => setProj('notes', e.target.value)}
                rows={3}
                placeholder="Add delivery instructions, special pricing notes, etc."
                style={{ ...inputStyle(), fontFamily: 'inherit', resize: 'vertical' }}
              />
            </SectionCard>
          </div>

          {/* RIGHT: Sticky totals */}
          <TotalsPanel
            totals={totals}
            currency={currency}
            project={project}
            setProj={setProj}
            fmt={fmt}
          />
        </div>
      </main>

      {showAddItem && (
        <AddItemModal
          products={products}
          paperStocks={paperStocks}
          printingRates={printingRates}
          markupPercent={defaultMarkup}
          currency={currency}
          onClose={() => setShowAddItem(false)}
          onAdd={(item) => { addItem(item); setShowAddItem(false); }}
        />
      )}

      <style>{`
        @media (max-width: 980px) {
          .pc-project-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .pc-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────────────────────────────

function Header({ project, saving, savedFlash, onSave, onDelete }: { project: Project; saving: boolean; savedFlash: string; onSave: () => void; onDelete: () => void }) {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(10, 8, 21, 0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '12px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/projects" style={{ color: TOKENS.colors.textMuted, textDecoration: 'none', fontSize: 14 }}>← Projects</Link>
          <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{project.name}</span>
          <StatusBadge status={project.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {savedFlash && <span style={{ fontSize: 13, color: TOKENS.colors.success, fontWeight: 600 }}>{savedFlash}</span>}
          <button onClick={onDelete} style={ghostButton('#EF4444')}>🗑️</button>
          <button onClick={onSave} disabled={saving} style={{ ...primaryButton(), opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>
    </nav>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    Draft: { bg: 'rgba(156,163,175,0.18)', fg: '#9CA3AF' },
    Sent: { bg: 'rgba(59,130,246,0.18)', fg: '#60A5FA' },
    Approved: { bg: 'rgba(16,185,129,0.18)', fg: '#34D399' },
    Converted: { bg: 'rgba(124,58,237,0.22)', fg: '#A78BFA' },
    Expired: { bg: 'rgba(239,68,68,0.18)', fg: '#F87171' },
  };
  const c = colors[status] || colors.Draft;
  return <span style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.04em' }}>{status}</span>;
}

function Ambient() {
  return (
    <>
      <div style={{ position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 700, background: 'radial-gradient(ellipse, rgba(217,70,239,0.18) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 22, animation: 'pc-fade-up 0.5s 0.05s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <h3 style={{ fontFamily: TOKENS.fonts.display, fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, margin: 0, marginTop: 4 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 6, letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function ItemRow({ item, fmt, onRemove, idx }: { item: ProjectItem; fmt: (n: number) => string; onRemove: () => void; idx: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.md, animation: 'pc-fade-up 0.3s ease both' }}>
      <div style={{ width: 32, height: 32, background: 'rgba(124,58,237,0.15)', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{item.icon || '📦'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{item.display_name}</div>
        <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2 }}>
          {item.quantity.toLocaleString()} × {fmt(item.unit_price)}{item.item_data?.paper_label ? ` · ${item.item_data.paper_label}` : ''}
        </div>
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, fontWeight: 700, color: '#fff', textAlign: 'right' }}>{fmt(item.line_total)}</div>
      <button onClick={onRemove} style={{ ...ghostButton('#EF4444'), padding: '6px 10px', fontSize: 12 }}>✕</button>
    </div>
  );
}

function TotalsPanel({ totals, currency, project, setProj, fmt }: { totals: { subtotal: number; marginAmt: number; afterMargin: number; taxAmt: number; total: number }; currency: string; project: Project; setProj: any; fmt: (n: number) => string }) {
  return (
    <div style={{ position: 'sticky', top: 80, animation: 'pc-fade-up 0.5s 0.15s ease both' }}>
      <div style={{ background: 'rgba(19, 15, 42, 0.85)', border: `1px solid rgba(217,70,239,0.4)`, borderRadius: TOKENS.radius['2xl'], padding: 22, backdropFilter: 'blur(20px)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #A78BFA, #D946EF)' }} />

        <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Project Total</div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 38, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, background: 'linear-gradient(135deg, #fff 0%, #D946EF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {fmt(totals.total)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${TOKENS.colors.border}` }}>
          <Row label="Subtotal" value={fmt(totals.subtotal)} />
          {totals.marginAmt > 0 && <Row label={`Reseller margin (${project.margin_percent}%)`} value={fmt(totals.marginAmt)} />}
          {totals.taxAmt > 0 && <Row label={`Tax (${project.tax_percent}%)`} value={fmt(totals.taxAmt)} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Your reseller margin %">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={project.margin_percent || 0}
                onChange={(e) => setProj('margin_percent', Number(e.target.value))}
                style={{ ...inputStyle(), flex: 1 }}
              />
              <span style={{ color: TOKENS.colors.textMuted, fontSize: 13 }}>%</span>
            </div>
          </Field>
          <Field label="Tax %">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={project.tax_percent || 0}
                onChange={(e) => setProj('tax_percent', Number(e.target.value))}
                style={{ ...inputStyle(), flex: 1 }}
              />
              <span style={{ color: TOKENS.colors.textMuted, fontSize: 13 }}>%</span>
            </div>
          </Field>
          <Field label="Status">
            <select value={project.status} onChange={(e) => setProj('status', e.target.value)} style={inputStyle()}>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Approved">Approved</option>
              <option value="Converted">Converted</option>
              <option value="Expired">Expired</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: TOKENS.colors.textMuted }}>{label}</span>
      <span style={{ color: '#fff', fontFamily: TOKENS.fonts.mono, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Add Item Modal — pick product, configure, calculate, add to project
// ──────────────────────────────────────────────────────────────────────

function AddItemModal({
  products, paperStocks, printingRates, markupPercent, currency, onClose, onAdd,
}: {
  products: SubscriberProduct[];
  paperStocks: PaperStock[];
  printingRates: PrintingRate[];
  markupPercent: number;
  currency: string;
  onClose: () => void;
  onAdd: (item: Omit<ProjectItem, 'id' | 'project_id' | 'sort_order'>) => void;
}) {
  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [selectedProduct, setSelectedProduct] = useState<SubscriberProduct | null>(null);
  const [qty, setQty] = useState(500);
  const [paperId, setPaperId] = useState<string>('');
  const [sides, setSides] = useState<'one' | 'both'>('both');
  const [color, setColor] = useState<'four_color' | 'single_color' | 'bw'>('four_color');

  function pickProduct(p: SubscriberProduct) {
    setSelectedProduct(p);
    // Pick default paper based on template
    let defaultGsm = 170;
    if (p.template_id === 'card' || p.template_id === 'folder') defaultGsm = 350;
    if (p.template_id === 'sheet' || p.template_id === 'folded') defaultGsm = 130;
    if (p.template_id === 'stationery' || p.template_id === 'booklet') defaultGsm = 100;
    if (paperStocks.length > 0) {
      const closest = paperStocks.reduce((a, b) => Math.abs(b.gsm - defaultGsm) < Math.abs(a.gsm - defaultGsm) ? b : a);
      setPaperId(closest.id);
    }
    setStep('configure');
  }

  const calc = useMemo(() => {
    if (!selectedProduct || !paperId) return null;
    const stock = paperStocks.find((p) => p.id === paperId);
    if (!stock) return null;
    const w = Number(selectedProduct.default_size_w_inch) || 3.5;
    const h = Number(selectedProduct.default_size_h_inch) || 2;
    return computeLineCost({ qty, w, h, stock, sides, color, paperStocks, printingRates, markupPercent });
  }, [selectedProduct, paperId, qty, sides, color, paperStocks, printingRates, markupPercent]);

  function confirmAdd() {
    if (!selectedProduct || !calc) return;
    const stock = paperStocks.find((p) => p.id === paperId);
    onAdd({
      subscriber_product_id: selectedProduct.id,
      template_id: selectedProduct.template_id,
      display_name: selectedProduct.display_name,
      icon: selectedProduct.icon,
      quantity: qty,
      unit_price: calc.unitPrice,
      line_total: calc.lineTotal,
      item_data: {
        paper_id: paperId,
        paper_label: stock ? `${stock.label} ${stock.gsm}gsm` : '',
        size_w: selectedProduct.default_size_w_inch,
        size_h: selectedProduct.default_size_h_inch,
        sides, color,
        sheets: calc.sheets,
        ups: calc.ups,
        plate: calc.plate,
      },
    });
  }

  // Group products by template
  const grouped: Record<string, SubscriberProduct[]> = {};
  products.forEach((p) => {
    if (!grouped[p.template_id]) grouped[p.template_id] = [];
    grouped[p.template_id].push(p);
  });
  const templatesWithProducts = TEMPLATES.filter((t) => grouped[t.id]?.length);

  const fmt = (n: number) => `${currency}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'pc-fade-in 0.2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: TOKENS.colors.bgPanel, border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: 18, maxWidth: 720, width: '100%', maxHeight: '92vh', overflow: 'auto', boxShadow: TOKENS.shadow.lg }}>

        <div style={{ position: 'sticky', top: 0, background: TOKENS.colors.bgPanel, padding: '20px 24px', borderBottom: `1px solid ${TOKENS.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 11, color: TOKENS.colors.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {step === 'pick' ? 'Step 1 of 2' : 'Step 2 of 2'}
            </div>
            <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 20, fontWeight: 700, margin: 0 }}>
              {step === 'pick' ? 'Pick a product' : `Configure ${selectedProduct?.display_name}`}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TOKENS.colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 'pick' && (
            <div>
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                  <p style={{ color: TOKENS.colors.textMuted, marginBottom: 16 }}>You have no enabled products yet.</p>
                  <Link href="/dashboard/products" style={primaryButton()}>Set up products</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {templatesWithProducts.map((tpl) => (
                    <div key={tpl.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 24, height: 24, background: `${tpl.accent}22`, border: `1px solid ${tpl.accent}55`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{tpl.icon}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{tpl.label}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                        {grouped[tpl.id].map((p) => (
                          <button key={p.id} onClick={() => pickProduct(p)} style={{
                            textAlign: 'left',
                            padding: 14,
                            background: TOKENS.colors.bgCard,
                            border: `1px solid ${TOKENS.colors.border}`,
                            borderRadius: TOKENS.radius.md,
                            color: '#fff',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.18s ease',
                          }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = tpl.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKENS.colors.border; }}>
                            <div style={{ fontSize: 22, marginBottom: 8 }}>{p.icon || '📦'}</div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.display_name}</div>
                            <div style={{ fontSize: 11, color: TOKENS.colors.textDim, marginTop: 3 }}>{p.default_size_label || ''}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'configure' && selectedProduct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Quantity">
                <input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 0))} style={inputStyle()} />
              </Field>
              <Field label="Paper">
                <select value={paperId} onChange={(e) => setPaperId(e.target.value)} style={inputStyle()}>
                  <option value="">Choose paper…</option>
                  {paperStocks.map((p) => (
                    <option key={p.id} value={p.id}>{p.label} · {p.gsm}gsm</option>
                  ))}
                </select>
              </Field>
              <Field label="Sides">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'one', l: 'Front only' }, { v: 'both', l: 'Front + Back' }].map((o) => (
                    <button key={o.v} onClick={() => setSides(o.v as any)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${sides === o.v ? TOKENS.colors.primary : TOKENS.colors.border}`, background: sides === o.v ? `${TOKENS.colors.primary}22` : 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{o.l}</button>
                  ))}
                </div>
              </Field>
              <Field label="Color">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'four_color', l: 'Full Color' }, { v: 'single_color', l: '1 Color' }, { v: 'bw', l: 'B & W' }].map((o) => (
                    <button key={o.v} onClick={() => setColor(o.v as any)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${color === o.v ? TOKENS.colors.primary : TOKENS.colors.border}`, background: color === o.v ? `${TOKENS.colors.primary}22` : 'rgba(0,0,0,0.2)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{o.l}</button>
                  ))}
                </div>
              </Field>

              {calc && (
                <div style={{ padding: 16, background: `rgba(124,58,237,0.1)`, border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: TOKENS.radius.md }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Line Total</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 26, fontWeight: 800 }}>{fmt(calc.lineTotal)}</div>
                    <div style={{ fontSize: 13, color: TOKENS.colors.textMuted }}>{fmt(calc.unitPrice)} per piece</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
                <button onClick={() => setStep('pick')} style={ghostButton()}>← Back</button>
                <button onClick={confirmAdd} disabled={!calc} style={{ ...primaryButton(), opacity: calc ? 1 : 0.5 }}>
                  ➕ Add to Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Loading / empty states
// ──────────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.textMuted, fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${TOKENS.colors.border}`, borderTopColor: TOKENS.colors.primary, animation: 'pc-spin 0.8s linear infinite', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 14 }}>Loading project…</div>
      </div>
    </div>
  );
}

function NeedSignIn() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 36, textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>Sign in required</h2>
        <button onClick={() => router.push('/login')} style={primaryButton()}>Sign In →</button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 36, textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>Project not found</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>This project was deleted or doesn&apos;t belong to you.</p>
        <Link href="/projects" style={primaryButton()}>← Back to Projects</Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Style helpers
// ──────────────────────────────────────────────────────────────────────

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    background: 'rgba(0,0,0,0.25)',
    color: '#fff',
    border: `1px solid ${TOKENS.colors.border}`,
    borderRadius: TOKENS.radius.md,
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  };
}

function primaryButton(): React.CSSProperties {
  return {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #A78BFA 0%, #D946EF 100%)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: TOKENS.fonts.display,
    borderRadius: TOKENS.radius.md,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(217,70,239,0.35)',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function ghostButton(color?: string): React.CSSProperties {
  return {
    padding: '8px 14px',
    background: color ? `${color}1a` : 'rgba(255,255,255,0.04)',
    color: color || '#fff',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: TOKENS.fonts.body,
    borderRadius: TOKENS.radius.md,
    border: `1px solid ${color ? `${color}44` : TOKENS.colors.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function PageStyles() {
  return (
    <style>{`
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pc-spin { to { transform: rotate(360deg); } }
      input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
      input:focus, select:focus, textarea:focus { border-color: rgba(148,97,251,0.6) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
      *::-webkit-scrollbar { width: 8px; }
      *::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
      *::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
      button:hover:not(:disabled) { filter: brightness(1.05); }
      button:active:not(:disabled) { transform: scale(0.98); }
    `}</style>
  );
}
