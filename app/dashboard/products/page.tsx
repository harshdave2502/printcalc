'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TEMPLATES, ProductTemplate } from '../../lib/templates';
import { TOKENS } from '../../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Product Manager — list, add, enable/disable subscriber's products.
// Click a product → edit page (next file).
// ─────────────────────────────────────────────────────────────────────────

interface SubscriberProduct {
  id: string;
  template_id: string;
  slug: string;
  display_name: string;
  description: string;
  icon: string;
  is_enabled: boolean;
  sort_order: number;
}

export default function DashboardProductsPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SubscriberProduct[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTpl, setFilterTpl] = useState<string>('all');

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
      await reload(session.user.id);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function reload(uid?: string) {
    let userId = uid;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userId = session.user.id;
    }
    const { data } = await supabase
      .from('subscriber_products')
      .select('*')
      .eq('subscriber_id', userId)
      .order('sort_order', { ascending: true });
    setProducts(data || []);
  }

  async function toggleEnabled(p: SubscriberProduct) {
    await supabase
      .from('subscriber_products')
      .update({ is_enabled: !p.is_enabled })
      .eq('id', p.id);
    await reload();
  }

  async function deleteProduct(p: SubscriberProduct) {
    if (!confirm(`Delete "${p.display_name}"? This won't affect saved quotes/orders.`)) return;
    await supabase.from('subscriber_products').delete().eq('id', p.id);
    await reload();
  }

  const filtered = useMemo(() => {
    let list = products;
    if (filterTpl !== 'all') list = list.filter(p => p.template_id === filterTpl);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.display_name.toLowerCase().includes(q) || p.slug.includes(q));
    }
    return list;
  }, [products, filterTpl, search]);

  const grouped = useMemo(() => {
    const g: Record<string, SubscriberProduct[]> = {};
    filtered.forEach(p => {
      if (!g[p.template_id]) g[p.template_id] = [];
      g[p.template_id].push(p);
    });
    return g;
  }, [filtered]);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body, position: 'relative', overflow: 'hidden' }}>
      <PageStyles />
      <Ambient />
      <Header />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 32px 60px', position: 'relative', zIndex: 1 }}>
        <Hero count={products.length} onAdd={() => setShowAdd(true)} />

        {hasSession === false && (
          <div style={card({ padding: 40, textAlign: 'center' })}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <p style={{ color: TOKENS.colors.textMuted, marginBottom: 16 }}>Sign in to manage your products</p>
            <button onClick={() => router.push('/login')} style={primary()}>Sign In</button>
          </div>
        )}

        {hasSession && loading && <Loading />}

        {hasSession && !loading && products.length === 0 && (
          <EmptyState onAdd={() => setShowAdd(true)} />
        )}

        {hasSession && !loading && products.length > 0 && (
          <>
            <Filters search={search} setSearch={setSearch} filterTpl={filterTpl} setFilterTpl={setFilterTpl} count={filtered.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36, marginTop: 32 }}>
              {TEMPLATES.filter(t => grouped[t.id]?.length).map((tpl) => (
                <TemplateGroup key={tpl.id} template={tpl} products={grouped[tpl.id]} onToggle={toggleEnabled} onDelete={deleteProduct} />
              ))}
            </div>
          </>
        )}
      </main>

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onCreated={async (id) => { setShowAdd(false); router.push(`/dashboard/products/${id}`); }} />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(10, 8, 21, 0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: TOKENS.colors.textMuted, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>← Dashboard</Link>
          <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Manage Products</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/products" style={{ fontSize: 14, color: TOKENS.colors.accent, textDecoration: 'none', fontWeight: 500 }}>👁️ View Catalog</Link>
        </div>
      </div>
    </nav>
  );
}

function Ambient() {
  return (
    <>
      <div style={{ position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 700, background: 'radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function Hero({ count, onAdd }: { count: number; onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap', animation: 'pc-fade-up 0.5s ease both' }}>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: 100, padding: '6px 14px', fontSize: 12, color: TOKENS.colors.accent, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ⚙️ Admin · Product Manager
        </div>
        <h1 style={{ fontFamily: TOKENS.fonts.display, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, marginBottom: 8 }}>
          Your <span style={{ background: TOKENS.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>products</span>
        </h1>
        <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, maxWidth: 580, lineHeight: 1.6 }}>
          Add, rename, toggle fields, and create custom products from any of the 7 templates. Disable what you don&apos;t offer — customers will only see what&apos;s enabled.
        </p>
      </div>
      <button onClick={onAdd} style={primary()}>
        ➕ Add Product
      </button>
    </div>
  );
}

function Filters({ search, setSearch, filterTpl, setFilterTpl, count }: { search: string; setSearch: (v: string) => void; filterTpl: string; setFilterTpl: (v: string) => void; count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'pc-fade-up 0.5s 0.1s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.lg, padding: '11px 15px' }}>
        <span style={{ fontSize: 16, color: TOKENS.colors.textMuted }}>🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name or slug…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'inherit' }} />
        <span style={{ fontSize: 12, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono }}>{count} {count === 1 ? 'product' : 'products'}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip active={filterTpl === 'all'} onClick={() => setFilterTpl('all')}>All Templates</Chip>
        {TEMPLATES.map((t) => (
          <Chip key={t.id} active={filterTpl === t.id} onClick={() => setFilterTpl(t.id)} accent={t.accent}>
            {t.icon} {t.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; accent?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px',
      borderRadius: TOKENS.radius.full,
      border: `1px solid ${active ? (accent || TOKENS.colors.primary) : TOKENS.colors.border}`,
      background: active ? `${accent || TOKENS.colors.primary}22` : 'transparent',
      color: active ? '#fff' : TOKENS.colors.textMuted,
      fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.18s ease',
    }}>{children}</button>
  );
}

function TemplateGroup({ template, products, onToggle, onDelete }: { template: ProductTemplate; products: SubscriberProduct[]; onToggle: (p: SubscriberProduct) => void; onDelete: (p: SubscriberProduct) => void }) {
  return (
    <section style={{ animation: 'pc-fade-up 0.5s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, background: `${template.accent}22`, border: `1px solid ${template.accent}55`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{template.icon}</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 18, fontWeight: 700, margin: 0 }}>{template.label}</h2>
        <span style={{ fontSize: 12, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono }}>{products.length} product{products.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products.map((p) => <ProductRow key={p.id} product={p} accent={template.accent} onToggle={onToggle} onDelete={onDelete} />)}
      </div>
    </section>
  );
}

function ProductRow({ product, accent, onToggle, onDelete }: { product: SubscriberProduct; accent: string; onToggle: (p: SubscriberProduct) => void; onDelete: (p: SubscriberProduct) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`,
      borderRadius: TOKENS.radius.lg, opacity: product.is_enabled ? 1 : 0.55,
      transition: 'all 0.2s ease',
    }}>
      <div style={{ width: 40, height: 40, background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {product.icon || '📦'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: TOKENS.fonts.display, fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>{product.display_name}</h3>
          <code style={{ fontSize: 11, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>/{product.slug}</code>
          {!product.is_enabled && <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#71717a', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em' }}>DISABLED</span>}
        </div>
        <p style={{ fontSize: 12, color: TOKENS.colors.textMuted, margin: 0, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onToggle(product)} title={product.is_enabled ? 'Disable' : 'Enable'} style={iconButton(product.is_enabled ? '#10B981' : '#71717a')}>
          {product.is_enabled ? '✓' : '○'}
        </button>
        <Link href={`/dashboard/products/${product.id}`} style={{ ...iconButton(accent), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✏️</Link>
        <button onClick={() => onDelete(product)} style={iconButton('#EF4444')}>🗑️</button>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: 70, background: 'linear-gradient(110deg, rgba(30,22,64,0.4) 0%, rgba(40,30,80,0.5) 50%, rgba(30,22,64,0.4) 100%)', backgroundSize: '200% 100%', animation: 'pc-shimmer 1.5s linear infinite', borderRadius: TOKENS.radius.lg }} />
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={card({ padding: 56, textAlign: 'center' })}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, marginBottom: 10 }}>No products yet</h2>
      <p style={{ color: TOKENS.colors.textMuted, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
        Add your first product to start quoting. Pick a template that matches what you offer — Card, Sheet, Folded, Booklet, Calendar, Stationery, or Folder.
      </p>
      <button onClick={onAdd} style={primary()}>➕ Add First Product</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Add Product Modal
// ──────────────────────────────────────────────────────────────────────

function AddProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => Promise<void> }) {
  const [step, setStep] = useState<'template' | 'preset' | 'custom'>('template');
  const [selectedTpl, setSelectedTpl] = useState<ProductTemplate | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('📦');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  function pickTemplate(tpl: ProductTemplate) {
    setSelectedTpl(tpl);
    setStep('preset');
  }

  async function applyPreset(presetSlug?: string) {
    if (!selectedTpl) return;
    if (presetSlug) {
      const preset = selectedTpl.defaultProducts.find(p => p.slug === presetSlug);
      if (preset) {
        await save({ slug: preset.slug, name: preset.name, icon: preset.icon, description: preset.description, defaultSize: preset.defaultSize });
      }
    } else {
      setStep('custom');
      setName('');
      setSlug('');
      setIcon(selectedTpl.icon);
      setDescription('');
    }
  }

  async function save({ slug, name, icon, description, defaultSize }: { slug: string; name: string; icon: string; description: string; defaultSize?: { label: string; w: number; h: number } }) {
    if (!selectedTpl) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); onClose(); return; }
    const { data: existing } = await supabase
      .from('subscriber_products')
      .select('id, sort_order')
      .eq('subscriber_id', session.user.id)
      .order('sort_order', { ascending: false })
      .limit(1);
    const sort_order = (existing && existing[0] && (existing[0] as any).sort_order ? Number((existing[0] as any).sort_order) : 0) + 1;
    const insertData: any = {
      subscriber_id: session.user.id,
      template_id: selectedTpl.id,
      slug,
      display_name: name,
      icon,
      description,
      is_enabled: true,
      sort_order,
    };
    if (defaultSize) {
      insertData.default_size_label = defaultSize.label;
      insertData.default_size_w_inch = defaultSize.w;
      insertData.default_size_h_inch = defaultSize.h;
    }
    const { data, error } = await supabase
      .from('subscriber_products')
      .insert(insertData)
      .select()
      .single();
    setSaving(false);
    if (error) {
      alert('Could not create product: ' + error.message);
      return;
    }
    if (data) await onCreated(data.id);
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'pc-fade-in 0.2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: TOKENS.colors.bgPanel,
        border: `1px solid ${TOKENS.colors.borderStrong}`,
        borderRadius: TOKENS.radius['2xl'],
        padding: 32,
        maxWidth: 720,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: TOKENS.shadow.lg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, margin: 0 }}>
            {step === 'template' && 'Pick a template'}
            {step === 'preset' && `Add a ${selectedTpl?.label.toLowerCase()}`}
            {step === 'custom' && 'Create custom product'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TOKENS.colors.textMuted, fontSize: 24, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {step === 'template' && (
          <div>
            <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>
              Templates define the calculation formula and default fields. Pick one that matches what you make.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {TEMPLATES.map((tpl) => (
                <button key={tpl.id} onClick={() => pickTemplate(tpl)} style={{
                  textAlign: 'left',
                  padding: 18,
                  background: TOKENS.colors.bgCard,
                  border: `1px solid ${TOKENS.colors.border}`,
                  borderRadius: TOKENS.radius.lg,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: '#fff',
                  transition: 'all 0.2s ease',
                }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = tpl.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKENS.colors.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div style={{ width: 40, height: 40, background: `${tpl.accent}22`, border: `1px solid ${tpl.accent}55`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 }}>{tpl.icon}</div>
                  <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{tpl.label}</div>
                  <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, lineHeight: 1.5 }}>{tpl.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'preset' && selectedTpl && (
          <div>
            <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>
              Pick a common preset, or create a custom product from this template.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
              {selectedTpl.defaultProducts.map((p) => (
                <button key={p.slug} onClick={() => applyPreset(p.slug)} disabled={saving} style={{
                  textAlign: 'left', padding: 14, background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.md, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', transition: 'all 0.2s ease',
                }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = selectedTpl.accent; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKENS.colors.border; }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{p.icon}</div>
                  <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: TOKENS.colors.textMuted, lineHeight: 1.45 }}>{p.description}</div>
                  {p.defaultSize && <div style={{ fontSize: 10, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono, marginTop: 6 }}>{p.defaultSize.label}</div>}
                </button>
              ))}
            </div>
            <button onClick={() => applyPreset()} style={{ ...ghost(), width: '100%' }}>
              ➕ Or create my own custom product
            </button>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setStep('template')} style={{ ...ghost(), padding: '8px 14px', fontSize: 13 }}>← Back</button>
            </div>
          </div>
        )}

        {step === 'custom' && selectedTpl && (
          <div>
            <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>
              Create your own product based on the <strong style={{ color: '#fff' }}>{selectedTpl.label}</strong> template.
            </p>
            <Field label="Product name" hint="Customers will see this">
              <input value={name} onChange={(e) => { setName(e.target.value); if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value)); }} placeholder="e.g. Wedding Invitation Card" style={input()} />
            </Field>
            <Field label="Slug" hint="Used in the URL — letters, numbers, hyphens">
              <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="wedding-invitation-card" style={input()} />
            </Field>
            <Field label="Icon (emoji)">
              <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} style={{ ...input(), width: 100 }} />
            </Field>
            <Field label="Short description">
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief blurb shown on the product card" style={input()} />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep('preset')} style={{ ...ghost(), padding: '10px 16px' }}>← Back</button>
              <button
                disabled={saving || !name || !slug}
                onClick={() => save({ slug, name, icon, description })}
                style={{ ...primary(), opacity: (saving || !name || !slug) ? 0.5 : 1 }}
              >
                {saving ? 'Creating…' : 'Create Product →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ marginLeft: 8, color: TOKENS.colors.textDim, fontWeight: 400, fontSize: 11 }}>· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Style helpers
// ──────────────────────────────────────────────────────────────────────

function card(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: TOKENS.colors.bgCard,
    border: `1px solid ${TOKENS.colors.border}`,
    borderRadius: TOKENS.radius.xl,
    padding: 24,
    ...extra,
  };
}
function input(): React.CSSProperties {
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
function primary(): React.CSSProperties {
  return {
    padding: '11px 22px',
    background: TOKENS.colors.gradient,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: TOKENS.fonts.display,
    borderRadius: TOKENS.radius.md,
    border: 'none',
    cursor: 'pointer',
    boxShadow: TOKENS.shadow.glow,
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}
function ghost(): React.CSSProperties {
  return {
    padding: '9px 16px',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: TOKENS.fonts.body,
    borderRadius: TOKENS.radius.md,
    border: `1px solid ${TOKENS.colors.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
}
function iconButton(color: string): React.CSSProperties {
  return {
    width: 34, height: 34,
    background: `${color}1a`,
    border: `1px solid ${color}55`,
    color,
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    transition: 'all 0.18s ease',
  };
}
function PageStyles() {
  return (
    <style>{`
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      input::placeholder { color: rgba(255,255,255,0.3); }
      input:focus { border-color: rgba(148,97,251,0.6) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
      *::-webkit-scrollbar { width: 8px; }
      *::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
      *::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
      button:hover:not(:disabled) { filter: brightness(1.05); }
    `}</style>
  );
}
