'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import { TOKENS } from '../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// /products — customer-facing product catalog
// Reads from master_products (admin catalog)
// Joins with subscriber_product_settings (subscriber's overrides + enable flag)
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

interface SubSetting {
  master_product_id: string;
  is_enabled: boolean;
  custom_display_name: string | null;
  custom_description: string | null;
  custom_icon: string | null;
  custom_category: string | null;
}

interface ResolvedProduct extends MasterProduct {
  display_name: string;
  display_description: string;
  display_icon: string;
  display_category: string;
  is_enabled: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  card: '🪪 Cards',
  sheet: '📄 Sheets',
  folded: '📰 Folded',
  booklet: '📚 Booklets & Books',
  calendar: '📅 Calendars',
  stationery: '✉️ Stationery',
  folder: '📁 Folders',
  envelope: '✉️ Envelopes',
};

const FONT_DISPLAY = TOKENS.fonts.display;
const FONT_BODY = TOKENS.fonts.body;

export default function ProductsPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ResolvedProduct[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
      setHasSession(true);

      const userId = session.user.id;
      const [masterRes, settingsRes] = await Promise.all([
        supabase.from('master_products').select('*').eq('is_active', true).order('sort_order').order('name'),
        supabase.from('subscriber_product_settings').select('*').eq('subscriber_id', userId),
      ]);

      if (!mounted) return;

      const settings: Record<string, SubSetting> = {};
      (settingsRes.data || []).forEach((s: any) => { settings[s.master_product_id] = s; });

      const resolved: ResolvedProduct[] = (masterRes.data || []).map((m: MasterProduct) => {
        const s = settings[m.id];
        return {
          ...m,
          display_name: s?.custom_display_name || m.name,
          display_description: s?.custom_description || m.description,
          display_icon: s?.custom_icon || m.icon,
          display_category: s?.custom_category || m.category,
          // Default to enabled if no setting row exists
          is_enabled: s ? s.is_enabled : true,
        };
      }).filter(p => p.is_enabled);

      setProducts(resolved);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (filterCat !== 'all') list = list.filter(p => p.display_category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.display_name.toLowerCase().includes(q) ||
        (p.group_label || '').toLowerCase().includes(q) ||
        p.slug.includes(q),
      );
    }
    return list;
  }, [products, filterCat, search]);

  const grouped = useMemo(() => {
    const map: Record<string, ResolvedProduct[]> = {};
    filtered.forEach(p => {
      const k = p.display_category;
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });
    return map;
  }, [filtered]);

  const categoriesInUse = useMemo(() => {
    const set = new Set(products.map(p => p.display_category));
    return Object.keys(CATEGORY_LABELS).filter(c => set.has(c));
  }, [products]);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500 }}>
      <PageStyles />
      <Header />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '100px 32px 80px' }}>
        <Hero />

        {hasSession === false && (
          <NeedSignIn onLogin={() => router.push('/login')} />
        )}

        {hasSession && loading && <LoadingState />}

        {hasSession && !loading && products.length === 0 && (
          <EmptyState />
        )}

        {hasSession && !loading && products.length > 0 && (
          <>
            <Filters
              search={search}
              setSearch={setSearch}
              filterCat={filterCat}
              setFilterCat={setFilterCat}
              categories={categoriesInUse}
              count={filtered.length}
            />

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: TOKENS.colors.textMuted, fontWeight: 600 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ fontSize: 16 }}>No products match your search.</p>
              </div>
            )}

            {Object.keys(grouped).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 48, marginTop: 36 }}>
                {categoriesInUse.filter(c => grouped[c]?.length).map(cat => (
                  <CategorySection key={cat} category={cat} products={grouped[cat]} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, background: TOKENS.colors.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>📐</div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 800, color: TOKENS.colors.text, letterSpacing: '-0.02em' }}>PrintCalc</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Link href="/dashboard" style={navLinkStyle()}>Dashboard</Link>
          <Link href="/projects" style={navLinkStyle()}>Projects</Link>
          <Link href="/quotes" style={navLinkStyle()}>Quotes</Link>
          <Link href="/orders" style={navLinkStyle()}>Orders</Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.08)', color: TOKENS.colors.primary, border: `1px solid ${TOKENS.colors.borderStrong}`, padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 18 }}>
        Product Catalog
      </div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-0.025em', margin: 0, marginBottom: 12, color: TOKENS.colors.text }}>
        What do you want to <span style={{ background: TOKENS.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>price?</span>
      </h1>
      <p style={{ fontSize: 17, color: TOKENS.colors.textMuted, maxWidth: 560, margin: '0 auto', fontWeight: 500, lineHeight: 1.55 }}>
        Pick a product, answer a few questions, get your price.
      </p>
    </div>
  );
}

function Filters({ search, setSearch, filterCat, setFilterCat, categories, count }: { search: string; setSearch: (s: string) => void; filterCat: string; setFilterCat: (s: string) => void; categories: string[]; count: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TOKENS.colors.bgPanel, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 12, padding: '12px 16px' }}>
        <span style={{ fontSize: 18, color: TOKENS.colors.textMuted }}>🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: TOKENS.colors.text, fontSize: 15, fontWeight: 500, fontFamily: 'inherit' }} />
        <span style={{ fontSize: 13, color: TOKENS.colors.textDim, fontWeight: 600 }}>{count} {count === 1 ? 'product' : 'products'}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>All</Chip>
        {categories.map(c => (
          <Chip key={c} active={filterCat === c} onClick={() => setFilterCat(c)}>{CATEGORY_LABELS[c] || c}</Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 100,
      border: `1.5px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
      background: active ? `${TOKENS.colors.primary}15` : '#fff',
      color: active ? TOKENS.colors.primary : TOKENS.colors.textMuted,
      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  );
}

function CategorySection({ category, products }: { category: string; products: ResolvedProduct[] }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, margin: 0, color: TOKENS.colors.text, letterSpacing: '-0.015em' }}>
          {CATEGORY_LABELS[category] || category}
        </h2>
        <span style={{ fontSize: 13, color: TOKENS.colors.textDim, fontWeight: 600 }}>{products.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {products.map(p => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

function ProductCard({ p }: { p: ResolvedProduct }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/products/${p.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: '#fff',
        border: `1.5px solid ${hover ? TOKENS.colors.primary : TOKENS.colors.border}`,
        borderRadius: 16,
        padding: 22,
        transition: 'all 0.2s ease',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover ? TOKENS.shadow.lg : TOKENS.shadow.sm,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 48, height: 48, background: `${TOKENS.colors.primary}10`, border: `1px solid ${TOKENS.colors.borderStrong}33`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
          {p.display_icon || '📦'}
        </div>
        <code style={{ fontSize: 10, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono, background: TOKENS.colors.bgPanel2, padding: '3px 7px', borderRadius: 5, fontWeight: 700 }}>{p.size_w_inch} × {p.size_h_inch}"</code>
      </div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800, margin: 0, marginBottom: 5, color: TOKENS.colors.text, letterSpacing: '-0.01em' }}>{p.display_name}</h3>
      <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 500, lineHeight: 1.5, minHeight: 36 }}>
        {p.display_description || 'Configure size, paper, finishes, and quantity.'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTop: `1px solid ${TOKENS.colors.border}` }}>
        <span style={{ fontSize: 11, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Calculate →</span>
        <span style={{ fontSize: 14, color: hover ? TOKENS.colors.primary : TOKENS.colors.textDim, fontWeight: 800, transition: 'color 0.2s' }}>›</span>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 36 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 180, background: TOKENS.colors.bgPanel2, borderRadius: 16, animation: 'pc-shimmer 1.5s linear infinite' }} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ background: TOKENS.colors.bgPanel, border: `1px dashed ${TOKENS.colors.border}`, borderRadius: 18, padding: 56, textAlign: 'center', marginTop: 32 }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>📦</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 10 }}>No products yet</h2>
      <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, fontWeight: 500, maxWidth: 460, margin: '0 auto 24px' }}>
        The admin hasn&apos;t added any products to the catalog yet. Check back soon, or contact support.
      </p>
    </div>
  );
}

function NeedSignIn({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 48, textAlign: 'center', marginTop: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Sign in to see products</h3>
      <p style={{ color: TOKENS.colors.textMuted, marginBottom: 24, fontWeight: 500 }}>The product catalog is unique to your business.</p>
      <button onClick={onLogin} style={primaryBtn()}>Sign In →</button>
    </div>
  );
}

function navLinkStyle(): React.CSSProperties {
  return { fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 600, fontFamily: FONT_DISPLAY };
}
function primaryBtn(): React.CSSProperties {
  return {
    padding: '11px 22px',
    background: TOKENS.colors.gradient,
    color: '#fff',
    fontSize: 14, fontWeight: 700, fontFamily: FONT_DISPLAY,
    borderRadius: 10, border: 'none', cursor: 'pointer',
    boxShadow: TOKENS.shadow.glow,
  };
}

function PageStyles() {
  return (
    <style>{`
      @keyframes pc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      input::placeholder { color: ${TOKENS.colors.textDim}; font-weight: 500; }
      input:focus { border-color: ${TOKENS.colors.primary} !important; }
      button:hover:not(:disabled) { filter: brightness(1.04); }
    `}</style>
  );
}
