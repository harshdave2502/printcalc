'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TOKENS } from '../../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// PARKED — 2026-06-12
// Architecture changed: subscribers now own their products (created via
// /dashboard/products). This admin master catalog is no longer the source
// of truth. Page kept for now in case we revive a global catalog later.
// ─────────────────────────────────────────────────────────────────────────

interface MasterProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  group_label: string | null;
  size_w_inch: number;
  size_h_inch: number;
  plate: string;
  total_ups: number;
  default_sides: string;
  default_color: string;
  default_paper_category: string | null;
  is_active: boolean;
  sort_order: number;
}

const PLATES = ['15×20"', '18×23"', '18×25"', '20×28"', '20×29"', '20×30"', '25×36"'];
const CATEGORIES = ['card', 'sheet', 'folded', 'booklet', 'calendar', 'stationery', 'folder', 'envelope'];

// Brand fonts — consistent across all pages
const FONT_DISPLAY = TOKENS.fonts.display;
const FONT_BODY = TOKENS.fonts.body;

export default function AdminProductsPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [editing, setEditing] = useState<MasterProduct | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        setHasSession(false);
        setLoading(false);
        return;
      }
      setHasSession(true);
      await reload();
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function reload() {
    const { data } = await supabase
      .from('master_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    setProducts(data || []);
  }

  async function saveProduct(p: Partial<MasterProduct> & { id?: string }) {
    const payload = {
      slug: p.slug,
      name: p.name,
      description: p.description || '',
      icon: p.icon || '📦',
      category: p.category,
      group_label: p.group_label || null,
      size_w_inch: Number(p.size_w_inch),
      size_h_inch: Number(p.size_h_inch),
      plate: p.plate,
      total_ups: Number(p.total_ups),
      default_sides: p.default_sides || 'both',
      default_color: p.default_color || 'four_color',
      default_paper_category: p.default_paper_category || null,
      is_active: p.is_active !== false,
      sort_order: Number(p.sort_order) || 0,
    };
    if (p.id) {
      const { error } = await supabase.from('master_products').update(payload).eq('id', p.id);
      if (error) { alert('Save failed: ' + error.message); return false; }
    } else {
      const { error } = await supabase.from('master_products').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return false; }
    }
    await reload();
    return true;
  }

  async function deleteProduct(p: MasterProduct) {
    if (!confirm(`Delete master product "${p.name}"? Subscribers will lose access.`)) return;
    await supabase.from('master_products').delete().eq('id', p.id);
    await reload();
  }

  const filtered = useMemo(() => {
    let list = products;
    if (filterCat !== 'all') list = list.filter(p => p.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.slug.includes(q) ||
        (p.group_label || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, filterCat, search]);

  const grouped = useMemo(() => {
    const map: Record<string, MasterProduct[]> = {};
    for (const p of filtered) {
      const k = p.category;
      if (!map[k]) map[k] = [];
      map[k].push(p);
    }
    return map;
  }, [filtered]);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500 }}>
      <PageStyles />
      <Header />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '100px 32px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.08)', color: TOKENS.colors.primary, border: `1px solid ${TOKENS.colors.borderStrong}`, padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              🛡 Admin · Master Catalog
            </div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 800, color: TOKENS.colors.text, margin: 0, marginBottom: 6, letterSpacing: '-0.02em' }}>Products</h1>
            <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 500 }}>
              Single source of truth. Subscribers see these but cannot edit <strong style={{ color: TOKENS.colors.text }}>Size · Plate · Total Ups</strong>.
            </p>
          </div>
          <button onClick={() => { setEditing(null); setShowAdd(true); }} style={primaryBtn()}>+ New Product</button>
        </div>

        {hasSession === false && <NeedSignIn onLogin={() => router.push('/admin/login')} />}

        {hasSession && loading && <LoadingState />}

        {hasSession && !loading && products.length === 0 && (
          <EmptyState onCreate={() => { setEditing(null); setShowAdd(true); }} />
        )}

        {hasSession && !loading && products.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TOKENS.colors.bgPanel, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ fontSize: 18, color: TOKENS.colors.textMuted }}>🔍</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name, slug, or group…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: TOKENS.colors.text, fontSize: 15, fontWeight: 500, fontFamily: 'inherit' }} />
                <span style={{ fontSize: 13, color: TOKENS.colors.textDim, fontWeight: 600 }}>{filtered.length} of {products.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Chip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>All</Chip>
                {CATEGORIES.map(c => (
                  <Chip key={c} active={filterCat === c} onClick={() => setFilterCat(c)}>{c}</Chip>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {CATEGORIES.filter(c => grouped[c]?.length).map(cat => (
                <section key={cat}>
                  <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: TOKENS.colors.text, margin: 0, marginBottom: 12, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
                    {cat} <span style={{ color: TOKENS.colors.textDim, fontWeight: 600 }}>· {grouped[cat].length}</span>
                  </h2>
                  <div style={{ background: TOKENS.colors.bgPanel, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 90px 90px 110px 90px 140px', gap: 14, padding: '12px 18px', borderBottom: `1px solid ${TOKENS.colors.border}`, fontSize: 11, fontWeight: 700, color: TOKENS.colors.textDim, letterSpacing: '0.06em', textTransform: 'uppercase', background: TOKENS.colors.bgPanel2 }} className="pc-admin-head">
                      <div></div>
                      <div>Name</div>
                      <div>Slug</div>
                      <div>Size (in)</div>
                      <div>Plate</div>
                      <div>🔒 Total Ups</div>
                      <div>Status</div>
                      <div style={{ textAlign: 'right' }}>Actions</div>
                    </div>
                    {grouped[cat].map(p => (
                      <ProductRow key={p.id} p={p} onEdit={() => { setEditing(p); setShowAdd(true); }} onDelete={() => deleteProduct(p)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      {showAdd && (
        <ProductFormModal
          existing={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={async (p) => { const ok = await saveProduct(p); if (ok) { setShowAdd(false); setEditing(null); } }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, background: TOKENS.colors.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>🛡</div>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 800, color: TOKENS.colors.text, letterSpacing: '-0.02em' }}>PrintCalc Admin</span>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Link href="/admin" style={navLink()}>Subscribers</Link>
          <Link href="/admin/products" style={{ ...navLink(), color: TOKENS.colors.primary, fontWeight: 700 }}>Products</Link>
        </div>
      </div>
    </nav>
  );
}

function ProductRow({ p, onEdit, onDelete }: { p: MasterProduct; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 90px 90px 110px 90px 140px', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${TOKENS.colors.border}`, alignItems: 'center', fontSize: 14, fontWeight: 500 }} className="pc-admin-row">
      <div style={{ fontSize: 22 }}>{p.icon}</div>
      <div>
        <div style={{ fontWeight: 700, color: TOKENS.colors.text, fontSize: 15 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: TOKENS.colors.textDim, marginTop: 2 }}>{p.group_label || '—'}</div>
      </div>
      <code style={{ fontSize: 12, color: TOKENS.colors.textMuted, fontFamily: TOKENS.fonts.mono, background: TOKENS.colors.bgPanel2, padding: '3px 8px', borderRadius: 5 }}>{p.slug}</code>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 13, fontWeight: 600 }}>{p.size_w_inch} × {p.size_h_inch}</div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 13, fontWeight: 600 }}>{p.plate}</div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 15, fontWeight: 800, color: TOKENS.colors.primary, textAlign: 'center' }}>{p.total_ups}</div>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: p.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.18)', color: p.is_active ? '#10B981' : '#9CA3AF', letterSpacing: '0.04em' }}>
          {p.is_active ? 'ACTIVE' : 'OFF'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onEdit} style={iconBtn(TOKENS.colors.primary)} title="Edit">✏️</button>
        <button onClick={onDelete} style={iconBtn('#EF4444')} title="Delete">🗑</button>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 100,
      border: `1.5px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
      background: active ? `${TOKENS.colors.primary}15` : '#fff',
      color: active ? TOKENS.colors.primary : TOKENS.colors.textMuted,
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      textTransform: 'capitalize',
    }}>{children}</button>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 70, background: TOKENS.colors.bgPanel2, borderRadius: 12, animation: 'pc-shimmer 1.5s linear infinite' }} />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ background: TOKENS.colors.bgPanel, border: `1px dashed ${TOKENS.colors.border}`, borderRadius: 18, padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 10 }}>Empty catalog</h2>
      <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, fontWeight: 500, marginBottom: 24, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
        Add master products with their size, plate, and total ups. Subscribers will see these immediately.
      </p>
      <button onClick={onCreate} style={primaryBtn()}>+ Add First Product</button>
    </div>
  );
}

function NeedSignIn({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ background: TOKENS.colors.bgPanel, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 14, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 10 }}>Admin sign-in required</h2>
      <button onClick={onLogin} style={primaryBtn()}>Sign in</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Product Form Modal — add or edit a master product
// ──────────────────────────────────────────────────────────────────────

function ProductFormModal({ existing, onClose, onSave }: {
  existing: MasterProduct | null;
  onClose: () => void;
  onSave: (p: Partial<MasterProduct> & { id?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<MasterProduct>>({
    slug: existing?.slug || '',
    name: existing?.name || '',
    description: existing?.description || '',
    icon: existing?.icon || '📦',
    category: existing?.category || 'card',
    group_label: existing?.group_label || '',
    size_w_inch: existing?.size_w_inch || 0,
    size_h_inch: existing?.size_h_inch || 0,
    plate: existing?.plate || '18×25"',
    total_ups: existing?.total_ups || 1,
    default_sides: existing?.default_sides || 'both',
    default_color: existing?.default_color || 'four_color',
    default_paper_category: existing?.default_paper_category || '',
    is_active: existing?.is_active !== false,
    sort_order: existing?.sort_order || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof MasterProduct>(k: K, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function submit() {
    setError('');
    if (!form.name) { setError('Name is required'); return; }
    if (!form.slug) { setError('Slug is required'); return; }
    if (!form.size_w_inch || !form.size_h_inch) { setError('Size (W × H) is required'); return; }
    if (!form.plate) { setError('Plate is required'); return; }
    if (!form.total_ups || form.total_ups < 1) { setError('Total Ups must be at least 1'); return; }
    setSaving(true);
    await onSave({ ...form, id: existing?.id });
    setSaving(false);
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,14,50,0.45)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, maxWidth: 720, width: '100%', maxHeight: '92vh', overflow: 'auto', boxShadow: TOKENS.shadow.lg, fontFamily: FONT_BODY }}>

        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '22px 28px', borderBottom: `1px solid ${TOKENS.colors.border}`, zIndex: 1 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: TOKENS.colors.text, margin: 0 }}>
            {existing ? `Edit · ${existing.name}` : 'New Master Product'}
          </h2>
          <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginTop: 4, fontWeight: 500 }}>
            🔒 Size, Plate, Total Ups are LOCKED to subscribers — only you can set these
          </p>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Display details — editable by subscriber */}
          <Section title="Display" subtitle="Subscribers can override these">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Name *">
                <input value={form.name || ''} onChange={(e) => { set('name', e.target.value); if (!existing) set('slug', slugify(e.target.value)); }} style={inputStyle()} placeholder="Visiting Card" />
              </Field>
              <Field label="Slug *">
                <input value={form.slug || ''} onChange={(e) => set('slug', slugify(e.target.value))} style={inputStyle()} placeholder="visiting-card" />
              </Field>
              <Field label="Icon">
                <input value={form.icon || ''} onChange={(e) => set('icon', e.target.value)} maxLength={4} style={{ ...inputStyle(), width: 80, textAlign: 'center', fontSize: 22 }} />
              </Field>
              <Field label="Category *">
                <select value={form.category} onChange={(e) => set('category', e.target.value)} style={inputStyle()}>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                </select>
              </Field>
              <Field label="Group label">
                <input value={form.group_label || ''} onChange={(e) => set('group_label', e.target.value)} style={inputStyle()} placeholder="A Series / B Series / US Wedding" />
              </Field>
              <Field label="Sort order">
                <input type="number" value={form.sort_order || 0} onChange={(e) => set('sort_order', e.target.value)} style={inputStyle()} />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2} style={{ ...inputStyle(), fontFamily: 'inherit' }} />
            </Field>
          </Section>

          {/* 🔒 LOCKED — admin-only math fields */}
          <Section title="🔒 Math Fields — LOCKED" subtitle="Drive the price calculation. Only admin can edit." accent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <Field label="Size W (inch) *">
                <input type="number" step="0.01" value={form.size_w_inch || ''} onChange={(e) => set('size_w_inch', e.target.value)} style={lockedInputStyle()} />
              </Field>
              <Field label="Size H (inch) *">
                <input type="number" step="0.01" value={form.size_h_inch || ''} onChange={(e) => set('size_h_inch', e.target.value)} style={lockedInputStyle()} />
              </Field>
              <Field label="Plate *">
                <select value={form.plate} onChange={(e) => set('plate', e.target.value)} style={lockedInputStyle()}>
                  {PLATES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Total Ups *">
                <input type="number" min="1" value={form.total_ups || ''} onChange={(e) => set('total_ups', e.target.value)} style={{ ...lockedInputStyle(), fontWeight: 800, fontSize: 17 }} />
              </Field>
            </div>
          </Section>

          {/* Defaults — subscriber can override */}
          <Section title="Defaults" subtitle="Suggested defaults. Subscribers may override.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Sides">
                <select value={form.default_sides} onChange={(e) => set('default_sides', e.target.value)} style={inputStyle()}>
                  <option value="one">One side</option>
                  <option value="both">Both sides</option>
                </select>
              </Field>
              <Field label="Color">
                <select value={form.default_color} onChange={(e) => set('default_color', e.target.value)} style={inputStyle()}>
                  <option value="four_color">Four Color CMYK</option>
                  <option value="two_color">Two Color</option>
                  <option value="single_color">Single Color</option>
                  <option value="bw">Black & White</option>
                </select>
              </Field>
              <Field label="Suggested paper">
                <input value={form.default_paper_category || ''} onChange={(e) => set('default_paper_category', e.target.value)} placeholder="Art Card / Maplitho" style={inputStyle()} />
              </Field>
            </div>
            <Field label="Active?">
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => set('is_active', true)} style={togBtn(form.is_active === true)}>Active</button>
                <button onClick={() => set('is_active', false)} style={togBtn(form.is_active === false)}>Hidden</button>
              </div>
            </Field>
          </Section>

          {error && <div style={{ color: '#EF4444', fontWeight: 600, fontSize: 14 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={ghostBtn()}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ ...primaryBtn(), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : (existing ? 'Save Changes' : 'Create Product')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, accent }: { title: string; subtitle?: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <section style={{
      padding: 18,
      background: accent ? 'rgba(124,58,237,0.04)' : TOKENS.colors.bgPanel2,
      border: `1px solid ${accent ? TOKENS.colors.borderStrong : TOKENS.colors.border}`,
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: TOKENS.colors.text, letterSpacing: '-0.005em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 3, fontWeight: 500 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TOKENS.colors.text, marginBottom: 5, letterSpacing: '0.02em' }}>{label}</label>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    background: '#fff',
    color: TOKENS.colors.text,
    border: `1.5px solid ${TOKENS.colors.border}`,
    borderRadius: 9,
    padding: '10px 13px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    outline: 'none',
  };
}
function lockedInputStyle(): React.CSSProperties {
  return { ...inputStyle(), background: '#fff', borderColor: TOKENS.colors.borderStrong, color: TOKENS.colors.primary };
}
function primaryBtn(): React.CSSProperties {
  return {
    padding: '11px 22px',
    background: TOKENS.colors.gradient,
    color: '#fff',
    fontSize: 14, fontWeight: 700, fontFamily: FONT_DISPLAY,
    borderRadius: 10, border: 'none', cursor: 'pointer',
    boxShadow: TOKENS.shadow.glow,
    letterSpacing: '0.005em',
  };
}
function ghostBtn(): React.CSSProperties {
  return {
    padding: '10px 18px',
    background: '#fff',
    color: TOKENS.colors.text,
    fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
    border: `1.5px solid ${TOKENS.colors.border}`,
    borderRadius: 10, cursor: 'pointer',
  };
}
function togBtn(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    background: active ? TOKENS.colors.primary : '#fff',
    color: active ? '#fff' : TOKENS.colors.text,
    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    border: `1.5px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
    borderRadius: 9, cursor: 'pointer',
  };
}
function iconBtn(color: string): React.CSSProperties {
  return {
    width: 32, height: 32,
    background: `${color}15`,
    color,
    border: `1.5px solid ${color}33`,
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  };
}
function navLink(): React.CSSProperties {
  return { fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 600, fontFamily: FONT_DISPLAY };
}

function PageStyles() {
  return (
    <style>{`
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      input::placeholder, textarea::placeholder { color: ${TOKENS.colors.textDim}; font-weight: 500; }
      input:focus, select:focus, textarea:focus { border-color: ${TOKENS.colors.primary} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.10); }
      button:hover:not(:disabled) { filter: brightness(1.04); transform: translateY(-0.5px); }
      .pc-admin-row:hover { background: ${TOKENS.colors.bgCardHover}; }
      @media (max-width: 880px) {
        .pc-admin-head, .pc-admin-row { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}
