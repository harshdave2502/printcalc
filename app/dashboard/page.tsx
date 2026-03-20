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

interface PaperStock {
  id: string;
  category: string;
  label: string;
  gsm: number;
  rate_per_kg: number;
  packing_size: number;
  in_stock: boolean;
}

export default function DashboardPage() {
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [paperStocks, setPaperStocks] = useState<PaperStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingStock, setEditingStock] = useState<PaperStock | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = '/login';
      return;
    }

    const { data: profile } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) setSubscriber(profile);

    const { data: stocks } = await supabase
      .from('paper_stocks')
      .select('*')
      .eq('subscriber_id', user.id)
      .order('sort_order');

    setPaperStocks(stocks || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleUpdateStock = async (stock: PaperStock) => {
    setSaving(true);
    const { error } = await supabase
      .from('paper_stocks')
      .update({
        rate_per_kg: stock.rate_per_kg,
        packing_size: stock.packing_size,
        in_stock: stock.in_stock,
      })
      .eq('id', stock.id);

    if (!error) {
      setSaveMsg('Saved!');
      setPaperStocks(prev => prev.map(s => s.id === stock.id ? stock : s));
      setTimeout(() => setSaveMsg(''), 2000);
    }
    setSaving(false);
    setEditingStock(null);
  };

  const handleUpdateSettings = async () => {
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

    if (!error) {
      setSaveMsg('Settings saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#888' }}>Loading dashboard...</p>
      </main>
    );
  }

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
        .tabs { background: #fff; border-bottom: 1px solid #EBEBEB; padding: 0 24px; display: flex; gap: 0; }
        .tab { padding: 14px 20px; font-size: 13px; font-weight: 500; color: #888; cursor: pointer; border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; transition: color 0.15s; }
        .tab.active { color: #1A1A1A; border-bottom-color: #C84B31; }
        .tab:hover { color: #1A1A1A; }
        .content { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
        .card { background: #fff; border-radius: 12px; border: 1px solid #EBEBEB; padding: 24px; margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 600; color: #1A1A1A; margin-bottom: 16px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 12px; font-weight: 500; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        input[type="text"], input[type="number"] { width: 100%; padding: 9px 12px; border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; }
        input:focus { border-color: #C84B31; background: #fff; }
        .btn-save { padding: 9px 20px; background: #1A1A1A; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-edit { padding: 6px 14px; background: #F5F5F5; color: #555; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
        .btn-cancel { padding: 6px 14px; background: none; color: #888; border: 1px solid #E8E8E8; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; margin-left: 8px; }
        .stock-table { width: 100%; border-collapse: collapse; }
        .stock-table th { text-align: left; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 12px; border-bottom: 1px solid #F0F0F0; }
        .stock-table td { padding: 10px 12px; border-bottom: 1px solid #F8F8F8; font-size: 13px; color: #1A1A1A; vertical-align: middle; }
        .stock-table tr:last-child td { border-bottom: none; }
        .badge-in { display: inline-block; padding: 2px 8px; background: #F0FFF4; color: #38A169; border: 1px solid #9AE6B4; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-out { display: inline-block; padding: 2px 8px; background: #FFF0F0; color: #E53E3E; border: 1px solid #FEB2B2; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .save-msg { color: #38A169; font-size: 13px; margin-left: 12px; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .stat-card { background: #F9F9F9; border-radius: 10px; padding: 16px; }
        .stat-label { font-size: 11px; color: #999; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-value { font-size: 22px; font-weight: 600; color: #1A1A1A; font-family: 'DM Mono', monospace; }
        .empty-msg { text-align: center; padding: 40px; color: #BBB; font-size: 14px; }
        .plan-badge { display: inline-block; padding: 3px 10px; background: #EEF4FA; color: #185FA5; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .section-title { font-size: 12px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px 0 6px; }
      `}</style>

      <div>
        {/* Navbar */}
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

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab ${activeTab === 'papers' ? 'active' : ''}`} onClick={() => setActiveTab('papers')}>Paper Stocks</button>
          <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>

        <div className="content">
          {saveMsg && <p className="save-msg" style={{ marginBottom: 16 }}>✓ {saveMsg}</p>}

          {/* OVERVIEW TAB */}
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
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a href="/" style={{ padding: '10px 18px', background: '#1A1A1A', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                    View Calculator
                  </a>
                  <button onClick={() => setActiveTab('papers')} style={{ padding: '10px 18px', background: '#F5F5F5', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Manage Paper Stocks
                  </button>
                  <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 18px', background: '#F5F5F5', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Settings
                  </button>
                </div>
              </div>

              <div className="card">
                <p className="card-title">Account info</p>
                <table style={{ width: '100%', fontSize: 13 }}>
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

          {/* PAPER STOCKS TAB */}
          {activeTab === 'papers' && (
            <div>
              {paperStocks.length === 0 ? (
                <div className="card">
                  <div className="empty-msg">
                    <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
                    <p>No paper stocks yet.</p>
                    <p style={{ fontSize: 12, marginTop: 6 }}>Your paper stocks will appear here once set up.</p>
                  </div>
                </div>
              ) : (
                categories.map(cat => (
                  <div key={cat} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', background: '#F9F9F9', borderBottom: '1px solid #F0F0F0' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat}</p>
                    </div>
                    <table className="stock-table">
                      <thead>
                        <tr>
                          <th>Paper</th>
                          <th>GSM</th>
                          <th>Rate / kg ({subscriber?.currency_symbol})</th>
                          <th>Packing</th>
                          <th>Stock</th>
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
                                    value={editingStock.rate_per_kg}
                                    onChange={e => setEditingStock({ ...editingStock, rate_per_kg: parseFloat(e.target.value) })}
                                    style={{ width: 80 }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={editingStock.packing_size}
                                    onChange={e => setEditingStock({ ...editingStock, packing_size: parseInt(e.target.value) })}
                                    style={{ width: 70 }}
                                  />
                                </td>
                                <td>
                                  <select
                                    value={editingStock.in_stock ? 'true' : 'false'}
                                    onChange={e => setEditingStock({ ...editingStock, in_stock: e.target.value === 'true' })}
                                    style={{ padding: '4px 8px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
                                  >
                                    <option value="true">In Stock</option>
                                    <option value="false">Out of Stock</option>
                                  </select>
                                </td>
                                <td>
                                  <button className="btn-save" onClick={() => handleUpdateStock(editingStock)} disabled={saving}>
                                    {saving ? '...' : 'Save'}
                                  </button>
                                  <button className="btn-cancel" onClick={() => setEditingStock(null)}>Cancel</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>{stock.label}</td>
                                <td style={{ fontFamily: 'monospace' }}>{stock.gsm}</td>
                                <td style={{ fontFamily: 'monospace' }}>{subscriber?.currency_symbol}{stock.rate_per_kg}</td>
                                <td style={{ fontFamily: 'monospace' }}>{stock.packing_size} sh</td>
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
                ))
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && subscriber && (
            <div>
              <div className="card">
                <p className="card-title">Business settings</p>
                <div className="field">
                  <label>Business name</label>
                  <input
                    type="text"
                    value={subscriber.business_name || ''}
                    onChange={e => setSubscriber({ ...subscriber, business_name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Markup %</label>
                    <input
                      type="number"
                      value={subscriber.markup_percent}
                      onChange={e => setSubscriber({ ...subscriber, markup_percent: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="field">
                    <label>Tax / GST %</label>
                    <input
                      type="number"
                      value={subscriber.tax_percent}
                      onChange={e => setSubscriber({ ...subscriber, tax_percent: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                  <button className="btn-save" onClick={handleUpdateSettings} disabled={saving}>
                    {saving ? 'Saving...' : 'Save settings'}
                  </button>
                  {saveMsg && <span className="save-msg">✓ {saveMsg}</span>}
                </div>
              </div>

              <div className="card">
                <p className="card-title">Account</p>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Logged in as <strong style={{ color: '#1A1A1A' }}>{subscriber.email}</strong></p>
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
