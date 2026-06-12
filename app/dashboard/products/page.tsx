'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TOKENS } from '../../lib/design';
import { autoSelectPlate } from '../../lib/calc';
import Header from '../../components/Header';

// ─────────────────────────────────────────────────────────────────────────
// Subscriber-owned products page.
// The subscriber creates and manages their own products here.
// Required fields enforced at save time:
//   1. Display name
//   2. Category
//   3. Final size W × H (inches)
//   4. ≥ 1 allowed paper category
//   5. Default quantity
// Plate + ups are NOT asked — auto-derived from size via SIZE_PLATE_MAP.
// ─────────────────────────────────────────────────────────────────────────

interface SubProduct {
  id: string;
  subscriber_id: string;
  template_id: string;            // doubles as "category"
  slug: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  is_enabled: boolean;
  sort_order: number;
  default_size_label: string | null;
  default_size_w_inch: number | null;
  default_size_h_inch: number | null;
  default_paper_label: string | null;
  default_color: string;
  default_sides: string;
  default_qty: number | null;
  allowed_paper_categories: string[] | null;
}

interface PaperCat { id: string; category: string; }

const CATEGORIES = [
  { id: 'card', label: '🪪 Cards' },
  { id: 'sheet', label: '📄 Sheets' },
  { id: 'folded', label: '📰 Folded' },
  { id: 'booklet', label: '📚 Booklets' },
  { id: 'calendar', label: '📅 Calendars' },
  { id: 'stationery', label: '✉️ Stationery' },
  { id: 'folder', label: '📁 Folders' },
  { id: 'envelope', label: '✉️ Envelopes' },
];

const FONT_DISPLAY = TOKENS.fonts.display;
const FONT_BODY = TOKENS.fonts.body;

const EMPTY_FORM: Partial<SubProduct> = {
  template_id: 'card',
  slug: '',
  display_name: '',
  description: '',
  icon: '📦',
  is_enabled: true,
  default_size_w_inch: undefined,
  default_size_h_inch: undefined,
  default_color: 'four_color',
  default_sides: 'one',
  default_qty: 1000,
  allowed_paper_categories: [],
};

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export default function MyProductsPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SubProduct[]>([]);
  const [paperCats, setPaperCats] = useState<PaperCat[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SubProduct | 'new' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
      setHasSession(true);
      setUserId(session.user.id);
      await reload(session.user.id);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function reload(uid: string) {
    const [prodRes, papRes] = await Promise.all([
      supabase.from('subscriber_products').select('*').eq('subscriber_id', uid).order('sort_order').order('display_name'),
      supabase.from('paper_categories').select('id, category').eq('subscriber_id', uid).order('category'),
    ]);
    setProducts((prodRes.data || []) as SubProduct[]);
    setPaperCats((papRes.data || []) as PaperCat[]);
  }

  async function deleteProduct(p: SubProduct) {
    if (!confirm(`Delete "${p.display_name}"? This cannot be undone.`)) return;
    await supabase.from('subscriber_products').delete().eq('id', p.id);
    if (userId) await reload(userId);
  }

  async function toggleEnabled(p: SubProduct) {
    await supabase.from('subscriber_products').update({ is_enabled: !p.is_enabled }).eq('id', p.id);
    if (userId) await reload(userId);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.display_name.toLowerCase().includes(q) ||
      p.slug.includes(q) ||
      p.template_id.includes(q),
    );
  }, [products, search]);

  const grouped = useMemo(() => {
    const map: Record<string, SubProduct[]> = {};
    filtered.forEach(p => {
      if (!map[p.template_id]) map[p.template_id] = [];
      map[p.template_id].push(p);
    });
    return map;
  }, [filtered]);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500 }}>
      <PageStyles />
      <Header subtitle="My Products" />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 32px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.08)', color: TOKENS.colors.primary, border: `1px solid ${TOKENS.colors.borderStrong}`, padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              📦 My Products
            </div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 800, color: TOKENS.colors.text, margin: 0, marginBottom: 8, letterSpacing: '-0.025em' }}>
              Your product catalog
            </h1>
            <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 500, maxWidth: 700 }}>
              Build the products you sell. Pick a final size — we work out the plate and ups for you.
            </p>
          </div>
          <button onClick={() => setEditing('new')} style={primaryBtn()}>+ Create new product</button>
        </div>

        {hasSession === false && (
          <div style={card({ padding: 40, textAlign: 'center' })}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <p style={{ color: TOKENS.colors.textMuted, marginBottom: 16, fontWeight: 600 }}>Sign in to manage your products</p>
            <button onClick={() => router.push('/login')} style={primaryBtn()}>Sign In</button>
          </div>
        )}

        {hasSession && loading && <LoadingState />}

        {hasSession && !loading && products.length === 0 && (
          <div style={card({ padding: 56, textAlign: 'center' })}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 8 }}>No products yet</h3>
            <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, fontWeight: 500, marginBottom: 24 }}>
              Click <strong>Create new product</strong> to build the first one.
            </p>
            <button onClick={() => setEditing('new')} style={primaryBtn()}>+ Create your first product</button>
          </div>
        )}

        {hasSession && !loading && products.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TOKENS.colors.bgPanel, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
              <span style={{ fontSize: 18, color: TOKENS.colors.textMuted }}>🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontWeight: 500, color: TOKENS.colors.text, fontFamily: 'inherit' }} />
              <span style={{ fontSize: 13, color: TOKENS.colors.textDim, fontWeight: 600 }}>{filtered.length} of {products.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {Object.keys(grouped).map(cat => (
                <CategorySection
                  key={cat}
                  category={cat}
                  products={grouped[cat]}
                  onEdit={(p) => setEditing(p)}
                  onToggle={toggleEnabled}
                  onDelete={deleteProduct}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {editing && userId && (
        <EditModal
          initial={editing === 'new' ? null : editing}
          paperCats={paperCats}
          subscriberId={userId}
          existingSlugs={new Set(products.filter(p => editing === 'new' || p.id !== editing.id).map(p => p.slug))}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); if (userId) await reload(userId); }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function CategorySection({ category, products, onEdit, onToggle, onDelete }: {
  category: string;
  products: SubProduct[];
  onEdit: (p: SubProduct) => void;
  onToggle: (p: SubProduct) => void;
  onDelete: (p: SubProduct) => void;
}) {
  const label = CATEGORIES.find(c => c.id === category)?.label || category;
  return (
    <section>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 12, letterSpacing: '-0.01em' }}>
        {label} <span style={{ color: TOKENS.colors.textDim, fontWeight: 600 }}>· {products.length}</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products.map(p => (
          <ProductRow key={p.id} p={p} onEdit={() => onEdit(p)} onToggle={() => onToggle(p)} onDelete={() => onDelete(p)} />
        ))}
      </div>
    </section>
  );
}

function ProductRow({ p, onEdit, onToggle, onDelete }: { p: SubProduct; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const sizeLbl = p.default_size_w_inch && p.default_size_h_inch
    ? `${p.default_size_w_inch} × ${p.default_size_h_inch}"`
    : '—';
  const auto = (p.default_size_w_inch && p.default_size_h_inch)
    ? autoSelectPlate(Number(p.default_size_w_inch), Number(p.default_size_h_inch))
    : null;
  return (
    <div className="pc-row" style={{
      display: 'grid', gridTemplateColumns: '48px 1fr 120px 160px 90px 160px',
      gap: 14, padding: '14px 18px', alignItems: 'center',
      background: '#fff',
      border: `1px solid ${TOKENS.colors.border}`,
      borderRadius: 12,
      opacity: p.is_enabled ? 1 : 0.55,
      fontFamily: FONT_BODY,
    }}>
      <div style={{ fontSize: 26 }}>{p.icon || '📦'}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, color: TOKENS.colors.text }}>{p.display_name}</div>
        <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2, fontWeight: 500 }}>
          {p.description || '—'}
        </div>
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, fontWeight: 700, color: TOKENS.colors.textMuted, background: TOKENS.colors.bgPanel2, border: `1px solid ${TOKENS.colors.border}`, padding: '5px 9px', borderRadius: 6, textAlign: 'center' }}>
        {sizeLbl}
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 11, fontWeight: 700, color: TOKENS.colors.primary, background: 'rgba(124,58,237,0.08)', border: `1px solid ${TOKENS.colors.borderStrong}`, padding: '5px 9px', borderRadius: 6, textAlign: 'center' }}>
        {auto ? `${auto.plate} · ${auto.ups} ups` : '— auto —'}
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 13, fontWeight: 800, color: TOKENS.colors.text, textAlign: 'center' }}>
        {p.default_qty || 1000}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} style={ghostBtn()} title="Edit">✏️ Edit</button>
        <button onClick={onToggle} style={{ ...togBtn(p.is_enabled), minWidth: 52 }} title={p.is_enabled ? 'Disable' : 'Enable'}>
          {p.is_enabled ? 'ON' : 'OFF'}
        </button>
        <button onClick={onDelete} style={dangerBtn()} title="Delete">🗑</button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 70, background: TOKENS.colors.bgPanel2, borderRadius: 12 }} />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Edit / Create modal — validates required fields, computes plate+ups live
// ──────────────────────────────────────────────────────────────────────

function EditModal({ initial, paperCats, subscriberId, existingSlugs, onClose, onSaved }: {
  initial: SubProduct | null;
  paperCats: PaperCat[];
  subscriberId: string;
  existingSlugs: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<SubProduct>>(() => initial ? { ...initial } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [touchedSlug, setTouchedSlug] = useState(!!initial);

  function set<K extends keyof SubProduct>(k: K, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => { const c = { ...prev }; delete c[k as string]; return c; });
  }

  function setName(v: string) {
    set('display_name', v);
    if (!touchedSlug) set('slug', slugify(v));
  }

  function toggleCat(cat: string) {
    const current = form.allowed_paper_categories || [];
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
    set('allowed_paper_categories', next);
  }

  const auto = (form.default_size_w_inch && form.default_size_h_inch)
    ? autoSelectPlate(Number(form.default_size_w_inch), Number(form.default_size_h_inch))
    : null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.display_name?.trim()) e.display_name = 'Product name is required';
    if (!form.template_id) e.template_id = 'Pick a category';
    if (!form.default_size_w_inch || Number(form.default_size_w_inch) <= 0) e.default_size_w_inch = 'Enter width in inches';
    if (!form.default_size_h_inch || Number(form.default_size_h_inch) <= 0) e.default_size_h_inch = 'Enter height in inches';
    if (!form.allowed_paper_categories?.length) e.allowed_paper_categories = 'Pick at least one paper category';
    if (!form.default_qty || Number(form.default_qty) <= 0) e.default_qty = 'Enter a default quantity (e.g. 1000)';
    const slug = (form.slug || slugify(form.display_name || '')).trim();
    if (!slug) e.slug = 'Slug is required';
    else if (existingSlugs.has(slug)) e.slug = 'You already have a product with this slug';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    const w = Number(form.default_size_w_inch);
    const h = Number(form.default_size_h_inch);
    const sizeLabel = `${w} × ${h} in`;
    const slug = (form.slug || slugify(form.display_name || '')).trim();
    const payload: any = {
      subscriber_id: subscriberId,
      template_id: form.template_id,
      slug,
      display_name: form.display_name?.trim(),
      description: form.description?.trim() || '',
      icon: form.icon || '📦',
      is_enabled: form.is_enabled ?? true,
      default_size_label: sizeLabel,
      default_size_w_inch: w,
      default_size_h_inch: h,
      default_color: form.default_color || 'four_color',
      default_sides: form.default_sides || 'one',
      default_qty: Number(form.default_qty),
      allowed_paper_categories: form.allowed_paper_categories,
    };
    if (initial?.id) {
      await supabase.from('subscriber_products').update(payload).eq('id', initial.id);
    } else {
      await supabase.from('subscriber_products').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,14,50,0.45)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, maxWidth: 620, width: '100%', maxHeight: '92vh', overflow: 'auto', boxShadow: TOKENS.shadow.lg, fontFamily: FONT_BODY }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '22px 26px', borderBottom: `1px solid ${TOKENS.colors.border}`, zIndex: 1 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, margin: 0 }}>
            {initial ? `Edit: ${initial.display_name}` : 'Create a new product'}
          </h2>
          <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginTop: 4, fontWeight: 500 }}>
            Required fields are marked with <span style={{ color: '#DC2626', fontWeight: 800 }}>*</span>. Plate and ups are auto-computed from size.
          </p>
        </div>

        <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="Product name" required error={errors.display_name}>
            <input value={form.display_name || ''} onChange={(e) => setName(e.target.value)} placeholder="e.g. Visiting Card" style={inputStyle(!!errors.display_name)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
            <Field label="URL slug" required error={errors.slug}>
              <input
                value={form.slug || ''}
                onChange={(e) => { setTouchedSlug(true); set('slug', slugify(e.target.value)); }}
                placeholder="visiting-card"
                style={{ ...inputStyle(!!errors.slug), fontFamily: TOKENS.fonts.mono }}
              />
            </Field>
            <Field label="Icon">
              <input value={form.icon || ''} onChange={(e) => set('icon', e.target.value)} maxLength={4} placeholder="📦" style={{ ...inputStyle(), textAlign: 'center', fontSize: 22 }} />
            </Field>
          </div>

          <Field label="Category" required error={errors.template_id}>
            <select value={form.template_id || 'card'} onChange={(e) => set('template_id', e.target.value)} style={inputStyle(!!errors.template_id)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>

          <Field label="Description">
            <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Short text shown to customers" rows={2} style={{ ...inputStyle(), fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>

          {/* SIZE — drives plate + ups */}
          <div style={{ background: TOKENS.colors.bgPanel2, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TOKENS.colors.textMuted, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Final size <span style={{ color: '#DC2626' }}>*</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Width (inch)" error={errors.default_size_w_inch}>
                <input type="number" step="0.001" value={form.default_size_w_inch ?? ''} onChange={(e) => set('default_size_w_inch', e.target.value ? Number(e.target.value) : undefined)} placeholder="3.5" style={inputStyle(!!errors.default_size_w_inch)} />
              </Field>
              <Field label="Height (inch)" error={errors.default_size_h_inch}>
                <input type="number" step="0.001" value={form.default_size_h_inch ?? ''} onChange={(e) => set('default_size_h_inch', e.target.value ? Number(e.target.value) : undefined)} placeholder="2" style={inputStyle(!!errors.default_size_h_inch)} />
              </Field>
            </div>

            {/* Auto-derived plate + ups preview */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: auto ? 'rgba(124,58,237,0.07)' : '#fff', border: `1px dashed ${auto ? TOKENS.colors.borderStrong : TOKENS.colors.border}`, borderRadius: 8, fontSize: 13 }}>
              {auto ? (
                <span style={{ color: TOKENS.colors.text, fontWeight: 600 }}>
                  ✓ Auto: <strong style={{ color: TOKENS.colors.primary }}>{auto.plate}</strong> plate, <strong style={{ color: TOKENS.colors.primary }}>{auto.ups} ups</strong>
                  {!auto.fromMap && <span style={{ color: TOKENS.colors.textDim, marginLeft: 8 }}>(geometric fit — not in standard size map)</span>}
                </span>
              ) : (
                <span style={{ color: TOKENS.colors.textDim, fontWeight: 600 }}>Enter size to see plate + ups</span>
              )}
            </div>
          </div>

          {/* Allowed paper categories */}
          <Field label="Allowed paper categories" required error={errors.allowed_paper_categories}>
            {paperCats.length === 0 ? (
              <div style={{ padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                You have no paper categories set up yet. <Link href="/dashboard" style={{ color: TOKENS.colors.primary, fontWeight: 700 }}>Add some in dashboard</Link> first.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {paperCats.map(pc => {
                  const active = (form.allowed_paper_categories || []).includes(pc.category);
                  return (
                    <button
                      key={pc.id}
                      type="button"
                      onClick={() => toggleCat(pc.category)}
                      style={{
                        padding: '7px 14px', borderRadius: 100,
                        border: `1.5px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
                        background: active ? 'rgba(124,58,237,0.10)' : '#fff',
                        color: active ? TOKENS.colors.primary : TOKENS.colors.textMuted,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {active ? '✓ ' : ''}{pc.category}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Default qty" required error={errors.default_qty}>
              <input type="number" value={form.default_qty ?? ''} onChange={(e) => set('default_qty', e.target.value ? Number(e.target.value) : undefined)} placeholder="1000" style={inputStyle(!!errors.default_qty)} />
            </Field>
            <Field label="Default sides">
              <select value={form.default_sides || 'one'} onChange={(e) => set('default_sides', e.target.value)} style={inputStyle()}>
                <option value="one">One</option>
                <option value="both">Both</option>
              </select>
            </Field>
            <Field label="Default color">
              <select value={form.default_color || 'four_color'} onChange={(e) => set('default_color', e.target.value)} style={inputStyle()}>
                <option value="four_color">Four Color</option>
                <option value="two_color">Two Color</option>
                <option value="single_color">Single Color</option>
                <option value="bw">Black & White</option>
              </select>
            </Field>
          </div>

          <Field label="Enabled?">
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => set('is_enabled', true)} style={togBtn(form.is_enabled === true)}>ON</button>
              <button type="button" onClick={() => set('is_enabled', false)} style={togBtn(form.is_enabled === false)}>OFF</button>
            </div>
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 16, borderTop: `1px solid ${TOKENS.colors.border}` }}>
            <button onClick={onClose} style={ghostBtn()}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ ...primaryBtn(), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : (initial ? 'Save changes' : 'Create product')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TOKENS.colors.text, marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
      {error && <div style={{ marginTop: 5, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>⚠ {error}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function card(extra: React.CSSProperties = {}): React.CSSProperties {
  return { background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 24, ...extra };
}
function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: '100%', background: '#fff', color: TOKENS.colors.text,
    border: `1.5px solid ${hasError ? '#DC2626' : TOKENS.colors.border}`, borderRadius: 9,
    padding: '10px 13px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none',
  };
}
function primaryBtn(): React.CSSProperties {
  return {
    padding: '11px 22px', background: TOKENS.colors.gradient, color: '#fff',
    fontSize: 14, fontWeight: 700, fontFamily: FONT_DISPLAY,
    borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: TOKENS.shadow.glow,
  };
}
function ghostBtn(): React.CSSProperties {
  return {
    padding: '8px 14px', background: '#fff', color: TOKENS.colors.text,
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
    border: `1.5px solid ${TOKENS.colors.border}`, borderRadius: 9, cursor: 'pointer',
  };
}
function togBtn(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    background: active ? '#10B981' : '#fff',
    color: active ? '#fff' : TOKENS.colors.text,
    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    border: `1.5px solid ${active ? '#10B981' : TOKENS.colors.border}`,
    borderRadius: 9, cursor: 'pointer',
  };
}
function dangerBtn(): React.CSSProperties {
  return {
    padding: '8px 12px', background: '#FEF2F2', color: '#DC2626',
    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    border: `1.5px solid #FECACA`, borderRadius: 9, cursor: 'pointer',
  };
}
function PageStyles() {
  return (
    <style>{`
      input::placeholder, textarea::placeholder { color: ${TOKENS.colors.textDim}; font-weight: 500; }
      input:focus, select:focus, textarea:focus { border-color: ${TOKENS.colors.primary} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.10); }
      button:hover:not(:disabled) { filter: brightness(1.04); }
      .pc-row:hover { box-shadow: ${TOKENS.shadow.md}; }
      @media (max-width: 880px) {
        .pc-row { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}
