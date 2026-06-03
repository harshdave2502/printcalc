'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import { TEMPLATES, ProductTemplate } from '../lib/templates';
import { TOKENS } from '../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Product catalog page — beautiful visual grid of the printer's products
// grouped by template. Click a product → goes to /products/[slug] calculator.
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

export default function ProductsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [products, setProducts] = useState<SubscriberProduct[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<string>('all');

  // ─── Auth + load products ──────────────────────────────────────────────
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
      const { data, error } = await supabase
        .from('subscriber_products')
        .select('*')
        .eq('subscriber_id', session.user.id)
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      if (error) {
        console.error('[products] load error', error);
      }
      setProducts(data || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // ─── Seed demo products (first-time setup) ─────────────────────────────
  async function handleSeedDemo() {
    setSeeding(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    const userId = session.user.id;
    const seedRows: Array<Partial<SubscriberProduct & { subscriber_id: string }>> = [];
    let order = 0;
    for (const tpl of TEMPLATES) {
      // Add the most common product from each template
      const first = tpl.defaultProducts[0];
      if (!first) continue;
      seedRows.push({
        subscriber_id: userId,
        template_id: tpl.id,
        slug: first.slug,
        display_name: first.name,
        description: first.description,
        icon: first.icon,
        is_enabled: true,
        sort_order: order++,
      });
    }
    const { error } = await supabase.from('subscriber_products').insert(seedRows);
    if (error) {
      console.error('[seed] error', error);
      alert('Could not seed products: ' + error.message);
    } else {
      // Re-fetch
      const { data } = await supabase
        .from('subscriber_products')
        .select('*')
        .eq('subscriber_id', userId)
        .order('sort_order', { ascending: true });
      setProducts(data || []);
    }
    setSeeding(false);
  }

  // ─── Filter products ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products;
    if (activeTemplate !== 'all') {
      list = list.filter((p) => p.template_id === activeTemplate);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, activeTemplate, search]);

  // ─── Group by template for display ─────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, SubscriberProduct[]> = {};
    for (const p of filtered) {
      if (!map[p.template_id]) map[p.template_id] = [];
      map[p.template_id].push(p);
    }
    return map;
  }, [filtered]);

  // ─── Templates with products ───────────────────────────────────────────
  const templatesInUse = useMemo(() => {
    const set = new Set(products.map((p) => p.template_id));
    return TEMPLATES.filter((t) => set.has(t.id));
  }, [products]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body, position: 'relative', overflow: 'hidden' }}>
      <PageStyles />
      <AmbientBackground />

      <Header />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '120px 32px 80px', position: 'relative', zIndex: 1 }}>
        <HeroSection />

        {hasSession === false && (
          <SignInPrompt onLogin={() => router.push('/login')} />
        )}

        {hasSession && loading && <LoadingState />}

        {hasSession && !loading && products.length === 0 && (
          <EmptyState onSeed={handleSeedDemo} seeding={seeding} />
        )}

        {hasSession && !loading && products.length > 0 && (
          <>
            <SearchAndFilter
              search={search}
              setSearch={setSearch}
              activeTemplate={activeTemplate}
              setActiveTemplate={setActiveTemplate}
              templates={templatesInUse}
              count={filtered.length}
            />

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: TOKENS.colors.textMuted }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ fontSize: 16 }}>No products match your search.</p>
              </div>
            )}

            {Object.keys(grouped).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 56, marginTop: 48 }}>
                {TEMPLATES.filter((t) => grouped[t.id]?.length).map((tpl) => (
                  <TemplateSection key={tpl.id} template={tpl} products={grouped[tpl.id]} />
                ))}
              </div>
            )}

            <AddCustomProductCTA />
          </>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, background: TOKENS.colors.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: TOKENS.shadow.glow }}>📐</div>
          <span style={{ fontFamily: TOKENS.fonts.display, fontSize: 19, fontWeight: 800, color: TOKENS.colors.text, letterSpacing: '-0.02em' }}>PrintCalc</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/dashboard" style={{ fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
          <Link href="/quotes" style={{ fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 500 }}>Quotes</Link>
          <Link href="/orders" style={{ fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 500 }}>Orders</Link>
        </div>
      </div>
    </nav>
  );
}

function AmbientBackground() {
  return (
    <>
      <div style={{ position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 800, background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 100, right: -200, width: 600, height: 600, background: 'radial-gradient(ellipse, rgba(217,70,239,0.05) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function HeroSection() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40, animation: 'pc-fade-up 0.6s ease both' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: 100, padding: '6px 18px', fontSize: 13, color: TOKENS.colors.accent, fontWeight: 500, marginBottom: 24 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: TOKENS.colors.pink, boxShadow: `0 0 8px ${TOKENS.colors.pink}`, animation: 'pc-blink 2s infinite' }} />
        Product Catalog
      </div>
      <h1 style={{ fontFamily: TOKENS.fonts.display, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0, marginBottom: 16 }}>
        Pick what you want to <span style={{ background: TOKENS.colors.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>price</span>
      </h1>
      <p style={{ fontSize: 17, color: TOKENS.colors.textMuted, maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
        Each product has only the fields it needs. Pick a card to open the calculator.
      </p>

      <div style={{ display: 'inline-flex', gap: 6, marginTop: 24, padding: 4, background: TOKENS.colors.bgPanel2, border: `1px solid ${TOKENS.colors.border}`, borderRadius: 100 }}>
        <span style={{ padding: '8px 18px', borderRadius: 100, background: TOKENS.colors.gradient, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: TOKENS.fonts.display, boxShadow: TOKENS.shadow.glow }}>
          🔧 Subscriber View
        </span>
        <span style={{ padding: '8px 18px', fontSize: 13, color: TOKENS.colors.textMuted, fontWeight: 500 }}>
          🚀 Quick Quote (click any product → toggle in header)
        </span>
      </div>
    </div>
  );
}

function SignInPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 48, textAlign: 'center', marginTop: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <h3 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Sign in to see your products</h3>
      <p style={{ color: TOKENS.colors.textMuted, marginBottom: 24 }}>Your product catalog is unique to your business.</p>
      <button onClick={onLogin} style={primaryButtonStyle()}>Sign In →</button>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 48 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: 180, background: 'linear-gradient(110deg, rgba(243,242,247,0.6) 0%, rgba(232,228,242,0.6) 50%, rgba(243,242,247,0.6) 100%)', backgroundSize: '200% 100%', animation: 'pc-shimmer 1.5s linear infinite', borderRadius: TOKENS.radius.xl, border: `1px solid ${TOKENS.colors.border}` }} />
      ))}
    </div>
  );
}

function EmptyState({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius['2xl'], padding: 64, textAlign: 'center', marginTop: 32, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: TOKENS.colors.gradientSubtle, opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Welcome — let&apos;s set up your catalog</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 16, maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.6 }}>
          We&apos;ll add the most common print products so you can start quoting immediately. You can rename, customize, or remove any of them later.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onSeed} disabled={seeding} style={{ ...primaryButtonStyle(), opacity: seeding ? 0.7 : 1 }}>
            {seeding ? 'Adding products…' : '✨ Add Standard Products'}
          </button>
          <Link href="/dashboard" style={ghostButtonStyle()}>Skip — I&apos;ll add manually</Link>
        </div>
        <p style={{ fontSize: 12, color: TOKENS.colors.textDim, marginTop: 24 }}>
          7 templates · Business Card, Flyer, Brochure, Booklet, Calendar, Letterhead, Folder
        </p>
      </div>
    </div>
  );
}

function SearchAndFilter({
  search, setSearch, activeTemplate, setActiveTemplate, templates, count,
}: {
  search: string;
  setSearch: (s: string) => void;
  activeTemplate: string;
  setActiveTemplate: (s: string) => void;
  templates: ProductTemplate[];
  count: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, animation: 'pc-fade-up 0.6s 0.1s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.lg, padding: '12px 16px' }}>
        <span style={{ fontSize: 18, color: TOKENS.colors.textMuted }}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: TOKENS.colors.text, fontSize: 15, fontFamily: 'inherit' }}
        />
        <span style={{ fontSize: 12, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono }}>{count} {count === 1 ? 'product' : 'products'}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <FilterChip active={activeTemplate === 'all'} onClick={() => setActiveTemplate('all')}>
          All
        </FilterChip>
        {templates.map((t) => (
          <FilterChip key={t.id} active={activeTemplate === t.id} onClick={() => setActiveTemplate(t.id)} icon={t.icon} accent={t.accent}>
            {t.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children, icon, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; icon?: string; accent?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderRadius: TOKENS.radius.full,
        border: `1px solid ${active ? (accent || TOKENS.colors.primary) : TOKENS.colors.border}`,
        background: active ? `${accent || TOKENS.colors.primary}22` : 'transparent',
        color: active ? (accent || TOKENS.colors.primary) : TOKENS.colors.textMuted,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: `all 0.2s ${TOKENS.ease.out}`,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

function TemplateSection({ template, products }: { template: ProductTemplate; products: SubscriberProduct[] }) {
  return (
    <section style={{ animation: 'pc-fade-up 0.6s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, background: `${template.accent}22`, border: `1px solid ${template.accent}55`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{template.icon}</div>
        <div>
          <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{template.label}</h2>
          <p style={{ fontSize: 13, color: TOKENS.colors.textDim, margin: 0, marginTop: 2 }}>{template.description}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} accent={template.accent} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, accent }: { product: SubscriberProduct; accent: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: TOKENS.colors.bgCard,
        border: `1px solid ${hover ? accent + '88' : TOKENS.colors.border}`,
        borderRadius: TOKENS.radius.xl,
        padding: 22,
        transition: `all 0.25s ${TOKENS.ease.out}`,
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? `0 16px 40px ${accent}33` : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {hover && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.9 }} />
      )}
      <div style={{ width: 48, height: 48, background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 }}>
        {product.icon || '📦'}
      </div>
      <h3 style={{ fontFamily: TOKENS.fonts.display, fontSize: 17, fontWeight: 700, margin: 0, marginBottom: 6, letterSpacing: '-0.01em' }}>{product.display_name}</h3>
      <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, margin: 0, lineHeight: 1.55, minHeight: 36 }}>{product.description || 'Configure size, paper, finishes, and quantity.'}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTop: `1px solid ${TOKENS.colors.border}` }}>
        <span style={{ fontSize: 11, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Calculate →</span>
        <span style={{ fontSize: 14, color: accent, opacity: hover ? 1 : 0.6, transition: 'opacity 0.2s' }}>›</span>
      </div>
    </Link>
  );
}

function AddCustomProductCTA() {
  return (
    <div style={{
      marginTop: 56,
      padding: 28,
      borderRadius: TOKENS.radius.xl,
      border: `1px dashed ${TOKENS.colors.borderStrong}`,
      background: 'rgba(124,58,237,0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
    }}>
      <div>
        <h4 style={{ fontFamily: TOKENS.fonts.display, fontSize: 17, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          ➕ Add your own custom product
        </h4>
        <p style={{ fontSize: 14, color: TOKENS.colors.textMuted, margin: 0 }}>
          Create products unique to your shop — stickers, NFC cards, premium variants. Pick a template, name it, done.
        </p>
      </div>
      <Link href="/dashboard?tab=products&new=1" style={primaryButtonStyle()}>
        New Product
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Style helpers
// ──────────────────────────────────────────────────────────────────────────

function primaryButtonStyle(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 24px',
    background: TOKENS.colors.gradient,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: TOKENS.fonts.display,
    borderRadius: TOKENS.radius.md,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: TOKENS.shadow.glow,
    transition: `all 0.2s ${TOKENS.ease.out}`,
  };
}

function ghostButtonStyle(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 24px',
    background: 'transparent',
    color: TOKENS.colors.text,
    fontSize: 15,
    fontWeight: 500,
    borderRadius: TOKENS.radius.md,
    border: `1px solid ${TOKENS.colors.borderStrong}`,
    textDecoration: 'none',
    transition: `all 0.2s ${TOKENS.ease.out}`,
  };
}

function PageStyles() {
  return (
    <style>{`
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pc-pulse-glow { 0%, 100% { box-shadow: 0 0 30px rgba(124,58,237,0.3); } 50% { box-shadow: 0 0 50px rgba(124,58,237,0.55); } }
      @keyframes pc-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes pc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      *::-webkit-scrollbar { width: 8px; }
      *::-webkit-scrollbar-track { background: ${TOKENS.colors.bgPanel2}; }
      *::-webkit-scrollbar-thumb { background: ${TOKENS.colors.border}; border-radius: 4px; }
      *::-webkit-scrollbar-thumb:hover { background: ${TOKENS.colors.borderStrong}; }
    `}</style>
  );
}
