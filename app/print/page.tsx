'use client';
import { useState, useEffect } from 'react';

// ─── PLATE SIZE GROUPS ───────────────────────────────────────────────
const PLATE_GROUPS = {
  small: { label: 'Small Plate (15×20, 18×23, 18×25)', sizes: ['15×20"', '18×23"', '18×25"'] },
  medium: { label: 'Medium Plate (20×28, 20×30)', sizes: ['20×28"', '20×30"'] },
  large: { label: 'Large Plate (25×36, 28×40)', sizes: ['25×36"', '28×40"'] },
};

// ─── COLOR OPTIONS ───────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { id: 'single', label: 'Single Color (1 color)' },
  { id: 'two', label: 'Two Color (2 colors)' },
  { id: 'cmyk', label: 'Four Color CMYK' },
  { id: 'five', label: 'Five Color (CMYK + White)' },
  { id: 'five_coater', label: 'Five Color + Coater' },
  { id: 'five_uv', label: 'Five Color + UV Dripoff Online' },
];

// ─── FINAL SIZES ─────────────────────────────────────────────────────
const FINAL_SIZES = [
  // A Series
  { id: 'a2', label: 'A2 (16.5 × 23.4")', w: 16.5, h: 23.4, plate: 'small', plateSize: '18×25"' },
  { id: 'a3', label: 'A3 (11.7 × 16.5")', w: 11.7, h: 16.5, plate: 'small', plateSize: '18×25"' },
  { id: 'a4', label: 'A4 (8.3 × 11.7")', w: 8.3, h: 11.7, plate: 'small', plateSize: '18×25"' },
  { id: 'a5', label: 'A5 (5.8 × 8.3")', w: 5.8, h: 8.3, plate: 'small', plateSize: '18×25"' },
  { id: 'a6', label: 'A6 (4.1 × 5.8")', w: 4.1, h: 5.8, plate: 'small', plateSize: '18×25"' },
  // American
  { id: 'am1', label: '4.25 × 5.5"', w: 4.25, h: 5.5, plate: 'small', plateSize: '18×25"' },
  { id: 'am2', label: '5.5 × 8.5"', w: 5.5, h: 8.5, plate: 'small', plateSize: '18×25"' },
  { id: 'am3', label: 'Letter 8.5 × 11"', w: 8.5, h: 11, plate: 'small', plateSize: '18×23"' },
  { id: 'am4', label: 'Legal 8.5 × 14"', w: 8.5, h: 14, plate: 'small', plateSize: '15×20"' },
  { id: 'am5', label: '11 × 17"', w: 11, h: 17, plate: 'small', plateSize: '18×25"' },
  { id: 'am6', label: '18 × 23"', w: 18, h: 23, plate: 'small', plateSize: '18×23"' },
  // B Series
  { id: 'b3', label: 'B3 (10 × 14")', w: 10, h: 14, plate: 'medium', plateSize: '20×28"' },
  { id: 'b4', label: 'B4 (9.5 × 14")', w: 9.5, h: 14, plate: 'medium', plateSize: '20×28"' },
  { id: 'b5', label: 'B5 (7 × 9.5")', w: 7, h: 9.5, plate: 'small', plateSize: '15×20"' },
  { id: 'b6', label: 'B6 (4.5 × 7")', w: 4.5, h: 7, plate: 'small', plateSize: '15×20"' },
  // Other
  { id: 'vc', label: 'Visiting Card (3.5 × 2")', w: 3.5, h: 2, plate: 'small', plateSize: '18×25"' },
  { id: 'dl', label: 'DL Envelope (4.3 × 8.5")', w: 4.3, h: 8.5, plate: 'small', plateSize: '18×25"' },
  { id: 'custom', label: 'Custom size...', w: 0, h: 0, plate: 'small', plateSize: '18×25"' },
];

// ─── PLATE DIMENSIONS ────────────────────────────────────────────────
const PLATE_DIMS: Record<string, { w: number; h: number }> = {
  '15×20"': { w: 15, h: 20 },
  '18×23"': { w: 18, h: 23 },
  '18×25"': { w: 18, h: 25 },
  '20×28"': { w: 20, h: 28 },
  '20×30"': { w: 20, h: 30 },
  '25×36"': { w: 25, h: 36 },
  '28×40"': { w: 28, h: 40 },
};

// ─── PARENT SHEETS ───────────────────────────────────────────────────
const PARENT_SHEETS: Record<string, { parent: string; cuts: number }> = {
  '15×20"': { parent: '20×30"', cuts: 2 },
  '18×23"': { parent: '23×36"', cuts: 2 },
  '18×25"': { parent: '25×36"', cuts: 2 },
  '20×28"': { parent: '20×28"', cuts: 1 },
  '20×30"': { parent: '20×30"', cuts: 1 },
  '25×36"': { parent: '25×36"', cuts: 1 },
};

// ─── LAMINATION OPTIONS ──────────────────────────────────────────────
const LAM_OPTIONS = [
  { id: 'none', label: 'No Lamination' },
  { id: 'gloss_thermal', label: 'Gloss Thermal' },
  { id: 'matt_thermal', label: 'Matt Thermal' },
  { id: 'velvet_thermal', label: 'Velvet Thermal' },
  { id: 'bopp_gloss', label: 'BOPP Gloss (cheaper)' },
  { id: 'bopp_matt', label: 'BOPP Matt (cheaper)' },
];

// ─── UV / COATING OPTIONS ────────────────────────────────────────────
const UV_OPTIONS = [
  { id: 'none', label: 'No UV / Coating' },
  { id: 'full_uv', label: 'Full UV' },
  { id: 'spot_uv', label: 'Spot UV' },
  { id: 'aqueous', label: 'Aqueous Coating' },
  { id: 'varnish', label: 'Varnish' },
  { id: 'uv_online', label: 'UV Dripoff Online' },
  { id: 'uv_offline', label: 'UV Dripoff Offline' },
];

// ─── BINDING OPTIONS ─────────────────────────────────────────────────
const BINDING_OPTIONS = [
  { id: 'none', label: 'No Binding' },
  { id: 'center_pin', label: 'Center Pin / Saddle Stitch (up to 32 pages)' },
  { id: 'perfect', label: 'Perfect Bind (32+ pages)' },
  { id: 'hard', label: 'Hard Bind / Case Bound' },
  { id: 'spiral', label: 'Spiral Bind' },
  { id: 'folding', label: 'Just Folding' },
  { id: 'cutting', label: 'Just Cutting' },
];

// ─── DEMO RATES (will come from subscriber database) ─────────────────
const DEMO_RATES = {
  plates: {
    small: { single: { fixed: 500, per1000: 200 }, two: { fixed: 800, per1000: 250 }, cmyk: { fixed: 2000, per1000: 400 }, five: { fixed: 2500, per1000: 450 }, five_coater: { fixed: 2800, per1000: 480 }, five_uv: { fixed: 3000, per1000: 500 } },
    medium: { single: { fixed: 700, per1000: 250 }, two: { fixed: 1200, per1000: 300 }, cmyk: { fixed: 2800, per1000: 500 }, five: { fixed: 3500, per1000: 550 }, five_coater: { fixed: 3800, per1000: 580 }, five_uv: { fixed: 4000, per1000: 600 } },
    large: { single: { fixed: 1000, per1000: 300 }, two: { fixed: 1800, per1000: 400 }, cmyk: { fixed: 4000, per1000: 600 }, five: { fixed: 5000, per1000: 700 }, five_coater: { fixed: 5500, per1000: 750 }, five_uv: { fixed: 6000, per1000: 800 } },
  },
  lamination: {
    gloss_thermal: { min: 800, per100sqin: 0.65 },
    matt_thermal: { min: 900, per100sqin: 0.70 },
    velvet_thermal: { min: 1200, per100sqin: 0.90 },
    bopp_gloss: { min: 600, per100sqin: 0.50 },
    bopp_matt: { min: 650, per100sqin: 0.55 },
  },
  uv: {
    full_uv: { min: 1000, per100sqin: 0.80 },
    spot_uv: { min: 1500, per100sqin: 1.20 },
    aqueous: { min: 600, per100sqin: 0.40 },
    varnish: { min: 500, per100sqin: 0.35 },
    uv_online: { min: 2000, per100sqin: 1.50 },
    uv_offline: { min: 1800, per100sqin: 1.30 },
  },
  binding: {
    center_pin: { perBindingFormat: 50 },
    perfect: { perBindingFormat: 80 },
    hard: { perBindingFormat: 150 },
    spiral: { perBindingFormat: 60 },
    folding: { perBindingFormat: 20 },
    cutting: { perBindingFormat: 15 },
  },
  markup: 25,
  tax: 18,
};

// ─── HELPER: Calculate UPS ───────────────────────────────────────────
function calcUps(finalW: number, finalH: number, plateKey: string): number {
  const plate = PLATE_DIMS[plateKey];
  if (!plate) return 1;
  const printW = plate.w - 0.5;
  const printH = plate.h - 0.5;
  const portrait = Math.floor(printW / finalW) * Math.floor(printH / finalH);
  const landscape = Math.floor(printW / finalH) * Math.floor(printH / finalW);
  return Math.max(portrait, landscape, 1);
}

// ─── HELPER: Get plate group key ─────────────────────────────────────
function getPlateGroup(plateSize: string): 'small' | 'medium' | 'large' {
  if (['15×20"', '18×23"', '18×25"'].includes(plateSize)) return 'small';
  if (['20×28"', '20×30"'].includes(plateSize)) return 'medium';
  return 'large';
}

export default function PrintCalcPage() {
  const [jobType, setJobType] = useState<'single' | 'book'>('single');

  // Single item fields
  const [selectedSize, setSelectedSize] = useState(FINAL_SIZES[2]); // A4 default
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [quantity, setQuantity] = useState('');
  const [colorOption, setColorOption] = useState('cmyk');
  const [sides, setSides] = useState<'single' | 'double'>('double');
  const [lamination, setLamination] = useState('none');
  const [lamSides, setLamSides] = useState<'single' | 'double'>('single');
  const [uvCoating, setUvCoating] = useState('none');

  // Book/Brochure fields
  const [totalPages, setTotalPages] = useState('');
  const [pageError, setPageError] = useState('');
  const [coverGSM, setCoverGSM] = useState('350');
  const [coverColor, setCoverColor] = useState('cmyk');
  const [coverLam, setCoverLam] = useState('none');
  const [coverLamSides, setCoverLamSides] = useState<'single' | 'double'>('single');
  const [coverUV, setCoverUV] = useState('none');
  const [innerGSM, setInnerGSM] = useState('130');
  const [innerColorType, setInnerColorType] = useState<'all' | 'mixed'>('all');
  const [innerColor, setInnerColor] = useState('cmyk');
  const [colorPages, setColorPages] = useState('');
  const [singlePages, setSinglePages] = useState('');
  const [innerUV, setInnerUV] = useState('none');
  const [binding, setBinding] = useState('center_pin');

  const [result, setResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  const getFinalSize = () => {
    if (selectedSize.id === 'custom') {
      return { w: parseFloat(customW) || 0, h: parseFloat(customH) || 0 };
    }
    return { w: selectedSize.w, h: selectedSize.h };
  };

  const getPlateSize = () => {
    if (selectedSize.id === 'custom') return '18×25"';
    return selectedSize.plateSize;
  };

  const validatePages = (val: string) => {
    const n = parseInt(val);
    if (!n) { setPageError(''); return; }
    if (n % 4 !== 0) setPageError('Pages must be divisible by 4 (e.g. 8, 12, 16, 20...)');
    else setPageError('');
  };

  const calculate = () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;

    setCalculating(true);

    const finalSize = getFinalSize();
    if (!finalSize.w || !finalSize.h) return;

    const plateKey = getPlateSize();
    const plateGroup = getPlateGroup(plateKey);
    const plateRates = DEMO_RATES.plates[plateGroup][colorOption as keyof typeof DEMO_RATES.plates.small];
    const ups = calcUps(finalSize.w, finalSize.h, plateKey);

    if (jobType === 'single') {
      // Working sheets
      const workingSheets = Math.ceil(qty / ups);

      // Impressions
      const totalImpressions = sides === 'double' ? workingSheets * 2 : workingSheets;

      // Plates needed (new plate every 50000 impressions)
      const platesNeeded = Math.ceil(totalImpressions / 50000);
      const plateFixed = plateRates.fixed * platesNeeded;
      const freeImpressions = 1000 * platesNeeded;
      const extraImpressions = Math.max(0, totalImpressions - freeImpressions);
      const extraRounded = Math.ceil(extraImpressions / 1000) * 1000;
      const impressionCost = (extraRounded / 1000) * plateRates.per1000;
      const printingCost = plateFixed + impressionCost;

      // Sheet area for lamination/UV
      const sheetArea = finalSize.w * finalSize.h;
      const sheetAreaPer100 = sheetArea / 100;

      // Lamination
      let lamCost = 0;
      if (lamination !== 'none') {
        const lamRates = DEMO_RATES.lamination[lamination as keyof typeof DEMO_RATES.lamination];
        const lamPerSheet = sheetAreaPer100 * lamRates.per100sqin;
        const lamSidesMultiplier = lamSides === 'double' ? 2 : 1;
        const lamTotal = lamPerSheet * lamSidesMultiplier * workingSheets;
        lamCost = Math.max(lamTotal, lamRates.min);
      }

      // UV/Coating
      let uvCost = 0;
      if (uvCoating !== 'none') {
        const uvRates = DEMO_RATES.uv[uvCoating as keyof typeof DEMO_RATES.uv];
        const uvTotal = (sheetAreaPer100 * uvRates.per100sqin) * workingSheets;
        uvCost = Math.max(uvTotal, uvRates.min);
      }

      const subtotal = printingCost + lamCost + uvCost;
      const afterMarkup = subtotal * (1 + DEMO_RATES.markup / 100);
      const taxAmount = afterMarkup * (DEMO_RATES.tax / 100);
      const finalPrice = afterMarkup + taxAmount;

      const parentInfo = PARENT_SHEETS[plateKey] || { parent: plateKey, cuts: 1 };

      setResult({
        jobType: 'single',
        ups,
        workingSheets,
        parentSheet: parentInfo.parent,
        parentSheets: Math.ceil(workingSheets / parentInfo.cuts),
        totalImpressions,
        platesNeeded,
        plateFixed,
        impressionCost,
        printingCost,
        lamCost,
        uvCost,
        subtotal,
        markupAmount: afterMarkup - subtotal,
        taxAmount,
        finalPrice,
        plateKey,
        plateGroup,
      });

    } else {
      // BOOK / BROCHURE
      const pages = parseInt(totalPages);
      if (!pages || pages % 4 !== 0) return;

      const coverPages = 4;
      const innerPages = pages - coverPages;
      const bindingFormats = pages / (ups * 2);

      // COVER calculation
      const coverWorkingSheets = Math.ceil(qty / ups);
      const coverImpressions = coverWorkingSheets * 2; // always double side
      const coverPlateRates = DEMO_RATES.plates[plateGroup][coverColor as keyof typeof DEMO_RATES.plates.small];
      const coverPlatesNeeded = Math.ceil(coverImpressions / 50000);
      const coverPlateFixed = coverPlateRates.fixed * coverPlatesNeeded;
      const coverFreeImp = 1000 * coverPlatesNeeded;
      const coverExtraImp = Math.max(0, coverImpressions - coverFreeImp);
      const coverExtraRounded = Math.ceil(coverExtraImp / 1000) * 1000;
      const coverImpCost = (coverExtraRounded / 1000) * coverPlateRates.per1000;
      const coverPrintCost = coverPlateFixed + coverImpCost;

      // Cover lamination
      const sheetArea = finalSize.w * finalSize.h;
      const sheetAreaPer100 = sheetArea / 100;
      let coverLamCost = 0;
      if (coverLam !== 'none') {
        const lamRates = DEMO_RATES.lamination[coverLam as keyof typeof DEMO_RATES.lamination];
        const lamPerSheet = sheetAreaPer100 * lamRates.per100sqin;
        const lamTotal = lamPerSheet * (coverLamSides === 'double' ? 2 : 1) * coverWorkingSheets;
        coverLamCost = Math.max(lamTotal, lamRates.min);
      }

      // Cover UV
      let coverUVCost = 0;
      if (coverUV !== 'none') {
        const uvRates = DEMO_RATES.uv[coverUV as keyof typeof DEMO_RATES.uv];
        coverUVCost = Math.max((sheetAreaPer100 * uvRates.per100sqin) * coverWorkingSheets, uvRates.min);
      }

      // INNER calculation
      const innerBindingFormats = innerPages / (ups * 2);
      const innerWorkingSheets = Math.ceil(qty * innerBindingFormats);
      const innerImpressions = innerWorkingSheets * 2;

      let innerPrintCost = 0;
      if (innerColorType === 'all') {
        const innerPlateRates = DEMO_RATES.plates[plateGroup][innerColor as keyof typeof DEMO_RATES.plates.small];
        const innerPlatesNeeded = Math.ceil(innerImpressions / 50000);
        const innerPlateFixed = innerPlateRates.fixed * innerPlatesNeeded;
        const innerExtraImp = Math.max(0, innerImpressions - 1000 * innerPlatesNeeded);
        const innerExtraRounded = Math.ceil(innerExtraImp / 1000) * 1000;
        innerPrintCost = innerPlateFixed + (innerExtraRounded / 1000) * innerPlateRates.per1000;
      } else {
        // Mixed — color pages + single pages
        const cPages = parseInt(colorPages) || 0;
        const sPages = parseInt(singlePages) || 0;
        const cWorkSheets = Math.ceil(qty * (cPages / (ups * 2)));
        const sWorkSheets = Math.ceil(qty * (sPages / (ups * 2)));
        const cImpressions = cWorkSheets * 2;
        const sImpressions = sWorkSheets * 2;
        const cmykRates = DEMO_RATES.plates[plateGroup]['cmyk'];
        const singleRates = DEMO_RATES.plates[plateGroup]['single'];
        const cExtraRounded = Math.ceil(Math.max(0, cImpressions - 1000) / 1000) * 1000;
        const sExtraRounded = Math.ceil(Math.max(0, sImpressions - 1000) / 1000) * 1000;
        innerPrintCost =
          (cmykRates.fixed + (cExtraRounded / 1000) * cmykRates.per1000) +
          (singleRates.fixed + (sExtraRounded / 1000) * singleRates.per1000);
      }

      // Inner UV
      let innerUVCost = 0;
      if (innerUV !== 'none') {
        const uvRates = DEMO_RATES.uv[innerUV as keyof typeof DEMO_RATES.uv];
        innerUVCost = Math.max((sheetAreaPer100 * uvRates.per100sqin) * innerWorkingSheets, uvRates.min);
      }

      // Binding
      let bindingCost = 0;
      if (binding !== 'none') {
        const bindRates = DEMO_RATES.binding[binding as keyof typeof DEMO_RATES.binding];
        bindingCost = Math.ceil(bindingFormats) * bindRates.perBindingFormat * qty;
      }

      const subtotal = coverPrintCost + coverLamCost + coverUVCost + innerPrintCost + innerUVCost + bindingCost;
      const afterMarkup = subtotal * (1 + DEMO_RATES.markup / 100);
      const taxAmount = afterMarkup * (DEMO_RATES.tax / 100);
      const finalPrice = afterMarkup + taxAmount;

      const parentInfo = PARENT_SHEETS[plateKey] || { parent: plateKey, cuts: 1 };

      setResult({
        jobType: 'book',
        ups,
        bindingFormats: bindingFormats.toFixed(2),
        coverWorkingSheets,
        innerWorkingSheets,
        parentSheet: parentInfo.parent,
        coverPrintCost,
        coverLamCost,
        coverUVCost,
        innerPrintCost,
        innerUVCost,
        bindingCost,
        subtotal,
        markupAmount: afterMarkup - subtotal,
        taxAmount,
        finalPrice,
      });
    }

    setCalculating(false);
  };

  useEffect(() => {
    if (quantity && parseInt(quantity) > 0) {
      const timer = setTimeout(calculate, 500);
      return () => clearTimeout(timer);
    } else {
      setResult(null);
    }
  }, [jobType, selectedSize, customW, customH, quantity, colorOption, sides, lamination, lamSides, uvCoating, totalPages, coverGSM, coverColor, coverLam, coverLamSides, coverUV, innerGSM, innerColorType, innerColor, colorPages, singlePages, innerUV, binding]);

  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .topbar { background: #1A1A1A; height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
        .topbar-brand { display: flex; align-items: center; gap: 8px; }
        .topbar-dot { width: 8px; height: 8px; background: #C84B31; border-radius: 50%; }
        .topbar-name { font-size: 13px; font-weight: 500; color: #fff; }
        .topbar-right { display: flex; align-items: center; gap: 16px; }
        .topbar-link { font-size: 13px; color: #AAA; text-decoration: none; }
        .topbar-link:hover { color: #fff; }
        .page { min-height: calc(100vh - 52px); padding: 32px 16px 64px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { margin-bottom: 28px; }
        .title { font-size: 28px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.02em; line-height: 1.2; margin-top: 24px; }
        .subtitle { font-size: 14px; color: #888; margin-top: 6px; }
        .card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #EBEBEB; }
        .section-label { font-size: 11px; font-weight: 600; color: #999; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
        .field { margin-bottom: 16px; }
        .field:last-child { margin-bottom: 0; }
        .field-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: center; }
        .field-hint { font-size: 11px; color: #AAA; }
        select, input[type="number"], input[type="text"] { width: 100%; padding: 10px 14px; border: 1.5px solid #E8E8E8; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; transition: border-color 0.15s; appearance: none; -webkit-appearance: none; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
        select:focus, input:focus { border-color: #C84B31; background: #fff; }
        input::placeholder { color: #CCC; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .toggle-wrap { display: flex; gap: 8px; }
        .toggle-btn { flex: 1; padding: 10px; border: 1.5px solid #E8E8E8; border-radius: 10px; font-size: 13px; font-weight: 500; color: #888; background: #FAFAFA; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: center; }
        .toggle-btn.active { border-color: #1A1A1A; background: #1A1A1A; color: #fff; }
        .divider { height: 1px; background: #F0F0F0; margin: 18px 0; }
        .sub-card { background: #F9F9F9; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #F0F0F0; }
        .sub-card-title { font-size: 12px; font-weight: 600; color: #C84B31; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
        .error-text { font-size: 12px; color: #E53E3E; margin-top: 4px; }
        .custom-size-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
        .result-card { background: #1A1A1A; border-radius: 16px; padding: 28px; margin-bottom: 12px; position: relative; overflow: hidden; }
        .result-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: #C84B31; border-radius: 50%; opacity: 0.08; }
        .result-total-label { font-size: 13px; color: #666; margin-bottom: 4px; }
        .result-total-price { font-size: 42px; font-weight: 600; color: #fff; letter-spacing: -0.03em; font-family: 'DM Mono', monospace; line-height: 1; margin-bottom: 24px; }
        .result-currency { font-size: 24px; vertical-align: super; font-weight: 400; margin-right: 2px; }
        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .result-item { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
        .result-item-label { font-size: 11px; color: #666; margin-bottom: 4px; }
        .result-item-value { font-size: 16px; font-weight: 500; color: #fff; font-family: 'DM Mono', monospace; }
        .breakdown-card { background: #fff; border-radius: 16px; border: 1px solid #EBEBEB; overflow: hidden; margin-bottom: 12px; }
        .breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #F5F5F5; }
        .breakdown-row:last-child { border-bottom: none; }
        .breakdown-key { font-size: 13px; color: #888; }
        .breakdown-val { font-size: 13px; font-weight: 500; color: #1A1A1A; font-family: 'DM Mono', monospace; }
        .gst-card { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 16px; overflow: hidden; }
        .gst-header { padding: 10px 20px; background: #FDE68A; }
        .gst-header-text { font-size: 11px; font-weight: 600; color: #78350F; letter-spacing: 0.08em; text-transform: uppercase; }
        .gst-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #FDE68A; }
        .gst-row:last-child { border-bottom: none; }
        .gst-key { font-size: 13px; color: #92400E; }
        .gst-val { font-size: 13px; font-weight: 600; color: #92400E; font-family: 'DM Mono', monospace; }
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-icon { font-size: 32px; margin-bottom: 12px; }
        .empty-text { font-size: 14px; color: #BBB; }
        .info-badge { display: inline-block; padding: 3px 10px; background: #EEF4FA; color: #185FA5; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px; font-family: 'DM Mono', monospace; }
        .demo-notice { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #92400E; }
        @media (max-width: 480px) {
          .result-total-price { font-size: 34px; }
          .card { padding: 18px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-dot" />
          <span className="topbar-name">PrintCalc</span>
        </div>
        <div className="topbar-right">
          <a href="/" className="topbar-link">Paper Calc</a>
          <a href="/dashboard" className="topbar-link">Dashboard</a>
        </div>
      </div>

      <main className="page">
        <div className="container">

          <div className="header">
            <h1 className="title">Printing Cost<br />Calculator</h1>
            <p className="subtitle">Complete job costing — printing, lamination, binding and more</p>
          </div>

          <div className="demo-notice">
            ⚡ Demo rates are shown. Login to use your own rates from dashboard.
          </div>

          {/* Job Type */}
          <div className="card">
            <p className="section-label">Job Type</p>
            <div className="toggle-wrap">
              <button className={`toggle-btn ${jobType === 'single' ? 'active' : ''}`} onClick={() => setJobType('single')}>
                📄 Single Item
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>Leaflet / Poster / Card</div>
              </button>
              <button className={`toggle-btn ${jobType === 'book' ? 'active' : ''}`} onClick={() => setJobType('book')}>
                📚 Brochure / Book
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>Multi page with binding</div>
              </button>
            </div>
          </div>

          {/* Job Details */}
          <div className="card">
            <p className="section-label">Job Details</p>

            {/* Final Size */}
            <div className="field">
              <div className="field-label">Final size</div>
              <select value={selectedSize.id} onChange={e => {
                const s = FINAL_SIZES.find(x => x.id === e.target.value);
                if (s) setSelectedSize(s);
              }}>
                <optgroup label="── A Series ──">
                  {FINAL_SIZES.filter(s => s.id.startsWith('a')).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
                <optgroup label="── American Standard ──">
                  {FINAL_SIZES.filter(s => s.id.startsWith('am')).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
                <optgroup label="── B Series ──">
                  {FINAL_SIZES.filter(s => s.id.startsWith('b')).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
                <optgroup label="── Other ──">
                  {FINAL_SIZES.filter(s => ['vc', 'dl', 'custom'].includes(s.id)).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              </select>
              {selectedSize.id !== 'custom' && (
                <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#AAA', fontFamily: 'monospace' }}>
                    Plate: {selectedSize.plateSize}
                  </span>
                  <span className="info-badge">
                    {calcUps(selectedSize.w, selectedSize.h, selectedSize.plateSize)} ups
                  </span>
                </div>
              )}
              {selectedSize.id === 'custom' && (
                <div className="custom-size-wrap">
                  <input type="number" placeholder='Width (inches)' value={customW} onChange={e => setCustomW(e.target.value)} />
                  <input type="number" placeholder='Height (inches)' value={customH} onChange={e => setCustomH(e.target.value)} />
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="field">
              <div className="field-label">
                Quantity
                <span className="field-hint">pieces</span>
              </div>
              <input type="number" placeholder="Enter quantity" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
            </div>

            {/* Pages — book only */}
            {jobType === 'book' && (
              <div className="field">
                <div className="field-label">
                  Total pages
                  <span className="field-hint">must be ÷ 4</span>
                </div>
                <input type="number" placeholder="e.g. 8, 12, 16, 24, 32..." value={totalPages}
                  onChange={e => { setTotalPages(e.target.value); validatePages(e.target.value); }} />
                {pageError && <p className="error-text">⚠ {pageError}</p>}
                {totalPages && !pageError && parseInt(totalPages) >= 8 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#AAA' }}>Cover: 4 pages</span>
                    <span style={{ fontSize: 11, color: '#AAA' }}>Inner: {parseInt(totalPages) - 4} pages</span>
                    <span className="info-badge">
                      {(parseInt(totalPages) / (calcUps(selectedSize.w, selectedSize.h, selectedSize.plateSize) * 2)).toFixed(1)} binding formats
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SINGLE ITEM — Printing options */}
          {jobType === 'single' && (
            <div className="card">
              <p className="section-label">Printing</p>

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

              <div className="divider" />

              <div className="field">
                <div className="field-label">Lamination</div>
                <select value={lamination} onChange={e => setLamination(e.target.value)}>
                  {LAM_OPTIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
                {lamination !== 'none' && (
                  <div className="toggle-wrap" style={{ marginTop: 8 }}>
                    <button className={`toggle-btn ${lamSides === 'single' ? 'active' : ''}`} onClick={() => setLamSides('single')}>Single side</button>
                    <button className={`toggle-btn ${lamSides === 'double' ? 'active' : ''}`} onClick={() => setLamSides('double')}>Both sides</button>
                  </div>
                )}
              </div>

              <div className="field">
                <div className="field-label">UV / Coating</div>
                <select value={uvCoating} onChange={e => setUvCoating(e.target.value)}>
                  {UV_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* BOOK — Cover + Inner */}
          {jobType === 'book' && (
            <>
              {/* COVER */}
              <div className="card">
                <p className="section-label">Cover (4 pages)</p>

                <div className="sub-card">
                  <p className="sub-card-title">Paper</p>
                  <div className="field">
                    <div className="field-label">Cover GSM</div>
                    <input type="number" value={coverGSM} onChange={e => setCoverGSM(e.target.value)} placeholder="e.g. 350" />
                  </div>
                </div>

                <div className="sub-card">
                  <p className="sub-card-title">Printing</p>
                  <div className="field">
                    <div className="field-label">Colors</div>
                    <select value={coverColor} onChange={e => setCoverColor(e.target.value)}>
                      {COLOR_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sub-card">
                  <p className="sub-card-title">Lamination (optional)</p>
                  <select value={coverLam} onChange={e => setCoverLam(e.target.value)}>
                    {LAM_OPTIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  {coverLam !== 'none' && (
                    <div className="toggle-wrap" style={{ marginTop: 8 }}>
                      <button className={`toggle-btn ${coverLamSides === 'single' ? 'active' : ''}`} onClick={() => setCoverLamSides('single')}>Single side</button>
                      <button className={`toggle-btn ${coverLamSides === 'double' ? 'active' : ''}`} onClick={() => setCoverLamSides('double')}>Both sides</button>
                    </div>
                  )}
                </div>

                <div className="sub-card" style={{ marginBottom: 0 }}>
                  <p className="sub-card-title">UV / Coating (optional)</p>
                  <select value={coverUV} onChange={e => setCoverUV(e.target.value)}>
                    {UV_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {/* INNER PAGES */}
              <div className="card">
                <p className="section-label">Inner Pages ({parseInt(totalPages) > 4 ? parseInt(totalPages) - 4 : '—'} pages)</p>

                <div className="sub-card">
                  <p className="sub-card-title">Paper</p>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <div className="field-label">Inner GSM</div>
                    <input type="number" value={innerGSM} onChange={e => setInnerGSM(e.target.value)} placeholder="e.g. 130" />
                  </div>
                </div>

                <div className="sub-card">
                  <p className="sub-card-title">Printing Colors</p>
                  <div className="toggle-wrap" style={{ marginBottom: 12 }}>
                    <button className={`toggle-btn ${innerColorType === 'all' ? 'active' : ''}`} onClick={() => setInnerColorType('all')}>All same color</button>
                    <button className={`toggle-btn ${innerColorType === 'mixed' ? 'active' : ''}`} onClick={() => setInnerColorType('mixed')}>Mixed colors</button>
                  </div>

                  {innerColorType === 'all' && (
                    <select value={innerColor} onChange={e => setInnerColor(e.target.value)}>
                      {COLOR_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  )}

                  {innerColorType === 'mixed' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Color pages (CMYK)</p>
                        <input type="number" value={colorPages} onChange={e => setColorPages(e.target.value)} placeholder="No. of pages" />
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Single color pages</p>
                        <input type="number" value={singlePages} onChange={e => setSinglePages(e.target.value)} placeholder="No. of pages" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="sub-card" style={{ marginBottom: 0 }}>
                  <p className="sub-card-title">UV / Coating (optional)</p>
                  <select value={innerUV} onChange={e => setInnerUV(e.target.value)}>
                    {UV_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {/* BINDING */}
              <div className="card">
                <p className="section-label">Binding</p>
                <select value={binding} onChange={e => setBinding(e.target.value)}>
                  {BINDING_OPTIONS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
            </>
          )}

          {/* RESULTS */}
          {result ? (
            <div>
              <div className="result-card">
                <p className="result-total-label">Total price (incl. GST)</p>
                <p className="result-total-price">
                  <span className="result-currency">₹</span>
                  {fmt(result.finalPrice)}
                </p>
                <div className="result-grid">
                  <div className="result-item">
                    <p className="result-item-label">Per piece</p>
                    <p className="result-item-value">₹{fmt(result.finalPrice / parseInt(quantity))}</p>
                  </div>
                  <div className="result-item">
                    <p className="result-item-label">{result.jobType === 'single' ? 'Working sheets' : 'Binding formats'}</p>
                    <p className="result-item-value">{result.jobType === 'single' ? result.workingSheets?.toLocaleString() : result.bindingFormats}</p>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="breakdown-card">
                {result.jobType === 'single' ? (
                  <>
                    <div className="breakdown-row"><span className="breakdown-key">Plate fixed charge</span><span className="breakdown-val">₹{fmt(result.plateFixed)}</span></div>
                    <div className="breakdown-row"><span className="breakdown-key">Impression charges</span><span className="breakdown-val">₹{fmt(result.impressionCost)}</span></div>
                    {result.lamCost > 0 && <div className="breakdown-row"><span className="breakdown-key">Lamination</span><span className="breakdown-val">₹{fmt(result.lamCost)}</span></div>}
                    {result.uvCost > 0 && <div className="breakdown-row"><span className="breakdown-key">UV / Coating</span><span className="breakdown-val">₹{fmt(result.uvCost)}</span></div>}
                  </>
                ) : (
                  <>
                    <div className="breakdown-row"><span className="breakdown-key">Cover printing</span><span className="breakdown-val">₹{fmt(result.coverPrintCost)}</span></div>
                    {result.coverLamCost > 0 && <div className="breakdown-row"><span className="breakdown-key">Cover lamination</span><span className="breakdown-val">₹{fmt(result.coverLamCost)}</span></div>}
                    {result.coverUVCost > 0 && <div className="breakdown-row"><span className="breakdown-key">Cover UV</span><span className="breakdown-val">₹{fmt(result.coverUVCost)}</span></div>}
                    <div className="breakdown-row"><span className="breakdown-key">Inner pages printing</span><span className="breakdown-val">₹{fmt(result.innerPrintCost)}</span></div>
                    {result.innerUVCost > 0 && <div className="breakdown-row"><span className="breakdown-key">Inner UV / Coating</span><span className="breakdown-val">₹{fmt(result.innerUVCost)}</span></div>}
                    {result.bindingCost > 0 && <div className="breakdown-row"><span className="breakdown-key">Binding</span><span className="breakdown-val">₹{fmt(result.bindingCost)}</span></div>}
                  </>
                )}
                <div className="breakdown-row" style={{ background: '#F9F9F9' }}>
                  <span className="breakdown-key" style={{ fontWeight: 600, color: '#1A1A1A' }}>Subtotal (before tax)</span>
                  <span className="breakdown-val" style={{ fontWeight: 600 }}>₹{fmt(result.subtotal)}</span>
                </div>
              </div>

              {/* GST Breakdown */}
              <div className="gst-card">
                <div className="gst-header"><p className="gst-header-text">GST / Tax Breakdown</p></div>
                <div className="gst-row"><span className="gst-key">Base price (before tax)</span><span className="gst-val">₹{fmt(result.subtotal)}</span></div>
                <div className="gst-row"><span className="gst-key">Markup ({DEMO_RATES.markup}%)</span><span className="gst-val">₹{fmt(result.markupAmount)}</span></div>
                <div className="gst-row"><span className="gst-key">GST @ {DEMO_RATES.tax}%</span><span className="gst-val">₹{fmt(result.taxAmount)}</span></div>
                <div className="gst-row">
                  <span className="gst-key" style={{ fontWeight: 600, color: '#78350F' }}>Total incl. GST</span>
                  <span className="gst-val" style={{ fontSize: 15 }}>₹{fmt(result.finalPrice)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card empty-state">
              <p className="empty-icon">🖨️</p>
              <p className="empty-text">Enter quantity above to see instant pricing</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 12, color: '#CCC' }}>Demo rates · Login to use your own rates · GST @ {DEMO_RATES.tax}%</p>
          </div>

        </div>
      </main>
    </>
  );
}
