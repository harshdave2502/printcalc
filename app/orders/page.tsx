'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// ─── TYPES ────────────────────────────────────────────────────────────
interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string;
  job_title: string;
  job_size: string;
  paper_type: string;
  quantity: number;
  sides: string;
  finishing: string;
  total_amount: number;
  currency_symbol: string;
  status: 'Pending' | 'In Production' | 'Ready' | 'Delivered' | 'Cancelled';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  advance_paid: number;
  due_amount: number;
  notes: string;
  delivery_date: string;
  created_at: string;
  quote_id: string | null;
  quote_number: string | null;
}

interface Subscriber {
  id: string;
  business_name: string;
  email: string;
  currency_symbol: string;
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────
const STATUS_FLOW = ['Pending', 'In Production', 'Ready', 'Delivered'];

const ORDER_STATUS: Record<string, { color: string; bg: string; icon: string }> = {
  Pending:        { color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
  'In Production':{ color: '#185FA5', bg: '#EEF4FA', icon: '⚙️' },
  Ready:          { color: '#6B46C1', bg: '#F5F0FF', icon: '✅' },
  Delivered:      { color: '#38A169', bg: '#F0FFF4', icon: '🚚' },
  Cancelled:      { color: '#E53E3E', bg: '#FFF0F0', icon: '✕' },
};

const PAY_STATUS: Record<string, { color: string; bg: string }> = {
  Unpaid:  { color: '#E53E3E', bg: '#FFF0F0' },
  Partial: { color: '#D97706', bg: '#FFFBEB' },
  Paid:    { color: '#38A169', bg: '#F0FFF4' },
};

function genOrderNum() {
  const d = new Date();
  return `ORD${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*900+100)}`;
}

function formatDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function deliveryIn(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────
function Badge({ label, map }: { label: string; map: Record<string, any> }) {
  const s = map[label] || { color: '#888', bg: '#F5F5F5', icon: '' };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.icon ? `${s.icon} ${label}` : label}
    </span>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────
function StatusProgress({ status }: { status: string }) {
  const idx = STATUS_FLOW.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
      {STATUS_FLOW.map((s, i) => {
        const done = i <= idx;
        const active = i === idx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#1A1A1A' : '#F0F0F0',
                border: active ? '3px solid #C84B31' : 'none',
                fontSize: 13, color: done ? '#fff' : '#AAA', fontWeight: 600, marginBottom: 6,
              }}>
                {done && !active ? '✓' : i + 1}
              </div>
              <p style={{ fontSize: 11, color: active ? '#C84B31' : done ? '#1A1A1A' : '#AAA', fontWeight: active ? 600 : 400, textAlign: 'center' }}>{s}</p>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div style={{ height: 2, flex: 1, background: i < idx ? '#1A1A1A' : '#F0F0F0', marginBottom: 22, marginLeft: -8, marginRight: -8 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [sub, setSub] = useState<Subscriber | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selOrder, setSelOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [fromQuote, setFromQuote] = useState('');

  const blankForm = {
    customer_name: '', customer_email: '', customer_phone: '', customer_company: '',
    job_title: '', job_size: '', paper_type: '', quantity: '',
    sides: 'Double side', finishing: '', total_amount: '', advance_paid: '0',
    notes: '', delivery_date: deliveryIn(7), quote_id: '', quote_number: '',
  };
  const [form, setForm] = useState(blankForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const [{ data: profile }, { data: ord }, { data: q }] = await Promise.all([
      supabase.from('subscribers').select('*').eq('id', user.id).single(),
      supabase.from('orders').select('*').eq('subscriber_id', user.id).order('created_at', { ascending: false }),
      supabase.from('quotes').select('id,quote_number,customer_name,customer_email,customer_phone,customer_company,job_title,job_size,paper_type,quantity,sides,finishing,total_amount,currency_symbol').eq('subscriber_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (profile) setSub(profile);
    setOrders(ord || []);
    setQuotes(q || []);
    setLoading(false);
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  // Pre-fill form from a quote
  const fillFromQuote = (qid: string) => {
    const q = quotes.find(x => x.id === qid);
    if (!q) return;
    setForm(f => ({
      ...f,
      customer_name: q.customer_name || '',
      customer_email: q.customer_email || '',
      customer_phone: q.customer_phone || '',
      customer_company: q.customer_company || '',
      job_title: q.job_title || '',
      job_size: q.job_size || '',
      paper_type: q.paper_type || '',
      quantity: q.quantity?.toString() || '',
      sides: q.sides || 'Double side',
      finishing: q.finishing || '',
      total_amount: q.total_amount?.toString() || '',
      quote_id: q.id,
      quote_number: q.quote_number,
    }));
    setFromQuote(qid);
  };

  const saveOrder = async () => {
    if (!form.customer_name || !form.total_amount) {
      setSaveMsg('Please fill in customer name and total amount.');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const total = parseFloat(form.total_amount) || 0;
    const advance = parseFloat(form.advance_paid) || 0;
    const payload = {
      subscriber_id: user!.id,
      order_number: genOrderNum(),
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      customer_company: form.customer_company,
      job_title: form.job_title,
      job_size: form.job_size,
      paper_type: form.paper_type,
      quantity: parseInt(form.quantity) || 0,
      sides: form.sides,
      finishing: form.finishing,
      total_amount: total,
      advance_paid: advance,
      due_amount: total - advance,
      currency_symbol: sub?.currency_symbol || '₹',
      notes: form.notes,
      status: 'Pending',
      payment_status: advance >= total ? 'Paid' : advance > 0 ? 'Partial' : 'Unpaid',
      delivery_date: form.delivery_date,
      quote_id: form.quote_id || null,
      quote_number: form.quote_number || null,
    };
    const { data, error } = await supabase.from('orders').insert(payload).select().single();
    if (data) {
      // If from quote, mark quote as Converted
      if (form.quote_id) {
        await supabase.from('quotes').update({ status: 'Converted' }).eq('id', form.quote_id);
      }
      setOrders(prev => [data, ...prev]);
      setSelOrder(data);
      setView('detail');
      setSaveMsg('Order created!');
      setForm(blankForm);
      setFromQuote('');
    } else {
      setSaveMsg('Error: ' + (error?.message || 'Could not save'));
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    if (selOrder?.id === id) setSelOrder(prev => prev ? { ...prev, status: status as any } : prev);
  };

  const updatePayment = async (id: string, advance: number, total: number) => {
    const due = total - advance;
    const payment_status = advance >= total ? 'Paid' : advance > 0 ? 'Partial' : 'Unpaid';
    await supabase.from('orders').update({ advance_paid: advance, due_amount: due, payment_status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, advance_paid: advance, due_amount: due, payment_status: payment_status as any } : o));
    if (selOrder?.id === id) setSelOrder(prev => prev ? { ...prev, advance_paid: advance, due_amount: due, payment_status: payment_status as any } : prev);
    setSaveMsg('Payment updated!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    await supabase.from('orders').delete().eq('id', id);
    setOrders(prev => prev.filter(o => o.id !== id));
    setView('list');
    setSelOrder(null);
  };

  const sym = sub?.currency_symbol || '₹';
  const fmt = (n: number) => sym + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = filterStatus === 'All' ? orders : orders.filter(o => o.status === filterStatus);

  // Revenue stats
  const totalRevenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total_amount || 0), 0);
  const collected = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.advance_paid || 0), 0);
  const pending = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.due_amount || 0), 0);

  // Payment edit state
  const [editPayId, setEditPayId] = useState('');
  const [editAdvance, setEditAdvance] = useState('');

  const IS: any = { padding: '9px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans,sans-serif', color: '#1A1A1A', background: '#FAFAFA', outline: 'none', width: '100%' };

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif' }}>
      <p style={{ color: '#888' }}>Loading...</p>
    </main>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .nav { background: #1A1A1A; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; }
        .content { max-width: 980px; margin: 0 auto; padding: 28px 24px; }
        .card { background: #fff; border-radius: 12px; border: 1px solid #EBEBEB; padding: 24px; margin-bottom: 16px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 11px; font-weight: 600; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.06em; }
        input, select, textarea { padding: 9px 12px; border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; width: 100%; }
        input:focus, select:focus, textarea:focus { border-color: #C84B31; background: #fff; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .btn-primary { padding: 9px 20px; background: #1A1A1A; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-red { padding: 9px 20px; background: #C84B31; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-sm { padding: 5px 12px; background: #F5F5F5; color: #555; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
        .btn-del { padding: 5px 10px; background: #FFF0F0; color: #E53E3E; border: 1px solid #FEB2B2; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
        .btn-outline { padding: 9px 20px; background: #fff; color: #1A1A1A; border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-green { padding: 8px 16px; background: #F0FFF4; color: #276749; border: 1px solid #9AE6B4; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { text-align: left; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 16px; border-bottom: 1px solid #F0F0F0; }
        .table td { padding: 12px 16px; border-bottom: 1px solid #F8F8F8; font-size: 13px; color: #1A1A1A; vertical-align: middle; }
        .table tr:last-child td { border-bottom: none; }
        .table tbody tr:hover td { background: #FAFAFA; cursor: pointer; }
        .sh { background: #F9F9F9; border-bottom: 1px solid #F0F0F0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
        .st { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
        .stat-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 10px; padding: 16px; }
        .save-msg { color: #38A169; font-size: 13px; }
        .err-msg { color: #E53E3E; font-size: 13px; }
        .filter-btn { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1.5px solid #E8E8E8; background: #fff; color: #888; font-family: inherit; }
        .filter-btn.active { background: #1A1A1A; color: #fff; border-color: #1A1A1A; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F5F5F5; }
        .info-label { font-size: 13px; color: #888; }
        .info-value { font-size: 13px; font-weight: 500; color: #1A1A1A; }
        @media(max-width:640px) { .grid-2,.grid-3,.grid-4 { grid-template-columns: 1fr; } .content { padding: 16px; } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>PrintCalc</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/dashboard" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>← Dashboard</a>
          <a href="/quotes" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Quotes</a>
          <a href="/" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Calculator</a>
          <button style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="content">

        {/* ─── LIST VIEW ─── */}
        {view === 'list' && (
          <>
            {/* Revenue stats */}
            <div className="grid-4">
              {[
                { l: 'Total Orders', v: orders.filter(o => o.status !== 'Cancelled').length.toString() },
                { l: 'Total Revenue', v: fmt(totalRevenue), mono: true },
                { l: 'Collected', v: fmt(collected), mono: true, color: '#38A169' },
                { l: 'Due / Pending', v: fmt(pending), mono: true, color: pending > 0 ? '#E53E3E' : '#38A169' },
              ].map(s => (
                <div key={s.l} className="stat-card">
                  <p style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.l}</p>
                  <p style={{ fontSize: s.mono ? 18 : 28, fontWeight: 600, fontFamily: s.mono ? 'DM Mono,monospace' : 'inherit', color: s.color || '#1A1A1A' }}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Status summary pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {['All', ...STATUS_FLOW, 'Cancelled'].map(s => {
                const count = s === 'All' ? orders.length : orders.filter(o => o.status === s).length;
                return (
                  <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                    {ORDER_STATUS[s]?.icon} {s} {count > 0 && <span style={{ marginLeft: 4, background: filterStatus === s ? 'rgba(255,255,255,0.2)' : '#F0F0F0', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Orders table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="sh">
                <p className="st">Orders {filterStatus !== 'All' ? `— ${filterStatus}` : ''}</p>
                <button className="btn-red" onClick={() => { setForm(blankForm); setFromQuote(''); setView('create'); }}>+ New Order</button>
              </div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>📦</p>
                  <p style={{ fontSize: 15, color: '#888', marginBottom: 8 }}>{filterStatus === 'All' ? 'No orders yet' : `No ${filterStatus} orders`}</p>
                  {filterStatus === 'All' && <button className="btn-red" style={{ marginTop: 8 }} onClick={() => setView('create')}>+ Create First Order</button>}
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Order #</th><th>Customer</th><th>Job</th><th>Qty</th><th>Amount</th><th>Due</th><th>Delivery</th><th>Status</th><th>Payment</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(o => (
                      <tr key={o.id} onClick={() => { setSelOrder(o); setView('detail'); }}>
                        <td style={{ fontFamily: 'monospace', color: '#C84B31', fontSize: 12, fontWeight: 600 }}>{o.order_number}</td>
                        <td>
                          <p style={{ fontWeight: 500 }}>{o.customer_name}</p>
                          {o.customer_company && <p style={{ fontSize: 11, color: '#AAA' }}>{o.customer_company}</p>}
                        </td>
                        <td style={{ fontSize: 12 }}>{o.job_title || '—'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{o.quantity?.toLocaleString('en-IN') || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(o.total_amount)}</td>
                        <td style={{ fontFamily: 'monospace', color: o.due_amount > 0 ? '#E53E3E' : '#38A169', fontWeight: 500 }}>{fmt(o.due_amount)}</td>
                        <td style={{ fontSize: 12, color: '#888' }}>{formatDate(o.delivery_date)}</td>
                        <td><Badge label={o.status} map={ORDER_STATUS} /></td>
                        <td><Badge label={o.payment_status} map={PAY_STATUS} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ─── CREATE VIEW ─── */}
        {view === 'create' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button className="btn-sm" onClick={() => setView('list')}>← Back</button>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>New Order</h2>
            </div>

            {/* Import from quote */}
            {quotes.length > 0 && (
              <div className="card" style={{ background: '#F5F0FF', border: '1px solid #D6BCFA' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6B46C1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>⚡ Import from Quote (optional)</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select value={fromQuote} onChange={e => { setFromQuote(e.target.value); if (e.target.value) fillFromQuote(e.target.value); else setForm(blankForm); }} style={{ ...IS, flex: 1 }}>
                    <option value="">— Select a quote to import —</option>
                    {quotes.map(q => <option key={q.id} value={q.id}>{q.quote_number} · {q.customer_name} · {q.job_title || 'No title'}</option>)}
                  </select>
                  {fromQuote && <button className="btn-sm" onClick={() => { setFromQuote(''); setForm(blankForm); }}>Clear</button>}
                </div>
                {fromQuote && <p style={{ fontSize: 12, color: '#6B46C1', marginTop: 8 }}>✓ Form pre-filled from quote. You can edit anything before saving.</p>}
              </div>
            )}

            {/* Customer details */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>👤 Customer Details</p>
              <div className="grid-2">
                <div className="field"><label>Customer Name *</label><input placeholder="e.g. Raj Printers" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div className="field"><label>Company</label><input placeholder="Company name (optional)" value={form.customer_company} onChange={e => setForm({ ...form, customer_company: e.target.value })} /></div>
                <div className="field"><label>Email</label><input type="email" placeholder="customer@email.com" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} /></div>
                <div className="field"><label>Phone</label><input placeholder="Phone number" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} /></div>
              </div>
            </div>

            {/* Job details */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>🖨️ Job Details</p>
              <div className="grid-2">
                <div className="field"><label>Job Title / Description</label><input placeholder="e.g. Business Cards, Brochure" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} /></div>
                <div className="field"><label>Size</label><input placeholder="e.g. A4 (8.3 × 11.7\")" value={form.job_size} onChange={e => setForm({ ...form, job_size: e.target.value })} /></div>
                <div className="field"><label>Paper Type</label><input placeholder="e.g. Art Card 300 GSM" value={form.paper_type} onChange={e => setForm({ ...form, paper_type: e.target.value })} /></div>
                <div className="field"><label>Quantity</label><input type="number" placeholder="e.g. 5000" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div className="field">
                  <label>Sides</label>
                  <select value={form.sides} onChange={e => setForm({ ...form, sides: e.target.value })}>
                    <option>Single side</option><option>Double side</option>
                  </select>
                </div>
                <div className="field"><label>Finishing</label><input placeholder="e.g. Matt Lamination, UV" value={form.finishing} onChange={e => setForm({ ...form, finishing: e.target.value })} /></div>
              </div>
            </div>

            {/* Payment & delivery */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>💰 Payment & Delivery</p>
              <div className="grid-3">
                <div className="field">
                  <label>Total Amount ({sym}) *</label>
                  <input type="number" placeholder="e.g. 18500" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} />
                </div>
                <div className="field">
                  <label>Advance Paid ({sym})</label>
                  <input type="number" placeholder="0" value={form.advance_paid} onChange={e => setForm({ ...form, advance_paid: e.target.value })} />
                </div>
                <div className="field">
                  <label>Expected Delivery</label>
                  <input type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} />
                </div>
              </div>
              {parseFloat(form.total_amount) > 0 && (
                <div style={{ background: '#F9F9F9', borderRadius: 10, padding: 16, marginTop: 4 }}>
                  <div style={{ display: 'flex', gap: 24 }}>
                    {[
                      { l: 'Total', v: fmt(parseFloat(form.total_amount) || 0) },
                      { l: 'Advance', v: fmt(parseFloat(form.advance_paid) || 0), color: '#38A169' },
                      { l: 'Balance Due', v: fmt((parseFloat(form.total_amount) || 0) - (parseFloat(form.advance_paid) || 0)), color: '#E53E3E' },
                    ].map(s => (
                      <div key={s.l}>
                        <p style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{s.l}</p>
                        <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'DM Mono,monospace', color: s.color || '#1A1A1A' }}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>📝 Notes</p>
              <textarea rows={3} placeholder="Internal notes about this order..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn-red" onClick={saveOrder} disabled={saving}>{saving ? 'Saving...' : 'Create Order →'}</button>
              <button className="btn-outline" onClick={() => setView('list')}>Cancel</button>
              {saveMsg && <span className={saveMsg.startsWith('Error') ? 'err-msg' : 'save-msg'}>{saveMsg}</span>}
            </div>
          </>
        )}

        {/* ─── DETAIL VIEW ─── */}
        {view === 'detail' && selOrder && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn-sm" onClick={() => setView('list')}>← Back</button>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600 }}>{selOrder.order_number}</h2>
                  {selOrder.quote_number && <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>From quote: <span style={{ color: '#C84B31', fontFamily: 'monospace' }}>{selOrder.quote_number}</span></p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {saveMsg && <span className="save-msg">✓ {saveMsg}</span>}
                <button className="btn-del" onClick={() => deleteOrder(selOrder.id)}>Delete</button>
              </div>
            </div>

            {/* Progress tracker */}
            {selOrder.status !== 'Cancelled' && (
              <div className="card">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Order Progress</p>
                <StatusProgress status={selOrder.status} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUS_FLOW.map(s => (
                    <button
                      key={s}
                      onClick={() => updateOrderStatus(selOrder.id, s)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                        background: selOrder.status === s ? '#1A1A1A' : '#F5F5F5',
                        color: selOrder.status === s ? '#fff' : '#555',
                      }}
                    >
                      {ORDER_STATUS[s]?.icon} {s}
                    </button>
                  ))}
                  <button onClick={() => updateOrderStatus(selOrder.id, 'Cancelled')} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: '#FFF0F0', color: '#E53E3E', border: '1px solid #FEB2B2', fontWeight: 500 }}>
                    ✕ Cancel
                  </button>
                </div>
              </div>
            )}

            {selOrder.status === 'Cancelled' && (
              <div style={{ background: '#FFF0F0', border: '1px solid #FEB2B2', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: '#E53E3E', fontWeight: 500 }}>✕ This order has been cancelled</p>
                <button className="btn-sm" onClick={() => updateOrderStatus(selOrder.id, 'Pending')}>Reactivate</button>
              </div>
            )}

            <div className="grid-2">
              {/* Order info */}
              <div className="card">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>👤 Customer</p>
                {[
                  ['Name', selOrder.customer_name],
                  ['Company', selOrder.customer_company],
                  ['Email', selOrder.customer_email],
                  ['Phone', selOrder.customer_phone],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="info-row">
                    <span className="info-label">{k}</span>
                    <span className="info-value">{v}</span>
                  </div>
                ))}
              </div>

              <div className="card">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>🖨️ Job Info</p>
                {[
                  ['Job', selOrder.job_title],
                  ['Size', selOrder.job_size],
                  ['Paper', selOrder.paper_type],
                  ['Quantity', selOrder.quantity?.toLocaleString('en-IN')],
                  ['Sides', selOrder.sides],
                  ['Finishing', selOrder.finishing],
                  ['Delivery', formatDate(selOrder.delivery_date)],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="info-row">
                    <span className="info-label">{k}</span>
                    <span className="info-value">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment section */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>💰 Payment</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { l: 'Total Amount', v: fmt(selOrder.total_amount), color: '#1A1A1A' },
                  { l: 'Advance Paid', v: fmt(selOrder.advance_paid), color: '#38A169' },
                  { l: 'Balance Due', v: fmt(selOrder.due_amount), color: selOrder.due_amount > 0 ? '#E53E3E' : '#38A169' },
                ].map(s => (
                  <div key={s.l} style={{ background: '#F9F9F9', borderRadius: 10, padding: 16 }}>
                    <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.l}</p>
                    <p style={{ fontSize: 18, fontWeight: 600, fontFamily: 'DM Mono,monospace', color: s.color }}>{s.v}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge label={selOrder.payment_status} map={PAY_STATUS} />
                {selOrder.payment_status !== 'Paid' && (
                  editPayId === selOrder.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
                      <span style={{ fontSize: 13, color: '#888' }}>Update advance paid ({sym}):</span>
                      <input type="number" value={editAdvance} onChange={e => setEditAdvance(e.target.value)} style={{ width: 120, padding: '6px 10px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} placeholder={selOrder.advance_paid.toString()} />
                      <button className="btn-green" onClick={() => { updatePayment(selOrder.id, parseFloat(editAdvance) || 0, selOrder.total_amount); setEditPayId(''); }}>Save</button>
                      <button className="btn-sm" onClick={() => setEditPayId('')}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn-green" style={{ marginLeft: 8 }} onClick={() => { setEditPayId(selOrder.id); setEditAdvance(selOrder.advance_paid.toString()); }}>
                      💳 Update Payment
                    </button>
                  )
                )}
                {selOrder.payment_status === 'Paid' && <span style={{ fontSize: 13, color: '#38A169', marginLeft: 8 }}>✓ Fully paid</span>}
              </div>
            </div>

            {/* Notes */}
            {selOrder.notes && (
              <div className="card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>📝 Notes</p>
                <p style={{ fontSize: 13, color: '#78350F' }}>{selOrder.notes}</p>
              </div>
            )}

            <p style={{ fontSize: 12, color: '#CCC', marginTop: 8 }}>Created: {formatDate(selOrder.created_at)}</p>
          </>
        )}
      </div>
    </>
  );
}
