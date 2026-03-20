'use client';
import { useState, useEffect } from 'react';

const SHEET_SIZES = [
  { name: '23 × 36"', label: 'Double Crown', length: 23, width: 36 },
  { name: '25 × 36"', label: 'Double Quad', length: 25, width: 36 },
  { name: '20 × 30"', label: 'Double Crown B', length: 20, width: 30 },
  { name: '20 × 28"', label: 'Super Royal', length: 20, width: 28 },
  { name: '31.5 × 41.5"', label: 'Packaging Large', length: 31.5, width: 41.5 },
  { name: '25 × 38"', label: 'Packaging Standard', length: 25, width: 38 },
  { name: '22 × 28"', label: 'Packaging Small', length: 22, width: 28 },
  { name: '22.5 × 35"', label: 'Double Demy', length: 22.5, width: 35 },
  { name: '18 × 23"', label: 'Small Offset', length: 18, width: 23 },
];

const GSM_OPTIONS = [
  { value: 60, label: '60 GSM — Newsprint' },
  { value: 70, label: '70 GSM — Bond' },
  { value: 80, label: '80 GSM — Office' },
  { value: 90, label: '90 GSM — Maplitho' },
  { value: 100, label: '100 GSM — Offset' },
  { value: 115, label: '115 GSM — Art' },
  { value: 120, label: '120 GSM — Art' },
  { value: 130, label: '130 GSM — Art Coated' },
  { value: 150, label: '150 GSM — Art Coated' },
  { value: 170, label: '170 GSM — Art Card' },
  { value: 200, label: '200 GSM — Art Card' },
  { value: 250, label: '250 GSM — Board' },
  { value: 300, label: '300 GSM — Board' },
  { value: 350, label: '350 GSM — Board' },
  { value: 400, label: '400 GSM — Board' },
];

const PACKING_OPTIONS = [
  { value: 100, label: '100 sheets / pack' },
  { value: 200, label: '200 sheets / pack' },
  { value: 250, label: '250 sheets / pack' },
  { value: 500, label: '500 sheets / ream' },
];

interface Result {
  pricePerSheet: string;
  pricePerRream: string;
  totalSheets: number;
  totalWeight: string;
  finalPrice: string;
}

export default function Home() {
  const [size, setSize] = useState(SHEET_SIZES[0]);
  const [gsm, setGsm] = useState(130);
  const [quantity, setQuantity] = useState('');
  const [packingSize, setPackingSize] = useState(500);
  const [result, setResult] = useState<Result | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Admin-only values — hardcoded for now, will come from database later
  const RATE_PER_KG = 70;
  const MARKUP = 25;
  const TAX = 18;

  useEffect(() => {
    if (!quantity || parseInt(quantity) <= 0) {
      setResult(null);
      return;
    }
    const timer = setTimeout(() => {
      calculate();
    }, 400);
    return () => clearTimeout(timer);
  }, [size, gsm, quantity, packingSize]);

  const calculate = () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;

    setCalculating(true);

    const BASE_FACTOR = 0.2666;
    const BASE_SQIN = 828;
    const factor = (size.length * size.width * BASE_FACTOR) / BASE_SQIN;
    const weightPerRream = factor * gsm;
    const costPerRream = weightPerRream * RATE_PER_KG;
    const costPerSheet = costPerRream / 500;

    const totalSheets = qty;
    const totalWeight = (weightPerRream / 500) * totalSheets;
    const rawCost = costPerSheet * totalSheets;

    const afterMarkup = rawCost * (1 + MARKUP / 100);
    const finalPrice = afterMarkup * (1 + TAX / 100);

    setTimeout(() => {
      setResult({
        pricePerSheet: costPerSheet.toFixed(4),
        pricePerRream: (finalPrice / Math.ceil(qty / packingSize)).toFixed(2),
        totalSheets,
        totalWeight: totalWeight.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
      });
      setCalculating(false);
    }, 300);
  };

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
        .subtitle { font-size: 14px; color: #888; margin-top: 6px; font-weight: 400; }

        .card { background: #fff; border-radius: 16px; padding: 28px; margin-bottom: 16px; border: 1px solid #EBEBEB; }

        .section-label { font-size: 11px; font-weight: 600; color: #999; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }

        .field { margin-bottom: 18px; }
        .field:last-child { margin-bottom: 0; }
        .field-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: center; }
        .field-hint { font-size: 11px; color: #AAA; font-weight: 400; }

        select, input[type="number"] {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #E8E8E8;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #1A1A1A;
          background: #FAFAFA;
          outline: none;
          transition: border-color 0.15s, background 0.15s;
          appearance: none;
          -webkit-appearance: none;
        }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
        select:focus, input[type="number"]:focus { border-color: #C84B31; background: #fff; }
        input[type="number"]::placeholder { color: #CCC; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }

        .size-select-wrap { position: relative; }
        .size-sublabel { font-size: 11px; color: #AAA; margin-top: 5px; font-family: 'DM Mono', monospace; }

        .qty-input-wrap { position: relative; }
        .qty-suffix { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 13px; color: #AAA; pointer-events: none; }

        .divider { height: 1px; background: #F0F0F0; margin: 20px 0; }

        .result-card { background: #1A1A1A; border-radius: 16px; padding: 28px; margin-bottom: 16px; overflow: hidden; position: relative; }
        .result-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; background: #C84B31; border-radius: 50%; opacity: 0.08; }

        .result-label { font-size: 11px; font-weight: 600; color: #666; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
        .result-total-label { font-size: 13px; color: #666; margin-bottom: 4px; }
        .result-total-price { font-size: 42px; font-weight: 600; color: #fff; letter-spacing: -0.03em; font-family: 'DM Mono', monospace; line-height: 1; margin-bottom: 24px; }
        .result-currency { font-size: 24px; vertical-align: super; font-weight: 400; margin-right: 2px; }

        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .result-item { background: rgba(255,255,255,0.06); border-radius: 10px; padding: 14px; }
        .result-item-label { font-size: 11px; color: #666; margin-bottom: 4px; }
        .result-item-value { font-size: 18px; font-weight: 500; color: #fff; font-family: 'DM Mono', monospace; }

        .details-card { background: #fff; border-radius: 16px; border: 1px solid #EBEBEB; overflow: hidden; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #F5F5F5; }
        .detail-row:last-child { border-bottom: none; }
        .detail-key { font-size: 13px; color: #888; }
        .detail-val { font-size: 13px; font-weight: 500; color: #1A1A1A; font-family: 'DM Mono', monospace; }

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

          {/* Header */}
          <div className="header">
            <div className="header-top">
              <div className="logo-dot" />
              <span className="brand">PrintCalc</span>
            </div>
            <h1 className="title">Paper Price<br />Calculator</h1>
            <p className="subtitle">Instant pricing for any sheet size and GSM</p>
          </div>

          {/* Input Card */}
          <div className="card">
            <p className="section-label">Job Details</p>

            {/* Sheet Size */}
            <div className="field">
              <div className="field-label">
                Sheet size
                <span className="field-hint">inches</span>
              </div>
              <div className="size-select-wrap">
                <select
                  value={size.name}
                  onChange={e => setSize(SHEET_SIZES.find(s => s.name === e.target.value) || SHEET_SIZES[0])}
                >
                  {SHEET_SIZES.map(s => (
                    <option key={s.name} value={s.name}>{s.name} — {s.label}</option>
                  ))}
                </select>
              </div>
              <p className="size-sublabel">{size.length}" × {size.width}" = {(size.length * size.width).toFixed(0)} sq in</p>
            </div>

            {/* GSM */}
            <div className="field">
              <div className="field-label">Paper type / GSM</div>
              <select value={gsm} onChange={e => setGsm(parseInt(e.target.value))}>
                {GSM_OPTIONS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
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

            {/* Packing Size */}
            <div className="field">
              <div className="field-label">Packing unit</div>
              <select value={packingSize} onChange={e => setPackingSize(parseInt(e.target.value))}>
                {PACKING_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results */}
          {result ? (
            <div className={calculating ? 'calculating' : ''}>
              {/* Total Price Card */}
              <div className="result-card">
                <p className="result-total-label">Total price</p>
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
                    <p className="result-item-label">Per ream</p>
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
                  <span className="detail-key">GSM</span>
                  <span className="detail-val">{gsm} gsm</span>
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
            <p className="footer-text">Prices update automatically as you type</p>
          </div>

        </div>
      </main>
    </>
  );
}
