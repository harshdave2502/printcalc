'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

function formatDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SC: Record<string, string> = {
  Draft: '#888', Sent: '#185FA5', Converted: '#38A169', Expired: '#E53E3E',
  Pending: '#D97706', 'In Production': '#185FA5', Ready: '#6B46C1', Delivered: '#38A169', Cancelled: '#E53E3E',
};
const SBG: Record<string, string> = {
  Draft: '#F5F5F5', Sent: '#EEF4FA', Converted: '#F0FFF4', Expired: '#FFF0F0',
  Pending: '#FFFBEB', 'In Production': '#EEF4FA', Ready: '#F5F0FF', Delivered: '#F0FFF4', Cancelled: '#FFF0F0',
};

function Badge({ s }: { s: string }) {
  return <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: SBG[s] || '#F5F5F5', color: SC[s] || '#888' }}>{s}</span>;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#C84B31', '#185FA5', '#6B46C1', '#276749', '#D97706'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

export default function CustomersPage() {
  const [sub, setSub] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selCust, setSelCust] = useState<any>(null);
  const [custOrders, setCustOrders] = useState<any[]>([]);
  const [custQuotes, setCustQuotes] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', company: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: profile } = await supabase.from('subscribers').select('*').eq('id', user.id).single();
    if (profile) setSub(profile);

    // Pull unique customers from orders + quotes combined
    const [{ data: orders }, { data: quotes }] = await Promise.all([
      supabase.from('orders').select('customer_name,customer_email,customer_phone,customer_company,total_amount,due_amount,status,created_at').eq('subscriber_id', user.id),
      supabase.from('quotes').select('customer_name,customer_email,customer_phone,customer_company,total_amount,status,created_at').eq('subscriber_id', user.id),
    ]);

    // Build customer map keyed by email (or name if no email)
    const map: Record<string, any> = {};
    for (const o of orders || []) {
      const key = o.customer_email || o.customer_name;
      if (!map[key]) map[key] = { name: o.customer_name, email: o.customer_email, phone: o.customer_phone, company: o.customer_company, orders: [], quotes: [], total_spend: 0, total_due: 0 };
      map[key].orders.push(o);
      map[key].total_spend += o.total_amount || 0;
      map[key].total_due += o.due_amount || 0;
    }
    for (const q of quotes || []) {
      const key = q.customer_email || q.customer_name;
      if (!map[key]) map[key] = { name: q.customer_name, email: q.customer_email, phone: q.customer_phone, company: q.customer_company, orders: [], quotes: [], total_spend: 0, total_due: 0 };
      map[key].quotes.push(q);
    }

    // Sort by total spend desc
    const list = Object.values(map).sort((a: any, b: any) => b.total_spend - a.total_spend);
    setCustomers(list);
    setLoading(false);
  };

  const loadCustomerDetail = async (cust: any) => {
    setDetailLoading(true);
    setSelCust(cust);
    const { data: { user } } = await supabase.auth.getUser();
    const email = cust.email;
    const name = cust.name;
    const [{ data: ord }, { data: quo }] = await Promise.all([
      email
        ? supabase.from('orders').select('*').eq('subscriber_id', user!.id).eq('customer_email', email).order('created_at', { ascending: false })
        : supabase.from('orders').select('*').eq('subscriber_id', user!.id).eq('customer_name', name).order('created_at', { ascending: false }),
      email
        ? supabase.from('quotes').select('*').eq('subscriber_id', user!.id).eq('customer_email', email).order('created_at', { ascending: false })
        : supabase.from('quotes').select('*').eq('subscriber_id', user!.id).eq('customer_name', name).order('created_at', { ascending: false }),
    ]);
    setCustOrders(ord || []);
    setCustQuotes(quo || []);
    setDetailLoading(false);
  };

  const addCustomer = async () => {
    if (!newCust.name) { setSaveMsg('Please enter a name.'); setTimeout(() => setSaveMsg(''), 2000); return; }
    setSaving(true);
    // Add a placeholder quote to register this customer
    const { data: { user } } = await supabase.auth.getUser();
    // We just store them locally — they'll appear properly once they get a quote/order
    setCustomers(prev => [{
      name: newCust.name, email: newCust.email, phone: newCust.phone,
      company: newCust.company, orders: [], quotes: [], total_spend: 0, total_due: 0,
    }, ...prev]);
    setNewCust({ name: '', email: '', phone: '', company: '' });
    setShowAdd(false);
    setSaveMsg('Customer added!');
    setTimeout(() => setSaveMsg(''), 2000);
    setSaving(false);
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const sym = sub?.currency_symbol || '₹';
  const fmt = (n: number) => sym + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const IS: any = { padding: '9px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans,sans-serif', color: '#1A1A1A', background: '#FAFAFA', outline: 'none', width: '100%' };

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif' }}>
      <p style={{ color: '#888' }}>Loading customers...</p>
    </main>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .nav { background: #1A1A1A; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; }
        .content { max-width: 1000px; margin: 0 auto; padding: 28px 24px; }
        .card { background: #fff; border-radius: 12px; border: 1px solid #EBEBEB; padding: 24px; margin-bottom: 16px; }
        .sh { background: #F9F9F9; border-bottom: 1px solid #F0F0F0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
        .st { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { text-align: left; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 16px; border-bottom: 1px solid #F0F0F0; }
        .table td { padding: 12px 16px; border-bottom: 1px solid #F8F8F8; font-size: 13px; color: #1A1A1A; vertical-align: middle; }
        .table tr:last-child td { border-bottom: none; }
        .table tbody tr:hover td { background: #FAFAFA; cursor: pointer; }
        .btn-primary { padding: 9px 20px; background: #1A1A1A; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-red { padding: 9px 20px; background: #C84B31; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-sm { padding: 5px 12px; background: #F5F5F5; color: #555; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
        .btn-outline { padding: 9px 20px; background: #fff; color: #1A1A1A; border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .search { padding: 9px 14px; border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 13px; font-family: inherit; color: #1A1A1A; background: #fff; outline: none; width: 260px; }
        .search:focus { border-color: #C84B31; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 11px; font-weight: 600; color: #888; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.06em; }
        input { padding: 9px 12px; border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; width: 100%; }
        input:focus { border-color: #C84B31; background: #fff; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stat-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 10px; padding: 16px; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F5F5F5; }
        .save-msg { color: #38A169; font-size: 13px; }
        .err-msg { color: #E53E3E; font-size: 13px; }
        @media(max-width:640px) { .content { padding: 16px; } .grid-2 { grid-template-columns: 1fr; } .search { width: 100%; } }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>PrintCalc</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Calculator</a>
          <a href="/quotes" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Quotes</a>
          <a href="/orders" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Orders</a>
          <a href="/dashboard" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Dashboard</a>
          <button style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="content">

        {/* ── LIST VIEW ── */}
        {!selCust && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { l: 'Total Customers', v: customers.length.toString() },
                { l: 'With Active Orders', v: customers.filter(c => c.orders.some((o: any) => !['Delivered', 'Cancelled'].includes(o.status))).length.toString() },
                { l: 'Total Revenue', v: fmt(customers.reduce((s, c) => s + c.total_spend, 0)), mono: true },
                { l: 'Total Due', v: fmt(customers.reduce((s, c) => s + c.total_due, 0)), mono: true, color: customers.reduce((s, c) => s + c.total_due, 0) > 0 ? '#E53E3E' : '#38A169' },
              ].map(s => (
                <div key={s.l} className="stat-card">
                  <p style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.l}</p>
                  <p style={{ fontSize: s.mono ? 17 : 26, fontWeight: 600, fontFamily: s.mono ? 'DM Mono,monospace' : 'inherit', color: s.color || '#1A1A1A' }}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Add customer form */}
            {showAdd && (
              <div className="card" style={{ border: '1.5px solid #C84B31' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>➕ Add New Customer</p>
                <div className="grid-2">
                  <div className="field"><label>Name *</label><input placeholder="Customer name" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} /></div>
                  <div className="field"><label>Company</label><input placeholder="Company name" value={newCust.company} onChange={e => setNewCust({ ...newCust, company: e.target.value })} /></div>
                  <div className="field"><label>Email</label><input type="email" placeholder="email@example.com" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} /></div>
                  <div className="field"><label>Phone</label><input placeholder="Phone number" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button className="btn-red" onClick={addCustomer} disabled={saving}>{saving ? 'Saving...' : 'Add Customer'}</button>
                  <button className="btn-outline" onClick={() => { setShowAdd(false); setNewCust({ name: '', email: '', phone: '', company: '' }); }}>Cancel</button>
                  {saveMsg && <span className={saveMsg.startsWith('Please') ? 'err-msg' : 'save-msg'}>{saveMsg}</span>}
                </div>
              </div>
            )}

            {/* Customers table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="sh">
                <p className="st">All Customers ({filtered.length})</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    className="search"
                    placeholder="🔍 Search by name, email, company..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <button className="btn-red" onClick={() => setShowAdd(true)}>+ Add Customer</button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>👥</p>
                  <p style={{ fontSize: 15, color: '#888', marginBottom: 8 }}>
                    {search ? `No customers matching "${search}"` : 'No customers yet'}
                  </p>
                  <p style={{ fontSize: 13, color: '#BBB' }}>
                    Customers appear automatically when you create quotes or orders for them.
                  </p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Orders</th>
                      <th>Quotes</th>
                      <th>Total Spend</th>
                      <th>Balance Due</th>
                      <th>Last Activity</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => {
                      const lastActivity = [...c.orders, ...c.quotes].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                      return (
                        <tr key={i} onClick={() => loadCustomerDetail(c)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar name={c.name} />
                              <div>
                                <p style={{ fontWeight: 600 }}>{c.name}</p>
                                {c.company && <p style={{ fontSize: 11, color: '#AAA' }}>{c.company}</p>}
                              </div>
                            </div>
                          </td>
                          <td>
                            {c.email && <p style={{ fontSize: 12 }}>{c.email}</p>}
                            {c.phone && <p style={{ fontSize: 12, color: '#888' }}>{c.phone}</p>}
                            {!c.email && !c.phone && <span style={{ color: '#CCC', fontSize: 12 }}>—</span>}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.orders.length}</span>
                            {c.orders.filter((o: any) => !['Delivered', 'Cancelled'].includes(o.status)).length > 0 && (
                              <span style={{ marginLeft: 6, fontSize: 11, background: '#EEF4FA', color: '#185FA5', padding: '2px 6px', borderRadius: 4 }}>
                                {c.orders.filter((o: any) => !['Delivered', 'Cancelled'].includes(o.status)).length} active
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.quotes.length}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(c.total_spend)}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: c.total_due > 0 ? '#E53E3E' : '#38A169' }}>{fmt(c.total_due)}</td>
                          <td style={{ fontSize: 12, color: '#888' }}>{lastActivity ? formatDate(lastActivity.created_at) : '—'}</td>
                          <td><button className="btn-sm" onClick={e => { e.stopPropagation(); loadCustomerDetail(c); }}>View →</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── CUSTOMER DETAIL ── */}
        {selCust && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn-sm" onClick={() => { setSelCust(null); setCustOrders([]); setCustQuotes([]); }}>← Back</button>
                <Avatar name={selCust.name} size={44} />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600 }}>{selCust.name}</h2>
                  {selCust.company && <p style={{ fontSize: 13, color: '#888' }}>{selCust.company}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href="/quotes" style={{ padding: '9px 16px', background: '#EEF4FA', color: '#185FA5', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                  + New Quote
                </a>
                <a href="/orders" style={{ padding: '9px 16px', background: '#F5F0FF', color: '#6B46C1', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                  + New Order
                </a>
              </div>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>Loading...</div>
            ) : (
              <>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { l: 'Total Orders', v: custOrders.length.toString() },
                    { l: 'Total Quotes', v: custQuotes.length.toString() },
                    { l: 'Total Spend', v: fmt(selCust.total_spend), mono: true },
                    { l: 'Balance Due', v: fmt(selCust.total_due), mono: true, color: selCust.total_due > 0 ? '#E53E3E' : '#38A169' },
                  ].map(s => (
                    <div key={s.l} className="stat-card">
                      <p style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.l}</p>
                      <p style={{ fontSize: s.mono ? 17 : 26, fontWeight: 600, fontFamily: s.mono ? 'DM Mono,monospace' : 'inherit', color: s.color || '#1A1A1A' }}>{s.v}</p>
                    </div>
                  ))}
                </div>

                <div className="grid-2">
                  {/* Contact info */}
                  <div className="card">
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>👤 Contact Info</p>
                    {[
                      ['Name', selCust.name],
                      ['Company', selCust.company],
                      ['Email', selCust.email],
                      ['Phone', selCust.phone],
                    ].map(([k, v]) => (
                      <div key={k as string} className="info-row">
                        <span style={{ fontSize: 13, color: '#888' }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Active orders summary */}
                  <div className="card">
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>📦 Order Summary</p>
                    {[
                      ['Total Orders', custOrders.length],
                      ['Active', custOrders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length],
                      ['Delivered', custOrders.filter(o => o.status === 'Delivered').length],
                      ['Cancelled', custOrders.filter(o => o.status === 'Cancelled').length],
                    ].map(([k, v]) => (
                      <div key={k as string} className="info-row">
                        <span style={{ fontSize: 13, color: '#888' }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono,monospace' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orders history */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                  <div className="sh"><p className="st">📦 Orders ({custOrders.length})</p></div>
                  {custOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#AAA', fontSize: 13 }}>No orders yet</div>
                  ) : (
                    <table className="table">
                      <thead><tr><th>Order #</th><th>Job</th><th>Qty</th><th>Amount</th><th>Due</th><th>Date</th><th>Status</th><th>Payment</th></tr></thead>
                      <tbody>
                        {custOrders.map(o => (
                          <tr key={o.id} onClick={() => window.location.href = '/orders'} style={{ cursor: 'pointer' }}>
                            <td style={{ fontFamily: 'monospace', color: '#C84B31', fontSize: 12, fontWeight: 600 }}>{o.order_number}</td>
                            <td style={{ fontWeight: 500 }}>{o.job_title || '—'}</td>
                            <td style={{ fontFamily: 'monospace' }}>{o.quantity?.toLocaleString('en-IN') || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(o.total_amount)}</td>
                            <td style={{ fontFamily: 'monospace', color: o.due_amount > 0 ? '#E53E3E' : '#38A169', fontWeight: 500 }}>{fmt(o.due_amount)}</td>
                            <td style={{ fontSize: 12, color: '#888' }}>{formatDate(o.created_at)}</td>
                            <td><Badge s={o.status} /></td>
                            <td><Badge s={o.payment_status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Quotes history */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="sh"><p className="st">📋 Quotes ({custQuotes.length})</p></div>
                  {custQuotes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#AAA', fontSize: 13 }}>No quotes yet</div>
                  ) : (
                    <table className="table">
                      <thead><tr><th>Quote #</th><th>Job</th><th>Qty</th><th>Amount</th><th>Valid Until</th><th>Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {custQuotes.map(q => (
                          <tr key={q.id} onClick={() => window.location.href = '/quotes'} style={{ cursor: 'pointer' }}>
                            <td style={{ fontFamily: 'monospace', color: '#C84B31', fontSize: 12, fontWeight: 600 }}>{q.quote_number}</td>
                            <td style={{ fontWeight: 500 }}>{q.job_title || '—'}</td>
                            <td style={{ fontFamily: 'monospace' }}>{q.quantity?.toLocaleString('en-IN') || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{q.currency_symbol}{q.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td style={{ fontSize: 12, color: '#888' }}>{formatDate(q.valid_until)}</td>
                            <td style={{ fontSize: 12, color: '#888' }}>{formatDate(q.created_at)}</td>
                            <td><Badge s={q.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
