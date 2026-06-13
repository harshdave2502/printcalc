'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TOKENS } from '../../lib/design';
import { autoSelectPlate } from '../../lib/calc';
import { FINAL_SIZES, SIZE_GROUPS } from '../../lib/sizes';
import Header from '../../components/Header';

// ─────────────────────────────────────────────────────────────────────────
// Subscriber-owned products with PER-PRODUCT allowed lists.
//
// Each product carries its own:
//   • allowed sizes (subset of CSV size list, multi-select)
//   • allowed paper categories
//   • allowed colors, sides
//   • allowed bindings / lamination / UV / pasting
//
// Customer only sees options the subscriber turned on for THAT product.
// Products are hidden from customers until is_setup_complete = true.
// ─────────────────────────────────────────────────────────────────────────

interface SubProduct {
  id: string;
  subscriber_id: string;
  template_id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  is_enabled: boolean;
  sort_order: number;
  default_size_label: string | null;
  default_size_w_inch: number | null;
  default_size_h_inch: number | null;
  default_color: string;
  default_sides: string;
  default_qty: number | null;
  // Per-product allowed lists
  allowed_size_ids: string[] | null;
  default_size_id: string | null;
  allow_custom_size: boolean | null;
  allowed_paper_categories: string[] | null;
  default_paper_category: string | null;
  default_gsm: number | null;
  allowed_colors: string[] | null;
  allowed_sides: string[] | null;
  allowed_binding_ids: string[] | null;
  allowed_lamination_ids: string[] | null;
  allowed_uv_ids: string[] | null;
  allowed_pasting_ids: string[] | null;
  is_setup_complete: boolean | null;
}

interface PaperCat { id: string; category: string; }
interface NamedRate { id: string; name: string; }

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

const COLOR_OPTIONS = [
  { id: 'four_color', label: 'Four Color (CMYK)' },
  { id: 'two_color', label: 'Two Color' },
  { id: 'single_color', label: 'Single Color' },
  { id: 'bw', label: 'Black & White' },
];
const SIDES_OPTIONS = [
  { id: 'one', label: 'One Side' },
  { id: 'both', label: 'Both Sides' },
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
  default_color: 'four_color',
  default_sides: 'one',
  default_qty: 1000,
  allowed_size_ids: [],
  default_size_id: null,
  allow_custom_size: false,
  allowed_paper_categories: [],
  allowed_colors: ['four_color'],
  allowed_sides: ['one'],
  allowed_binding_ids: [],
  allowed_lamination_ids: [],
  allowed_uv_ids: [],
  allowed_pasting_ids: [],
  is_setup_complete: false,
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
  const [bindings, setBindings] = useState<NamedRate[]>([]);
  const [lams, setLams] = useState<NamedRate[]>([]);
  const [uvs, setUvs] = useState<NamedRate[]>([]);
  const [pastings, setPastings] = useState<NamedRate[]>([]);
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
    const [prodRes, papRes, bindRes, lamRes, uvRes, pastRes] = await Promise.all([
      supabase.from('subscriber_products').select('*').eq('subscriber_id', uid).order('sort_order').order('display_name'),
      supabase.from('paper_categories').select('id, category').eq('subscriber_id', uid).order('category'),
      supabase.from('binding_rates').select('id, binding_name').eq('subscriber_id', uid).order('sort_order'),
      supabase.from('lamination_rates').select('id, lam_name').eq('subscriber_id', uid).order('sort_order'),
      supabase.from('uv_rates').select('id, uv_name').eq('subscriber_id', uid).order('sort_order'),
      supabase.from('pasting_rates').select('id, pasting_name').eq('subscriber_id', uid).order('sort_order'),
    ]);
    setProducts((prodRes.data || []) as SubProduct[]);
    setPaperCats((papRes.data || []) as PaperCat[]);
    setBindings((bindRes.data || []).map((r: any) => ({ id: r.id, name: r.binding_name })));
    setLams((lamRes.data || []).map((r: any) => ({ id: r.id, name: r.lam_name })));
    setUvs((uvRes.data || []).map((r: any) => ({ id: r.id, name: r.uv_name })));
    setPastings((pastRes.data || []).map((r: any) => ({ id: r.id, name: r.pasting_name })));
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

  const incompleteCount = useMemo(
    () => products.filter(p => !p.is_setup_complete).length,
    [products],
  );

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
            <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 500, maxWidth: 740 }}>
              Build the products you sell. Each product carries its own allowed sizes, papers, colors, sides, and finishing.
              Customers only see what you turn on for that product.
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

        {hasSession && !loading && incompleteCount > 0 && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, color: '#92400E', fontWeight: 600 }}>
              ⚠️ {incompleteCount} product{incompleteCount > 1 ? 's are' : ' is'} not setup-complete yet — customers can&apos;t see them.
              &nbsp;Need help? The PrintCalc team can set them up for you (paid setup / AMC).
            </div>
            <a href="mailto:setup@printcalc.com?subject=Product setup help" style={{ background: '#fff', border: '1px solid #FDE68A', color: '#92400E', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Contact us</a>
          </div>
        )}

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
          bindings={bindings}
          lams={lams}
          uvs={uvs}
          pastings={pastings}
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
  const sizeCount = p.allowed_size_ids?.length ?? 0;
  const paperCount = p.allowed_paper_categories?.length ?? 0;
  const complete = p.is_setup_complete;
  return (
    <div className="pc-row" style={{
      display: 'grid', gridTemplateColumns: '44px 1fr 120px 120px 110px 160px',
      gap: 14, padding: '14px 18px', alignItems: 'center',
      background: '#fff',
      border: `1px solid ${complete ? TOKENS.colors.border : '#FDE68A'}`,
      borderRadius: 12,
      opacity: p.is_enabled ? 1 : 0.55,
      fontFamily: FONT_BODY,
    }}>
      <div style={{ fontSize: 26 }}>{p.icon || '📦'}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, color: TOKENS.colors.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          {p.display_name}
          {!complete && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Setup incomplete
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2, fontWeight: 500 }}>
          {p.description || '—'}
        </div>
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, fontWeight: 700, color: TOKENS.colors.textMuted, background: TOKENS.colors.bgPanel2, border: `1px solid ${TOKENS.colors.border}`, padding: '5px 9px', borderRadius: 6, textAlign: 'center' }}>
        {sizeCount > 0 ? `${sizeCount} size${sizeCount > 1 ? 's' : ''}` : '— no sizes —'}
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, fontWeight: 700, color: TOKENS.colors.textMuted, background: TOKENS.colors.bgPanel2, border: `1px solid ${TOKENS.colors.border}`, padding: '5px 9px', borderRadius: 6, textAlign: 'center' }}>
        {paperCount > 0 ? `${paperCount} paper${paperCount > 1 ? 's' : ''}` : '— no paper —'}
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
// Edit / Create modal — per-product allowed lists
// ──────────────────────────────────────────────────────────────────────

function EditModal({ initial, paperCats, bindings, lams, uvs, pastings, subscriberId, existingSlugs, onClose, onSaved }: {
  initial: SubProduct | null;
  paperCats: PaperCat[];
  bindings: NamedRate[];
  lams: NamedRate[];
  uvs: NamedRate[];
  pastings: NamedRate[];
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

  function toggleArrayItem<T>(field: keyof SubProduct, item: T) {
    const current = (form[field] as T[] | null) || [];
    const next = current.includes(item) ? current.filter(c => c !== item) : [...current, item];
    set(field, next);
  }

  // Auto-pick default size: when allowed sizes change, ensure default is in the list.
  const defaultSizeMeta = useMemo(
    () => FINAL_SIZES.find(s => s.id === form.default_size_id),
    [form.default_size_id],
  );

  const autoPreview = defaultSizeMeta
    ? autoSelectPlate(defaultSizeMeta.w, defaultSizeMeta.h)
    : null;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.display_name?.trim()) e.display_name = 'Product name is required';
    if (!form.template_id) e.template_id = 'Pick a category';
    if (!form.allowed_size_ids?.length && !form.allow_custom_size) {
      e.allowed_size_ids = 'Pick at least one allowed size (or enable custom size)';
    }
    if (form.allowed_size_ids?.length && !form.default_size_id) {
      e.default_size_id = 'Pick a default size from the allowed sizes';
    }
    if (!form.allowed_paper_categories?.length) e.allowed_paper_categories = 'Pick at least one paper category';
    if (!form.default_paper_category) e.default_paper_category = 'Pick a default paper category';
    if (!form.allowed_colors?.length) e.allowed_colors = 'Pick at least one color option';
    if (!form.allowed_sides?.length) e.allowed_sides = 'Pick at least one side option';
    if (!form.default_qty || Number(form.default_qty) <= 0) e.default_qty = 'Enter a default quantity (e.g. 1000)';
    const slug = (form.slug || slugify(form.display_name || '')).trim();
    if (!slug) e.slug = 'Slug is required';
    else if (existingSlugs.has(slug)) e.slug = 'You already have a product with this slug';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(markComplete: boolean) {
    if (!validate()) return;
    setSaving(true);
    const slug = (form.slug || slugify(form.display_name || '')).trim();

    // Pull the default-size details from the master list
    const ds = FINAL_SIZES.find(s => s.id === form.default_size_id);
    const sizeLabel = ds ? ds.label : (form.default_size_label || '');
    const w = ds ? ds.w : Number(form.default_size_w_inch) || null;
    const h = ds ? ds.h : Number(form.default_size_h_inch) || null;

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
      default_size_id: form.default_size_id,
      allow_custom_size: !!form.allow_custom_size,
      allowed_size_ids: form.allowed_size_ids || [],
      default_color: form.default_color || 'four_color',
      default_sides: form.default_sides || 'one',
      default_qty: Number(form.default_qty),
      default_paper_category: form.default_paper_category,
      default_gsm: form.default_gsm ? Number(form.default_gsm) : null,
      allowed_paper_categories: form.allowed_paper_categories || [],
      allowed_colors: form.allowed_colors || [],
      allowed_sides: form.allowed_sides || [],
      allowed_binding_ids: form.allowed_binding_ids || [],
      allowed_lamination_ids: form.allowed_lamination_ids || [],
      allowed_uv_ids: form.allowed_uv_ids || [],
      allowed_pasting_ids: form.allowed_pasting_ids || [],
      is_setup_complete: markComplete ? true : (form.is_setup_complete ?? false),
    };
    if (initial?.id) {
      await supabase.from('subscriber_products').update(payload).eq('id', initial.id);
    } else {
      await supabase.from('subscriber_products').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  const allowedSizeIds = form.allowed_size_ids || [];
  const allowedSizesByGroup = useMemo(() => {
    const map: Record<string, typeof FINAL_SIZES> = {};
    FINAL_SIZES.forEach(s => {
      if (!map[s.group]) map[s.group] = [];
      map[s.group].push(s);
    });
    return map;
  }, []);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,14,50,0.45)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, maxWidth: 720, width: '100%', maxHeight: '92vh', overflow: 'auto', boxShadow: TOKENS.shadow.lg, fontFamily: FONT_BODY }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '22px 26px', borderBottom: `1px solid ${TOKENS.colors.border}`, zIndex: 1 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, margin: 0 }}>
            {initial ? `Edit: ${initial.display_name}` : 'Create a new product'}
          </h2>
          <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginTop: 4, fontWeight: 500 }}>
            Required fields are marked <span style={{ color: '#DC2626', fontWeight: 800 }}>*</span>. Plate and ups auto-derive from size. Customer sees only what you turn on.
          </p>
        </div>

        <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* BASICS */}
          <SectionHeader title="Basics" />

          <Field label="Product name" required error={errors.display_name}>
            <input value={form.display_name || ''} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wall Calendar" style={inputStyle(!!errors.display_name)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
            <Field label="URL slug" required error={errors.slug}>
              <input
                value={form.slug || ''}
                onChange={(e) => { setTouchedSlug(true); set('slug', slugify(e.target.value)); }}
                placeholder="wall-calendar"
                style={{ ...inputStyle(!!errors.slug), fontFamily: TOKENS.fonts.mono }}
              />
            </Field>
            <Field label="Icon">
              <input value={form.icon || ''} onChange={(e) => set('icon', e.target.value)} maxLength={4} placeholder="📅" style={{ ...inputStyle(), textAlign: 'center', fontSize: 22 }} />
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

          {/* SIZES */}
          <SectionHeader title="Allowed sizes" subtitle="Pick which sizes this product can be made in. Customer only sees these." />
          <Field label="" required error={errors.allowed_size_ids}>
            <div style={{ background: TOKENS.colors.bgPanel2, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 10, padding: 14, maxHeight: 320, overflow: 'auto' }}>
              {SIZE_GROUPS.map(g => (
                <div key={g} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(allowedSizesByGroup[g] || []).map(s => {
                      const active = allowedSizeIds.includes(s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggleArrayItem('allowed_size_ids', s.id)} style={chipBtn(active)}>
                          {active ? '✓ ' : ''}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Default size" required error={errors.default_size_id}>
              <select value={form.default_size_id || ''} onChange={(e) => set('default_size_id', e.target.value || null)} style={inputStyle(!!errors.default_size_id)}>
                <option value="">— pick from allowed —</option>
                {allowedSizeIds.map(id => {
                  const s = FINAL_SIZES.find(x => x.id === id);
                  return s ? <option key={id} value={id}>{s.label}</option> : null;
                })}
              </select>
            </Field>
            <Field label="Allow customer custom W×H?">
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => set('allow_custom_size', true)} style={togBtn(form.allow_custom_size === true)}>YES</button>
                <button type="button" onClick={() => set('allow_custom_size', false)} style={togBtn(form.allow_custom_size === false)}>NO</button>
              </div>
            </Field>
          </div>

          {autoPreview && (
            <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.07)', border: `1px dashed ${TOKENS.colors.borderStrong}`, borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: TOKENS.colors.text, fontWeight: 600 }}>
                ✓ Default size auto-plate: <strong style={{ color: TOKENS.colors.primary }}>{autoPreview.plate}</strong>, <strong style={{ color: TOKENS.colors.primary }}>{autoPreview.ups} ups</strong>
              </span>
            </div>
          )}

          {/* PAPER */}
          <SectionHeader title="Paper" subtitle="Which paper categories suit this product?" />

          <Field label="Allowed paper categories" required error={errors.allowed_paper_categories}>
            {paperCats.length === 0 ? (
              <NoticeMissing url="/dashboard" what="paper categories" />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {paperCats.map(pc => {
                  const active = (form.allowed_paper_categories || []).includes(pc.category);
                  return (
                    <button key={pc.id} type="button" onClick={() => toggleArrayItem('allowed_paper_categories', pc.category)} style={chipBtn(active)}>
                      {active ? '✓ ' : ''}{pc.category}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Default paper category" required error={errors.default_paper_category}>
              <select value={form.default_paper_category || ''} onChange={(e) => set('default_paper_category', e.target.value || null)} style={inputStyle(!!errors.default_paper_category)}>
                <option value="">— pick from allowed —</option>
                {(form.allowed_paper_categories || []).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Default GSM (optional)">
              <input type="number" value={form.default_gsm ?? ''} onChange={(e) => set('default_gsm', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 90" style={inputStyle()} />
            </Field>
          </div>

          {/* PRINT */}
          <SectionHeader title="Print options" />

          <Field label="Allowed colors" required error={errors.allowed_colors}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COLOR_OPTIONS.map(c => {
                const active = (form.allowed_colors || []).includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggleArrayItem('allowed_colors', c.id)} style={chipBtn(active)}>
                    {active ? '✓ ' : ''}{c.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Allowed sides" required error={errors.allowed_sides}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SIDES_OPTIONS.map(s => {
                const active = (form.allowed_sides || []).includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleArrayItem('allowed_sides', s.id)} style={chipBtn(active)}>
                    {active ? '✓ ' : ''}{s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Default qty" required error={errors.default_qty}>
              <input type="number" value={form.default_qty ?? ''} onChange={(e) => set('default_qty', e.target.value ? Number(e.target.value) : undefined)} placeholder="1000" style={inputStyle(!!errors.default_qty)} />
            </Field>
            <Field label="Default sides">
              <select value={form.default_sides || 'one'} onChange={(e) => set('default_sides', e.target.value)} style={inputStyle()}>
                {SIDES_OPTIONS.filter(s => (form.allowed_sides || []).includes(s.id)).map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Default color">
              <select value={form.default_color || 'four_color'} onChange={(e) => set('default_color', e.target.value)} style={inputStyle()}>
                {COLOR_OPTIONS.filter(c => (form.allowed_colors || []).includes(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* FINISHING */}
          <SectionHeader title="Finishing & Binding" subtitle="Optional. Leave blank to hide the section from the customer." />

          <RatePicker label="Allowed bindings" items={bindings} selected={form.allowed_binding_ids || []} onToggle={(id) => toggleArrayItem('allowed_binding_ids', id)} fallbackUrl="/dashboard" fallbackWhat="binding rates" />
          <RatePicker label="Allowed lamination" items={lams} selected={form.allowed_lamination_ids || []} onToggle={(id) => toggleArrayItem('allowed_lamination_ids', id)} fallbackUrl="/dashboard" fallbackWhat="lamination rates" />
          <RatePicker label="Allowed UV / coating" items={uvs} selected={form.allowed_uv_ids || []} onToggle={(id) => toggleArrayItem('allowed_uv_ids', id)} fallbackUrl="/dashboard" fallbackWhat="UV rates" />
          <RatePicker label="Allowed pasting" items={pastings} selected={form.allowed_pasting_ids || []} onToggle={(id) => toggleArrayItem('allowed_pasting_ids', id)} fallbackUrl="/dashboard" fallbackWhat="pasting rates" />

          {/* VISIBILITY */}
          <SectionHeader title="Visibility" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Enabled?">
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => set('is_enabled', true)} style={togBtn(form.is_enabled === true)}>ON</button>
                <button type="button" onClick={() => set('is_enabled', false)} style={togBtn(form.is_enabled === false)}>OFF</button>
              </div>
            </Field>
            <Field label="Setup complete?">
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => set('is_setup_complete', true)} style={togBtn(form.is_setup_complete === true)}>YES</button>
                <button type="button" onClick={() => set('is_setup_complete', false)} style={togBtn(form.is_setup_complete === false)}>NO</button>
              </div>
            </Field>
          </div>
          <div style={{ fontSize: 12, color: TOKENS.colors.textDim, fontWeight: 500 }}>
            Customers only see products marked <strong>Setup complete</strong>. Save as draft first, then flip ON when you&apos;re ready.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 16, borderTop: `1px solid ${TOKENS.colors.border}` }}>
            <button onClick={onClose} style={ghostBtn()}>Cancel</button>
            <button onClick={() => submit(false)} disabled={saving} style={{ ...ghostBtn(), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save as draft'}
            </button>
            <button onClick={() => submit(true)} disabled={saving} style={{ ...primaryBtn(), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save & mark complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ borderTop: `1px solid ${TOKENS.colors.border}`, paddingTop: 14, marginTop: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: TOKENS.colors.text, fontFamily: FONT_DISPLAY }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2, fontWeight: 500 }}>{subtitle}</div>}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TOKENS.colors.text, marginBottom: 5 }}>
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}
      {children}
      {error && <div style={{ marginTop: 5, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>⚠ {error}</div>}
    </div>
  );
}

function RatePicker({ label, items, selected, onToggle, fallbackUrl, fallbackWhat }: { label: string; items: NamedRate[]; selected: string[]; onToggle: (id: string) => void; fallbackUrl: string; fallbackWhat: string }) {
  return (
    <Field label={label}>
      {items.length === 0 ? (
        <NoticeMissing url={fallbackUrl} what={fallbackWhat} />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map(r => {
            const active = selected.includes(r.id);
            return (
              <button key={r.id} type="button" onClick={() => onToggle(r.id)} style={chipBtn(active)}>
                {active ? '✓ ' : ''}{r.name}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}

function NoticeMissing({ url, what }: { url: string; what: string }) {
  return (
    <div style={{ padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 13, color: '#92400E', fontWeight: 600 }}>
      You have no {what} set up yet. <Link href={url} style={{ color: TOKENS.colors.primary, fontWeight: 700 }}>Add them in dashboard</Link> first.
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
function chipBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 100,
    border: `1.5px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
    background: active ? 'rgba(124,58,237,0.10)' : '#fff',
    color: active ? TOKENS.colors.primary : TOKENS.colors.textMuted,
    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
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
