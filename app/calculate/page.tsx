'use client';
import { useState, useEffect } from 'react';

// ─── DATA ────────────────────────────────────────────────────────────

const FINAL_SIZES = [
  { id: 'a2', label: 'A2 (16.5 × 23.4")', w: 16.5, h: 23.4, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a3', label: 'A3 (11.7 × 16.5")', w: 11.7, h: 16.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a4', label: 'A4 (8.3 × 11.7")', w: 8.3, h: 11.7, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a5', label: 'A5 (5.8 × 8.3")', w: 5.8, h: 8.3, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a6', label: 'A6 (4.1 × 5.8")', w: 4.1, h: 5.8, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am1', label: '4.25 × 5.5"', w: 4.25, h: 5.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am2', label: '5.5 × 8.5"', w: 5.5, h: 8.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am3', label: 'Letter 8.5 × 11"', w: 8.5, h: 11, plateSize: '18×23"', plateGroup: 'small' },
  { id: 'am4', label: 'Legal 8.5 × 14"', w: 8.5, h: 14, plateSize: '15×20"', plateGroup: 'small' },
  { id: 'am5', label: '11 × 17"', w: 11, h: 17, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am6', label: '18 × 23"', w: 18, h: 23, plateSize: '18×23"', plateGroup: 'small' },
  { id: 'b3', label: 'B3 (10 × 14")', w: 10, h: 14, plateSize: '20×28"', plateGroup: 'medium' },
  { id: 'b4', label: 'B4 (9.5 × 14")', w: 9.5, h: 14, plateSize: '20×28"', plateGroup: 'medium' },
  { id: 'b5', label: 'B5 (7 × 9.5")', w: 7, h: 9.5, plateSize: '15×20"', plateGroup: 'small' },
  { id: 'b6', label: 'B6 (4.5 × 7")', w: 4.5, h: 7, plateSize: '15×20"', plateGroup: 'small' },
  { id: 'vc', label: 'Visiting Card (3.5 × 2")', w: 3.5, h: 2, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'dl', label: 'DL Envelope (4.3 × 8.5")', w: 4.3, h: 8.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'custom', label: 'Custom size...', w: 0, h: 0, plateSize: '18×25"', plateGroup: 'small' },
];

const PAPER_CATEGORIES = [
  { id: 'maplitho', label: 'Maplitho', gsms: [60, 70, 80], ratePerKg: 70 },
  { id: 'art_paper', label: 'Art Paper', gsms: [80, 90, 100, 130], ratePerKg: 88 },
  { id: 'art_card', label: 'Art Card', gsms: [170, 200, 210, 230], ratePerKg: 97 },
  { id: 'art_card_heavy', label: 'Art Card Heavy', gsms: [250, 280, 300, 350, 380], ratePerKg: 106 },
  { id: 'art_card_xheavy', label: 'Art Card Extra Heavy', gsms: [400, 450, 500], ratePerKg: 116 },
  { id: 'fbb', label: 'FBB / Ultima / SBS', gsms: [200, 230, 250, 280, 300, 320, 350, 380, 400], ratePerKg: 128 },
  { id: 'duplex_grey', label: 'Duplex Grey Back', gsms: [200, 230, 250, 280, 300, 320, 350, 380, 400], ratePerKg: 62 },
  { id: 'duplex_white', label: 'Duplex White Back', gsms: [200, 230, 250, 280, 300, 320, 350, 380, 400], ratePerKg: 66 },
];

const COLOR_OPTIONS = [
  { id: 'single', label: 'Single Color' },
  { id: 'two', label: 'Two Color' },
  { id: 'cmyk', label: 'Four Color CMYK' },
  { id: 'five', label: 'Five Color (CMYK + White)' },
  { id: 'five_coater', label: 'Five Color + Coater' },
  { id: 'five_uv', label: 'Five Color + UV Online' },
];

const LAM_OPTIONS = [
  { id: 'none', label: 'No Lamination' },
  { id: 'gloss_thermal', label: 'Gloss Thermal' },
  { id: 'matt_thermal', label: 'Matt Thermal' },
  { id: 'velvet_thermal', label: 'Velvet Thermal' },
  { id: 'bopp_gloss', label: 'BOPP Gloss' },
  { id: 'bopp_matt', label: 'BOPP Matt' },
];

const UV_OPTIONS = [
  { id: 'none', label: 'No UV / Coating' },
  { id: 'full_uv', label: 'Full UV' },
  { id: 'spot_uv', label: 'Spot UV' },
  { id: 'aqueous', label: 'Aqueous Coating' },
  { id: 'varnish', label: 'Varnish' },
  { id: 'uv_online', label: 'UV Dripoff Online' },
  { id: 'uv_offline', label: 'UV Dripoff Offline' },
];

const BINDING_OPTIONS = [
  { id: 'none', label: 'No Binding' },
  { id: 'center_pin', label: 'Center Pin / Saddle Stitch' },
  { id: 'perfect', label: 'Perfect Bind' },
  { id: 'hard', label: 'Hard Bind / Case Bound' },
  { id: 'spiral', label: 'Spiral Bind' },
  { id: 'folding', label: 'Just Folding' },
  { id: 'cutting', label: 'Just Cutting' },
];

const PLATE_DIMS: Record<string, { w: number; h: number }> = {
  '15×20"': { w: 15, h: 20 }, '18×23"': { w: 18, h: 23 }, '18×25"': { w: 18, h: 25 },
  '20×28"': { w: 20, h: 28 }, '20×30"': { w: 20, h: 30 }, '25×36"': { w: 25, h: 36 },
};

const PARENT_SHEETS: Record<string, { parent: string; cuts: number; pw: number; ph: number }> = {
  '15×20"': { parent: '20×30"', cuts: 2, pw: 20, ph: 30 },
  '18×23"': { parent: '23×36"', cuts: 2, pw: 23, ph: 36 },
  '18×25"': { parent: '25×36"', cuts: 2, pw: 25, ph: 36 },
  '20×28"': { parent: '20×28"', cuts: 1, pw: 20, ph: 28 },
  '20×30"': { parent: '20×30"', cuts: 1, pw: 20, ph: 30 },
};

const DEMO_RATES = {
  plates: {
    small: { single: { fixed: 500, per1000: 200 }, two: { fixed: 800, per1000: 250 }, cmyk: { fixed: 2000, per1000: 400 }, five: { fixed: 2500, per1000: 450 }, five_coater: { fixed: 2800, per1000: 480 }, five_uv: { fixed: 3000, per1000: 500 } },
    medium: { single: { fixed: 700, per1000: 250 }, two: { fixed: 1200, per1000: 300 }, cmyk: { fixed: 2800, per1000: 500 }, five: { fixed: 3500, per1000: 550 }, five_coater: { fixed: 3800, per1000: 580 }, five_uv: { fixed: 4000, per1000: 600 } },
    large: { single: { fixed: 1000, per1000: 300 }, two: { fixed: 1800, per1000: 400 }, cmyk: { fixed: 4000, per1000: 600 }, five: { fixed: 5000, per1000: 700 }, five_coater: { fixed: 5500, per1000: 750 }, five_uv: { fixed: 6000, per1000: 800 } },
  },
  lamination: {
    gloss_thermal: { min: 800, per100sqin: 0.65 }, matt_thermal: { min: 900, per100sqin: 0.70 },
    velvet_thermal: { min: 1200, per100sqin: 0.90 }, bopp_gloss: { min: 600, per100sqin: 0.50 }, bopp_matt: { min: 650, per100sqin: 0.55 },
  },
  uv: {
    full_uv: { min: 1000, per100sqin: 0.80 }, spot_uv: { min: 1500, per100sqin: 1.20 },
    aqueous: { min: 600, per100sqin: 0.40 }, varnish: { min: 500, per100sqin: 0.35 },
    uv_online: { min: 2000, per100sqin: 1.50 }, uv_offline: { min: 1800, per100sqin: 1.30 },
  },
  binding: { center_pin: 50, perfect: 80, hard: 150, spiral: 60, folding: 20, cutting: 15 },
  markup: 25,
  tax: 18,
};

// ─── HELPERS ─────────────────────────────────────────────────────────

function calcUps(finalW: number, finalH: number, plateKey: string): number {
  const plate = PLATE_DIMS[plateKey];
  if (!plate) return 1;
  const pW = plate.w - 0.5; const pH = plate.h - 0.5;
  return Math.max(
    Math.floor(pW / finalW) * Math.floor(pH / finalH),
    Math.floor(pW / finalH) * Math.floor(pH / finalW),
    1
  );
}

function calcPaperCost(gsm: number, ratePerKg: number, parentW: number, parentH: number, parentSheets: number): number {
  const BASE_FACTOR = 0.2666; const BASE_SQIN = 828;
  const factor = (parentW * parentH * BASE_FACTOR) / BASE_SQIN;
  const weightPerRream = factor * gsm;
  const costPerRream = weightPerRream * ratePerKg;
  const costPerSheet = costPerRream / 500;
  return costPerSheet * parentSheets;
}

function calcPrintCost(impressions: number, plateGroup: 'small' | 'medium' | 'large', colorId: string): number {
  const rates = DEMO_RATES.plates[plateGroup][colorId as keyof typeof DEMO_RATES.plates.small];
  if (!rates) return 0;
  const platesNeeded = Math.ceil(impressions / 50000);
  const plateFixed = rates.fixed * platesNeeded;
  const freeImp = 1000 * platesNeeded;
  const extraImp = Math.max(0, impressions - freeImp);
  const extraRounded = Math.ceil(extraImp / 1000) * 1000;
  return plateFixed + (extraRounded / 1000) * rates.per1000;
}

function calcLamCost(lamId: string, sheetArea: number, sheets: number, doubleSide: boolean): number {
  if (lamId === 'none') return 0;
  const rates = DEMO_RATES.lamination[lamId as keyof typeof DEMO_RATES.lamination];
  if (!rates) return 0;
  const perSheet = (sheetArea / 100) * rates.per100sqin * (doubleSide ? 2 : 1);
  return Math.max(perSheet * sheets, rates.min);
}

function calcUVCost(uvId: string, sheetArea: number, sheets: number): number {
  if (uvId === 'none') return 0;
  const rates = DEMO_RATES.uv[uvId as keyof typeof DEMO_RATES.uv];
  if (!rates) return 0;
  return Math.max((sheetArea / 100) * rates.per100sqin * sheets, rates.min);
}

// ─── SECTION COMPONENT ───────────────────────────────────────────────

function Section({ title, subtitle, filled, children, optional }: any) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: `1.5px solid ${filled ? '#1A1A1A' : 'var(--color-border-tertiary)'}`, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ background: filled ? '#1A1A1A' : 'var(--color-background-secondary)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: filled ? '#fff' : 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: filled ? '#AAA' : 'var(--color-text-secondary)', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {optional && !filled && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'var(--color-background-primary)', padding: '2px 8px', borderRadius: 4 }}>Optional</span>}
          {filled && <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 500 }}>✓ Done</span>}
          <span style={{ fontSize: 14, color: filled ? '#AAA' : 'var(--color-text-secondary)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────

export default function CalculatePage() {
  // Paper state
  const [size, setSize] = useState(FINAL_SIZES[2]);
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [paperCat, setPaperCat] = useState(PAPER_CATEGORIES[2]);
  const [gsm, setGsm] = useState(300);
  const [quantity, setQuantity] = useState('');

  // Print state
  const [colorOption, setColorOption] = useState('cmyk');
  const [sides, setSides] = useState<'single' | 'double'>('double');

  // Finishing state
  const [lamination, setLamination] = useState('none');
  const [lamDoubleSide, setLamDoubleSide] = useState(false);
  const [uvCoating, setUvCoating] = useState('none');

  // Binding state
  const [binding, setBinding] = useState('none');

  const [result, setResult] = useState<any>(null);

  const finalW = size.id === 'custom' ? (parseFloat(customW) || 0) : size.w;
  const finalH = size.id === 'custom' ? (parseFloat(customH) || 0) : size.h;
  const plateKey = size.plateSize;
  const plateGroup = size.plateGroup as 'small' | 'medium' | 'large';
  const ups = (finalW && finalH) ? calcUps(finalW, finalH, plateKey) : 1;
  const parentInfo = PARENT_SHEETS[plateKey] || { parent: plateKey, cuts: 1, pw: 25, ph: 36 };

  const calculate = () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0 || !finalW || !finalH) return;

    // Paper
    const workingSheets = Math.ceil(qty / ups);
    const parentSheets = Math.ceil(workingSheets / parentInfo.cuts);
    const paperCost = calcPaperCost(gsm, paperCat.ratePerKg, parentInfo.pw, parentInfo.ph, parentSheets);

    // Printing
    const impressions = sides === 'double' ? workingSheets * 2 : workingSheets;
    const printCost = calcPrintCost(impressions, plateGroup, colorOption);

    // Finishing
    const sheetArea = finalW * finalH;
    const lamCost = calcLamCost(lamination, sheetArea, workingSheets, lamDoubleSide);
    const uvCost = calcUVCost(uvCoating, sheetArea, workingSheets);

    // Binding
    const bindingFormats = qty / (ups * 2);
    let bindCost = 0;
    if (binding !== 'none') {
      const bindRate = DEMO_RATES.binding[binding as keyof typeof DEMO_RATES.binding] || 0;
      bindCost = Math.ceil(bindingFormats) * bindRate * qty;
    }

    const subtotal = paperCost + printCost + lamCost + uvCost + bindCost;
    const afterMarkup = subtotal * (1 + DEMO_RATES.markup / 100);
    const taxAmount = afterMarkup * (DEMO_RATES.tax / 100);
    const finalPrice = afterMarkup + taxAmount;

    setResult({
      paperCost, printCost, lamCost, uvCost, bindCost,
      subtotal, markupAmount: afterMarkup - subtotal, taxAmount, finalPrice,
      workingSheets, parentSheets, parentSheet: parentInfo.parent,
      ups, impressions,
      perPiece: finalPrice / qty,
    });
  };

  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const paperFilled = !!quantity && parseInt(quantity) > 0;
  const printFilled = true;
  const finishFilled = lamination !== 'none' || uvCoating !== 'none';
  const bindFilled = binding !== 'none';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .topbar { background: #1A1A1A; height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 100; }
        .topbar-dot { width: 8px; height: 8px; background: #C84B31; border-radius: 50%; }
        .topbar-name { font-size: 13px; font-weight: 500; color: #fff; }
        .nav-links { display: flex; align-items: center; gap: 16px; }
        .nav-link { font-size: 13px; color: #888; text-decoration: none; padding: 5px 10px; border-radius: 6px; }
        .nav-link:hover { color: #fff; }
        .nav-link.active { background: rgba(255,255,255,0.1); color: #fff; }
        .page { min-height: calc(100vh - 52px); padding: 28px 16px 64px; }
        .container { max-width: 580px; margin: 0 auto; }
        .page-title { font-size: 26px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.02em; margin-bottom: 6px; }
        .page-sub { font-size: 14px; color: #888; margin-bottom: 24px; }
        .field { margin-bottom: 14px; }
        .field:last-child { margin-bottom: 0; }
        .field-label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary, #666); margin-bottom: 5px; display: flex; justify-content: space-between; }
        select, input[type="number"], input[type="text"] { width: 100%; padding: 10px 14px; border: 1.5px solid var(--color-border-tertiary, #E8E8E8); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--color-text-primary, #1A1A1A); background: var(--color-background-secondary, #FAFAFA); outline: none; transition: border-color 0.15s; appearance: none; -webkit-appearance: none; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
        select:focus, input:focus { border-color: #C84B31; background: var(--color-background-primary, #fff); }
        input::placeholder { color: #CCC; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .toggle-wrap { display: flex; gap: 8px; }
        .toggle-btn { flex: 1; padding: 9px; border: 1.5px solid var(--color-border-tertiary, #E8E8E8); border-radius: 10px; font-size: 13px; font-weight: 500; color: var(--color-text-secondary, #888); background: var(--color-background-secondary, #FAFAFA); cursor: pointer; font-family: inherit; text-align: center; transition: all 0.15s; }
        .toggle-btn.active { border-color: #1A1A1A; background: #1A1A1A; color: #fff; }
        .info-badge { display: inline-block; padding: 2px 8px; background: #EEF4FA; color: #185FA5; border-radius: 4px; font-size: 11px; font-weight: 500; font-family: 'DM Mono', monospace; margin-left: 6px; }
        .calc-btn { width: 100%; padding: 14px; background: #C84B31; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity 0.15s; margin-top: 8px; }
        .calc-btn:hover { opacity: 0.9; }
        .result-card { background: #1A1A1A; border-radius: 16px; padding: 28px; margin-bottom: 12px; position: relative; overflow: hidden; }
        .result-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: #C84B31; border-radius: 50%; opacity: 0.08; }
        .result-total-label { font-size: 13px; color: #666; margin-bottom: 4px; }
        .result-total-price { font-size: 42px; font-weight: 600; color: #fff; letter-spacing: -0.03em; font-family: 'DM Mono', monospace; line-height: 1; margin-bottom: 24px; }
        .result-currency { font-size: 24px; vertical-align: super; font-weight: 400; margin-right: 2px; }
        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .result-item { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
        .result-item-label { font-size: 11px; color: #666; margin-bottom: 4px; }
        .result-item-value { font-size: 16px; font-weight: 500; color: #fff; font-family: 'DM Mono', monospace; }
        .breakdown-card { background: var(--color-background-primary, #fff); border-radius: 16px; border: 1px solid var(--color-border-tertiary, #EBEBEB); overflow: hidden; margin-bottom: 12px; }
        .breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--color-border-tertiary, #F5F5F5); }
        .breakdown-row:last-child { border-bottom: none; }
        .breakdown-key { font-size: 13px; color: var(--color-text-secondary, #888); }
        .breakdown-val { font-size: 13px; font-weight: 500; color: var(--color-text-primary, #1A1A1A); font-family: 'DM Mono', monospace; }
        .gst-card { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 16px; overflow: hidden; }
        .gst-header { padding: 10px 20px; background: #FDE68A; }
        .gst-header-text { font-size: 11px; font-weight: 600; color: #78350F; letter-spacing: 0.08em; text-transform: uppercase; }
        .gst-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #FDE68A; }
        .gst-row:last-child { border-bottom: none; }
        .gst-key { font-size: 13px; color: #92400E; }
        .gst-val { font-size: 13px; font-weight: 600; color: #92400E; font-family: 'DM Mono', monospace; }
        .demo-notice { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #92400E; }
        .custom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
        @media (max-width: 480px) {
          .result-total-price { font-size: 34px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="topbar-dot" />
          <span className="topbar-name">PrintCalc</span>
        </div>
        <div className="nav-links">
          <a href="/" className="nav-link">Paper</a>
          <a href="/print" className="nav-link">Printing</a>
          <a href="/calculate" className="nav-link active">Full Job</a>
          <a href="/dashboard" className="nav-link">Dashboard</a>
        </div>
      </div>

      <main className="page">
        <div className="container">
          <h1 className="page-title">Full Job Calculator</h1>
          <p className="page-sub">Paper + printing + finishing — one complete quote</p>

          <div className="demo-notice">
            ⚡ Demo rates shown. Login to use your own rates.
          </div>

          {/* SECTION 1 — PAPER */}
          <Section title="Paper" subtitle="Size, type and quantity" filled={paperFilled}>
            <div className="field">
              <div className="field-label">
                Final size
                {finalW && finalH && <span className="info-badge">{ups} ups · {parentInfo.parent} parent sheet</span>}
              </div>
              <select value={size.id} onChange={e => {
                const s = FINAL_SIZES.find(x => x.id === e.target.value);
                if (s) setSize(s);
              }}>
                <optgroup label="── A Series ──">
                  {FINAL_SIZES.filter(s => s.id.startsWith('a')).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </optgroup>
                <optgroup label="── American Standard ──">
                  {FINAL_SIZES.filter(s => s.id.startsWith('am')).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </optgroup>
                <optgroup label="── B Series ──">
                  {FINAL_SIZES.filter(s => s.id.startsWith('b')).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </optgroup>
                <optgroup label="── Other ──">
                  {FINAL_SIZES.filter(s => ['vc', 'dl', 'custom'].includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </optgroup>
              </select>
              {size.id === 'custom' && (
                <div className="custom-grid">
                  <input type="number" placeholder="Width (inches)" value={customW} onChange={e => setCustomW(e.target.value)} />
                  <input type="number" placeholder="Height (inches)" value={customH} onChange={e => setCustomH(e.target.value)} />
                </div>
              )}
            </div>

            <div className="field">
              <div className="field-label">Paper category</div>
              <select value={paperCat.id} onChange={e => {
                const cat = PAPER_CATEGORIES.find(c => c.id === e.target.value);
                if (cat) { setPaperCat(cat); setGsm(cat.gsms[0]); }
              }}>
                {PAPER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div className="field">
              <div className="field-label">GSM</div>
              <select value={gsm} onChange={e => setGsm(parseInt(e.target.value))}>
                {paperCat.gsms.map(g => <option key={g} value={g}>{g} GSM</option>)}
              </select>
            </div>

            <div className="field">
              <div className="field-label">Quantity <span style={{ fontWeight: 400, color: '#AAA' }}>pieces</span></div>
              <input type="number" placeholder="Enter quantity" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
            </div>
          </Section>

          {/* SECTION 2 — PRINTING */}
          <Section title="Printing" subtitle="Colors and sides" filled={printFilled}>
            <div className="field">
              <div className="field-label">Print colors</div>
              <select value={colorOption} onChange={e => setColorOption(e.target.value)}>
                {COLOR_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="field">
              <div className="field-label">Sides</div>
              <div className="toggle-wrap">
                <button className={`toggle-btn ${sides === 'single' ? 'active' : ''}`} onClick={() => setSides('single')}>Single side</button>
                <button className={`toggle-btn ${sides === 'double' ? 'active' : ''}`} onClick={() => setSides('double')}>Front + Back</button>
              </div>
            </div>
          </Section>

          {/* SECTION 3 — FINISHING */}
          <Section title="Finishing" subtitle="Lamination and UV coating" filled={finishFilled} optional>
            <div className="field">
              <div className="field-label">Lamination</div>
              <select value={lamination} onChange={e => setLamination(e.target.value)}>
                {LAM_OPTIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              {lamination !== 'none' && (
                <div className="toggle-wrap" style={{ marginTop: 8 }}>
                  <button className={`toggle-btn ${!lamDoubleSide ? 'active' : ''}`} onClick={() => setLamDoubleSide(false)}>Single side</button>
                  <button className={`toggle-btn ${lamDoubleSide ? 'active' : ''}`} onClick={() => setLamDoubleSide(true)}>Both sides</button>
                </div>
              )}
            </div>
            <div className="field">
              <div className="field-label">UV / Coating</div>
              <select value={uvCoating} onChange={e => setUvCoating(e.target.value)}>
                {UV_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
          </Section>

          {/* SECTION 4 — BINDING */}
          <Section title="Binding" subtitle="Finishing and binding type" filled={bindFilled} optional>
            <div className="field">
              <div className="field-label">Binding type</div>
              <select value={binding} onChange={e => setBinding(e.target.value)}>
                {BINDING_OPTIONS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>
          </Section>

          {/* CALCULATE BUTTON */}
          <button className="calc-btn" onClick={calculate}>
            Calculate total price →
          </button>

          {/* RESULTS */}
          {result && (
            <div style={{ marginTop: 20 }}>
              <div className="result-card">
                <p className="result-total-label">Total price (incl. GST)</p>
                <p className="result-total-price">
                  <span className="result-currency">₹</span>
                  {fmt(result.finalPrice)}
                </p>
                <div className="result-grid">
                  <div className="result-item">
                    <p className="result-item-label">Per piece</p>
                    <p className="result-item-value">₹{fmt(result.perPiece)}</p>
                  </div>
                  <div className="result-item">
                    <p className="result-item-label">Working sheets</p>
                    <p className="result-item-value">{result.workingSheets.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="result-item">
                    <p className="result-item-label">Parent sheets</p>
                    <p className="result-item-value">{result.parentSheets.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="result-item">
                    <p className="result-item-label">Total impressions</p>
                    <p className="result-item-value">{result.impressions.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="breakdown-card">
                <div className="breakdown-row" style={{ background: 'var(--color-background-secondary)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cost Breakdown</span>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-key">Paper cost</span>
                  <span className="breakdown-val">₹{fmt(result.paperCost)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-key">Printing cost</span>
                  <span className="breakdown-val">₹{fmt(result.printCost)}</span>
                </div>
                {result.lamCost > 0 && (
                  <div className="breakdown-row">
                    <span className="breakdown-key">Lamination</span>
                    <span className="breakdown-val">₹{fmt(result.lamCost)}</span>
                  </div>
                )}
                {result.uvCost > 0 && (
                  <div className="breakdown-row">
                    <span className="breakdown-key">UV / Coating</span>
                    <span className="breakdown-val">₹{fmt(result.uvCost)}</span>
                  </div>
                )}
                {result.bindCost > 0 && (
                  <div className="breakdown-row">
                    <span className="breakdown-key">Binding</span>
                    <span className="breakdown-val">₹{fmt(result.bindCost)}</span>
                  </div>
                )}
                <div className="breakdown-row" style={{ background: 'var(--color-background-secondary)' }}>
                  <span className="breakdown-key" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Subtotal</span>
                  <span className="breakdown-val" style={{ fontWeight: 600 }}>₹{fmt(result.subtotal)}</span>
                </div>
              </div>

              {/* GST Card */}
              <div className="gst-card">
                <div className="gst-header"><p className="gst-header-text">GST / Tax Breakdown</p></div>
                <div className="gst-row"><span className="gst-key">Subtotal (before markup)</span><span className="gst-val">₹{fmt(result.subtotal)}</span></div>
                <div className="gst-row"><span className="gst-key">Markup ({DEMO_RATES.markup}%)</span><span className="gst-val">₹{fmt(result.markupAmount)}</span></div>
                <div className="gst-row"><span className="gst-key">GST @ {DEMO_RATES.tax}%</span><span className="gst-val">₹{fmt(result.taxAmount)}</span></div>
                <div className="gst-row">
                  <span className="gst-key" style={{ fontWeight: 600, color: '#78350F' }}>Total incl. GST</span>
                  <span className="gst-val" style={{ fontSize: 15 }}>₹{fmt(result.finalPrice)}</span>
                </div>
              </div>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#CCC', marginTop: 20 }}>
                Demo rates · Login to use your own rates · GST @ {DEMO_RATES.tax}%
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
