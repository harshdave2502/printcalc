'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../supabase';
import { TOKENS } from '../../../../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// ADMIN — Per-Customer Product Overrides
// For a specific customer (subscriber's client), admin can set non-standard
// size/plate/total_ups that only apply when that customer uses the calculator.
// ─────────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  subscriber_id: string;
}

interface MasterProduct {
  id: string;
  slug: string;
  name: string;
  icon: string;
  category: string;
  size_w_inch: number;
  size_h_inch: number;
  plate: string;
  total_ups: number;
}

interface Override {
  id?: string;
  customer_id: string;
  master_product_id: string;
  override_size_w_inch: number | null;
  override_size_h_inch: number | null;
  override_plate: string | null;
  override_total_ups: number | null;
  notes: string;
}

const PLATES = ['15×20"', '18×23"', '18×25"', '20×28"', '20×29"', '20×30"', '25×36"'];

const FONT_DISPLAY = TOKENS.fonts.display;
const FONT_BODY = TOKENS.fonts.body;

export default function CustomerOverridesPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
      setHasSession(true);

      const [custRes, masterRes, ovRes] = await Promise.all([
        supabase.from('customers').select('id, name, email, company, subscriber_id').eq('id', customerId).maybeSingle(),
        supabase.from('master_products').select('id, slug, name, icon, category, size_w_inch, size_h_inch, plate, total_ups').eq('is_active', true).order('sort_order'),
        supabase.from('customer_product_overrides').select('*').eq('customer_id', customerId),
      ]);

      if (!mounted) return;
      setCustomer(custRes.data as Customer | null);
      setMasterProducts((masterRes.data || []) as MasterProduct[]);
      const map: Record<string, Override> = {};
      (ovRes.data || []).forEach((o: any) => { map[o.master_product_id] = o; });
      setOverrides(map);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [customerId]);

  async function saveOverride(mp: MasterProduct, patch: Partial<Override>) {
    const existing = overrides[mp.id];
    const payload: any = {
      customer_id: customerId,
      master_product_id: mp.id,
      override_size_w_inch: patch.override_size_w_inch ?? existing?.override_size_w_inch ?? null,
      override_size_h_inch: patch.override_size_h_inch ?? existing?.override_size_h_inch ?? null,
      override_plate: patch.override_plate ?? existing?.override_plate ?? null,
      override_total_ups: patch.override_total_ups ?? existing?.override_total_ups ?? null,
      notes: patch.notes ?? existing?.notes ?? '',
    };

    if (existing?.id) {
      await supabase.from('customer_product_overrides').update(payload).eq('id', existing.id);
    } else {
      const { data } = await supabase.from('customer_product_overrides').insert(payload).select().single();
      payload.id = data?.id;
    }
    setOverrides(prev => ({ ...prev, [mp.id]: { ...payload, id: payload.id || existing?.id } }));
  }

  async function clearOverride(mp: MasterProduct) {
    const existing = overrides[mp.id];
    if (!existing?.id) return;
    if (!confirm('Remove all overrides for this product?')) return;
    await supabase.from('customer_product_overrides').delete().eq('id', existing.id);
    setOverrides(prev => {
      const m = { ...prev };
      delete m[mp.id];
      return m;
    });
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return masterProducts;
    const q = search.toLowerCase();
    return masterProducts.filter(p =>
      p.name.toLowerCase().includes(q) || p.slug.includes(q)
    );
  }, [masterProducts, search]);

  if (loading) return <FullPage>Loading…</FullPage>;
  if (hasSession === false) return <FullPage>Sign in required</FullPage>;
  if (!customer) return <FullPage>Customer not found</FullPage>;

  const withOverrides = Object.values(overrides).filter(o => o.override_size_w_inch || o.override_plate || o.override_total_ups).length;

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500 }}>
      <PageStyles />
      <Header />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '100px 32px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <Link href="/admin" style={{ fontSize: 13, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 600 }}>← All Customers</Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.08)', color: TOKENS.colors.primary, border: `1px solid ${TOKENS.colors.borderStrong}`, padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14, marginTop: 14, marginLeft: 14 }}>
            🛡 Admin · Customer Overrides
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 800, color: TOKENS.colors.text, margin: 0, marginTop: 10, marginBottom: 6, letterSpacing: '-0.025em' }}>
            {customer.name}
            {customer.company && <span style={{ color: TOKENS.colors.textMuted, fontWeight: 600 }}> · {customer.company}</span>}
          </h1>
          <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 500 }}>
            Override standard sizes for special clients. <strong style={{ color: TOKENS.colors.text }}>{withOverrides}</strong> override{withOverrides === 1 ? '' : 's'} configured.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <span style={{ fontSize: 18, color: TOKENS.colors.textMuted }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontWeight: 500, color: TOKENS.colors.text, fontFamily: 'inherit' }} />
          <span style={{ fontSize: 13, color: TOKENS.colors.textDim, fontWeight: 600 }}>{filtered.length} of {masterProducts.length}</span>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 110px 110px 90px 90px 70px', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${TOKENS.colors.border}`, background: TOKENS.colors.bgPanel2, fontSize: 11, fontWeight: 700, color: TOKENS.colors.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }} className="pc-head">
            <div></div>
            <div>Product</div>
            <div>Master size</div>
            <div>Override size</div>
            <div>Override plate</div>
            <div>Override ups</div>
            <div></div>
          </div>
          {filtered.map(mp => (
            <OverrideRow
              key={mp.id}
              mp={mp}
              override={overrides[mp.id]}
              onSave={(patch) => saveOverride(mp, patch)}
              onClear={() => clearOverride(mp)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function OverrideRow({ mp, override, onSave, onClear }: { mp: MasterProduct; override?: Override; onSave: (p: Partial<Override>) => Promise<void>; onClear: () => void }) {
  const [w, setW] = useState(override?.override_size_w_inch ?? '');
  const [h, setH] = useState(override?.override_size_h_inch ?? '');
  const [plate, setPlate] = useState(override?.override_plate || '');
  const [ups, setUps] = useState(override?.override_total_ups ?? '');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setW(override?.override_size_w_inch ?? '');
    setH(override?.override_size_h_inch ?? '');
    setPlate(override?.override_plate || '');
    setUps(override?.override_total_ups ?? '');
  }, [override?.id]);

  const hasOverride = override?.override_size_w_inch || override?.override_plate || override?.override_total_ups;

  async function saveAll() {
    setTouched(false);
    await onSave({
      override_size_w_inch: w === '' ? null : Number(w),
      override_size_h_inch: h === '' ? null : Number(h),
      override_plate: plate || null,
      override_total_ups: ups === '' ? null : Number(ups),
    });
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '40px 1fr 110px 110px 90px 90px 70px',
      gap: 12, padding: '12px 18px', alignItems: 'center',
      borderBottom: `1px solid ${TOKENS.colors.border}`,
      background: hasOverride ? 'rgba(124,58,237,0.04)' : '#fff',
    }} className="pc-row">
      <div style={{ fontSize: 22 }}>{mp.icon}</div>
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: TOKENS.colors.text }}>{mp.name}</div>
        <code style={{ fontSize: 10, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono }}>{mp.slug}</code>
      </div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, fontWeight: 700, color: TOKENS.colors.textMuted, background: TOKENS.colors.bgPanel2, padding: '5px 8px', borderRadius: 6, textAlign: 'center' }}>
        {mp.size_w_inch} × {mp.size_h_inch}<br />
        <span style={{ color: TOKENS.colors.textDim }}>{mp.plate} · {mp.total_ups}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <input type="number" step="0.01" value={w} onChange={(e) => { setW(e.target.value as any); setTouched(true); }} onBlur={touched ? saveAll : undefined} placeholder={String(mp.size_w_inch)} style={miniInput()} />
        <span style={{ alignSelf: 'center', fontSize: 12, color: TOKENS.colors.textDim }}>×</span>
        <input type="number" step="0.01" value={h} onChange={(e) => { setH(e.target.value as any); setTouched(true); }} onBlur={touched ? saveAll : undefined} placeholder={String(mp.size_h_inch)} style={miniInput()} />
      </div>
      <select value={plate} onChange={(e) => { setPlate(e.target.value); setTouched(true); }} onBlur={touched ? saveAll : undefined} style={miniInput()}>
        <option value="">— inherit —</option>
        {PLATES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <input type="number" min="1" value={ups} onChange={(e) => { setUps(e.target.value as any); setTouched(true); }} onBlur={touched ? saveAll : undefined} placeholder={String(mp.total_ups)} style={miniInput()} />
      <button onClick={onClear} disabled={!hasOverride} style={{
        padding: '6px 10px',
        background: hasOverride ? 'rgba(239,68,68,0.10)' : TOKENS.colors.bgPanel2,
        color: hasOverride ? '#EF4444' : TOKENS.colors.textDim,
        border: `1px solid ${hasOverride ? 'rgba(239,68,68,0.30)' : TOKENS.colors.border}`,
        borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
        cursor: hasOverride ? 'pointer' : 'default',
      }} title="Clear override">✕</button>
    </div>
  );
}

function Header() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, background: TOKENS.colors.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>🛡</div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 800, color: TOKENS.colors.text, letterSpacing: '-0.02em' }}>PrintCalc Admin</span>
        </Link>
        <div style={{ display: 'flex', gap: 22 }}>
          <Link href="/admin" style={navLink()}>Subscribers</Link>
          <Link href="/admin/products" style={navLink()}>Products</Link>
        </div>
      </div>
    </nav>
  );
}

function FullPage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_BODY, color: TOKENS.colors.textMuted, fontWeight: 600 }}>
      {children}
    </div>
  );
}

function miniInput(): React.CSSProperties {
  return {
    width: '100%', minWidth: 0,
    background: '#fff',
    border: `1px solid ${TOKENS.colors.border}`,
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
    outline: 'none',
    color: TOKENS.colors.text,
  };
}
function navLink(): React.CSSProperties {
  return { fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 600, fontFamily: FONT_DISPLAY };
}

function PageStyles() {
  return (
    <style>{`
      input::placeholder, select { color: ${TOKENS.colors.textDim}; }
      input:focus, select:focus { border-color: ${TOKENS.colors.primary} !important; box-shadow: 0 0 0 2px rgba(124,58,237,0.10); }
      .pc-row:hover { background: ${TOKENS.colors.bgCardHover} !important; }
      @media (max-width: 1000px) {
        .pc-head, .pc-row { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}
