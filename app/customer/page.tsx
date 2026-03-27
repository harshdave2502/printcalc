'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// ─── STATUS STYLES ────────────────────────────────────────────────────
const ORDER_STATUS: Record<string, { color: string; bg: string; icon: string; step: number }> = {
  Pending:          { color: '#D97706', bg: '#FFFBEB', icon: '⏳', step: 1 },
  'In Production':  { color: '#185FA5', bg: '#EEF4FA', icon: '⚙️', step: 2 },
  Ready:            { color: '#6B46C1', bg: '#F5F0FF', icon: '✅', step: 3 },
  Delivered:        { color: '#38A169', bg: '#F0FFF4', icon: '🚚', step: 4 },
  Cancelled:        { color: '#E53E3E', bg: '#FFF0F0', icon: '✕',  step: 0 },
};
const QUOTE_STATUS: Record<string, { color: string; bg: string }> = {
  Draft:     { color: '#888',    bg: '#F5F5F5' },
  Sent:      { color: '#185FA5', bg: '#EEF4FA' },
  Converted: { color: '#38A169', bg: '#F0FFF4' },
  Expired:   { color: '#E53E3E', bg: '#FFF0F0' },
};
const PAY_STATUS: Record<string, { color: string; bg: string }> = {
  Unpaid:  { color: '#E53E3E', bg: '#FFF0F0' },
  Partial: { color: '#D97706', bg: '#FFFBEB' },
  Paid:    { color: '#38A169', bg: '#F0FFF4' },
};

function Badge({ label, map }: { label: string; map: Record<string, any> }) {
  const s = map[label] || { color: '#888', bg: '#F5F5F5' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.icon ? `${s.icon} ${label}` : label}
    </span>
  );
}

const STATUS_FLOW = ['Pending', 'In Production', 'Ready', 'Delivered'];

function StatusProgress({ status }: { status: string }) {
  const idx = STATUS_FLOW.indexOf(status);
  if (status === 'Cancelled') return (
    <div style={{ background: '#FFF0F0', border: '1px solid #FEB2B2', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#E53E3E', fontWeight: 500 }}>
      ✕ This order has been cancelled
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STATUS_FLOW.map((s, i) => {
        const done = i <= idx;
        const active = i === idx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#1A1A1A' : '#F0F0F0',
                border: active ? '3px solid #C84B31' : 'none',
                fontSize: 12, color: done ? '#fff' : '#AAA', fontWeight: 600, marginBottom: 5,
              }}>
                {done && !active ? '✓' : i + 1}
              </div>
              <p style={{ fontSize: 10, color: active ? '#C84B31' : done ? '#1A1A1A' : '#AAA', fontWeight: active ? 600 : 400, textAlign: 'center' }}>{s}</p>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div style={{ height: 2, flex: 1, background: i < idx ? '#1A1A1A' : '#F0F0F0', marginBottom: 20, marginLeft: -6, marginRight: -6 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── MAIN ─────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'orders' | 'quotes'>('overview');
  const [selOrder, setSelOrder] = useState<any>(null);
  const [selQuote, setSelQuote] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/customer/login'; return; }

    const { data: profile } = await supabase.from('customers').select('*').eq('id', user.id).single();
    if (!profile) { window.location.href = '/customer/login'; return; }
    setCustomer(profile);

    const [{ data: ord }, { data: q }] = await Promise.all([
      supabase.from('orders').select('*').eq('customer_email', profile.email).order('created_at', { ascending: false }),
      supabase.from('quotes').select('*').eq('customer_email', profile.email).order('created_at', { ascending: false }),
    ]);
    setOrders(ord || []);
    setQuotes(q || []);
    setLoading(false);
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/customer/login'; };

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif' }}>
      <p style={{ color: '#888' }}>Loading your portal...</p>
    </main>
  );

  const sym = orders[0]?.currency_symbol || quotes[0]?.currency_symbol || '₹';
  const fmt = (n: number) => sym + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalOrders = orders.filter(o => o.status !== 'Cancelled').length;
  const totalSpend = orders.filter(o => o.status !== 'Cancelled').reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const totalDue = orders.filter(o => o.status !== 'Cancelled').reduce((s: number, o: any) => s + (o.due_amount || 0), 0);
  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .nav { background: #1A1A1A; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; }
        .tabs { background: #fff; border-bottom: 1px solid #EBEBEB; display: flex; padding: 0 24px; }
        .tab { padding: 13px 18px; font-size: 13px; font-weight: 500; color: #888; cursor: pointer; border-bottom: 2px solid transparent; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; white-space: nowrap; }
        .tab.active { color: #1A1A1A; border-bottom-color: #C84B31; }
        .content { max-width: 900px; margin: 0 auto; padding: 28px 24px; }
        .card { background: #fff; border-radius: 12px; border: 1px solid #EBEBEB; padding: 24px; margin-bottom: 16px; }
        .sh { background: #F9F9F9; border-bottom: 1px solid #F0F0F0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
        .st { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { text-align: left; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 16px; border-bottom: 1px solid #F0F0F0; }
        .table td { padding: 12px 16px; border-bottom: 1px solid #F8F8F8; font-size: 13px; color: #1A1A1A; vertical-align: middle; }
        .table tr:last-child td { border-bottom: none; }
        .table tbody tr:hover td { background: #FAFAFA; cursor: pointer; }
        .btn-sm { padding: 5px 12px; background: #F5F5F5; color: #555; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F5F5F5; }
        .info-label { font-size: 13px; color: #888; }
        .info-value { font-size: 13px; font-weight: 500; color: #1A1A1A; text-align: right; }
        @media(max-width:640px) { .content { padding: 16px; } .stat-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>PrintCalc</span>
          <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>· Customer Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#888' }}>👋 {customer?.name}</span>
          <button style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={logout}>Logout</button>
        </div>
      </nav>

      {/* TABS */}
      <div className="tabs">
        {[
          { id: 'overview', l: '🏠 Overview' },
          { id: 'orders',   l: `📦 Orders ${activeOrders > 0 ? `(${activeOrders} active)` : ''}` },
          { id: 'quotes',   l: `📋 Quotes (${quotes.length})` },
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id as any); setSelOrder(null); setSelQuote(null); }}>{t.l}</button>
        ))}
      </div>

      <div className="content">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && !selOrder && !selQuote && (
          <>
            {/* Welcome */}
            <div className="card" style={{ background: '#1A1A1A', border: 'none', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Welcome back, {customer?.name?.split(' ')[0]}! 👋</p>
                  <p style={{ fontSize: 13, color: '#666' }}>{customer?.company || customer?.email}</p>
                </div>
                <div style={{ width: 48, height: 48, background: '#C84B31', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  {customer?.name?.[0]?.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { l: 'Total Orders', v: totalOrders.toString() },
                { l: 'Active Orders', v: activeOrders.toString(), color: activeOrders > 0 ? '#185FA5' : undefined },
                { l: 'Total Spend', v: fmt(totalSpend), mono: true },
                { l: 'Balance Due', v: fmt(totalDue), mono: true, color: totalDue > 0 ? '#E53E3E' : '#38A169' },
              ].map(s => (
                <div key={s.l} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 16 }}>
                  <p style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.l}</p>
                  <p style={{ fontSize: s.mono ? 16 : 26, fontWeight: 600, fontFamily: s.mono ? 'DM Mono,monospace' : 'inherit', color: s.color || '#1A1A1A' }}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Active orders */}
            {orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                <div className="sh"><p className="st">⚙️ Active Orders</p><button className="btn-sm" onClick={() => setTab('orders')}>View all</button></div>
                {orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).map(o => (
                  <div key={o.id} style={{ padding: '16px 20px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }} onClick={() => { setSelOrder(o); setTab('orders'); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{o.job_title || 'Print Job'}</p>
                        <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{o.order_number} · {o.quantity?.toLocaleString('en-IN')} pcs · {formatDate(o.delivery_date)}</p>
                      </div>
                      <Badge label={o.status} map={ORDER_STATUS} />
                    </div>
                    <StatusProgress status={o.status} />
                  </div>
                ))}
              </div>
            )}

            {/* Recent quotes */}
            {quotes.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="sh"><p className="st">📋 Recent Quotes</p><button className="btn-sm" onClick={() => setTab('quotes')}>View all</button></div>
                <table className="table">
                  <thead><tr><th>Quote #</th><th>Job</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {quotes.slice(0, 3).map(q => (
                      <tr key={q.id} onClick={() => { setSelQuote(q); setTab('quotes'); }}>
                        <td style={{ fontFamily: 'monospace', color: '#C84B31', fontSize: 12 }}>{q.quote_number}</td>
                        <td style={{ fontWeight: 500 }}>{q.job_title || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{q.currency_symbol}{q.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ fontSize: 12, color: '#888' }}>{formatDate(q.created_at)}</td>
                        <td><Badge label={q.status} map={QUOTE_STATUS} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {orders.length === 0 && quotes.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>🖨️</p>
                <p style={{ fontSize: 16, fontWeight: 500, color: '#888', marginBottom: 6 }}>No activity yet</p>
                <p style={{ fontSize: 13, color: '#BBB' }}>Your quotes and orders will appear here once your printer adds them.</p>
              </div>
            )}
          </>
        )}

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && !selOrder && (
          <>
            {orders.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>📦</p>
                <p style={{ fontSize: 15, color: '#888' }}>No orders yet</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="sh"><p className="st">All Orders</p></div>
                <table className="table">
                  <thead><tr><th>Order #</th><th>Job</th><th>Qty</th><th>Amount</th><th>Due</th><th>Delivery</th><th>Status</th><th>Payment</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} onClick={() => setSelOrder(o)}>
                        <td style={{ fontFamily: 'monospace', color: '#C84B31', fontSize: 12, fontWeight: 600 }}>{o.order_number}</td>
                        <td style={{ fontWeight: 500 }}>{o.job_title || '—'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{o.quantity?.toLocaleString('en-IN')}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(o.total_amount)}</td>
                        <td style={{ fontFamily: 'monospace', color: o.due_amount > 0 ? '#E53E3E' : '#38A169', fontWeight: 500 }}>{fmt(o.due_amount)}</td>
                        <td style={{ fontSize: 12, color: '#888' }}>{formatDate(o.delivery_date)}</td>
                        <td><Badge label={o.status} map={ORDER_STATUS} /></td>
                        <td><Badge label={o.payment_status} map={PAY_STATUS} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── ORDER DETAIL ── */}
        {tab === 'orders' && selOrder && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button className="btn-sm" onClick={() => setSelOrder(null)}>← Back</button>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>{selOrder.order_number}</h2>
                <p style={{ fontSize: 12, color: '#888' }}>Placed {formatDate(selOrder.created_at)}</p>
              </div>
            </div>

            {/* Status progress */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Order Status</p>
              <StatusProgress status={selOrder.status} />
            </div>

            {/* Job + Payment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>🖨️ Job Details</p>
                {[
                  ['Job', selOrder.job_title],
                  ['Size', selOrder.job_size],
                  ['Paper', selOrder.paper_type],
                  ['Quantity', selOrder.quantity?.toLocaleString('en-IN')],
                  ['Sides', selOrder.sides],
                  ['Finishing', selOrder.finishing],
                  ['Expected Delivery', formatDate(selOrder.delivery_date)],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="info-row">
                    <span className="info-label">{k}</span>
                    <span className="info-value">{v}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>💰 Payment</p>
                <div style={{ marginBottom: 16 }}><Badge label={selOrder.payment_status} map={PAY_STATUS} /></div>
                {[
                  { l: 'Total Amount', v: fmt(selOrder.total_amount), bold: true },
                  { l: 'Advance Paid', v: fmt(selOrder.advance_paid), color: '#38A169' },
                  { l: 'Balance Due', v: fmt(selOrder.due_amount), color: selOrder.due_amount > 0 ? '#E53E3E' : '#38A169', bold: true },
                ].map(s => (
                  <div key={s.l} className="info-row">
                    <span className="info-label">{s.l}</span>
                    <span className="info-value" style={{ color: s.color, fontWeight: s.bold ? 600 : 500, fontFamily: 'DM Mono,monospace' }}>{s.v}</span>
                  </div>
                ))}
                {selOrder.due_amount > 0 && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#92400E' }}>
                    💡 Please contact your printer to pay the balance of <strong>{fmt(selOrder.due_amount)}</strong>
                  </div>
                )}
              </div>
            </div>

            {selOrder.notes && (
              <div className="card" style={{ background: '#F9F9F9' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>📝 Notes</p>
                <p style={{ fontSize: 13, color: '#555' }}>{selOrder.notes}</p>
              </div>
            )}
          </>
        )}

        {/* ── QUOTES TAB ── */}
        {tab === 'quotes' && !selQuote && (
          <>
            {quotes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
                <p style={{ fontSize: 15, color: '#888' }}>No quotes yet</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="sh"><p className="st">All Quotes</p></div>
                <table className="table">
                  <thead><tr><th>Quote #</th><th>Job</th><th>Size</th><th>Qty</th><th>Amount</th><th>Valid Until</th><th>Status</th></tr></thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} onClick={() => setSelQuote(q)}>
                        <td style={{ fontFamily: 'monospace', color: '#C84B31', fontSize: 12, fontWeight: 600 }}>{q.quote_number}</td>
                        <td style={{ fontWeight: 500 }}>{q.job_title || '—'}</td>
                        <td style={{ fontSize: 12 }}>{q.job_size || '—'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{q.quantity?.toLocaleString('en-IN') || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{q.currency_symbol}{q.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ fontSize: 12, color: '#888' }}>{formatDate(q.valid_until)}</td>
                        <td><Badge label={q.status} map={QUOTE_STATUS} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── QUOTE DETAIL ── */}
        {tab === 'quotes' && selQuote && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button className="btn-sm" onClick={() => setSelQuote(null)}>← Back</button>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>{selQuote.quote_number}</h2>
                <p style={{ fontSize: 12, color: '#888' }}>Issued {formatDate(selQuote.created_at)} · Valid until {formatDate(selQuote.valid_until)}</p>
              </div>
              <Badge label={selQuote.status} map={QUOTE_STATUS} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>🖨️ Job Details</p>
                {[
                  ['Job', selQuote.job_title],
                  ['Size', selQuote.job_size],
                  ['Paper', selQuote.paper_type],
                  ['Quantity', selQuote.quantity?.toLocaleString('en-IN')],
                  ['Sides', selQuote.sides],
                  ['Finishing', selQuote.finishing],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="info-row">
                    <span className="info-label">{k}</span>
                    <span className="info-value">{v}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>💰 Pricing</p>
                {[
                  { l: 'Subtotal', v: `${selQuote.currency_symbol}${selQuote.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                  { l: `Markup (${selQuote.markup_percent}%)`, v: `${selQuote.currency_symbol}${selQuote.markup_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                  { l: `GST (${selQuote.tax_percent}%)`, v: `${selQuote.currency_symbol}${selQuote.tax_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                ].map(s => (
                  <div key={s.l} className="info-row">
                    <span className="info-label">{s.l}</span>
                    <span className="info-value" style={{ fontFamily: 'DM Mono,monospace' }}>{s.v}</span>
                  </div>
                ))}
                <div style={{ background: '#1A1A1A', borderRadius: 10, padding: '14px 16px', marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Total (incl. GST)</span>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'DM Mono,monospace', color: '#fff' }}>{selQuote.currency_symbol}{selQuote.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {selQuote.notes && (
              <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>📝 Notes</p>
                <p style={{ fontSize: 13, color: '#78350F' }}>{selQuote.notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
