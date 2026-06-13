'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import { TEMPLATES, getTemplate, ProductTemplate, TemplateField } from '../../lib/templates';
import { TOKENS } from '../../lib/design';
import { formatPrice } from '../../lib/countries';
import { computePrice } from '../../lib/calc';
import { FINAL_SIZES } from '../../lib/sizes';

// ─────────────────────────────────────────────────────────────────────────
// Per-product calculator — renders only fields relevant to this product's
// template. Each template (card, sheet, folded, booklet, etc.) has its own
// optimized field list and calculation logic.
// ─────────────────────────────────────────────────────────────────────────

interface SubscriberProduct {
  id: string;
  template_id: string;
  slug: string;
  display_name: string;
  description: string;
  icon: string;
  default_size_label: string | null;
  default_size_w_inch: number | null;
  default_size_h_inch: number | null;
  default_paper_label: string | null;
  default_color: string;
  default_sides: string;
  default_qty: number | null;
  // Per-product allowed lists (Phase 1)
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

interface SubscriberInfo { business_name: string; email: string; }
interface Customer { id: string; name: string; email: string; phone: string; company: string; }
interface PaperStock { id: string; label: string; gsm: number; rate_per_kg: number; category: string; }
interface PrintingRate { id: string; plate_name: string; color_option: string; fixed_charge: number; per_1000_impression: number; }
interface FieldOverride { field_key: string; is_enabled: boolean; custom_label: string | null; custom_options: any; }
interface CustomField { field_key: string; label: string; field_type: string; options: any; price_impact: string; price_value: number; help_text: string | null; }

// Calc constants moved to ../../lib/calc.ts (single source of truth)

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export default function ProductCalculator() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  // Auth + product
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<SubscriberProduct | null>(null);
  const [template, setTemplate] = useState<ProductTemplate | null>(null);

  // Reference data
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([]);
  const [paperCategories, setPaperCategories] = useState<Array<{ category: string; rate_per_kg: number }>>([]);
  const [printingRates, setPrintingRates] = useState<PrintingRate[]>([]);
  const [bindings, setBindings] = useState<Array<{ id: string; name: string }>>([]);
  const [lams, setLams] = useState<Array<{ id: string; name: string }>>([]);
  const [uvs, setUvs] = useState<Array<{ id: string; name: string }>>([]);
  const [pastings, setPastings] = useState<Array<{ id: string; name: string }>>([]);
  const [overrideWastage, setOverrideWastage] = useState(false);
  const [fieldOverrides, setFieldOverrides] = useState<FieldOverride[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Subscriber settings
  const [currency, setCurrency] = useState('$');
  const [markupPercent, setMarkupPercent] = useState(25);
  const [taxPercent, setTaxPercent] = useState(0);
  const [subscriberInfo, setSubscriberInfo] = useState<SubscriberInfo>({ business_name: '', email: '' });
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Save / Order modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [savedFlash, setSavedFlash] = useState('');

  // Form state — flexible record keyed by field_key
  const [values, setValues] = useState<Record<string, any>>({});

  // ─── Auth + load everything ────────────────────────────────────────────
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
      const userId = session.user.id;

      const [prodRes, paperRes, catRes, rateRes, subRes, custRes, bindRes, lamRes, uvRes, pastRes] = await Promise.all([
        supabase.from('subscriber_products').select('*').eq('subscriber_id', userId).eq('slug', slug).maybeSingle(),
        supabase.from('paper_stocks').select('id, label, gsm, rate_per_kg, category').eq('subscriber_id', userId).order('sort_order'),
        supabase.from('paper_categories').select('category, rate_per_kg').eq('subscriber_id', userId),
        supabase.from('printing_rates').select('id, plate_name, color_option, fixed_charge, per_1000_impression').eq('subscriber_id', userId).order('sort_order'),
        supabase.from('subscribers').select('currency_symbol, markup_percent, tax_percent, business_name, email').eq('id', userId).maybeSingle(),
        supabase.from('customers').select('id, name, email, phone, company').eq('subscriber_id', userId).order('name'),
        supabase.from('binding_rates').select('id, binding_name').eq('subscriber_id', userId).order('sort_order'),
        supabase.from('lamination_rates').select('id, lam_name').eq('subscriber_id', userId).order('sort_order'),
        supabase.from('uv_rates').select('id, uv_name').eq('subscriber_id', userId).order('sort_order'),
        supabase.from('pasting_rates').select('id, pasting_name').eq('subscriber_id', userId).order('sort_order'),
      ]);

      if (!mounted) return;

      const prod = prodRes.data as SubscriberProduct | null;
      if (!prod) {
        setLoading(false);
        return;
      }

      setProduct(prod);
      setTemplate(getTemplate(prod.template_id) || null);
      // Filter paper stocks to those whose category is in allowed_paper_categories
      const allowedCats = prod.allowed_paper_categories || [];
      const filteredStocks = allowedCats.length > 0
        ? (paperRes.data || []).filter((s: any) => allowedCats.includes(s.category))
        : (paperRes.data || []);
      setPaperStocks(filteredStocks);

      // Map rate-table rows for finishing options
      const mapRate = (rows: any[], nameField: string) =>
        (rows || []).map((r: any) => ({ id: r.id, name: r[nameField] }));
      setBindings(mapRate(bindRes.data || [], 'binding_name'));
      setLams(mapRate(lamRes.data || [], 'lam_name'));
      setUvs(mapRate(uvRes.data || [], 'uv_name'));
      setPastings(mapRate(pastRes.data || [], 'pasting_name'));
      setPaperCategories((catRes.data || []) as Array<{ category: string; rate_per_kg: number }>);
      setPrintingRates(rateRes.data || []);
      setCustomers(custRes.data || []);
      if (subRes.data) {
        setCurrency(subRes.data.currency_symbol || '$');
        setMarkupPercent(Number(subRes.data.markup_percent) || 25);
        setTaxPercent(Number(subRes.data.tax_percent) || 0);
        setSubscriberInfo({ business_name: subRes.data.business_name || '', email: subRes.data.email || '' });
      }

      const [overridesRes, customRes] = await Promise.all([
        supabase.from('subscriber_product_fields').select('*').eq('subscriber_product_id', prod.id),
        supabase.from('subscriber_product_custom_fields').select('*').eq('subscriber_product_id', prod.id).order('sort_order'),
      ]);
      if (!mounted) return;
      setFieldOverrides(overridesRes.data || []);
      setCustomFields(customRes.data || []);

      // Initialize default values from product's per-product config
      const initVals: Record<string, any> = {
        quantity: prod.default_qty || 500,
        size: prod.default_size_w_inch
          ? { w: Number(prod.default_size_w_inch), h: Number(prod.default_size_h_inch), label: prod.default_size_label }
          : null,
        sides: prod.default_sides || 'one',
        color: prod.default_color || 'four_color',
      };
      // If there's a default paper category, pre-pick the first stock from that category
      if (prod.default_paper_category && paperRes.data) {
        const candidates = paperRes.data.filter((s: any) =>
          s.category === prod.default_paper_category &&
          (!prod.default_gsm || s.gsm === prod.default_gsm),
        );
        if (candidates.length > 0) initVals.paper = candidates[0].id;
      }
      setValues(initVals);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [slug]);

  // ─── Build active field list (template + overrides + per-product allowed lists) ───
  const activeFields = useMemo(() => {
    if (!template) return [] as TemplateField[];
    const overrideMap: Record<string, FieldOverride> = {};
    fieldOverrides.forEach((o) => { overrideMap[o.field_key] = o; });

    // Per-product allowed lists
    const allowedColors = product?.allowed_colors || [];
    const allowedSides = product?.allowed_sides || [];
    const allowedSizeIds = product?.allowed_size_ids || [];
    const allowCustom = !!product?.allow_custom_size;
    const allowedBindingIds = product?.allowed_binding_ids || [];
    const allowedLamIds = product?.allowed_lamination_ids || [];
    const allowedUvIds = product?.allowed_uv_ids || [];
    const allowedPastingIds = product?.allowed_pasting_ids || [];

    // Build size options from allowed_size_ids (+ optional custom)
    const sizeOptions: any[] = [];
    if (allowedSizeIds.length > 0) {
      allowedSizeIds.forEach((id) => {
        const s = FINAL_SIZES.find((x) => x.id === id);
        if (s) sizeOptions.push({ value: id, label: s.label, w: s.w, h: s.h });
      });
    }
    if (allowCustom) sizeOptions.push({ value: 'custom', label: 'Custom W × H', w: 0, h: 0 });

    return template.fields.filter((f) => {
      const ov = overrideMap[f.key];
      if (ov && ov.is_enabled === false) return false;

      // Hide finishing fields if subscriber has no allowed rows in that category
      if (f.key === 'binding' && allowedBindingIds.length === 0) return false;
      if (f.key === 'lamination' && allowedLamIds.length === 0) return false;
      if (f.key === 'uv' && allowedUvIds.length === 0) return false;
      if (f.key === 'pasting' && allowedPastingIds.length === 0) return false;

      // Optional fields default to OFF unless explicitly enabled
      if (f.optional) return ov?.is_enabled === true;
      return true;
    }).map((f) => {
      const ov = overrideMap[f.key];
      let defaultOptions = ov?.custom_options || f.defaultOptions;

      // SIZE — replace with this product's allowed sizes (+ custom if enabled)
      if (f.key === 'size' && sizeOptions.length > 0) {
        defaultOptions = sizeOptions;
      }
      // COLOR — filter to allowed_colors
      if (f.key === 'color' && allowedColors.length > 0 && Array.isArray(defaultOptions)) {
        defaultOptions = (defaultOptions as any[]).filter((o) => allowedColors.includes(o.value));
      }
      // SIDES — filter to allowed_sides
      if (f.key === 'sides' && allowedSides.length > 0 && Array.isArray(defaultOptions)) {
        defaultOptions = (defaultOptions as any[]).filter((o) => allowedSides.includes(o.value));
      }
      // FINISHING — build from product's allowed_*_ids
      if (f.key === 'binding' && allowedBindingIds.length > 0) {
        defaultOptions = [
          { value: 'none', label: 'No binding' },
          ...bindings.filter((b) => allowedBindingIds.includes(b.id)).map((b) => ({ value: b.id, label: b.name })),
        ];
      }
      if (f.key === 'lamination' && allowedLamIds.length > 0) {
        defaultOptions = [
          { value: 'none', label: 'No lamination' },
          ...lams.filter((b) => allowedLamIds.includes(b.id)).map((b) => ({ value: b.id, label: b.name })),
        ];
      }
      if (f.key === 'uv' && allowedUvIds.length > 0) {
        defaultOptions = [
          { value: 'none', label: 'No UV' },
          ...uvs.filter((b) => allowedUvIds.includes(b.id)).map((b) => ({ value: b.id, label: b.name })),
        ];
      }
      if (f.key === 'pasting' && allowedPastingIds.length > 0) {
        defaultOptions = [
          { value: 'none', label: 'No pasting' },
          ...pastings.filter((b) => allowedPastingIds.includes(b.id)).map((b) => ({ value: b.id, label: b.name })),
        ];
      }

      return {
        ...f,
        label: ov?.custom_label || f.label,
        defaultOptions,
      };
    });
  }, [template, fieldOverrides, product, bindings, lams, uvs, pastings]);

  // ─── Calculate price (uses shared lib/calc.ts) ──────────────────────────
  const calc = useMemo(() => {
    if (!product || !template) return null;
    const qty = Number(values.quantity) || 0;
    const size = values.size as { w: number; h: number } | null;
    const paperId = values.paper as string | null;
    const sidesVal = (values.sides as string) === 'both' ? 'both' : 'one';
    const colorVal = (values.color as string) || 'four_color';

    const stock = paperStocks.find((p) => p.id === paperId);
    if (!qty || !size || !size.w || !size.h || !stock) {
      return { ready: false } as const;
    }

    // Plate + ups are auto-derived from final size via SIZE_PLATE_MAP inside computePrice.
    const r = computePrice({
      qty,
      w: size.w,
      h: size.h,
      stock,
      paperCategories,
      printingRates,
      sides: sidesVal as 'one' | 'both',
      color: colorVal as any,
      markupPercent,
      taxPercent,
    });
    if (!r.ready) return { ready: false } as const;

    // Custom field price impact — added on top of core calc
    let extraCost = 0;
    customFields.forEach((cf) => {
      const v = values[`custom_${cf.field_key}`];
      if (!v) return;
      if (cf.price_impact === 'flat') extraCost += Number(cf.price_value);
      else if (cf.price_impact === 'per_unit') extraCost += Number(cf.price_value) * qty;
      else if (cf.price_impact === 'percent') extraCost += (r.paperCost + r.printCost) * (Number(cf.price_value) / 100);
    });
    const subtotal = r.subtotal + extraCost;
    const markupAmt = subtotal * (markupPercent / 100);
    const withMarkup = subtotal + markupAmt;
    const tax = withMarkup * (taxPercent / 100);
    const total = withMarkup + tax;
    const perUnit = qty > 0 ? total / qty : 0;

    return {
      ready: true,
      qty, ws: r.ws, ups: r.ups, imp: r.imp, plateKey: r.plateKey,
      useWorkAndTurn: r.useWorkAndTurn, useDoublePlate: r.useDoublePlate,
      paperCost: r.paperCost, printCost: r.printCost, extraCost,
      printBreakdown: r.printBreakdown,
      // Custom-size fit info (Phase 2)
      fromMap: r.fromMap,
      orientation: r.orientation,
      wastagePercent: r.wastagePercent,
      hasHighWastage: r.hasHighWastage,
      warnings: r.warnings,
      suggestions: r.suggestions,
      wastageExplanation: r.wastageExplanation,
      subtotal, withMarkup, tax, total, perUnit,
    } as const;
  }, [product, template, values, paperStocks, paperCategories, printingRates, customFields, markupPercent, taxPercent]);

  function setVal(key: string, v: any) {
    setValues((prev) => ({ ...prev, [key]: v }));
    // Wastage override is per-size — reset it whenever inputs that affect fit change.
    if (key === 'size' || key === 'sides' || key === 'paper') setOverrideWastage(false);
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return <FullPageLoading />;
  }

  if (hasSession === false) {
    return <SignInRedirect onLogin={() => router.push('/login')} />;
  }

  if (!product || !template) {
    return <NotFound slug={slug} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, color: TOKENS.colors.text, fontFamily: TOKENS.fonts.body, position: 'relative', overflow: 'hidden' }}>
      <PageStyles />
      <AmbientBg accent={template.accent} />

      <Header product={product} template={template} />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '110px 32px 60px', position: 'relative', zIndex: 1 }}>
        <Hero product={product} template={template} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 32, marginTop: 32, alignItems: 'start' }} className="pc-grid">
          <FormPanel
            template={template}
            activeFields={activeFields}
            customFields={customFields}
            values={values}
            setVal={setVal}
            paperStocks={paperStocks}
          />
          <PricePanel
            calc={calc}
            currency={currency}
            product={product}
            template={template}
            values={values}
            overrideWastage={overrideWastage}
            setOverrideWastage={setOverrideWastage}
            onApplySuggestion={(s) => setVal('size', { key: s.id, label: s.label, w: s.w, h: s.h })}
            onSaveQuote={() => calc?.ready && setShowSaveModal(true)}
            onDownloadPdf={() => calc?.ready && setShowPrintView(true)}
            onConvertToOrder={() => calc?.ready && setShowOrderModal(true)}
          />
        </div>

        {savedFlash && <Toast text={savedFlash} />}
      </main>

      {showSaveModal && calc?.ready && (
        <SaveQuoteModal
          calc={calc}
          values={values}
          product={product}
          template={template}
          customers={customers}
          paperStocks={paperStocks}
          markupPercent={markupPercent}
          taxPercent={taxPercent}
          currency={currency}
          onClose={() => setShowSaveModal(false)}
          onSaved={(msg) => { setShowSaveModal(false); setSavedFlash(msg); setTimeout(() => setSavedFlash(''), 3500); }}
        />
      )}

      {showOrderModal && calc?.ready && (
        <ConvertToOrderModal
          calc={calc}
          values={values}
          product={product}
          template={template}
          customers={customers}
          paperStocks={paperStocks}
          markupPercent={markupPercent}
          taxPercent={taxPercent}
          currency={currency}
          onClose={() => setShowOrderModal(false)}
          onSaved={(msg) => { setShowOrderModal(false); setSavedFlash(msg); setTimeout(() => setSavedFlash(''), 3500); }}
        />
      )}

      {showPrintView && calc?.ready && (
        <PrintView
          calc={calc}
          values={values}
          product={product}
          template={template}
          subscriberInfo={subscriberInfo}
          paperStocks={paperStocks}
          markupPercent={markupPercent}
          taxPercent={taxPercent}
          currency={currency}
          onClose={() => setShowPrintView(false)}
        />
      )}

      <style>{`
        @media (max-width: 980px) {
          .pc-grid { grid-template-columns: 1fr !important; }
        }
        @media print {
          body > *:not(.pc-print-root) { display: none !important; }
          .pc-print-root { position: static !important; background: #fff !important; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────────────────────────────────

function Header({ product, template }: { product: SubscriberProduct; template: ProductTemplate }) {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${TOKENS.colors.border}`, padding: '14px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: TOKENS.colors.textMuted, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            ← All Products
          </Link>
          <div style={{ width: 1, height: 20, background: TOKENS.colors.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{template.icon}</span>
            <span style={{ fontSize: 14, color: TOKENS.colors.textDim }}>{template.label}</span>
            <span style={{ color: TOKENS.colors.textDim }}>›</span>
            <span style={{ fontSize: 14, color: '#1A1330', fontWeight: 600 }}>{product.display_name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href={`/quote/${product.slug}`} style={{ fontSize: 13, color: TOKENS.colors.accent, textDecoration: 'none', fontWeight: 500, padding: '6px 12px', border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: 8 }}>🚀 Quick Quote View</Link>
          <Link href="/dashboard" style={{ fontSize: 14, color: TOKENS.colors.textMuted, textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
          <Link href={`/dashboard/products/${product.id}`} style={{ fontSize: 13, color: TOKENS.colors.accent, textDecoration: 'none', fontWeight: 500 }}>⚙️ Customize</Link>
        </div>
      </div>
    </nav>
  );
}

function AmbientBg({ accent }: { accent: string }) {
  return (
    <>
      <div style={{ position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 700, background: `radial-gradient(ellipse, ${accent}14 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(124,58,237,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none', zIndex: 0 }} />
    </>
  );
}

function Hero({ product, template }: { product: SubscriberProduct; template: ProductTemplate }) {
  return (
    <div style={{ animation: 'pc-fade-up 0.5s ease both' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${template.accent}1a`, border: `1px solid ${template.accent}55`, borderRadius: 100, padding: '6px 14px', fontSize: 12, color: template.accent, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {template.icon} {template.label} Calculator
      </div>
      <h1 style={{ fontFamily: TOKENS.fonts.display, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, marginBottom: 8 }}>
        {product.icon} {product.display_name}
      </h1>
      <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, maxWidth: 600, margin: 0, lineHeight: 1.6 }}>
        {product.description}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Form Panel — left column, dynamic fields
// ──────────────────────────────────────────────────────────────────────────

function FormPanel({
  template, activeFields, customFields, values, setVal, paperStocks,
}: {
  template: ProductTemplate;
  activeFields: TemplateField[];
  customFields: CustomField[];
  values: Record<string, any>;
  setVal: (k: string, v: any) => void;
  paperStocks: PaperStock[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'pc-fade-up 0.5s 0.1s ease both' }}>
      {activeFields.map((f, i) => (
        <FieldCard key={f.key} field={f} value={values[f.key]} setValue={(v) => setVal(f.key, v)} paperStocks={paperStocks} accent={template.accent} delay={i * 0.05} />
      ))}

      {customFields.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8 }}>Custom options</div>
          {customFields.map((cf) => (
            <FieldCard
              key={cf.field_key}
              field={{ key: `custom_${cf.field_key}`, label: cf.label, type: cf.field_type === 'dropdown' ? 'select' : (cf.field_type as any), required: false, helpText: cf.help_text || undefined, defaultOptions: cf.options }}
              value={values[`custom_${cf.field_key}`]}
              setValue={(v) => setVal(`custom_${cf.field_key}`, v)}
              paperStocks={paperStocks}
              accent={template.accent}
              delay={0}
            />
          ))}
        </>
      )}
    </div>
  );
}

function FieldCard({
  field, value, setValue, paperStocks, accent, delay,
}: {
  field: TemplateField;
  value: any;
  setValue: (v: any) => void;
  paperStocks: PaperStock[];
  accent: string;
  delay: number;
}) {
  return (
    <div
      style={{
        background: TOKENS.colors.bgCard,
        border: `1px solid ${TOKENS.colors.border}`,
        borderRadius: TOKENS.radius.xl,
        padding: 18,
        animation: `pc-fade-up 0.4s ${delay}s ease both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: TOKENS.colors.text, letterSpacing: '-0.01em' }}>
          {field.label}
          {field.required && <span style={{ color: accent, marginLeft: 4 }}>*</span>}
        </label>
        {field.helpText && (
          <span style={{ fontSize: 11, color: TOKENS.colors.textDim }}>{field.helpText}</span>
        )}
      </div>
      <FieldInput field={field} value={value} setValue={setValue} paperStocks={paperStocks} accent={accent} />
    </div>
  );
}

function FieldInput({
  field, value, setValue, paperStocks, accent,
}: {
  field: TemplateField;
  value: any;
  setValue: (v: any) => void;
  paperStocks: PaperStock[];
  accent: string;
}) {
  // ─── Number ─────────────────────────────────────────────────────────
  if (field.type === 'number' || field.type === 'page_count') {
    return (
      <input
        type="number"
        value={value || ''}
        onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
        placeholder="0"
        style={inputStyle(accent)}
      />
    );
  }

  // ─── Sizes ──────────────────────────────────────────────────────────
  if (field.type === 'sizes') {
    const opts = field.defaultOptions || [];
    const selectedKey = value && typeof value === 'object' && value.key ? value.key : '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <select
          value={selectedKey}
          onChange={(e) => {
            const opt = opts.find((o) => o.value === e.target.value);
            if (!opt) return;
            const meta = (opt.meta || {}) as { w: number; h: number };
            setValue({ key: opt.value, label: opt.label, w: meta.w, h: meta.h });
          }}
          style={selectStyle(accent)}
        >
          <option value="">Choose a size…</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {selectedKey === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="number" placeholder="Width (in)" value={value?.w || ''} onChange={(e) => setValue({ ...value, w: Number(e.target.value), key: 'custom' })} style={inputStyle(accent)} />
            <input type="number" placeholder="Height (in)" value={value?.h || ''} onChange={(e) => setValue({ ...value, h: Number(e.target.value), key: 'custom' })} style={inputStyle(accent)} />
          </div>
        )}
      </div>
    );
  }

  // ─── Paper ──────────────────────────────────────────────────────────
  if (field.type === 'paper') {
    return (
      <select value={value || ''} onChange={(e) => setValue(e.target.value)} style={selectStyle(accent)}>
        <option value="">Choose paper…</option>
        {paperStocks.map((p) => (
          <option key={p.id} value={p.id}>{p.label} · {p.gsm}gsm</option>
        ))}
      </select>
    );
  }

  // ─── Segment (sides, color) ─────────────────────────────────────────
  if (field.type === 'segment') {
    const opts = field.defaultOptions || [];
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {opts.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => setValue(o.value)}
              style={{
                flex: '1 1 auto',
                minWidth: 100,
                padding: '10px 14px',
                borderRadius: TOKENS.radius.md,
                border: `1px solid ${active ? accent : TOKENS.colors.border}`,
                background: active ? `${accent}22` : '#F4F2F9',
                color: active ? accent : TOKENS.colors.textMuted,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: `all 0.18s ${TOKENS.ease.out}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ─── Toggle ─────────────────────────────────────────────────────────
  if (field.type === 'toggle') {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {['No', 'Yes'].map((label, i) => {
          const v = i === 1;
          const active = value === v;
          return (
            <button
              key={label}
              onClick={() => setValue(v)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: TOKENS.radius.md,
                border: `1px solid ${active ? accent : TOKENS.colors.border}`,
                background: active ? `${accent}22` : '#F4F2F9',
                color: active ? accent : TOKENS.colors.textMuted,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: `all 0.18s ${TOKENS.ease.out}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  // ─── Select / fold / binding ────────────────────────────────────────
  const opts = (field.defaultOptions as any[] | undefined) || [];
  return (
    <select value={value || ''} onChange={(e) => setValue(e.target.value)} style={selectStyle(accent)}>
      <option value="">— None —</option>
      {opts.map((o, i) => (
        <option key={o.value || i} value={o.value || o}>{o.label || o}</option>
      ))}
    </select>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Price Panel — right column, sticky
// ──────────────────────────────────────────────────────────────────────────

function PricePanel({
  calc, currency, product, template, values, overrideWastage, setOverrideWastage,
  onApplySuggestion, onSaveQuote, onDownloadPdf, onConvertToOrder,
}: {
  calc: any;
  currency: string;
  product: SubscriberProduct;
  template: ProductTemplate;
  values: Record<string, any>;
  overrideWastage: boolean;
  setOverrideWastage: (b: boolean) => void;
  onApplySuggestion: (s: { id: string; label: string; w: number; h: number }) => void;
  onSaveQuote: () => void;
  onDownloadPdf: () => void;
  onConvertToOrder: () => void;
}) {
  const isBlocked = calc?.ready && calc.hasHighWastage && !overrideWastage;
  return (
    <div style={{ position: 'sticky', top: 90, animation: 'pc-fade-up 0.5s 0.2s ease both' }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.95)', border: `1px solid ${template.accent}55`, borderRadius: TOKENS.radius['2xl'], padding: 24, backdropFilter: 'blur(20px)', boxShadow: `0 20px 60px ${template.accent}22`, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${template.accent}, ${TOKENS.colors.pink})` }} />

        <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Estimate</div>

        {/* Wastage warning — block price card until customer confirms */}
        {isBlocked && (
          <div style={{ padding: 16, background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E', marginBottom: 6 }}>
              ⚠️ This size wastes paper
            </div>
            <div style={{ fontSize: 13, color: '#92400E', fontWeight: 500, marginBottom: 12, lineHeight: 1.55 }}>
              {calc.wastageExplanation || (
                <>At <strong>{values.size?.w} × {values.size?.h}"</strong>, only <strong>{calc.ups}</strong> piece{calc.ups === 1 ? '' : 's'} fits per plate — <strong>{calc.wastagePercent}%</strong> of the plate is unused. You still pay for the full plate, so per-piece cost is higher.</>
              )}
            </div>

            {/* Nearby-size suggestions */}
            {calc.suggestions && calc.suggestions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#92400E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Better standard sizes nearby
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {calc.suggestions.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => onApplySuggestion(s)}
                      style={{ textAlign: 'left', padding: '10px 12px', background: '#fff', border: '1.5px solid #FDE68A', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1330' }}>
                        {s.label} <span style={{ fontWeight: 500, color: '#5B5870' }}>· tap to use</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#5B5870', marginTop: 2, fontWeight: 600 }}>
                        Fits {s.ups} pcs/plate · {s.wastagePercent}% waste · plate {s.plate}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setOverrideWastage(true)}
              style={{ padding: '9px 16px', background: '#92400E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Show price anyway →
            </button>
          </div>
        )}

        {/* Other (non-wastage) warnings — e.g. odd-ups W&T-impossible */}
        {calc?.ready && calc.warnings && calc.warnings.length > 0 && !calc.hasHighWastage && (
          <div style={{ padding: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, marginBottom: 14 }}>
            {calc.warnings.map((w: string, i: number) => (
              <div key={i} style={{ fontSize: 12, color: '#1E3A8A', fontWeight: 600, lineHeight: 1.5 }}>ℹ️ {w}</div>
            ))}
          </div>
        )}

        {!calc?.ready ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>🧮</div>
            <p style={{ fontSize: 14, color: TOKENS.colors.textMuted, margin: 0 }}>Fill in the form to see your price</p>
          </div>
        ) : isBlocked ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: TOKENS.colors.textMuted, fontWeight: 600 }}>
              Click <strong>“Show price anyway”</strong> above to reveal the estimate.
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: TOKENS.fonts.display, fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, background: `linear-gradient(135deg, #1A1330 0%, ${template.accent} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {currency}{calc.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 13, color: TOKENS.colors.textMuted, marginTop: 6 }}>
                {currency}{calc.perUnit.toFixed(2)} each · {calc.qty.toLocaleString()} {product.display_name.toLowerCase()}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16, borderTop: `1px solid ${TOKENS.colors.border}` }}>
              <PriceRow
                label="Sheets needed"
                value={`${calc.ws.toLocaleString()} (${calc.ups}-up on ${calc.plateKey})`}
              />
              {calc.useWorkAndTurn && (
                <PriceRow label="Method" value={`Work & Turn · ${calc.imp.toLocaleString()} impressions`} />
              )}
              {calc.useDoublePlate && (
                <PriceRow label="Method" value={`2 plate setups · ${calc.imp.toLocaleString()} imp/plate`} />
              )}
              <PriceRow label="Paper" value={`${currency}${calc.paperCost.toFixed(2)}`} />
              {calc.printBreakdown && calc.printBreakdown.length > 1 ? (
                calc.printBreakdown.map((b: { label: string; value: number }, i: number) => (
                  <PriceRow key={i} label={b.label} value={`${currency}${b.value.toFixed(2)}`} />
                ))
              ) : (
                <PriceRow label="Printing" value={`${currency}${calc.printCost.toFixed(2)}`} />
              )}
              {calc.extraCost > 0 && <PriceRow label="Add-ons" value={`${currency}${calc.extraCost.toFixed(2)}`} />}
              <PriceRow label="Subtotal" value={`${currency}${calc.subtotal.toFixed(2)}`} />
              <PriceRow label="Markup" value={`${currency}${(calc.withMarkup - calc.subtotal).toFixed(2)}`} />
              {calc.tax > 0 && <PriceRow label="Tax" value={`${currency}${calc.tax.toFixed(2)}`} />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              <button onClick={onSaveQuote} style={{ ...primaryButton(template.accent), width: '100%' }}>📋 Save Quote</button>
              <button onClick={onDownloadPdf} style={{ ...ghostButton(), width: '100%' }}>📄 Download PDF</button>
              <button onClick={onConvertToOrder} style={{ ...ghostButton(), width: '100%' }}>🛒 Convert to Order</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: TOKENS.colors.textMuted }}>{label}</span>
      <span style={{ color: TOKENS.colors.text, fontFamily: TOKENS.fonts.mono, fontSize: 12 }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Save Quote Modal
// ──────────────────────────────────────────────────────────────────────────

interface ModalCommonProps {
  calc: any;
  values: Record<string, any>;
  product: SubscriberProduct;
  template: ProductTemplate;
  customers: Customer[];
  paperStocks: PaperStock[];
  markupPercent: number;
  taxPercent: number;
  currency: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

function genQuoteNum() {
  const d = new Date();
  return `Q${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`;
}

function buildJobSummary(calc: any, values: Record<string, any>, product: SubscriberProduct, paperStocks: PaperStock[]): {
  job_size: string; paper_type: string; finishing: string;
} {
  const size = values.size as { label?: string; w?: number; h?: number } | undefined;
  const stock = paperStocks.find((p) => p.id === values.paper);
  const finishParts: string[] = [];
  ['lamination', 'uv', 'foiling', 'embossing', 'rounded_corners', 'spot_uv'].forEach((k) => {
    const v = values[k];
    if (v && v !== 'No' && v !== false) finishParts.push(typeof v === 'string' ? v : k);
  });
  return {
    job_size: size?.label || `${size?.w || ''}×${size?.h || ''}`,
    paper_type: stock ? `${stock.label} ${stock.gsm}gsm` : '',
    finishing: finishParts.join(', '),
  };
}

function SaveQuoteModal(props: ModalCommonProps) {
  const { calc, values, product, template, customers, paperStocks, markupPercent, taxPercent, currency, onClose, onSaved } = props;
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function pickCustomer(c: Customer | null) {
    setPickedCustomer(c);
    if (c) {
      setName(c.name || '');
      setEmail(c.email || '');
      setPhone(c.phone || '');
      setCompany(c.company || '');
    }
  }

  async function save() {
    setError('');
    if (!name.trim()) { setError('Customer name is required'); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); setError('Session expired'); return; }
    const { job_size, paper_type, finishing } = buildJobSummary(calc, values, product, paperStocks);
    const colorMap: Record<string, string> = { four_color: 'Four Color CMYK', two_color: 'Two Color', single_color: 'Single Color', bw: 'Black & White' };
    const payload = {
      subscriber_id: session.user.id,
      quote_number: genQuoteNum(),
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      customer_company: company,
      job_title: jobTitle || product.display_name,
      job_size,
      paper_type,
      quantity: Number(values.quantity) || 0,
      sides: values.sides === 'both' ? 'Both Sides' : 'Single Side',
      color_option: colorMap[values.color] || 'Full Color',
      finishing,
      lamination: values.lamination || '',
      uv_coating: values.uv || '',
      binding: values.binding || '',
      subtotal: Number(calc.subtotal) || 0,
      markup_amount: Number(calc.withMarkup - calc.subtotal) || 0,
      markup_percent: markupPercent,
      tax_amount: Number(calc.tax) || 0,
      tax_percent: taxPercent,
      total_amount: Number(calc.total) || 0,
      currency_symbol: currency,
      notes,
      status: 'Draft',
      valid_until: validUntil,
      // New product-template fields
      subscriber_product_id: product.id,
      template_id: template.id,
      product_data: { values, calc: { sheets: calc.ws, ups: calc.ups, plate: calc.plateKey, useWorkAndTurn: calc.useWorkAndTurn } },
    };
    const { error: insErr } = await supabase.from('quotes').insert(payload);
    setSaving(false);
    if (insErr) { setError('Save failed: ' + insErr.message); return; }
    onSaved('✓ Quote saved! Visit /quotes to view all.');
  }

  return (
    <ModalShell title="Save Quote" subtitle="Capture customer details and lock in this quote" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ModalField label="Customer">
          <select value={pickedCustomer?.id || ''} onChange={(e) => pickCustomer(customers.find((c) => c.id === e.target.value) || null)} style={modalInput()}>
            <option value="">— Type new customer below —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
            ))}
          </select>
        </ModalField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pc-2col">
          <ModalField label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} style={modalInput()} placeholder="Customer name" /></ModalField>
          <ModalField label="Company"><input value={company} onChange={(e) => setCompany(e.target.value)} style={modalInput()} /></ModalField>
          <ModalField label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={modalInput()} /></ModalField>
          <ModalField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} style={modalInput()} /></ModalField>
        </div>

        <ModalField label="Job title"><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder={product.display_name} style={modalInput()} /></ModalField>
        <ModalField label="Valid until"><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={modalInput()} /></ModalField>
        <ModalField label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...modalInput(), fontFamily: 'inherit' }} placeholder="Internal notes…" /></ModalField>

        <SummaryBlock calc={calc} values={values} currency={currency} product={product} />

        {error && <div style={{ color: '#EF4444', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={ghostButton()}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ ...primaryButton(template.accent), opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : '💾 Save Quote'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Convert to Order Modal
// ──────────────────────────────────────────────────────────────────────────

function ConvertToOrderModal(props: ModalCommonProps) {
  const { calc, values, product, template, customers, paperStocks, markupPercent, taxPercent, currency, onClose, onSaved } = props;
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function pickCustomer(c: Customer | null) {
    setPickedCustomer(c);
    if (c) { setName(c.name || ''); setEmail(c.email || ''); setPhone(c.phone || ''); }
  }

  async function save() {
    setError('');
    if (!name.trim()) { setError('Customer name is required'); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    const { job_size, paper_type, finishing } = buildJobSummary(calc, values, product, paperStocks);
    const total = Number(calc.total) || 0;
    const adv = Number(advancePaid) || 0;
    const payload = {
      subscriber_id: session.user.id,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      job_title: jobTitle || product.display_name,
      job_size,
      paper_type,
      quantity: Number(values.quantity) || 0,
      finishing,
      total_amount: total,
      advance_paid: adv,
      due_amount: Math.max(0, total - adv),
      status: 'Pending',
      notes,
      subscriber_product_id: product.id,
      template_id: template.id,
      product_data: { values, calc: { sheets: calc.ws, ups: calc.ups, plate: calc.plateKey } },
    };
    const { error: insErr } = await supabase.from('orders').insert(payload);
    setSaving(false);
    if (insErr) { setError('Save failed: ' + insErr.message); return; }
    onSaved('✓ Order created! Visit /orders to track it.');
  }

  return (
    <ModalShell title="Convert to Order" subtitle="Move from quote to confirmed order" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ModalField label="Customer">
          <select value={pickedCustomer?.id || ''} onChange={(e) => pickCustomer(customers.find((c) => c.id === e.target.value) || null)} style={modalInput()}>
            <option value="">— Type new customer below —</option>
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>))}
          </select>
        </ModalField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pc-2col">
          <ModalField label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} style={modalInput()} /></ModalField>
          <ModalField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} style={modalInput()} /></ModalField>
        </div>
        <ModalField label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={modalInput()} /></ModalField>
        <ModalField label="Job title"><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder={product.display_name} style={modalInput()} /></ModalField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="pc-2col">
          <ModalField label="Advance paid">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: TOKENS.colors.textMuted, fontSize: 14 }}>{currency}</span>
              <input type="number" value={advancePaid} onChange={(e) => setAdvancePaid(Number(e.target.value))} style={modalInput()} />
            </div>
          </ModalField>
          <ModalField label="Due amount">
            <div style={{ padding: '10px 14px', background: '#FAFAFB', border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.md, fontSize: 14, color: TOKENS.colors.text }}>
              {currency}{(Math.max(0, (Number(calc.total) || 0) - (Number(advancePaid) || 0))).toFixed(2)}
            </div>
          </ModalField>
        </div>

        <ModalField label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...modalInput(), fontFamily: 'inherit' }} /></ModalField>

        <SummaryBlock calc={calc} values={values} currency={currency} product={product} />

        {error && <div style={{ color: '#EF4444', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={ghostButton()}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ ...primaryButton(template.accent), opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating…' : '🛒 Create Order'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Print View (PDF via browser print)
// ──────────────────────────────────────────────────────────────────────────

function PrintView({
  calc, values, product, template, subscriberInfo, paperStocks, markupPercent, taxPercent, currency, onClose,
}: {
  calc: any;
  values: Record<string, any>;
  product: SubscriberProduct;
  template: ProductTemplate;
  subscriberInfo: SubscriberInfo;
  paperStocks: PaperStock[];
  markupPercent: number;
  taxPercent: number;
  currency: string;
  onClose: () => void;
}) {
  const { job_size, paper_type, finishing } = buildJobSummary(calc, values, product, paperStocks);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const validUntil = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); })();
  const fmt = (n: number) => `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function doPrint() { setTimeout(() => window.print(), 100); }

  useEffect(() => {
    doPrint();
  }, []);

  return (
    <div className="pc-print-root" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', overflow: 'auto' }}>
      <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="pc-print-bar">
        <span style={{ fontSize: 14, color: '#666' }}>Print preview · use browser print dialog to save as PDF</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: '8px 14px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🖨️ Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 14px', background: '#fff', color: '#1A1A1A', border: '1px solid #d4d4d4', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>✕ Close</button>
        </div>
      </div>

      <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 720, margin: '0 auto', padding: 40, color: '#1A1A1A' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 20, borderBottom: '2px solid #1A1A1A' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, background: template.accent, borderRadius: '50%' }} />
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{subscriberInfo.business_name || 'Your Business'}</span>
            </div>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{subscriberInfo.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quote</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{genQuoteNum()}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{today}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Valid until {validUntil}</div>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Job</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>{product.display_name}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                ['Quantity', String(values.quantity || '—')],
                ['Size', job_size],
                ['Paper', paper_type],
                ['Sides', values.sides === 'both' ? 'Both Sides' : 'Single Side'],
                ['Color', { four_color: 'Full Color (CMYK)', two_color: '2 Colors', single_color: '1 Color', bw: 'Black & White' }[values.color as string] || ''],
                ...(finishing ? [['Finishing', finishing]] : []),
                ['Method', calc.useWorkAndTurn ? 'Work & Turn (1 plate setup)' : (calc.useDoublePlate ? '2 plate setups' : 'Single side')],
              ].map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 0', color: '#888', width: 140 }}>{label}</td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 28, padding: 20, background: '#FAFAFA', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: '6px 0', color: '#666' }}>Subtotal</td><td style={{ padding: '6px 0', textAlign: 'right' }}>{fmt(calc.subtotal)}</td></tr>
              <tr><td style={{ padding: '6px 0', color: '#666' }}>Markup ({markupPercent}%)</td><td style={{ padding: '6px 0', textAlign: 'right' }}>{fmt(calc.withMarkup - calc.subtotal)}</td></tr>
              {calc.tax > 0 && <tr><td style={{ padding: '6px 0', color: '#666' }}>Tax ({taxPercent}%)</td><td style={{ padding: '6px 0', textAlign: 'right' }}>{fmt(calc.tax)}</td></tr>}
              <tr style={{ borderTop: '2px solid #1A1A1A' }}>
                <td style={{ padding: '12px 0 4px', fontWeight: 700, fontSize: 15 }}>Total</td>
                <td style={{ padding: '12px 0 4px', textAlign: 'right', fontWeight: 700, fontSize: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{fmt(calc.total)}</td>
              </tr>
              <tr><td colSpan={2} style={{ paddingTop: 4, fontSize: 11, color: '#888', textAlign: 'right' }}>{fmt(calc.perUnit)} per piece</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 36, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 11, color: '#888', textAlign: 'center' }}>
          Thank you for your business. This quote is valid for 30 days from the date issued.
        </div>
      </div>

      <style>{`
        @media print {
          .pc-print-bar { display: none !important; }
          @page { margin: 1in; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Modal shell + reusable bits
// ──────────────────────────────────────────────────────────────────────────

function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20, 14, 50, 0.45)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'pc-fade-in 0.2s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: TOKENS.colors.bgPanel, border: `1px solid ${TOKENS.colors.borderStrong}`, borderRadius: TOKENS.radius['2xl'], padding: 28, maxWidth: 580, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: TOKENS.shadow.lg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 13, color: TOKENS.colors.textMuted, margin: 0, marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TOKENS.colors.textMuted, fontSize: 24, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
      <style>{`@media (max-width: 600px) { .pc-2col { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: TOKENS.colors.text, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function modalInput(): React.CSSProperties {
  return {
    width: '100%',
    background: '#FAFAFB',
    color: TOKENS.colors.text,
    border: `1px solid ${TOKENS.colors.border}`,
    borderRadius: TOKENS.radius.md,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
  };
}

function SummaryBlock({ calc, values, currency, product }: { calc: any; values: Record<string, any>; currency: string; product: SubscriberProduct }) {
  return (
    <div style={{ background: 'rgba(124,58,237,0.08)', border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.md, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: TOKENS.colors.textDim, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Quote Summary</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: TOKENS.colors.textMuted }}>{product.display_name} × {values.quantity || 0}</span>
        <span style={{ color: TOKENS.colors.text, fontFamily: TOKENS.fonts.mono }}>{currency}{(Number(calc.total) || 0).toFixed(2)}</span>
      </div>
      <div style={{ fontSize: 11, color: TOKENS.colors.textDim, marginTop: 4 }}>{currency}{(Number(calc.perUnit) || 0).toFixed(2)} each</div>
    </div>
  );
}

function Toast({ text }: { text: string }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(16,185,129,0.95)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500, boxShadow: '0 8px 24px rgba(16,185,129,0.4)', zIndex: 110, animation: 'pc-fade-up 0.3s ease both' }}>
      {text}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Empty / loading / not-found states
// ──────────────────────────────────────────────────────────────────────────

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

function SignInRedirect({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TOKENS.fonts.body }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 40, textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 22, fontWeight: 700, color: TOKENS.colors.text, margin: 0, marginBottom: 8 }}>Please sign in</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 20 }}>You need to be signed in to use the calculator.</p>
        <button onClick={onLogin} style={primaryButton(TOKENS.colors.primary)}>Sign In →</button>
      </div>
    </div>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div style={{ minHeight: '100vh', background: TOKENS.colors.bgDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TOKENS.fonts.body, color: TOKENS.colors.text }}>
      <PageStyles />
      <div style={{ background: TOKENS.colors.bgCard, border: `1px solid ${TOKENS.colors.border}`, borderRadius: TOKENS.radius.xl, padding: 40, textAlign: 'center', maxWidth: 460 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontFamily: TOKENS.fonts.display, fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 8 }}>Product not found</h2>
        <p style={{ color: TOKENS.colors.textMuted, fontSize: 14, marginBottom: 24 }}>
          We couldn&apos;t find <code style={{ background: TOKENS.colors.bgPanel2, padding: '2px 6px', borderRadius: 4, fontFamily: TOKENS.fonts.mono, color: TOKENS.colors.text }}>{slug}</code> in your catalog. It may have been removed, or you might need to add it.
        </p>
        <Link href="/products" style={primaryButton(TOKENS.colors.primary)}>← Back to Products</Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Style helpers
// ──────────────────────────────────────────────────────────────────────────

function inputStyle(accent: string): React.CSSProperties {
  return {
    width: '100%',
    background: '#FAFAFB',
    color: TOKENS.colors.text,
    border: `1px solid ${TOKENS.colors.border}`,
    borderRadius: TOKENS.radius.md,
    padding: '11px 14px',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    transition: `border-color 0.18s ${TOKENS.ease.out}`,
  };
}

function selectStyle(accent: string): React.CSSProperties {
  return {
    ...inputStyle(accent),
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23A78BFA' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: 36,
  };
}

function primaryButton(accent: string): React.CSSProperties {
  return {
    padding: '12px 20px',
    background: `linear-gradient(135deg, ${accent} 0%, ${TOKENS.colors.pink} 100%)`,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: TOKENS.fonts.display,
    borderRadius: TOKENS.radius.md,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: `0 6px 20px ${accent}44`,
    transition: `all 0.2s ${TOKENS.ease.out}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  };
}

function ghostButton(): React.CSSProperties {
  return {
    padding: '11px 18px',
    background: 'transparent',
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: TOKENS.fonts.body,
    borderRadius: TOKENS.radius.md,
    border: `1px solid ${TOKENS.colors.border}`,
    cursor: 'pointer',
    textAlign: 'center',
    transition: `all 0.2s ${TOKENS.ease.out}`,
  };
}

function PageStyles() {
  return (
    <style>{`
      @keyframes pc-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pc-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pc-spin { to { transform: rotate(360deg); } }
      @keyframes pc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      input::placeholder, textarea::placeholder { color: ${TOKENS.colors.textDim}; }
      input:focus, select:focus, textarea:focus { border-color: ${TOKENS.colors.borderStrong} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
      *::-webkit-scrollbar { width: 8px; }
      *::-webkit-scrollbar-track { background: ${TOKENS.colors.bgPanel2}; }
      *::-webkit-scrollbar-thumb { background: ${TOKENS.colors.border}; border-radius: 4px; }
      button:hover { filter: brightness(1.05); transform: translateY(-1px); }
      button:active { transform: translateY(0); }
    `}</style>
  );
}
