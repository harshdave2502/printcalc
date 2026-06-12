'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TOKENS } from '../../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Subscriber's product settings page
// Subscriber sees admin's master_products and customizes display only.
// 🔒 Math fields (size, plate, total_ups) are READ-ONLY here.
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
}

interface Setting {
  id?: string;
  master_product_id: string;
  is_enabled: boolean;
  custom_display_name: string | null;
  custom_description: string | null;
  custom_icon: string | null;
  custom_default_sides: string | null;
  custom_default_color: string | null;
  custom_default_paper_category: string | null;
}

const FONT_DISPLAY = TOKENS.fonts.display;
const FONT_BODY = TOKENS.fonts.body;

export default function SubscriberProductSettingsPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MasterProduct | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { setHasSession(false); setLoading(false); return; }
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
    const [masterRes, settingRes] = await Promise.all([
      supabase.from('master_products').select('*').eq('is_active', true).order('sort_order').order('name'),
      supabase.from('subscriber_product_settings').select('*').eq('subscriber_id', userId),
    ]);
    setProducts((masterRes.data || []) as MasterProduct[]);
    const map: Record<string, Setting> = {};
    (settingRes.data || []).forEach((s: any) => { map[s.master_product_id] = s; });
    setSettings(map);
  }

  async function toggleEnable(mp: MasterProduct) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const existing = settings[mp.id];
    const newEnabled = existing ? !existing.is_enabled : false; // first toggle = disable
    if (existing?.id) {
      await supabase.from('subscriber_product_settings').update({ is_enabled: newEnabled }).eq('id', existing.id);
    } else {
      await supabase.from('subscriber_product_settings').insert({
        subscriber_id: session.user.id,
        master_product_id: mp.id,
        is_enabled: newEnabled,
      });
    }
    await reload(session.user.id);
  }

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (settings[p.id]?.custom_display_name || p.name).toLowerCase().includes(q) ||
        p.slug.includes(q) ||
        (p.group_label || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, settings, search]);

  const grouped = useMemo(() => {
    const map: Record<string, MasterProduct[]> = {};
    filtered.forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, [filtered]);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500 }}>
      <PageStyles />
      <Header />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '100px 32px 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.08)', color: TOKENS.colors.primary, border: `1px solid ${TOKENS.colors.borderStrong}`, padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
            ⚙️ My Products
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 800, color: TOKENS.colors.text, margin: 0, marginBottom: 8, letterSpacing: '-0.025em' }}>
            Customize your catalog
          </h1>
          <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 500, maxWidth: 700 }}>
            Enable / disable products, rename for your market, customize defaults.
            <strong style={{ color: TOKENS.colors.text }}> Size, plate, and total ups are locked</strong> — those drive the price math.
          </p>
        </div>

        {hasSession === false && (
          <div style={card({ padding: 40, textAlign: 'center' })}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
            <p style={{ color: TOKENS.colors.textMuted, marginBottom: 16, fontWeight: 600 }}>Sign in to manage your products</p>
            <button onClick={() => router.push('/login')} style={primaryBtn()}>Sign In</button>
          </div>
        )}

        {hasSession && loading && <LoadingState />}

        {hasSession && !loading && products.length === 0 && <NoMaster />}

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
                  settings={settings}
                  onToggle={toggleEnable}
                  onEdit={(mp) => setEditing(mp)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {editing && (
        <EditModal
          master={editing}
          setting={settings[editing.id]}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/dashboard" style={{ color: TOKENS.colors.textMuted, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Dashboard</Link>
          <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
          <span style={{ fontSize: 14, color: TOKENS.colors.text, fontWeight: 700, fontFamily: FONT_DISPLAY }}>Manage Products</span>
        </div>
        <Link href="/products" style={{ fontSize: 14, color: TOKENS.colors.primary, textDecoration: 'none', fontWeight: 700, fontFamily: FONT_DISPLAY }}>👁 View Catalog →</Link>
      </div>
    </nav>
  );
}

function CategorySection({ category, products, settings, onToggle, onEdit }: {
  category: string;
  products: MasterProduct[];
  settings: Record<string, Setting>;
  onToggle: (mp: MasterProduct) => void;
  onEdit: (mp: MasterProduct) => void;
}) {
  return (
    <section>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 12, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
        {category} <span style={{ color: TOKENS.colors.textDim, fontWeight: 600 }}>· {products.length}</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products.map(p => (
          <ProductRow
            key={p.id}
            mp={p}
            setting={settings[p.id]}
            onToggle={() => onToggle(p)}
            onEdit={() => onEdit(p)}
          />
        ))}
      </div>
    </section>
  );
}

function ProductRow({ mp, setting, onToggle, onEdit }: { mp: MasterProduct; setting?: Setting; onToggle: () => void; onEdit: () => void }) {
  const isEnabled = setting ? setting.is_enabled : true;
  const displayName = setting?.custom_display_name || mp.name;
  const displayIcon = setting?.custom_icon || mp.icon;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '48px 1fr 120px 90px 100px 140px',
      gap: 14, padding: '14px 18px', alignItems: 'center',
      background: '#fff',
      border: `1px solid ${TOKENS.colors.border}`,
      borderRadius: 12,
      opacity: isEnabled ? 1 : 0.55,
      fontFamily: FONT_BODY,
    }} className="pc-row">
      <div style={{ fontSize: 26 }}>{displayIcon}</div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, color: TOKENS.colors.text }}>
          {displayName}
          {setting?.custom_display_name && setting.custom_display_name !== mp.name && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim }}>(was: {mp.name})</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2, fontWeight: 500 }}>
          {mp.group_label || mp.description || '—'}
        </div>
      </div>

      {/* 🔒 LOCKED: Size */}
      <div title="🔒 Locked — admin only" style={{ fontFamily: TOKENS.fonts.mono, fontSize: 12, fontWeight: 700, color: TOKENS.colors.textMuted, background: TOKENS.colors.bgPanel2, border: `1px dashed ${TOKENS.colors.border}`, padding: '5px 9px', borderRadius: 6, textAlign: 'center' }}>
        🔒 {mp.size_w_inch}×{mp.size_h_inch}
      </div>
      {/* 🔒 LOCKED: Plate */}
      <div title="🔒 Locked — admin only" style={{ fontFamily: TOKENS.fonts.mono, fontSize: 11, fontWeight: 700, color: TOKENS.colors.textMuted, background: TOKENS.colors.bgPanel2, border: `1px dashed ${TOKENS.colors.border}`, padding: '5px 8px', borderRadius: 6, textAlign: 'center' }}>
        🔒 {mp.plate}
      </div>
      {/* 🔒 LOCKED: Total Ups */}
      <div title="🔒 Locked — admin only" style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, fontWeight: 800, color: TOKENS.colors.primary, background: 'rgba(124,58,237,0.08)', border: `1px dashed ${TOKENS.colors.borderStrong}`, padding: '5px 10px', borderRadius: 6, textAlign: 'center' }}>
        🔒 {mp.total_ups} ups
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} style={ghostBtn()} title="Customize display">✏️ Edit</button>
        <button
          onClick={onToggle}
          style={{
            ...togBtn(isEnabled),
            minWidth: 60,
          }}
          title={isEnabled ? 'Disable for my shop' : 'Enable for my shop'}
        >
          {isEnabled ? 'ON' : 'OFF'}
        </button>
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

function NoMaster() {
  return (
    <div style={card({ padding: 56, textAlign: 'center' })}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: TOKENS.colors.text, marginBottom: 8 }}>No products in catalog yet</h3>
      <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, fontWeight: 500, marginBottom: 0 }}>
        The admin hasn&apos;t added any products yet. Once they do, they&apos;ll appear here for you to customize.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Edit Modal — subscriber customizes display fields (not math)
// ──────────────────────────────────────────────────────────────────────

function EditModal({ master, setting, onClose, onSaved }: { master: MasterProduct; setting?: Setting; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Setting>({
    master_product_id: master.id,
    is_enabled: setting?.is_enabled ?? true,
    custom_display_name: setting?.custom_display_name || '',
    custom_description: setting?.custom_description || '',
    custom_icon: setting?.custom_icon || '',
    custom_default_sides: setting?.custom_default_sides || '',
    custom_default_color: setting?.custom_default_color || '',
    custom_default_paper_category: setting?.custom_default_paper_category || '',
    id: setting?.id,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Setting>(k: K, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSaving(true);
    const payload = {
      subscriber_id: session.user.id,
      master_product_id: master.id,
      is_enabled: form.is_enabled,
      custom_display_name: form.custom_display_name?.trim() || null,
      custom_description: form.custom_description?.trim() || null,
      custom_icon: form.custom_icon?.trim() || null,
      custom_default_sides: form.custom_default_sides || null,
      custom_default_color: form.custom_default_color || null,
      custom_default_paper_category: form.custom_default_paper_category?.trim() || null,
    };
    if (form.id) {
      await supabase.from('subscriber_product_settings').update(payload).eq('id', form.id);
    } else {
      await supabase.from('subscriber_product_settings').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,14,50,0.45)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, maxWidth: 580, width: '100%', maxHeight: '92vh', overflow: 'auto', boxShadow: TOKENS.shadow.lg, fontFamily: FONT_BODY }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '22px 26px', borderBottom: `1px solid ${TOKENS.colors.border}` }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, margin: 0 }}>
            {master.icon} {master.name}
          </h2>
          <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginTop: 4, fontWeight: 500 }}>
            Customize the display for your shop. Math fields are locked.
          </p>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 🔒 LOCKED — read-only */}
          <div style={{ padding: 14, background: TOKENS.colors.bgPanel2, border: `1px dashed ${TOKENS.colors.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TOKENS.colors.textMuted, marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>🔒 Locked (admin-only)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <ReadOnlyField label="Size (inch)" value={`${master.size_w_inch} × ${master.size_h_inch}`} />
              <ReadOnlyField label="Plate" value={master.plate} />
              <ReadOnlyField label="Total Ups" value={String(master.total_ups)} />
            </div>
          </div>

          <Field label="Display name override">
            <input value={form.custom_display_name || ''} onChange={(e) => set('custom_display_name', e.target.value)} placeholder={master.name} style={inputStyle()} />
          </Field>

          <Field label="Icon override">
            <input value={form.custom_icon || ''} onChange={(e) => set('custom_icon', e.target.value)} maxLength={4} placeholder={master.icon} style={{ ...inputStyle(), width: 100, textAlign: 'center', fontSize: 22 }} />
          </Field>

          <Field label="Description override">
            <textarea value={form.custom_description || ''} onChange={(e) => set('custom_description', e.target.value)} placeholder={master.description || '—'} rows={2} style={{ ...inputStyle(), fontFamily: 'inherit' }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Default sides">
              <select value={form.custom_default_sides || ''} onChange={(e) => set('custom_default_sides', e.target.value)} style={inputStyle()}>
                <option value="">— inherit ({master.default_sides}) —</option>
                <option value="one">One</option>
                <option value="both">Both</option>
              </select>
            </Field>
            <Field label="Default color">
              <select value={form.custom_default_color || ''} onChange={(e) => set('custom_default_color', e.target.value)} style={inputStyle()}>
                <option value="">— inherit ({master.default_color}) —</option>
                <option value="four_color">Four Color CMYK</option>
                <option value="two_color">Two Color</option>
                <option value="single_color">Single Color</option>
                <option value="bw">Black & White</option>
              </select>
            </Field>
          </div>

          <Field label="Default paper category">
            <input value={form.custom_default_paper_category || ''} onChange={(e) => set('custom_default_paper_category', e.target.value)} placeholder={master.default_paper_category || '— inherit —'} style={inputStyle()} />
          </Field>

          <Field label="Enabled for my shop?">
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => set('is_enabled', true)} style={togBtn(form.is_enabled === true)}>ON</button>
              <button onClick={() => set('is_enabled', false)} style={togBtn(form.is_enabled === false)}>OFF</button>
            </div>
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button onClick={onClose} style={ghostBtn()}>Cancel</button>
            <button onClick={submit} disabled={saving} style={{ ...primaryBtn(), opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: TOKENS.colors.textDim, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: TOKENS.fonts.mono, fontSize: 14, fontWeight: 800, color: TOKENS.colors.primary }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: TOKENS.colors.text, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function card(extra: React.CSSProperties = {}): React.CSSProperties {
  return { background: '#fff', border: `1px solid ${TOKENS.colors.border}`, borderRadius: 18, padding: 24, ...extra };
}
function inputStyle(): React.CSSProperties {
  return {
    width: '100%', background: '#fff', color: TOKENS.colors.text,
    border: `1.5px solid ${TOKENS.colors.border}`, borderRadius: 9,
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
