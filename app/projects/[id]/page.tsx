'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TEMPLATES, getTemplate, ProductTemplate } from '../../lib/templates';
import { TOKENS } from '../../lib/design';
import { computePrice } from '../../lib/calc';

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

// Computes line cost for one project item — uses shared lib/calc.ts (no tax — tax is at project level)
function computeLineCost({
  qty, w, h, stock, sides, color, paperCategories, printingRates, markupPercent,
}: {
  qty: number; w: number; h: number; stock: PaperStock;
  sides: 'one' | 'both'; color: 'four_color' | 'single_color' | 'bw';
  paperCategories: Array<{ category: string; rate_per_kg: number }>;
  printingRates: PrintingRate[]; markupPercent: number;
}): { lineTotal: number; unitPrice: number; sheets: number; ups: number; plate: string } | null {
  if (!qty || !stock) return null;
  const r = computePrice({
    qty, w, h, stock, paperCategories, printingRates, sides, color,
    markupPercent, taxPercent: 0, // line items don't carry tax — project-level
  });
  if (!r.ready) return null;
  return {
    lineTotal: r.withMarkup,
    unitPrice: r.perUnit,
    sheets: r.ws,
    ups: r.ups,
    plate: r.plateKey,
  };
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
  const [paperCategories, setPaperCategories] = useState<Array<{ category: string; rate_per_kg: number }>>([]);
  const [printingRates, setPrintingRates] = useState<PrintingRate[]>([]);
  const [currency, setCurrency] = useState('$');
  const [defaultMarkup, setDefaultMarkup] = useState(25);
  const [defaultTax, setDefaultTax] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [converting, setConverting] = useState<'' | 'quote' | 'order'>('');
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
      setHasSession(true);
      const userId = session.user.id;

      const [prRes, itRes, prodRes, papRes, catRes, rateRes, subRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).eq('subscriber_id', userId).maybeSingle(),
        supabase.from('project_items').select('*').eq('project_id', id).order('sort_order'),
        supabase.from('subscriber_products').select('*').eq('subscriber_id', userId).eq('is_enabled', true).order('sort_order'),
        supabase.from('paper_stocks').select('id, label, gsm, rate_per_kg, category').eq('subscriber_id', userId).order('gsm'),
        supabase.from('paper_categories').select('category, rate_per_kg').eq('subscriber_id', userId),
        supabase.from('printing_rates').select('id, plate_name, color_option, fixed_charge, per_1000_impression, sort_order').eq('subscriber_id', userId).order('sort_order'),
        supabase.from('subscribers').select('currency_symbol, markup_percent, tax_percent, business_name, email').eq('id', userId).maybeSingle(),
      ]);

      if (!mounted) return;
      const proj = prRes.data;
      if (!proj) { setLoading(false); return; }
      setProject(proj);
      setItems((itRes.data || []) as ProjectItem[]);
      setProducts((prodRes.data || []) as SubscriberProduct[]);
      setPaperStocks(papRes.data || []);
      setPaperCategories((catRes.data || []) as Array<{ category: string; rate_per_kg: number }>);
      setPrintingRates(rateRes.data || []);
      if (subRes.data) {
        setCurrency(subRes.data.currency_symbol || '$');
        setDefaultMarkup(Number(subRes.data.markup_percent) || 25);
        setDefaultTax(Number(subRes.data.tax_percent) || 0);
        setBusinessName(subRes.data.business_name || '');
        setBusinessEmail(subRes.data.email || '');
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

  async function saveAsQuote() {
    if (!project || items.length === 0) {
      alert('Add at least one item before saving as a quote.');
      return;
    }
    setConverting('quote');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setConverting(''); return; }
    const d = new Date(); d.setDate(d.getDate() + 30);
    // Combined description of all items
    const finishingSummary = items.map(i => `${i.quantity}× ${i.display_name}`).join(' + ');
    const payload = {
      subscriber_id: session.user.id,
      quote_number: `Q${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`,
      customer_name: project.customer_name || 'Customer',
      customer_email: project.customer_email,
      customer_phone: project.customer_phone,
      customer_company: project.customer_company,
      job_title: project.name,
      job_size: 'Multi-item project',
      paper_type: 'Mixed (see breakdown)',
      quantity: items.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
      sides: 'Mixed',
      finishing: finishingSummary,
      subtotal: totals.subtotal,
      markup_amount: totals.marginAmt,
      markup_percent: Number(project.margin_percent) || 0,
      tax_amount: totals.taxAmt,
      tax_percent: Number(project.tax_percent) || 0,
      total_amount: totals.total,
      currency_symbol: currency,
      notes: (project.notes ? project.notes + '\n\n' : '') + `From project ${project.project_number}`,
      status: 'Sent',
      valid_until: d.toISOString().split('T')[0],
      template_id: 'project',
      product_data: {
        source: 'project',
        project_id: project.id,
        project_number: project.project_number,
        items: items.map(i => ({
          name: i.display_name,
          icon: i.icon,
          template_id: i.template_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
          config: i.item_data,
        })),
      },
    };
    const { error } = await supabase.from('quotes').insert(payload);
    setConverting('');
    if (error) { alert('Save failed: ' + error.message); return; }
    // Mark project as Sent
    await supabase.from('projects').update({ status: 'Sent' }).eq('id', project.id);
    setProj('status', 'Sent');
    setSavedFlash('✓ Saved as quote · view in /quotes');
    setTimeout(() => setSavedFlash(''), 4000);
  }

  async function convertToOrder() {
    if (!project || items.length === 0) {
      alert('Add at least one item before converting to an order.');
      return;
    }
    if (!confirm(`Create an order for "${project.name}" totaling ${currency}${totals.total.toFixed(2)}?`)) return;
    setConverting('order');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setConverting(''); return; }
    const finishingSummary = items.map(i => `${i.quantity}× ${i.display_name}`).join(' + ');
    const payload = {
      subscriber_id: session.user.id,
      customer_name: project.customer_name || 'Customer',
      customer_email: project.customer_email,
      customer_phone: project.customer_phone,
      job_title: project.name,
      job_size: 'Multi-item project',
      paper_type: 'Mixed (see breakdown)',
      quantity: items.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
      finishing: finishingSummary,
      total_amount: totals.total,
      advance_paid: 0,
      due_amount: totals.total,
      status: 'Pending',
      notes: (project.notes ? project.notes + '\n\n' : '') + `From project ${project.project_number}`,
      template_id: 'project',
      product_data: {
        source: 'project',
        project_id: project.id,
        project_number: project.project_number,
        items: items.map(i => ({
          name: i.display_name,
          icon: i.icon,
          template_id: i.template_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
          config: i.item_data,
        })),
      },
    };
    const { error } = await supabase.from('orders').insert(payload);
    setConverting('');
    if (error) { alert('Order create failed: ' + error.message); return; }
    await supabase.from('projects').update({ status: 'Converted' }).eq('id', project.id);
    setProj('status', 'Converted');
    setSavedFlash('✓ Order created · view in /orders');
    setTimeout(() => setSavedFlash(''), 4000);
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
            style={{ width: '100%', background: 'transparent', border: 'none', color: TOKENS.colors.text, fontFamily: TOKENS.fonts.display, fontSize: 'clamp(28px, 3.8vw, 38px)', fontWeight: 800, letterSpacing: '-0.025em', outline: 'none', padding: '4px 0' }}
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
            itemCount={items.length}
            converting={converting}
            onPdf={() => setShowPrintView(true)}
            onSaveQuote={saveAsQuote}
            onConvertOrder={convertToOrder}
          />
        </div>
      </main>

      {showPrintView && project && (
        <PrintProjectView
          project={project}
          items={items}
          totals={totals}
          currency={currency}
          businessName={businessName}
          businessEmail={businessEmail}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {showAddItem && (
        <AddItemModal
          products={products}
          paperStocks={paperStocks}
          paperCategories={paperCategories}
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
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '12px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/projects" style={{ color: TOKENS.colors.textMuted, textDecoration: 'none', fontSize: 14 }}>← Projects</Link>
          <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
          <span style={{ fontSize: 14, color: '#1A1330', fontWeight: 600 }}>{project.name}</span>
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
      <div style={{ position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 700, background: 'radial-gradient(ellipse, rgba(217,70,239,0.06) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
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
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: TOKENS.colors.text, marginBottom: 6, letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function ItemRow({ item, fmt, onRemove, idx }: { item: ProjectItem; fmt: (n: number) => string; onRemove: () => void; idx: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: TOKENS.colors.bgPanel2, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.md, animation: 'pc-fade-up 0.3s ease both' }}>
      <div style={{ width: 32, height: 32, background: 'rgba(124,58,237,0.08)', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{item.icon || '📦'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: TOKENS.colors.text }}>{item.display_name}</div>
        <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2 }}>
          {item.quantity.toLocaleString()} × {fmt(item.unit_price)}{item.item_data?.paper_label ? ` · ${item.item_data.paper_label}` : ''}
        </div>
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, fontWeight: 700, color: TOKENS.colors.text, textAlign: 'right' }}>{fmt(item.line_total)}</div>
      <button onClick={onRemove} style={{ ...ghostButton('#EF4444'), padding: '6px 10px', fontSize: 12 }}>✕</button>
    </div>
  );
}

function TotalsPanel({ totals, currency, project, setProj, fmt, itemCount, converting, onPdf, onSaveQuote, onConvertOrder }: { totals: { subtotal: number; marginAmt: number; afterMargin: number; taxAmt: number; total: number }; currency: string; project: Project; setProj: any; fmt: (n: number) => string; itemCount: number; converting: '' | 'quote' | 'order'; onPdf: () => void; onSaveQuote: () => void; onConvertOrder: () => void }) {
  return (
    <div style={{ position: 'sticky', top: 80, animation: 'pc-fade-up 0.5s 0.15s ease both' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.95)', border: `1px solid rgba(217,70,239,0.4)`, borderRadius: TOKENS.radius['2xl'], padding: 22, backdropFilter: 'blur(20px)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #A78BFA, #D946EF)' }} />

        <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Project Total</div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 38, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, background: 'linear-gradient(135deg, #1A1330 0%, #D946EF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
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

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${TOKENS.colors.border}` }}>
          <button
            onClick={onPdf}
            disabled={itemCount === 0}
            style={{ ...primaryButton(), width: '100%', justifyContent: 'center', opacity: itemCount === 0 ? 0.4 : 1 }}
          >
            📄 Download PDF
          </button>
          <button
            onClick={onSaveQuote}
            disabled={itemCount === 0 || !!converting}
            style={{ ...ghostButton(), width: '100%', justifyContent: 'center', opacity: (itemCount === 0 || converting) ? 0.4 : 1 }}
          >
            {converting === 'quote' ? 'Saving…' : '📋 Save as Quote'}
          </button>
          <button
            onClick={onConvertOrder}
            disabled={itemCount === 0 || !!converting}
            style={{ ...ghostButton(), width: '100%', justifyContent: 'center', opacity: (itemCount === 0 || converting) ? 0.4 : 1 }}
          >
            {converting === 'order' ? 'Creating…' : '🛒 Convert to Order'}
          </button>
          {itemCount === 0 && (
            <p style={{ fontSize: 11, color: TOKENS.colors.textDim, margin: 0, marginTop: 4, textAlign: 'center' }}>Add line items to enable actions</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: TOKENS.colors.textMuted }}>{label}</span>
      <span style={{ color: TOKENS.colors.text, fontFamily: TOKENS.fonts.mono, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Add Item Modal — pick product, configure, calculate, add to project
// ──────────────────────────────────────────────────────────────────────

function AddItemModal({
  products, paperStocks, paperCategories, printingRates, markupPercent, currency, onClose, onAdd,
}: {
  products: SubscriberProduct[];
  paperStocks: PaperStock[];
  paperCategories: Array<{ category: string; rate_per_kg: number }>;
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
    return computeLineCost({ qty, w, h, stock, sides, color, paperCategories, printingRates, markupPercent });
  }, [selectedProduct, paperId, qty, sides, color, paperStocks, paperCategories, printingRates, markupPercent]);

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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20, 14, 50, 0.50)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'pc-fade-in 0.2s ease' }}>
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
                        <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.colors.text }}>{tpl.label}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                        {grouped[tpl.id].map((p) => (
                          <button key={p.id} onClick={() => pickProduct(p)} style={{
                            textAlign: 'left',
                            padding: 14,
                            background: TOKENS.colors.bgCard,
                            border: `1px solid ${TOKENS.colors.border}`,
                            borderRadius: TOKENS.radius.md,
                            color: TOKENS.colors.text,
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
                    <button key={o.v} onClick={() => setSides(o.v as any)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${sides === o.v ? TOKENS.colors.primary : TOKENS.colors.border}`, background: sides === o.v ? `${TOKENS.colors.primary}22` : '#F4F2F9', color: sides === o.v ? TOKENS.colors.primary : TOKENS.colors.text, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{o.l}</button>
                  ))}
                </div>
              </Field>
              <Field label="Color">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ v: 'four_color', l: 'Full Color' }, { v: 'single_color', l: '1 Color' }, { v: 'bw', l: 'B & W' }].map((o) => (
                    <button key={o.v} onClick={() => setColor(o.v as any)} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${color === o.v ? TOKENS.colors.primary : TOKENS.colors.border}`, background: color === o.v ? `${TOKENS.colors.primary}22` : '#F4F2F9', color: color === o.v ? TOKENS.colors.primary : TOKENS.colors.text, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{o.l}</button>
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
// Print Project View — professional PDF-ready layout
// ──────────────────────────────────────────────────────────────────────

function PrintProjectView({
  project, items, totals, currency, businessName, businessEmail, onClose,
}: {
  project: Project;
  items: ProjectItem[];
  totals: { subtotal: number; marginAmt: number; afterMargin: number; taxAmt: number; total: number };
  currency: string;
  businessName: string;
  businessEmail: string;
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const validUntil = project.valid_until
    ? new Date(project.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); })();
  const fmt = (n: number) => `${currency}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pc-print-root" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', overflow: 'auto' }}>
      <div className="pc-print-bar" style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: '#666' }}>Print preview · use browser print dialog to save as PDF</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 14px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🖨️ Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 14px', background: '#fff', color: '#1A1A1A', border: '1px solid #d4d4d4', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>✕ Close</button>
        </div>
      </div>

      <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 760, margin: '0 auto', padding: 40, color: '#1A1A1A' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 20, borderBottom: '2px solid #1A1A1A' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, background: '#D946EF', borderRadius: '50%' }} />
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{businessName || 'Your Business'}</span>
            </div>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{businessEmail}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Quote</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{project.project_number}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{today}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Valid until {validUntil}</div>
          </div>
        </div>

        {/* Customer + Project name */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>For</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{project.customer_name || 'Customer'}</div>
            {project.customer_company && <div style={{ fontSize: 13, color: '#555' }}>{project.customer_company}</div>}
            {project.customer_email && <div style={{ fontSize: 12, color: '#888' }}>{project.customer_email}</div>}
            {project.customer_phone && <div style={{ fontSize: 12, color: '#888' }}>{project.customer_phone}</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Project</div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{project.name}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Items</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #1A1A1A' }}>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, color: '#666', fontWeight: 600 }}>#</th>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontSize: 11, color: '#666', fontWeight: 600 }}>Product</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#666', fontWeight: 600 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#666', fontWeight: 600 }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#666', fontWeight: 600 }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 6px', color: '#888', verticalAlign: 'top' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 6px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600 }}>{it.icon} {it.display_name}</div>
                    {it.item_data?.paper_label && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{it.item_data.paper_label}</div>}
                  </td>
                  <td style={{ padding: '12px 6px', textAlign: 'right', verticalAlign: 'top', fontFamily: "monospace" }}>{Number(it.quantity).toLocaleString()}</td>
                  <td style={{ padding: '12px 6px', textAlign: 'right', verticalAlign: 'top', fontFamily: "monospace" }}>{fmt(it.unit_price)}</td>
                  <td style={{ padding: '12px 6px', textAlign: 'right', verticalAlign: 'top', fontFamily: "monospace", fontWeight: 600 }}>{fmt(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ marginLeft: 'auto', width: '60%', padding: 20, background: '#FAFAFA', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: '6px 0', color: '#666' }}>Subtotal</td><td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totals.subtotal)}</td></tr>
              {totals.marginAmt > 0 && <tr><td style={{ padding: '6px 0', color: '#666' }}>Margin ({project.margin_percent}%)</td><td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totals.marginAmt)}</td></tr>}
              {totals.taxAmt > 0 && <tr><td style={{ padding: '6px 0', color: '#666' }}>Tax ({project.tax_percent}%)</td><td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totals.taxAmt)}</td></tr>}
              <tr style={{ borderTop: '2px solid #1A1A1A' }}>
                <td style={{ padding: '12px 0 4px', fontWeight: 700, fontSize: 15 }}>Total</td>
                <td style={{ padding: '12px 0 4px', textAlign: 'right', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{fmt(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {project.notes && (
          <div style={{ marginTop: 28, padding: 14, background: '#FFF8DC', borderLeft: '3px solid #F59E0B', borderRadius: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 13, color: '#1A1A1A', whiteSpace: 'pre-wrap' }}>{project.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 36, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 11, color: '#888', textAlign: 'center' }}>
          Thank you for your business. This project quote is valid until {validUntil}.
        </div>
      </div>

      <style>{`
        @media print {
          .pc-print-bar { display: none !important; }
          @page { margin: 0.6in; }
          body > *:not(.pc-print-root) { display: none !important; }
        }
      `}</style>
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
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body }}>
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
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body }}>
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
    background: '#FAFAFB',
    color: TOKENS.colors.text,
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
    background: color ? `${color}1a` : 'transparent',
    color: color || TOKENS.colors.text,
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
      input::placeholder, textarea::placeholder { color: ${TOKENS.colors.textDim}; }
      input:focus, select:focus, textarea:focus { border-color: ${TOKENS.colors.borderStrong} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
      *::-webkit-scrollbar { width: 8px; }
      *::-webkit-scrollbar-track { background: ${TOKENS.colors.bgPanel2}; }
      *::-webkit-scrollbar-thumb { background: ${TOKENS.colors.border}; border-radius: 4px; }
      button:hover:not(:disabled) { filter: brightness(1.05); }
      button:active:not(:disabled) { transform: scale(0.98); }
    `}</style>
  );
}
