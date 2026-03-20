'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface Subscriber {
  id: string;
  email: string;
  business_name: string;
  currency: string;
  currency_symbol: string;
  markup_percent: number;
  tax_percent: number;
  plan: string;
}

interface PaperCategory {
  id: string;
  category: string;
  rate_per_kg: number;
}

interface PaperStock {
  id: string;
  category: string;
  label: string;
  gsm: number;
  packing_size: number;
  in_stock: boolean;
  stock_qty: number | null;
}

// GSM ranges per category — shown in Paper Rates tab
const GSM_RANGES: Record<string, string> = {
  'Maplitho': '60 GSM – 80 GSM',
  'Art Paper': '80 GSM – 130 GSM',
  'Art Card': '170 GSM – 230 GSM',
  'Art Card Heavy': '250 GSM – 380 GSM',
  'Art Card Extra Heavy': '400 GSM – 500 GSM',
  'FBB / Ultima / SBS': '200 GSM – 400 GSM',
  'Duplex Grey Back': '200 GSM – 400 GSM',
  'Duplex White Back': '200 GSM – 400 GSM',
};

export default function DashboardPage() {
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [paperCategories, setPaperCategories] = useState<PaperCategory[]>([]);
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingCategory, setEditingCategory] = useState<PaperCategory | null>(null);
  const [editingStock, setEditingStock] = useState<PaperStock | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: profile } = await supabase
      .from('subscribers').select('*').eq('id', user.id).single();
    if (profile) setSubscriber(profile);

    const { data: cats } = await supabase
      .from('paper_categories').select('*')
      .eq('subscriber_id', user.id).order('category');
    setPaperCategories(cats || []);

    const { data: stocks } = await supabase
      .from('paper_stocks').select('*')
      .eq('subscriber_id', user.id).order('sort_order');
    setPaperStocks(stocks || []);

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleSaveCategory = async (cat: PaperCategory) => {
    setSaving(true);
    const { error } = await supabase
      .from('paper_categories')
      .update({ rate_per_kg: cat.rate_per_kg })
      .eq('id', cat.id);
    if (!error) {
      setPaperCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
      setSaveMsg('Rate saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    }
    setSaving(false);
    setEditingCategory(null);
  };

  const handleSaveStock = async (stock: PaperStock) => {
    setSaving(true);
    const { error } = await supabase
      .from('paper_stocks')
      .update({
        packing_size: stock.packing_size,
        in_stock: stock.in_stock,
        stock_qty: stock.stock_qty,
      })
      .eq('id', stock.id);
    if (!error) {
      setPaperStocks(prev => prev.map(s => s.id === stock.id ? stock : s));
      setSaveMsg('Stock saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    }
    setSaving(false);
    setEditingStock(null);
  };

  const handleSaveSettings = async () => {
    if (!subscriber) return;
    setSaving(true);
    const { error } = await supabase
      .from('subscribers')
      .update({
        business_name: subscriber.business_name,
        markup_percent: subscriber.markup_percent,
        tax_percent: subscriber.tax_percent,
      })
      .eq('id', subscriber.id);
    if (!error) { setSaveMsg('Settings saved!'); setTimeout(() => setSaveMsg(''), 2000); }
    setSaving(false);
  };

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#888' }}>Loading dashboard...</p>
    </main>
  );

  const categories = [...new Set(paperStocks.map(p => p.category))];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .nav { background: #1A1A1A; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 56px; }
        .nav-brand { display: flex; align-items: center; gap: 8px; }
        .nav-dot { width: 8px; height: 8px; background: #C84B31; border-radius: 50%; }
        .nav-name { font-size: 14px; font-weight: 500; color: #fff; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-biz { font-size: 13px; color: #888; }
        .nav-logout { font-size: 13px; color: #888; background: none; border: none; cursor: pointer; font-family: inherit; }
        .nav-logout:hover { color: #fff; }
        .tabs { background: #fff; border-bottom: 1px solid #EBEBEB; padding: 0 24px; display: flex; }
        .tab { padding: 14px 20px; font-size: 13px; font-weight: 500; color: #888; cursor: pointer; border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; }
        .tab.active { color: #1A1A1A; border-bottom-color: #C84B31; }
        .content { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
        .card { background: #fff; border-radius: 12px; border: 1px solid #EBEBEB; padding: 24px; margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 600; color: #1A1A1A; margin-bottom: 4px; }
        .card-sub { font-size: 12px; color: #AAA; margin-bottom: 20px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 12px; font-weight: 500; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        input[type="text"], input[type="number"] { padding: 9px 12px; border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; }
        input:focus { border-color: #C84B31; background: #fff; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .btn-save { padding: 8px 18px; background: #1A1A1A; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-edit { padding: 5px 12px; background: #F5F5F5; color: #555; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
        .btn-cancel { padding: 5px 12px; background: none; color: #888; border: 1px solid #E8E8E8; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; margin-left: 6px; }
        .save-msg { color: #38A169; font-size: 13px; margin-left: 12px; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .stat-card { background: #F9F9F9; border-radius: 10px; padding: 16px; }
        .stat-label { font-size: 11px; color: #999; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-value { font-size: 22px; font-weight: 600; color: #1A1A1A; font-family: 'DM Mono', monospace; }
        .plan-badge { display: inline-block; padding: 3px 10px; background: #EEF4FA; color: #185FA5; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .section-header { background: #F9F9F9; border-bottom: 1px solid #F0F0F0; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .section-title { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { text-align: left; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 16px; border-bottom: 1px solid #F0F0F0; }
        .table td { padding: 11px 16px; border-bottom: 1px solid #F8F8F8; font-size: 13px; color: #1A1A1A; vertical-align: middle; }
        .table tr:last-child td { border-bottom: none; }
        .badge-in { display: inline-block; padding: 2px 8px; background: #F0FFF4; color: #38A169; border: 1px solid #9AE6B4; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-out { display: inline-block; padding: 2px 8px; background: #FFF0F0; color: #E53E3E; border: 1px solid #FEB2B2; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .info-box { background: #F0FFF4; border: 1px solid #9AE6B4; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #276749; }
        .gsm-range { display: inline-block; padding: 2px 8px; background: #F5F0FF; color: #6B46C1; border-radius: 4px; font-size: 11px; font-weight: 500; margin-left: 8px; font-family: 'DM Mono', monospace; }
        select { padding: 6px 10px; border: 1.5px solid #E8E8E8; border-radius: 6px; font-size: 12px; font-family: inherit; background: #FAFAFA; outline: none; }
        select:focus { border-color: #C84B31; }
      `}</style>

      <div>
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-dot" />
            <span className="nav-name">PrintCalc</span>
          </div>
          <div className="nav-right">
            <span className="nav-biz">{subscriber?.business_name}</span>
            <span className="plan-badge">{subscriber?.plan}</span>
            <button className="nav-logout" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab ${activeTab === 'rates' ? 'active' : ''}`} onClick={() => setActiveTab('rates')}>Paper Rates</button>
          <button className={`tab ${activeTab === 'stocks' ? 'active' : ''}`} onClick={() => setActiveTab('stocks')}>Stock Management</button>
          <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>

        <div className="content">
          {saveMsg && <p className="save-msg" style={{ marginBottom: 16 }}>✓ {saveMsg}</p>}

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="stat-grid">
                <div className="stat-card">
                  <p className="stat-label">Plan</p>
                  <p className="stat-value" style={{ fontSize: 16, textTransform: 'capitalize' }}>{subscriber?.plan}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Markup</p>
                  <p className="stat-value">{subscriber?.markup_percent}%</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Tax / GST</p>
                  <p className="stat-value">{subscriber?.tax_percent}%</p>
                </div>
              </div>
              <div className="card">
                <p className="card-title">Quick links</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                  <a href="/" style={{ padding: '10px 18px', background: '#1A1A1A', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>View Calculator</a>
                  <button onClick={() => setActiveTab('rates')} style={{ padding: '10px 18px', background: '#F5F5F5', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Paper Rates</button>
                  <button onClick={() => setActiveTab('stocks')} style={{ padding: '10px 18px', background: '#F5F5F5', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Stock Management</button>
                  <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 18px', background: '#F5F5F5', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Settings</button>
                </div>
              </div>
              <div className="card">
                <p className="card-title">Account info</p>
                <table style={{ width: '100%', fontSize: 13, marginTop: 12 }}>
                  <tbody>
                    {[
                      ['Business name', subscriber?.business_name],
                      ['Email', subscriber?.email],
                      ['Currency', `${subscriber?.currency_symbol} ${subscriber?.currency}`],
                      ['Plan', subscriber?.plan],
                    ].map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: '1px solid #F5F5F5' }}>
                        <td style={{ padding: '10px 0', color: '#888', width: '40%' }}>{k}</td>
                        <td style={{ padding: '10px 0', fontWeight: 500 }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAPER RATES — category level with GSM range */}
          {activeTab === 'rates' && (
            <div>
              <div className="info-box">
                💡 One rate per kg for each paper category — applies to all GSM variants in that range. Customers never see these rates.
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="section-header">
                  <p className="section-title">Paper Category Rates</p>
                  <p style={{ fontSize: 12, color: '#AAA' }}>{paperCategories.length} categories</p>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Paper Category</th>
                      <th>GSM Range</th>
                      <th>Rate per kg ({subscriber?.currency_symbol})</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paperCategories.map(cat => (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: 500 }}>{cat.category}</td>
                        <td>
                          <span className="gsm-range">
                            {GSM_RANGES[cat.category] || '—'}
                          </span>
                        </td>
                        <td>
                          {editingCategory?.id === cat.id ? (
                            <input
                              type="number"
                              value={editingCategory.rate_per_kg}
                              onChange={e => setEditingCategory({ ...editingCategory, rate_per_kg: parseFloat(e.target.value) })}
                              style={{ width: 100 }}
                            />
                          ) : (
                            <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                              {subscriber?.currency_symbol}{cat.rate_per_kg.toFixed(2)}/kg
                            </span>
                          )}
                        </td>
                        <td>
                          {editingCategory?.id === cat.id ? (
                            <>
                              <button className="btn-save" onClick={() => handleSaveCategory(editingCategory)} disabled={saving}>
                                {saving ? '...' : 'Save'}
                              </button>
                              <button className="btn-cancel" onClick={() => setEditingCategory(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn-edit" onClick={() => setEditingCategory(cat)}>Edit rate</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STOCK MANAGEMENT */}
          {activeTab === 'stocks' && (
            <div>
              <div className="info-box">
                💡 Stock tracking is optional. Enter total stock in kg — auto marks out of stock when depleted. Leave blank to skip tracking.
              </div>
              {categories.map(cat => (
                <div key={cat} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                  <div className="section-header">
                    <p className="section-title">
                      {cat}
                      <span className="gsm-range" style={{ marginLeft: 8 }}>
                        {GSM_RANGES[cat] || ''}
                      </span>
                    </p>
                  </div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Paper</th>
                        <th>GSM</th>
                        <th>Packing size</th>
                        <th>Stock qty (kg) — optional</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paperStocks.filter(p => p.category === cat).map(stock => (
                        <tr key={stock.id}>
                          {editingStock?.id === stock.id ? (
                            <>
                              <td>{stock.label}</td>
                              <td>{stock.gsm}</td>
                              <td>
                                <input
                                  type="number"
                                  value={editingStock.packing_size}
                                  onChange={e => setEditingStock({ ...editingStock, packing_size: parseInt(e.target.value) })}
                                  style={{ width: 70 }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={editingStock.stock_qty ?? ''}
                                  placeholder="Optional"
                                  onChange={e => setEditingStock({ ...editingStock, stock_qty: e.target.value ? parseFloat(e.target.value) : null })}
                                  style={{ width: 100 }}
                                />
                              </td>
                              <td>
                                <select
                                  value={editingStock.in_stock ? 'true' : 'false'}
                                  onChange={e => setEditingStock({ ...editingStock, in_stock: e.target.value === 'true' })}
                                >
                                  <option value="true">In Stock</option>
                                  <option value="false">Out of Stock</option>
                                </select>
                              </td>
                              <td>
                                <button className="btn-save" onClick={() => handleSaveStock(editingStock)} disabled={saving}>
                                  {saving ? '...' : 'Save'}
                                </button>
                                <button className="btn-cancel" onClick={() => setEditingStock(null)}>Cancel</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{stock.label}</td>
                              <td style={{ fontFamily: 'monospace' }}>{stock.gsm}</td>
                              <td style={{ fontFamily: 'monospace' }}>{stock.packing_size} sh</td>
                              <td style={{ fontFamily: 'monospace', color: stock.stock_qty ? '#1A1A1A' : '#CCC' }}>
                                {stock.stock_qty ? `${stock.stock_qty} kg` : '—'}
                              </td>
                              <td>
                                {stock.in_stock
                                  ? <span className="badge-in">In Stock</span>
                                  : <span className="badge-out">Out of Stock</span>
                                }
                              </td>
                              <td>
                                <button className="btn-edit" onClick={() => setEditingStock(stock)}>Edit</button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && subscriber && (
            <div>
              <div className="card">
                <p className="card-title">Business settings</p>
                <p className="card-sub">These settings affect all price calculations</p>
                <div className="field">
                  <label>Business name</label>
                  <input type="text" value={subscriber.business_name || ''} onChange={e => setSubscriber({ ...subscriber, business_name: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Markup %</label>
                    <input type="number" value={subscriber.markup_percent} onChange={e => setSubscriber({ ...subscriber, markup_percent: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                  </div>
                  <div className="field">
                    <label>Tax / GST %</label>
                    <input type="number" value={subscriber.tax_percent} onChange={e => setSubscriber({ ...subscriber, tax_percent: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                  <button className="btn-save" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? 'Saving...' : 'Save settings'}
                  </button>
                  {saveMsg && <span className="save-msg">✓ {saveMsg}</span>}
                </div>
              </div>
              <div className="card">
                <p className="card-title">Account</p>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                  Logged in as <strong style={{ color: '#1A1A1A' }}>{subscriber.email}</strong>
                </p>
                <button onClick={handleLogout} style={{ padding: '9px 20px', background: '#FFF0F0', color: '#E53E3E', border: '1px solid #FEB2B2', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
