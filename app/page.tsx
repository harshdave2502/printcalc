'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

interface SheetSize {
  id: string;
  name: string;
  length_inch: number;
  width_inch: number;
  factor: number;
}

interface PaperStock {
  id: string;
  category: string;
  label: string;
  gsm: number;
  rate_per_kg: number;
  packing_size: number;
  in_stock: boolean;
}

interface Result {
  pricePerSheet: string;
  pricePerRream: string;
  totalSheets: number;
  totalWeight: string;
  rawCost: string;
  taxAmount: string;
  finalPrice: string;
  inStock: boolean;
}

const MARKUP = 25;
const TAX = 18;

export default function Home() {
  const [sheetSizes, setSheetSizes] = useState<SheetSize[]>([]);
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([]);
  const [size, setSize] = useState<SheetSize | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<PaperStock | null>(null);
  const [quantity, setQuantity] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadData();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadData = async () => {
    setLoading(true);
    const { data: sizes } = await supabase
      .from('sheet_sizes').select('*').eq('is_active', true).order('sort_order');
    const { data: papers } = await supabase
      .from('paper_stocks').select('*').order('sort_order');

    setSheetSizes(sizes || []);
    setPaperStocks(papers || []);
    if (sizes && sizes.length > 0) setSize(sizes[0]);
    if (papers && papers.length > 0) setSelectedPaper(papers[0]);
    setLoading(false);
  };

  useEffect(() => {
    if (!quantity || parseInt(quantity) <= 0 || !size || !selectedPaper) {
      setResult(null);
      return;
    }
    setCalculating(true);
    const timer = setTimeout(() => { calculate(); }, 400);
    return () => clearTimeout(timer);
  }, [size, selectedPaper, quantity]);

  const calculate = () => {
    if (!size || !selectedPaper) return;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;

    const weightPerRream = selectedPaper.gsm * size.factor;
    const costPerRream = weightPerRream * selectedPaper.rate_per_kg;
    const costPerSheet = costPerRream / 500;
    const totalWeight = (weightPerRream / 500) * qty;
    const rawCost = costPerSheet * qty;
    const afterMarkup = rawCost * (1 + MARKUP / 100);
    const taxAmount = afterMarkup * (TAX / 100);
    const finalPrice = afterMarkup + taxAmount;

    setResult({
      pricePerSheet: costPerSheet.toFixed(4),
      pricePerRream: costPerRream.toFixed(2),
      totalSheets: qty,
      totalWeight: totalWeight.toFixed(2),
      rawCost: rawCost.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      inStock: selectedPaper.in_stock,
    });
    setCalculating(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const inchToMm = (inch: number) => (inch * 25.4).toFixed(1);
  const inchToCm = (inch: number) => (inch * 2.54).toFixed(1);
  const categories = [...new Set(paperStocks.map(p => p.category))];

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading...</p>
    </main>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .topbar { background: #1A1A1A; height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
        .topbar-brand { display: flex; align-items: center; gap: 8px; }
        .topbar-dot { width: 8px; height: 8px; background: #C84B31; border-radius: 50%; }
        .topbar-name { font-size: 13px; font-weight: 500; color: #fff; letter-spacing: 0.04em; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .topbar-link { font-size: 13px; color: #AAA; text-decoration: none; padding: 6px 14px; border-radius: 6px; transition: color 0.15s; }
        .topbar-link:hover { color: #fff; }
        .topbar-btn { font-size: 13px; font-weight: 500; color: #fff; background: #C84B31; border: none; padding: 7px 16px; border-radius: 6px; cursor: pointer; font-family: inherit; text-decoration: none; display: inline-block; transition: opacity 0.15s; }
        .topbar-btn:hover { opacity: 0.85; }
        .topbar-user { font-size: 12px; color: #888; }
        .topbar-logout { font-size: 13px; color: #888; background: none; border: none; cursor: pointer; font-family: inherit; padding: 6px 14px; }
        .topbar-logout:hover { color: #fff; }
        .topbar-dashboard { font-size: 13px; color: #AAA; text-decoration: none; padding: 6px 14px; border-radius: 6px; }
        .topbar-dashboard:hover { color: #fff; }
        .page { min-height: calc(100vh - 52px); padding: 32px 16px 64px; }
        .container { max-width: 520px; margin: 0 auto; }
        .header { margin-bottom: 28px; }
        .title { font-size: 28px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.02em; line-height: 1.2; margin-top: 24px; }
        .subtitle { font-size: 14px; color: #888; margin-top: 6px; }
        .card { background: #fff; border-radius: 16px; padding: 28px; margin-bottom: 16px; border: 1px solid #EBEBEB; }
        .section-label { font-size: 11px; font-weight: 600; color: #999; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
        .field { margin-bottom: 18px; }
        .field:last-child { margin-bottom: 0; }
        .field-label { font-size: 13px; font-weight: 500; color: #555; margin-bottom: 7px; display: flex; justify-content: space-between; align-items: center; }
        .field-hint { font-size: 11px; color: #AAA; font-weight: 400; }
        select, input[type="number"] { width: 100%; padding: 11px 14px; border: 1.5px solid #E8E8E8; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; transition: border-color 0.15s; appearance: none; -webkit-appearance: none; }
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
        .out-of-stock-select { border-color: #FEB2B2 !important; }
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
        .gst-header { padding: 10px 20px; background: #FDE68A; }
        .gst-header-text { font-size: 11px; font-weight: 600; color: #78350F; letter-spacing: 0.08em; text-transform: uppercase; }
        .gst-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 20px; border-bottom: 1px solid #FDE68A; }
        .gst-row:last-child { border-bottom: none; }
        .gst-key { font-size: 13px; color: #92400E; }
        .gst-val { font-size: 13px; font-weight: 600; color: #92400E; font-family: 'DM Mono', monospace; }
        .calculating { opacity: 0.5; transition: opacity 0.2s; }
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-icon { font-size: 32px; margin-bottom: 12px; }
        .empty-text { font-size: 14px; color: #BBB; }
        .footer { text-align: center; margin-top: 32px; }
        .footer-text { font-size: 12px; color: #CCC; }
        @media (max-width: 480px) {
          .result-total-price { font-size: 34px; }
          .card { padding: 20px; }
          .topbar { padding: 0 16px; }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <div className="topbar">
        <div className="topbar-brand">
          <div className="topbar-dot" />
          <span className="topbar-name">PrintCalc</span>
        </div>
        <div className="topbar-right">
          {user ? (
            <>
              <a href="/dashboard" className="topbar-dashboard">Dashboard</a>
              <span className="topbar-user">{user.email}</span>
              <button className="topbar-logout" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <a href="/login" className="topbar-link">Login</a>
              <a href="/signup" className="topbar-btn">Sign up free</a>
            </>
          )}
        </div>
      </div>

      <main className="page">
        <div className="container">

          <div className="header">
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
                value={size?.id || ''}
                onChange={e => {
                  const s = sheetSizes.find(s => s.id === e.target.value);
                  if (s) setSize(s);
                }}
              >
                {sheetSizes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {size && (
                <div className="size-meta">
                  <span className="size-sublabel">
                    {size.length_inch}" × {size.width_inch}" = {(size.length_inch * size.width_inch).toFixed(0)} sq in
                  </span>
                  <button className="convert-btn" onClick={() => setShowConverter(!showConverter)}>
                    {showConverter ? 'Hide converter' : 'Convert to MM / CM'}
                  </button>
                </div>
              )}
              {showConverter && size && (
                <div className="converter-box">
                  <div className="conv-item">
                    <p className="conv-unit">Inches</p>
                    <p className="conv-val">{size.length_inch}" × {size.width_inch}"</p>
                  </div>
                  <div className="conv-item">
                    <p className="conv-unit">MM</p>
                    <p className="conv-val">{inchToMm(size.length_inch)} × {inchToMm(size.width_inch)}</p>
                  </div>
                  <div className="conv-item">
                    <p className="conv-unit">CM</p>
                    <p className="conv-val">{inchToCm(size.length_inch)} × {inchToCm(size.width_inch)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Paper Type */}
            <div className="field">
              <div className="field-label">
                Paper type
                {selectedPaper && (
                  selectedPaper.in_stock
                    ? <span className="stock-badge badge-in">● In stock</span>
                    : <span className="stock-badge badge-out">● Out of stock</span>
                )}
              </div>
              <select
                value={selectedPaper?.id || ''}
                onChange={e => {
                  const p = paperStocks.find(p => p.id === e.target.value);
                  if (p) setSelectedPaper(p);
                }}
                className={selectedPaper && !selectedPaper.in_stock ? 'out-of-stock-select' : ''}
              >
                {categories.map(cat => (
                  <optgroup key={cat} label={`── ${cat} ──`}>
                    {paperStocks.filter(p => p.category === cat).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label}{!p.in_stock ? ' — OUT OF STOCK' : ''}
                      </option>
                    ))}
                  </optgroup>
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
          </div>

          {/* Results */}
          {result ? (
            <div className={calculating ? 'calculating' : ''}>
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
                  <span className="detail-val">{size?.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Paper</span>
                  <span className="detail-val">{selectedPaper?.label}</span>
                </div>
              </div>

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
              <p className="empty-icon">📄</p>
              <p className="empty-text">Enter quantity above to see instant pricing</p>
            </div>
          )}

          <div className="footer">
            <p className="footer-text">Live data · GST @ {TAX}% · Prices update automatically</p>
          </div>

        </div>
      </main>
    </>
  );
}
