'use client';
import { useState, useEffect } from 'react';

const SHEET_SIZES = [
  { name: '23 × 36"', length: 23, width: 36 },
  { name: '25 × 36"', length: 25, width: 36 },
  { name: '20 × 30"', length: 20, width: 30 },
  { name: '20 × 28"', length: 20, width: 28 },
  { name: '31.5 × 41.5"', length: 31.5, width: 41.5 },
  { name: '25 × 38"', length: 25, width: 38 },
  { name: '22 × 28"', length: 22, width: 28 },
  { name: '22.5 × 35"', length: 22.5, width: 35 },
  { name: '18 × 23"', length: 18, width: 23 },
];

// Paper catalogue — in future this comes from Supabase database
// inStock: false = shows OUT OF STOCK badge but price still visible
const PAPER_CATALOGUE = [
  // Maplitho
  { id: 'map60', category: 'Maplitho', gsm: 60, label: 'Maplitho 60 GSM', ratePerKg: 68, inStock: true },
  { id: 'map70', category: 'Maplitho', gsm: 70, label: 'Maplitho 70 GSM', ratePerKg: 70, inStock: true },
  { id: 'map80', category: 'Maplitho', gsm: 80, label: 'Maplitho 80 GSM', ratePerKg: 72, inStock: true },
  // Art Paper
  { id: 'art80', category: 'Art Paper', gsm: 80, label: 'Art Paper 80 GSM', ratePerKg: 85, inStock: true },
  { id: 'art90', category: 'Art Paper', gsm: 90, label: 'Art Paper 90 GSM', ratePerKg: 87, inStock: true },
  { id: 'art100', category: 'Art Paper', gsm: 100, label: 'Art Paper 100 GSM', ratePerKg: 89, inStock: true },
  { id: 'art130', category: 'Art Paper', gsm: 130, label: 'Art Paper 130 GSM', ratePerKg: 92, inStock: true },
  // Art Card 170-230
  { id: 'ac170', category: 'Art Card', gsm: 170, label: 'Art Card 170 GSM', ratePerKg: 95, inStock: true },
  { id: 'ac200', category: 'Art Card', gsm: 200, label: 'Art Card 200 GSM', ratePerKg: 97, inStock: false },
  { id: 'ac210', category: 'Art Card', gsm: 210, label: 'Art Card 210 GSM', ratePerKg: 98, inStock: true },
  { id: 'ac230', category: 'Art Card', gsm: 230, label: 'Art Card 230 GSM', ratePerKg: 99, inStock: true },
  // Art Card Heavy 250-380
  { id: 'ach250', category: 'Art Card Heavy', gsm: 250, label: 'Art Card 250 GSM', ratePerKg: 102, inStock: true },
  { id: 'ach280', category: 'Art Card Heavy', gsm: 280, label: 'Art Card 280 GSM', ratePerKg: 104, inStock: true },
  { id: 'ach300', category: 'Art Card Heavy', gsm: 300, label: 'Art Card 300 GSM', ratePerKg: 106, inStock: true },
  { id: 'ach350', category: 'Art Card Heavy', gsm: 350, label: 'Art Card 350 GSM', ratePerKg: 108, inStock: false },
  { id: 'ach380', category: 'Art Card Heavy', gsm: 380, label: 'Art Card 380 GSM', ratePerKg: 110, inStock: true },
  // Art Card Extra Heavy 400-500
  { id: 'ace400', category: 'Art Card Extra Heavy', gsm: 400, label: 'Art Card 400 GSM', ratePerKg: 114, inStock: true },
  { id: 'ace450', category: 'Art Card Extra Heavy', gsm: 450, label: 'Art Card 450 GSM', ratePerKg: 116, inStock: true },
  { id: 'ace500', category: 'Art Card Extra Heavy', gsm: 500, label: 'Art Card 500 GSM', ratePerKg: 118, inStock: false },
  // FBB / Ultima / SBS
  { id: 'fbb200', category: 'FBB / Ultima / SBS', gsm: 200, label: 'FBB / Ultima / SBS 200 GSM', ratePerKg: 120, inStock: true },
  { id: 'fbb230', category: 'FBB / Ultima / SBS', gsm: 230, label: 'FBB / Ultima / SBS 230 GSM', ratePerKg: 122, inStock: true },
  { id: 'fbb250', category: 'FBB / Ultima / SBS', gsm: 250, label: 'FBB / Ultima / SBS 250 GSM', ratePerKg: 124, inStock: true },
  { id: 'fbb280', category: 'FBB / Ultima / SBS', gsm: 280, label: 'FBB / Ultima / SBS 280 GSM', ratePerKg: 126, inStock: true },
  { id: 'fbb300', category: 'FBB / Ultima / SBS', gsm: 300, label: 'FBB / Ultima / SBS 300 GSM', ratePerKg: 128, inStock: false },
  { id: 'fbb320', category: 'FBB / Ultima / SBS', gsm: 320, label: 'FBB / Ultima / SBS 320 GSM', ratePerKg: 130, inStock: true },
  { id: 'fbb350', category: 'FBB / Ultima / SBS', gsm: 350, label: 'FBB / Ultima / SBS 350 GSM', ratePerKg: 132, inStock: true },
  { id: 'fbb380', category: 'FBB / Ultima / SBS', gsm: 380, label: 'FBB / Ultima / SBS 380 GSM', ratePerKg: 134, inStock: true },
  { id: 'fbb400', category: 'FBB / Ultima / SBS', gsm: 400, label: 'FBB / Ultima / SBS 400 GSM', ratePerKg: 136, inStock: true },
  // Duplex Grey Back
  { id: 'dgb200', category: 'Duplex Grey Back', gsm: 200, label: 'Duplex Grey Back 200 GSM', ratePerKg: 58, inStock: true },
  { id: 'dgb230', category: 'Duplex Grey Back', gsm: 230, label: 'Duplex Grey Back 230 GSM', ratePerKg: 59, inStock: true },
  { id: 'dgb250', category: 'Duplex Grey Back', gsm: 250, label: 'Duplex Grey Back 250 GSM', ratePerKg: 60, inStock: true },
  { id: 'dgb280', category: 'Duplex Grey Back', gsm: 280, label: 'Duplex Grey Back 280 GSM', ratePerKg: 61, inStock: false },
  { id: 'dgb300', category: 'Duplex Grey Back', gsm: 300, label: 'Duplex Grey Back 300 GSM', ratePerKg: 62, inStock: true },
  { id: 'dgb320', category: 'Duplex Grey Back', gsm: 320, label: 'Duplex Grey Back 320 GSM', ratePerKg: 63, inStock: true },
  { id: 'dgb350', category: 'Duplex Grey Back', gsm: 350, label: 'Duplex Grey Back 350 GSM', ratePerKg: 64, inStock: true },
  { id: 'dgb380', category: 'Duplex Grey Back', gsm: 380, label: 'Duplex Grey Back 380 GSM', ratePerKg: 65, inStock: true },
  { id: 'dgb400', category: 'Duplex Grey Back', gsm: 400, label: 'Duplex Grey Back 400 GSM', ratePerKg: 66, inStock: true },
  // Duplex White Back
  { id: 'dwb200', category: 'Duplex White Back', gsm: 200, label: 'Duplex White Back 200 GSM', ratePerKg: 62, inStock: true },
  { id: 'dwb230', category: 'Duplex White Back', gsm: 230, label: 'Duplex White Back 230 GSM', ratePerKg: 63, inStock: true },
  { id: 'dwb250', category: 'Duplex White Back', gsm: 250, label: 'Duplex White Back 250 GSM', ratePerKg: 64, inStock: true },
  { id: 'dwb280', category: 'Duplex White Back', gsm: 280, label: 'Duplex White Back 280 GSM', ratePerKg: 65, inStock: true },
  { id: 'dwb300', category: 'Duplex White Back', gsm: 300, label: 'Duplex White Back 300 GSM', ratePerKg: 66, inStock: false },
  { id: 'dwb320', category: 'Duplex White Back', gsm: 320, label: 'Duplex White Back 320 GSM', ratePerKg: 67, inStock: true },
  { id: 'dwb350', category: 'Duplex White Back', gsm: 350, label: 'Duplex White Back 350 GSM', ratePerKg: 68, inStock: true },
  { id: 'dwb380', category: 'Duplex White Back', gsm: 380, label: 'Duplex White Back 380 GSM', ratePerKg: 69, inStock: true },
  { id: 'dwb400', category: 'Duplex White Back', gsm: 400, label: 'Duplex White Back 400 GSM', ratePerKg: 70, inStock: true },
];

// Admin-only settings — will come from Supabase in next phase
const MARKUP = 25;
const TAX = 18;

interface Result {
  pricePerSheet: string;
  pricePerRream: string;
  totalSheets: number;
  totalWeight: string;
  rawCost: string;
  markupAmount: string;
  taxAmount: string;
  finalPrice: string;
  inStock: boolean;
}

export default function Home() {
  const [size, setSize] = useState(SHEET_SIZES[0]);
  const [selectedPaper, setSelectedPaper] = useState(PAPER_CATALOGUE[3]); // Art Paper 80gsm default
  const [quantity, setQuantity] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  useEffect(() => {
    if (!quantity || parseInt(quantity) <= 0) {
      setResult(null);
      return;
    }
    setCalculating(true);
    const timer = setTimeout(() => {
      calculate();
    }, 400);
    return () => clearTimeout(timer);
  }, [size, selectedPaper, quantity]);

  const calculate = () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;

    const BASE_FACTOR = 0.2666;
    const BASE_SQIN = 828;
    const factor = (size.length * size.width * BASE_FACTOR) / BASE_SQIN;
    const weightPerRream = factor * selectedPaper.gsm;
    const costPerRream = weightPerRream * selectedPaper.ratePerKg;
    const costPerSheet = costPerRream / 500;

    const totalSheets = qty;
    const totalWeight = (weightPerRream / 500) * totalSheets;
    const rawCost = costPerSheet * totalSheets;
    const markupAmount = rawCost * (MARKUP / 100);
    const afterMarkup = rawCost + markupAmount;
    const taxAmount = afterMarkup * (TAX / 100);
    const finalPrice = afterMarkup + taxAmount;

    setResult({
      pricePerSheet: costPerSheet.toFixed(4),
      pricePerRream: costPerRream.toFixed(2),
      totalSheets,
      totalWeight: totalWeight.toFixed(2),
      rawCost: rawCost.toFixed(2),
      markupAmount: markupAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      inStock: selectedPaper.inStock,
    });
    setCalculating(false);
  };

  const inchToMm = (inch: number) => (inch * 25.4).toFixed(1);
  const inchToCm = (inch: number) => (inch * 2.54).toFixed(1);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .page { min-height: 100vh; padding: 32px 16px 64px; }
        .container { max-width: 520px; margin: 0 auto; }
        .header { margin-bottom: 32px; }
        .header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .logo-dot { width: 10px; height: 10px; background: #C84B31; border-radius: 50%; flex-shrink: 0; }
        .brand { font-size: 13px; font-weight: 500; color: #888; letter-spacing: 0.08em; text-transform: uppercase; }
        .title { font-size: 30px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.02em; line-height: 1.2; }
        .subtitle { font-size: 14px; color: #888; margin-top: 6px; }
        .card { background: #fff; border-radius: 16px; padding: 28px; margin-bottom: 16px; border: 1px solid #EBEBEB; }
        .section-label { font-size: 11px; font-weight: 600; color: #999; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
        .field { margin-bottom: 18px; }
        .field:last-child { margin-bottom: 0; }
        .field-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: center; }
        .field-hint { font-size: 11px; color: #AAA; font-weight: 400; }
        select, input[type="number"] {
          width: 100%; padding: 11px 14px; border: 1.5px solid #E8E8E8;
          border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif;
          color: #1A1A1A; background: #FAFAFA; outline: none;
          transition: border-color 0.15s, background 0.15s;
          appearance: none; -webkit-appearance: none;
        }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
        select:focus, input[type="number"]:focus { border-color: #C84B31; background: #fff; }
        input[type="number"]::placeholder { color: #CCC; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .size-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
        .size-sublabel { font-size: 11px; color: #AAA; font-family: 'DM Mono', monospace; }
        .convert-btn { font-size: 11px; color: #C84B31; background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500; padding: 0; }
        .converter-box { background: #FFF8F6; border: 1px solid #FFD5CC; border-radius: 8px; padding: 10px 14px; margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .conv-item { text-align: center; }
        .conv-unit { font-size: 10px; color: #C84B31; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
        .conv-val { font-size: 13px; font-weight: 500; color: #1A1A1A; font-family: 'DM Mono', monospace; }
        .stock-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
        .badge-out { background: #FFF0F0; color: #E53E3E; border: 1px solid #FEB2B2; }
        .badge-in { background: #F0FFF4; color: #38A169; border: 1px solid #9AE6B4; }
        .paper-select-wrap { position: relative; }
        .out-of-stock-select { border-color: #FEB2B2 !important; color: #E53E3E !important; }
        .qty-input-wrap { position: relative; }
        .qty-suffix { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #AAA; pointer-events: none; }
        .divider { height: 1px; background: #F0F0F0; margin: 20px 0; }
        .result-card { background: #1A1A1A; border-radius: 16px; padding: 28px; margin-bottom: 12px; position: relative; overflow: hidden; }
        .result-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: #C84B31; border-radius: 50%; opacity: 0.08; }
        .result-out-of-stock { position: absolute; top: 16px; right: 16px; }
        .result-total-label { font-size: 13px; color: #666; margin-bottom: 4px; }
        .result-total-price { font-size: 42px; font-weight: 600; color: #fff; letter-spacing: -0.03em; font-family: 'DM Mono', monospace; line-height: 1; margin-bottom: 24px; }
        .result-currency { font-size: 24px; vertical-align: super; font-weight: 400; margin-right: 2px; }
        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .result-item { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
        .result-item-label { font-size: 11px; color: #666; margin-bottom: 4px; }
        .result-item-value { font-size: 18px; font-weight: 500; color: #fff; font-family: 'DM Mono', monospace; }
        .details-card { background: #fff; border-radius: 16px; border: 1px solid #EBEBEB; overflow: hidden; margin-bottom: 12px; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 20px; border-bottom: 1px solid #F5F5F5; }
        .detail-row:last-child { border-bottom: none; }
        .detail-key { font-size: 13px; color: #888; }
        .detail-val { font-size: 13px; font-weight: 500; color: #1A1A1A; font-family: 'DM Mono', monospace; }
        .gst-card { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 16px; overflow: hidden; }
        .gst-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 20px; border-bottom: 1px solid #FDE68A; }
        .gst-row:last-child { border-bottom: none; }
        .gst-key { font-size: 13px; color: #92400E; }
        .gst-val { font-size: 13px; font-weight: 600; color: #92400E; font-family: 'DM Mono', monospace; }
        .gst-header { padding: 10px 20px; background: #FDE68A; }
        .gst-header-text { font-size: 11px; font-weight: 600; color: #78350F; letter-spacing: 0.08em; text-transform: uppercase; }
        .calculating { opacity: 0.5; transition: opacity 0.2s; }
        .pulse { animation: pulse 1s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-icon { font-size: 32px; margin-bottom: 12px; }
        .empty-text { font-size: 14px; color: #BBB; }
        .footer { text-align: center; margin-top: 32px; }
        .footer-text { font-size: 12px; color: #CCC; }
        @media (max-width: 480px) {
          .result-total-price { font-size: 34px; }
          .card { padding: 20px; }
        }
      `}</style>

      <main className="page">
        <div className="container">

          <div className="header">
            <div className="header-top">
              <div className="logo-dot" />
              <span className="brand">PrintCalc</span>
            </div>
            <h1 className="title">Paper Price<br />Calculator</h1>
            <p className="subtitle">Instant pricing for any sheet size and paper type</p>
          </div>

          <div className="card">
            <p className="section-label">Job Details</p>

            {/* Sheet Size */}
            <div className="field">
              <div className="field-label">
                Sheet size
                <span className="field-hint">inches</span>
              </div>
              <select
                value={size.name}
                onChange={e => setSize(SHEET_SIZES.find(s => s.name === e.target.value) || SHEET_SIZES[0])}
              >
                {SHEET_SIZES.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
              <div className="size-meta">
                <span className="size-sublabel">
                  {size.length}" × {size.width}" = {(size.length * size.width).toFixed(0)} sq in
                </span>
                <button className="convert-btn" onClick={() => setShowConverter(!showConverter)}>
                  {showConverter ? 'Hide converter' : 'Convert to MM / CM'}
                </button>
              </div>

              {showConverter && (
                <div className="converter-box">
                  <div className="conv-item">
                    <p className="conv-unit">Inches</p>
                    <p className="conv-val">{size.length}" × {size.width}"</p>
                  </div>
                  <div className="conv-item">
                    <p className="conv-unit">MM</p>
                    <p className="conv-val">{inchToMm(size.length)} × {inchToMm(size.width)}</p>
                  </div>
                  <div className="conv-item">
                    <p className="conv-unit">CM</p>
                    <p className="conv-val">{inchToCm(size.length)} × {inchToCm(size.width)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Paper Type */}
            <div className="field">
              <div className="field-label">
                Paper type
                {selectedPaper.inStock
                  ? <span className="stock-badge badge-in">● In stock</span>
                  : <span className="stock-badge badge-out">● Out of stock</span>
                }
              </div>
              <div className="paper-select-wrap">
                <select
                  value={selectedPaper.id}
                  onChange={e => {
                    const p = PAPER_CATALOGUE.find(p => p.id === e.target.value);
                    if (p) setSelectedPaper(p);
                  }}
                  className={!selectedPaper.inStock ? 'out-of-stock-select' : ''}
                >
                  {['Maplitho', 'Art Paper', 'Art Card', 'Art Card Heavy', 'Art Card Extra Heavy', 'FBB / Ultima / SBS', 'Duplex Grey Back', 'Duplex White Back'].map(cat => (
                    <optgroup key={cat} label={`── ${cat} ──`}>
                      {PAPER_CATALOGUE.filter(p => p.category === cat).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.label}{!p.inStock ? ' — OUT OF STOCK' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="divider" />

            {/* Quantity */}
            <div className="field">
              <div className="field-label">
                Quantity
                <span className="field-hint">sheets</span>
              </div>
              <div className="qty-input-wrap">
                <input
                  type="number"
                  placeholder="Enter number of sheets"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  min="1"
                />
                {quantity && <span className="qty-suffix">sheets</span>}
              </div>
            </div>
          </div>

          {/* Results */}
          {result ? (
            <div className={calculating ? 'calculating' : ''}>

              {/* Total Price */}
              <div className="result-card">
                {!result.inStock && (
                  <div className="result-out-of-stock">
                    <span className="stock-badge badge-out">Out of stock</span>
                  </div>
                )}
                <p className="result-total-label">Total price (incl. GST)</p>
                <p className="result-total-price">
                  <span className="result-currency">₹</span>
                  {parseFloat(result.finalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="result-grid">
                  <div className="result-item">
                    <p className="result-item-label">Per sheet</p>
                    <p className="result-item-value">₹{result.pricePerSheet}</p>
                  </div>
                  <div className="result-item">
                    <p className="result-item-label">Per ream (500 sh)</p>
                    <p className="result-item-value">₹{result.pricePerRream}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="details-card">
                <div className="detail-row">
                  <span className="detail-key">Total sheets</span>
                  <span className="detail-val">{result.totalSheets.toLocaleString('en-IN')}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Total weight</span>
                  <span className="detail-val">{result.totalWeight} kg</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Sheet size</span>
                  <span className="detail-val">{size.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Paper</span>
                  <span className="detail-val">{selectedPaper.label}</span>
                </div>
              </div>

              {/* GST Breakdown */}
              <div className="gst-card">
                <div className="gst-header">
                  <p className="gst-header-text">GST / Tax Breakdown</p>
                </div>
                <div className="gst-row">
                  <span className="gst-key">Base price (before tax)</span>
                  <span className="gst-val">₹{parseFloat(result.rawCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="gst-row">
                  <span className="gst-key">GST @ {TAX}%</span>
                  <span className="gst-val">₹{parseFloat(result.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="gst-row">
                  <span className="gst-key" style={{ fontWeight: 600, color: '#78350F' }}>Total incl. GST</span>
                  <span className="gst-val" style={{ fontSize: 15 }}>₹{parseFloat(result.finalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="card empty-state">
              {calculating ? (
                <>
                  <p className="empty-icon pulse">⚡</p>
                  <p className="empty-text">Calculating...</p>
                </>
              ) : (
                <>
                  <p className="empty-icon">📄</p>
                  <p className="empty-text">Enter quantity above to see instant pricing</p>
                </>
              )}
            </div>
          )}

          <div className="footer">
            <p className="footer-text">Prices update automatically as you type · GST @ {TAX}%</p>
          </div>

        </div>
      </main>
    </>
  );
}
