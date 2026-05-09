'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../supabase';
import { TEMPLATES, getTemplate, ProductTemplate, TemplateField } from '../../../lib/templates';
import { TOKENS } from '../../../lib/design';

// ─────────────────────────────────────────────────────────────────────────
// Per-product editor — rename, toggle fields, add custom fields with
// price modifiers. Saves to subscriber_products + subscriber_product_fields
// + subscriber_product_custom_fields.
// ─────────────────────────────────────────────────────────────────────────

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
  default_color: string;
  default_sides: string;
}

interface FieldOverride {
  id?: string;
  field_key: string;
  is_enabled: boolean;
  custom_label: string | null;
  custom_options: any;
  sort_order: number;
}

interface CustomField {
  id?: string;
  field_key: string;
  label: string;
  field_type: string;
  options: any;
  is_required: boolean;
  price_impact: string;
  price_value: number;
  help_text: string | null;
  sort_order: number;
  _isNew?: boolean;
}

export default function ProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [product, setProduct] = useState<SubscriberProduct | null>(null);
  const [template, setTemplate] = useState<ProductTemplate | null>(null);
  const [overrides, setOverrides] = useState<Record<string, FieldOverride>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

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

      const { data: prod } = await supabase
        .from('subscriber_products')
        .select('*')
        .eq('id', id)
        .eq('subscriber_id', session.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (!prod) { setLoading(false); return; }
      setProduct(prod);
      setTemplate(getTemplate(prod.template_id) || null);

      const [{ data: ovs }, { data: cfs }] = await Promise.all([
        supabase.from('subscriber_product_fields').select('*').eq('subscriber_product_id', id),
        supabase.from('subscriber_product_custom_fields').select('*').eq('subscriber_product_id', id).order('sort_order'),
      ]);
      if (!mounted) return;
      const ovMap: Record<string, FieldOverride> = {};
      (ovs || []).forEach((o: any) => { ovMap[o.field_key] = o; });
      setOverrides(ovMap);
      setCustomFields(cfs || []);

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  const fieldsByCategory = useMemo(() => {
    if (!template) return { required: [] as TemplateField[], optional: [] as TemplateField[] };
    return {
      required: template.fields.filter(f => f.required),
      optional: template.fields.filter(f => f.optional),
    };
  }, [template]);

  function setProductField<K extends keyof SubscriberProduct>(key: K, value: SubscriberProduct[K]) {
    setProduct(p => p ? { ...p, [key]: value } : p);
  }

  function setOverride(fieldKey: string, patch: Partial<FieldOverride>) {
    setOverrides(prev => {
      const existing = prev[fieldKey];
      return {
        ...prev,
        [fieldKey]: {
          field_key: fieldKey,
          is_enabled: existing?.is_enabled ?? false,
          custom_label: existing?.custom_label ?? null,
          custom_options: existing?.custom_options ?? null,
          sort_order: existing?.sort_order ?? 0,
          ...patch,
        },
      };
    });
  }

  function addCustomField() {
    const newField: CustomField = {
      field_key: `custom_${Date.now()}`,
      label: 'New Field',
      field_type: 'text',
      options: null,
      is_required: false,
      price_impact: 'none',
      price_value: 0,
      help_text: '',
      sort_order: customFields.length,
      _isNew: true,
    };
    setCustomFields([...customFields, newField]);
  }

  function updateCustomField(idx: number, patch: Partial<CustomField>) {
    setCustomFields(cf => cf.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }

  function removeCustomField(idx: number) {
    setCustomFields(cf => cf.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!product) return;
    setSaving(true);
    try {
      // 1. Update product
      const { error: prodErr } = await supabase
        .from('subscriber_products')
        .update({
          display_name: product.display_name,
          slug: product.slug,
          description: product.description,
          icon: product.icon,
          is_enabled: product.is_enabled,
          default_size_label: product.default_size_label,
          default_size_w_inch: product.default_size_w_inch,
          default_size_h_inch: product.default_size_h_inch,
          default_color: product.default_color,
          default_sides: product.default_sides,
        })
        .eq('id', product.id);
      if (prodErr) throw prodErr;

      // 2. Upsert overrides — one row per touched optional field
      const ovRows = Object.values(overrides).map(o => ({
        subscriber_product_id: product.id,
        field_key: o.field_key,
        is_enabled: o.is_enabled,
        custom_label: o.custom_label,
        custom_options: o.custom_options,
        sort_order: o.sort_order,
      }));
      if (ovRows.length > 0) {
        // Delete existing overrides then re-insert (simple, idempotent)
        await supabase.from('subscriber_product_fields').delete().eq('subscriber_product_id', product.id);
        const { error: ovErr } = await supabase.from('subscriber_product_fields').insert(ovRows);
        if (ovErr) throw ovErr;
      } else {
        await supabase.from('subscriber_product_fields').delete().eq('subscriber_product_id', product.id);
      }

      // 3. Replace custom fields
      await supabase.from('subscriber_product_custom_fields').delete().eq('subscriber_product_id', product.id);
      if (customFields.length > 0) {
        const cfRows = customFields.map((cf, i) => ({
          subscriber_product_id: product.id,
          field_key: cf.field_key,
          label: cf.label,
          field_type: cf.field_type,
          options: cf.options,
          is_required: cf.is_required,
          price_impact: cf.price_impact,
          price_value: Number(cf.price_value) || 0,
          help_text: cf.help_text,
          sort_order: i,
        }));
        const { error: cfErr } = await supabase.from('subscriber_product_custom_fields').insert(cfRows);
        if (cfErr) throw cfErr;
      }

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) return <FullPageLoading />;
  if (hasSession === false) return <NeedSignIn />;
  if (!product || !template) return <NotFound />;

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body, position: 'relative', overflow: 'hidden' }}>
      <PageStyles />
      <Ambient accent={template.accent} />

      <Header product={product} template={template} saving={saving} savedFlash={savedFlash} onSave={save} onPreview={() => window.open(`/products/${product.slug}`, '_blank')} />

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '110px 32px 80px', position: 'relative', zIndex: 1 }}>
        <Hero product={product} template={template} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 32 }}>

          {/* ── Section 1: Product details ─────────────────────────────── */}
          <SectionCard title="Product Details" subtitle="Visible to customers" accent={template.accent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="pc-2col">
              <Field label="Display name">
                <input value={product.display_name} onChange={(e) => setProductField('display_name', e.target.value)} style={inputStyle()} />
              </Field>
              <Field label="URL slug" hint="Used in links — letters, numbers, hyphens only">
                <input value={product.slug} onChange={(e) => setProductField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} style={inputStyle()} />
              </Field>
              <Field label="Icon">
                <input value={product.icon || ''} onChange={(e) => setProductField('icon', e.target.value)} maxLength={4} style={{ ...inputStyle(), width: 100 }} />
              </Field>
              <Field label="Enabled" hint="When off, this product is hidden from customers">
                <ToggleSwitch checked={product.is_enabled} onChange={(v) => setProductField('is_enabled', v)} accent={template.accent} />
              </Field>
            </div>
            <Field label="Short description">
              <input value={product.description || ''} onChange={(e) => setProductField('description', e.target.value)} placeholder="Shown on the product card" style={inputStyle()} />
            </Field>
          </SectionCard>

          {/* ── Section 2: Required fields (locked) ─────────────────────── */}
          <SectionCard title="Required Fields" subtitle="The math needs these — cannot be disabled" accent={template.accent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fieldsByCategory.required.map((f) => (
                <RequiredFieldRow key={f.key} field={f} />
              ))}
            </div>
          </SectionCard>

          {/* ── Section 3: Optional fields (toggle on/off) ──────────────── */}
          <SectionCard title="Optional Fields" subtitle="Toggle on what you offer. Customers will only see what's enabled." accent={template.accent}>
            {fieldsByCategory.optional.length === 0 ? (
              <p style={{ color: TOKENS.colors.textDim, fontSize: 13, margin: 0 }}>This template has no optional fields.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fieldsByCategory.optional.map((f) => (
                  <OptionalFieldRow
                    key={f.key}
                    field={f}
                    override={overrides[f.key]}
                    onToggle={(v) => setOverride(f.key, { is_enabled: v })}
                    onLabelChange={(v) => setOverride(f.key, { custom_label: v || null })}
                    accent={template.accent}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Section 4: Custom fields (printer-added) ────────────────── */}
          <SectionCard
            title="Custom Fields"
            subtitle="Add your own fields — they can affect price (flat, per-unit, or %)"
            accent={template.accent}
            action={
              <button onClick={addCustomField} style={primaryButton(template.accent)}>➕ Add Field</button>
            }
          >
            {customFields.length === 0 ? (
              <p style={{ color: TOKENS.colors.textDim, fontSize: 13, margin: 0 }}>No custom fields yet. Add one to capture extras like &quot;NFC chip type&quot; or &quot;Embossing style&quot; with custom pricing.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {customFields.map((cf, i) => (
                  <CustomFieldEditor key={cf.field_key} field={cf} onChange={(patch) => updateCustomField(i, patch)} onRemove={() => removeCustomField(i)} accent={template.accent} />
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Save bar ────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 0', position: 'sticky', bottom: 0, background: 'linear-gradient(to top, rgba(10,8,21,0.95) 70%, transparent)', backdropFilter: 'blur(8px)' }}>
            <Link href="/dashboard/products" style={ghostButton()}>← Back to Products</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {savedFlash && <span style={{ fontSize: 13, color: TOKENS.colors.success, fontWeight: 600 }}>✓ Saved</span>}
              <button onClick={save} disabled={saving} style={{ ...primaryButton(template.accent), opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <style>{`@media (max-width: 720px) { .pc-2col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────

function Header({ product, template, saving, savedFlash, onSave, onPreview }: { product: SubscriberProduct; template: ProductTemplate; saving: boolean; savedFlash: boolean; onSave: () => void; onPreview: () => void }) {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(10, 8, 21, 0.85)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '12px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/dashboard/products" style={{ color: TOKENS.colors.textMuted, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>← Products</Link>
          <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{template.icon}</span>
            <span style={{ fontSize: 13, color: TOKENS.colors.textDim }}>{template.label}</span>
            <span style={{ color: TOKENS.colors.textDim }}>›</span>
            <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{product.display_name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {savedFlash && <span style={{ fontSize: 13, color: TOKENS.colors.success, fontWeight: 600 }}>✓ Saved</span>}
          <button onClick={onPreview} style={ghostButton()}>👁️ Preview</button>
          <button onClick={onSave} disabled={saving} style={{ ...primaryButton(template.accent), opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Ambient({ accent }: { accent: string }) {
  return (
    <>
      <div style={{ position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 700, background: `radial-gradient(ellipse, ${accent}25 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function Hero({ product, template }: { product: SubscriberProduct; template: ProductTemplate }) {
  return (
    <div style={{ animation: 'pc-fade-up 0.5s ease both' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${template.accent}1a`, border: `1px solid ${template.accent}55`, borderRadius: 100, padding: '6px 14px', fontSize: 12, color: template.accent, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Editing · {template.label}
      </div>
      <h1 style={{ fontFamily: TOKENS.fonts.display, fontSize: 'clamp(26px, 3.6vw, 36px)', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
        {product.icon} {product.display_name}
      </h1>
    </div>
  );
}

function SectionCard({ title, subtitle, accent, children, action }: { title: string; subtitle?: string; accent: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 22, animation: 'pc-fade-up 0.5s ease both', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, ${accent}00)` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <h3 style={{ fontFamily: TOKENS.fonts.display, fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, margin: 0, marginTop: 4 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ marginLeft: 8, color: TOKENS.colors.textDim, fontWeight: 400, fontSize: 11 }}>· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, accent }: { checked: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: checked ? accent : 'rgba(255,255,255,0.1)',
        border: `1px solid ${checked ? accent : TOKENS.colors.border}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: checked ? 24 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function RequiredFieldRow({ field }: { field: TemplateField }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.md }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.success, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 4 }}>REQUIRED</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{field.label}</span>
        {field.helpText && <span style={{ fontSize: 12, color: TOKENS.colors.textDim }}>· {field.helpText}</span>}
      </div>
      <span style={{ fontSize: 11, color: TOKENS.colors.textDim, fontFamily: TOKENS.fonts.mono }}>{field.type}</span>
    </div>
  );
}

function OptionalFieldRow({ field, override, onToggle, onLabelChange, accent }: { field: TemplateField; override?: FieldOverride; onToggle: (v: boolean) => void; onLabelChange: (v: string) => void; accent: string }) {
  const enabled = override?.is_enabled === true;
  const [editLabel, setEditLabel] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.md, opacity: enabled ? 1 : 0.7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {editLabel ? (
            <input
              value={override?.custom_label ?? field.label}
              onChange={(e) => onLabelChange(e.target.value)}
              onBlur={() => setEditLabel(false)}
              autoFocus
              style={{ ...inputStyle(), padding: '4px 8px', fontSize: 14, width: 200 }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
              {override?.custom_label || field.label}
              {override?.custom_label && <span style={{ fontSize: 11, color: TOKENS.colors.textDim, marginLeft: 6 }}>(was: {field.label})</span>}
            </span>
          )}
          {field.helpText && <span style={{ fontSize: 12, color: TOKENS.colors.textDim }}>· {field.helpText}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {enabled && (
            <button onClick={() => setEditLabel(!editLabel)} style={{ ...iconButtonStyle(TOKENS.colors.accent), fontSize: 12 }}>
              {editLabel ? '✓' : '✏️'}
            </button>
          )}
          <ToggleSwitch checked={enabled} onChange={onToggle} accent={accent} />
        </div>
      </div>
    </div>
  );
}

function CustomFieldEditor({ field, onChange, onRemove, accent }: { field: CustomField; onChange: (patch: Partial<CustomField>) => void; onRemove: () => void; accent: string }) {
  const [showOpts, setShowOpts] = useState(false);
  return (
    <div style={{ background: 'rgba(124,58,237,0.05)', border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.lg, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Custom Field</div>
        <button onClick={onRemove} style={{ ...iconButtonStyle('#EF4444'), fontSize: 12 }}>🗑️</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pc-2col">
        <Field label="Label" hint="Shown to customers">
          <input value={field.label} onChange={(e) => onChange({ label: e.target.value })} style={inputStyle()} />
        </Field>
        <Field label="Type">
          <select value={field.field_type} onChange={(e) => onChange({ field_type: e.target.value })} style={inputStyle()}>
            <option value="text">Text input</option>
            <option value="number">Number input</option>
            <option value="dropdown">Dropdown</option>
            <option value="checkbox">Checkbox (Yes/No)</option>
          </select>
        </Field>
        <Field label="Help text" hint="Optional hint shown below the field">
          <input value={field.help_text || ''} onChange={(e) => onChange({ help_text: e.target.value })} style={inputStyle()} />
        </Field>
        <Field label="Required?">
          <ToggleSwitch checked={field.is_required} onChange={(v) => onChange({ is_required: v })} accent={accent} />
        </Field>
      </div>

      {field.field_type === 'dropdown' && (
        <Field label="Options (one per line — &quot;label | price_delta&quot; or just &quot;label&quot;)">
          <textarea
            value={Array.isArray(field.options)
              ? field.options.map((o: any) => `${o.label}${o.price_delta ? ' | ' + o.price_delta : ''}`).join('\n')
              : ''}
            onChange={(e) => {
              const lines = e.target.value.split('\n').filter(l => l.trim());
              const opts = lines.map(line => {
                const [label, delta] = line.split('|').map(s => s.trim());
                return { value: label.toLowerCase().replace(/\s+/g, '_'), label, price_delta: Number(delta) || 0 };
              });
              onChange({ options: opts });
            }}
            placeholder={`None\nMatte | 50\nGloss | 50\nPremium | 120`}
            rows={4}
            style={{ ...inputStyle(), fontFamily: TOKENS.fonts.mono, fontSize: 13 }}
          />
        </Field>
      )}

      <div style={{ marginTop: 12, padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: TOKENS.radius.md, border: `1px solid ${TOKENS.colors.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Price impact</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PriceImpactChip active={field.price_impact === 'none'} onClick={() => onChange({ price_impact: 'none', price_value: 0 })} label="No price effect" />
          <PriceImpactChip active={field.price_impact === 'flat'} onClick={() => onChange({ price_impact: 'flat' })} label="Flat fee" />
          <PriceImpactChip active={field.price_impact === 'per_unit'} onClick={() => onChange({ price_impact: 'per_unit' })} label="Per piece" />
          <PriceImpactChip active={field.price_impact === 'percent'} onClick={() => onChange({ price_impact: 'percent' })} label="% of subtotal" />
        </div>
        {field.price_impact !== 'none' && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              value={field.price_value || 0}
              onChange={(e) => onChange({ price_value: Number(e.target.value) })}
              placeholder="0"
              style={{ ...inputStyle(), maxWidth: 160 }}
            />
            <span style={{ fontSize: 13, color: TOKENS.colors.textMuted }}>
              {field.price_impact === 'flat' && 'flat fee added to subtotal'}
              {field.price_impact === 'per_unit' && 'per piece (× quantity)'}
              {field.price_impact === 'percent' && '% of subtotal'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceImpactChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      borderRadius: TOKENS.radius.full,
      border: `1px solid ${active ? TOKENS.colors.primary : TOKENS.colors.border}`,
      background: active ? `${TOKENS.colors.primary}22` : 'transparent',
      color: active ? '#fff' : TOKENS.colors.textMuted,
      fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.18s ease',
    }}>{label}</button>
  );
}

function FullPageLoading() {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.textMuted, fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${TOKENS.colors.border}`, borderTopColor: TOKENS.colors.primary, animation: 'pc-spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 14 }}>Loading product…</div>
      </div>
    </div>
  );
}

function NeedSignIn() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 40, textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>Sign in required</h2>
        <button onClick={() => router.push('/login')} style={primaryButton(TOKENS.colors.primary)}>Sign In</button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TOKENS.fonts.body, color: TOKENS.colors.text }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 40, textAlign: 'center', maxWidth: 460 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>Product not found</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>This product was deleted or doesn&apos;t belong to you.</p>
        <Link href="/dashboard/products" style={primaryButton(TOKENS.colors.primary)}>← Back to Products</Link>
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
    transition: 'border-color 0.18s ease',
  };
}

function primaryButton(accent: string): React.CSSProperties {
  return {
    padding: '10px 20px',
    background: `linear-gradient(135deg, ${accent} 0%, ${TOKENS.colors.pink} 100%)`,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: TOKENS.fonts.display,
    borderRadius: TOKENS.radius.md,
    border: 'none',
    cursor: 'pointer',
    boxShadow: `0 4px 14px ${accent}33`,
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function ghostButton(): React.CSSProperties {
  return {
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: TOKENS.fonts.body,
    borderRadius: TOKENS.radius.md,
    border: `1px solid ${TOKENS.colors.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function iconButtonStyle(color: string): React.CSSProperties {
  return {
    width: 30, height: 30,
    background: `${color}1a`,
    border: `1px solid ${color}55`,
    color,
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.18s ease',
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
      button:active:not(:disabled) { transform: translateY(0.5px); }
    `}</style>
  );
}
