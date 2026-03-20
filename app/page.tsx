'use client';
import { useState } from 'react';

const SHEET_SIZES = [
  { name: '23 × 36"', length: 23, width: 36 },
  { name: '25 × 36"', length: 25, width: 36 },
  { name: '20 × 30"', length: 20, width: 30 },
  { name: '20 × 28"', length: 20, width: 28 },
  { name: '31.5 × 41.5"', length: 31.5, width: 41.5 },
  { name: '25 × 38"', length: 25, width: 38 },
  { name: '22 × 28"', length: 22, width: 28 },
];

const GSM_OPTIONS = [60, 70, 80, 90, 100, 115, 120, 130, 150, 170, 200, 250, 300, 350, 400];

export default function Home() {
  const [size, setSize] = useState(SHEET_SIZES[0]);
  const [gsm, setGsm] = useState(130);
  const [ratePerKg, setRatePerKg] = useState('');
  const [quantity, setQuantity] = useState('');
  const [packingSize, setPackingSize] = useState(500);
  const [markup, setMarkup] = useState('');
  const [tax, setTax] = useState('');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    const rate = parseFloat(ratePerKg);
    const qty = parseInt(quantity);
    if (!rate || !qty) return;

    // Core formula — invisible to customer
    const BASE_FACTOR = 0.2666;
    const BASE_SQIN = 828; // 23x36
    const factor = (size.length * size.width * BASE_FACTOR) / BASE_SQIN;
    const weightPerRream = factor * gsm;
    const costPerRream = weightPerRream * rate;
    const costPerSheet = costPerRream / 500;

    // Reams needed — always round UP
    const reamsNeeded = Math.ceil(qty / packingSize);
    const totalSheets = qty;
    const totalWeight = (weightPerRream / 500) * totalSheets;
    const rawCost = costPerSheet * totalSheets;

    // Markup and tax
    const markupVal = markup ? parseFloat(markup) / 100 : 0;
    const taxVal = tax ? parseFloat(tax) / 100 : 0;
    const afterMarkup = rawCost * (1 + markupVal);
    const finalPrice = afterMarkup * (1 + taxVal);

    setResult({
      costPerSheet: costPerSheet.toFixed(4),
      costPerRream: costPerRream.toFixed(2),
      weightPerRream: weightPerRream.toFixed(2),
      reamsNeeded,
      totalSheets,
      totalWeight: totalWeight.toFixed(2),
      rawCost: rawCost.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      pricePerSheet: (finalPrice / totalSheets).toFixed(4),
    });
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f5f5f5', padding: '40px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '24px', marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 28, fontWeight: 700 }}>Paper Calculator</h1>
          <p style={{ color: '#aaa', margin: '8px 0 0', fontSize: 14 }}>Get instant paper pricing</p>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#333' }}>Enter Job Details</h2>

          {/* Sheet Size */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Sheet Size</label>
            <select
              value={size.name}
              onChange={e => setSize(SHEET_SIZES.find(s => s.name === e.target.value) || SHEET_SIZES[0])}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fafafa' }}
            >
              {SHEET_SIZES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          {/* GSM */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>GSM</label>
            <select
              value={gsm}
              onChange={e => setGsm(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fafafa' }}
            >
              {GSM_OPTIONS.map(g => <option key={g} value={g}>{g} GSM</option>)}
            </select>
          </div>

          {/* Rate per kg */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Rate per kg (₹)</label>
            <input
              type="number"
              placeholder="e.g. 70"
              value={ratePerKg}
              onChange={e => setRatePerKg(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fafafa', boxSizing: 'border-box' }}
            />
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Quantity (sheets)</label>
            <input
              type="number"
              placeholder="e.g. 1000"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fafafa', boxSizing: 'border-box' }}
            />
          </div>

          {/* Packing Size */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Packing Size (sheets per ream)</label>
            <select
              value={packingSize}
              onChange={e => setPackingSize(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fafafa' }}
            >
              <option value={100}>100 sheets per pack</option>
              <option value={200}>200 sheets per pack</option>
              <option value={250}>250 sheets per pack</option>
              <option value={500}>500 sheets per ream</option>
            </select>
          </div>

          {/* Markup and Tax — side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Markup %</label>
              <input
                type="number"
                placeholder="e.g. 25"
                value={markup}
                onChange={e => setMarkup(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fafafa', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>Tax %</label>
              <input
                type="number"
                placeholder="e.g. 18"
                value={tax}
                onChange={e => setTax(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fafafa', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculate}
            style={{ width: '100%', padding: '14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
          >
            Calculate Price
          </button>
        </div>

        {/* Results */}
        {result && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#333' }}>Price Breakdown</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Price per sheet</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>₹{result.pricePerSheet}</p>
              </div>
              <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Price per ream</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>₹{result.costPerRream}</p>
              </div>
            </div>

            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#666' }}>Total sheets</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{result.totalSheets} sheets</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#666' }}>Total weight</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{result.totalWeight} kg</span>
              </div>
            </div>

            <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>Total Price</p>
              <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, color: '#fff' }}>₹{result.finalPrice}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}