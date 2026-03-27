'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

// ─── TYPES ────────────────────────────────────────────────────────────
interface Quote {
  id: string;
  quote_number: string;
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
  subtotal: number;
  markup_amount: number;
  tax_amount: number;
  total_amount: number;
  markup_percent: number;
  tax_percent: number;
  currency_symbol: string;
  notes: string;
  status: 'Draft' | 'Sent' | 'Converted' | 'Expired';
  created_at: string;
  valid_until: string;
}

interface Subscriber {
  id: string;
  business_name: string;
  email: string;
  markup_percent: number;
  tax_percent: number;
  currency_symbol: string;
  currency: string;
}

// ─── STATUS STYLES ───────────────────────────────────────────────────
const SC: Record<string, string> = {
  Draft: '#888', Sent: '#185FA5', Converted: '#38A169', Expired: '#E53E3E',
};
const SBG: Record<string, string> = {
  Draft: '#F5F5F5', Sent: '#EEF4FA', Converted: '#F0FFF4', Expired: '#FFF0F0',
};

// ─── QUOTE NUMBER GENERATOR ──────────────────────────────────────────
function genQuoteNum() {
  const d = new Date();
  return `Q${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function validUntilDate(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── PRINT / PDF QUOTE TEMPLATE ──────────────────────────────────────
function QuotePrintView({ quote, sub }: { quote: Quote; sub: Subscriber }) {
  const sym = quote.currency_symbol || '₹';
  const fmt = (n: number) => sym + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div id="quote-print" style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: 720, margin: '0 auto', padding: 40, background: '#fff', color: '#1A1A1A' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 24, borderBottom: '2px solid #1A1A1A' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, background: '#C84B31', borderRadius: '50%' }} />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{sub.business_name}</span>
          </div>
          <p style={{ fontSize: 12, color: '#888' }}>{sub.email}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Quotation</p>
          <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#C84B31' }}>{quote.quote_number}</p>
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Date: {formatDate(quote.created_at)}</p>
          <p style={{ fontSize: 12, color: '#888' }}>Valid until: {formatDate(quote.valid_until)}</p>
        </div>
      </div>

      {/* Customer info */}
      <div style={{ background: '#F9F9F9', borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Bill To</p>
        <p style={{ fontSize: 16, fontWeight: 600 }}>{quote.customer_name}</p>
        {quote.customer_company && <p style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{quote.customer_company}</p>}
        {quote.customer_email && <p style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{quote.customer_email}</p>}
        {quote.customer_phone && <p style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{quote.customer_phone}</p>}
      </div>

      {/* Job details */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Job Details</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1A1A1A', color: '#fff' }}>
              {['Description', 'Size', 'Paper', 'Qty', 'Sides', 'Finishing'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #EBEBEB' }}>
              <td style={{ padding: '14px', fontSize: 13, fontWeight: 500 }}>{quote.job_title || '—'}</td>
              <td style={{ padding: '14px', fontSize: 13 }}>{quote.job_size || '—'}</td>
              <td style={{ padding: '14px', fontSize: 13 }}>{quote.paper_type || '—'}</td>
              <td style={{ padding: '14px', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{quote.quantity?.toLocaleString('en-IN')}</td>
              <td style={{ padding: '14px', fontSize: 13 }}>{quote.sides || '—'}</td>
              <td style={{ padding: '14px', fontSize: 13 }}>{quote.finishing || 'None'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pricing */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
        <div style={{ width: 300 }}>
          {[
            { label: 'Subtotal', value: fmt(quote.subtotal) },
            { label: `Markup (${quote.markup_percent}%)`, value: fmt(quote.markup_amount) },
            { label: `GST / Tax (${quote.tax_percent}%)`, value: fmt(quote.tax_amount) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0F0F0' }}>
              <span style={{ fontSize: 13, color: '#888' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', background: '#1A1A1A', marginTop: 8, borderRadius: 8, paddingLeft: 14, paddingRight: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Total (incl. GST)</span>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>{fmt(quote.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 16, marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Notes</p>
          <p style={{ fontSize: 13, color: '#78350F' }}>{quote.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #EBEBEB', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: '#AAA' }}>Generated by PrintCalc · printcalc-beta.vercel.app</p>
        <p style={{ fontSize: 11, color: '#AAA' }}>This quote is valid for 30 days from the date of issue.</p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────
export default function QuotesPage() {
  const [sub, setSub] = useState<Subscriber | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selQuote, setSelQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [printMode, setPrintMode] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '', customer_company: '',
    job_title: '', job_size: '', paper_type: '', quantity: '', sides: 'Double side',
    finishing: '', subtotal: '', notes: '', valid_until: validUntilDate(30),
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: profile } = await supabase.from('subscribers').select('*').eq('id', user.id).single();
    if (profile) setSub(profile);
    const { data: q } = await supabase.from('quotes').select('*').eq('subscriber_id', user.id).order('created_at', { ascending: false });
    setQuotes(q || []);
    setLoading(false);
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const calcTotals = () => {
    const sub_val = parseFloat(form.subtotal) || 0;
    const m = sub?.markup_percent || 25;
    const t = sub?.tax_percent || 18;
    const markupAmt = sub_val * (m / 100);
    const afterMarkup = sub_val + markupAmt;
    const taxAmt = afterMarkup * (t / 100);
    return { subtotal: sub_val, markupAmount: markupAmt, taxAmount: taxAmt, total: afterMarkup + taxAmt };
  };

  const saveQuote = async () => {
    if (!form.customer_name || !form.subtotal) { setSaveMsg('Please fill in customer name and subtotal.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const totals = calcTotals();
    const payload = {
      subscriber_id: user!.id,
      quote_number: genQuoteNum(),
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
      subtotal: totals.subtotal,
      markup_amount: totals.markupAmount,
      markup_percent: sub?.markup_percent || 25,
      tax_amount: totals.taxAmount,
      tax_percent: sub?.tax_percent || 18,
      total_amount: totals.total,
      currency_symbol: sub?.currency_symbol || '₹',
      notes: form.notes,
      status: 'Draft',
      valid_until: form.valid_until,
    };
    const { data, error } = await supabase.from('quotes').insert(payload).select().single();
    if (data) {
      setQuotes(prev => [data, ...prev]);
      setSelQuote(data);
      setView('detail');
      setSaveMsg('Quote saved!');
      resetForm();
    } else {
      setSaveMsg('Error: ' + (error?.message || 'Could not save'));
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('quotes').update({ status }).eq('id', id);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: status as any } : q));
    if (selQuote?.id === id) setSelQuote(prev => prev ? { ...prev, status: status as any } : prev);
  };

  const deleteQuote = async (id: string) => {
    if (!confirm('Delete this quote?')) return;
    await supabase.from('quotes').delete().eq('id', id);
    setQuotes(prev => prev.filter(q => q.id !== id));
    setView('list');
    setSelQuote(null);
  };

  const resetForm = () => setForm({
    customer_name: '', customer_email: '', customer_phone: '', customer_company: '',
    job_title: '', job_size: '', paper_type: '', quantity: '', sides: 'Double side',
    finishing: '', subtotal: '', notes: '', valid_until: validUntilDate(30),
  });

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => { window.print(); setTimeout(() => setPrintMode(false), 500); }, 200);
  };

  const totals = calcTotals();
  const sym = sub?.currency_symbol || '₹';
  const fmt = (n: number) => sym + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const IS: any = { padding: '9px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans,sans-serif', color: '#1A1A1A', background: '#FAFAFA', outline: 'none', width: '100%' };

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif' }}>
      <p style={{ color: '#888' }}>Loading...</p>
    </main>
  );

  // ─── PRINT MODE ───────────────────────────────────────────────────
  if (printMode && selQuote && sub) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; background: #fff; }
          @media print { body { margin: 0; } }
        `}</style>
        <QuotePrintView quote={selQuote} sub={sub} />
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .nav { background: #1A1A1A; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; }
        .content { max-width: 960px; margin: 0 auto; padding: 28px 24px; }
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
        .table { width: 100%; border-collapse: collapse; }
        .table th { text-align: left; font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 16px; border-bottom: 1px solid #F0F0F0; }
        .table td { padding: 12px 16px; border-bottom: 1px solid #F8F8F8; font-size: 13px; color: #1A1A1A; vertical-align: middle; }
        .table tr:last-child td { border-bottom: none; }
        .table tbody tr:hover td { background: #FAFAFA; cursor: pointer; }
        .sh { background: #F9F9F9; border-bottom: 1px solid #F0F0F0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
        .st { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .save-msg { color: #38A169; font-size: 13px; }
        .err-msg { color: #E53E3E; font-size: 13px; }
        @media(max-width:640px) { .grid-2,.grid-3 { grid-template-columns: 1fr; } .content { padding: 16px; } }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* NAV */}
      <nav className="nav no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>PrintCalc</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/dashboard" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>← Dashboard</a>
          <a href="/" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>Calculator</a>
          <button style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="content no-print">

        {/* ─── LIST VIEW ─── */}
        {view === 'list' && (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { l: 'Total Quotes', v: quotes.length },
                { l: 'Draft', v: quotes.filter(q => q.status === 'Draft').length },
                { l: 'Sent', v: quotes.filter(q => q.status === 'Sent').length },
                { l: 'Converted', v: quotes.filter(q => q.status === 'Converted').length },
              ].map(s => (
                <div key={s.l} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 16 }}>
                  <p style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.l}</p>
                  <p style={{ fontSize: 28, fontWeight: 600, fontFamily: 'DM Mono,monospace', color: '#1A1A1A' }}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Quotes table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="sh">
                <p className="st">All Quotes</p>
                <button className="btn-red" onClick={() => { resetForm(); setView('create'); }}>+ New Quote</button>
              </div>
              {quotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
                  <p style={{ fontSize: 15, color: '#888', marginBottom: 8 }}>No quotes yet</p>
                  <p style={{ fontSize: 13, color: '#BBB', marginBottom: 20 }}>Create your first quote to get started</p>
                  <button className="btn-red" onClick={() => { resetForm(); setView('create'); }}>+ Create Quote</button>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Quote #</th><th>Customer</th><th>Job</th><th>Qty</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} onClick={() => { setSelQuote(q); setView('detail'); }}>
                        <td style={{ fontFamily: 'monospace', color: '#C84B31', fontSize: 12, fontWeight: 600 }}>{q.quote_number}</td>
                        <td>
                          <p style={{ fontWeight: 500 }}>{q.customer_name}</p>
                          {q.customer_company && <p style={{ fontSize: 11, color: '#AAA' }}>{q.customer_company}</p>}
                        </td>
                        <td style={{ fontSize: 12 }}>{q.job_title || '—'}</td>
                        <td style={{ fontFamily: 'monospace' }}>{q.quantity?.toLocaleString('en-IN') || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{q.currency_symbol}{q.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ fontSize: 12, color: '#888' }}>{formatDate(q.created_at)}</td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: SBG[q.status] || '#F5F5F5', color: SC[q.status] || '#888' }}>{q.status}</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <select
                            value={q.status}
                            onChange={e => updateStatus(q.id, e.target.value)}
                            style={{ padding: '4px 8px', border: '1.5px solid #E8E8E8', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: '#FAFAFA', outline: 'none', width: 'auto' }}
                          >
                            {['Draft', 'Sent', 'Converted', 'Expired'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
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
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>New Quote</h2>
            </div>

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
                <div className="field"><label>Job Title / Description</label><input placeholder="e.g. Business Cards, Brochure A4" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} /></div>
                <div className="field"><label>Size</label><input placeholder="e.g. A4 (8.3 × 11.7\")" value={form.job_size} onChange={e => setForm({ ...form, job_size: e.target.value })} /></div>
                <div className="field"><label>Paper Type</label><input placeholder="e.g. Art Card 300 GSM" value={form.paper_type} onChange={e => setForm({ ...form, paper_type: e.target.value })} /></div>
                <div className="field">
                  <label>Quantity</label>
                  <input type="number" placeholder="e.g. 5000" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="field">
                  <label>Sides</label>
                  <select value={form.sides} onChange={e => setForm({ ...form, sides: e.target.value })} style={{ ...IS }}>
                    <option>Single side</option>
                    <option>Double side</option>
                  </select>
                </div>
                <div className="field"><label>Finishing</label><input placeholder="e.g. Matt Lamination, UV Coating" value={form.finishing} onChange={e => setForm({ ...form, finishing: e.target.value })} /></div>
              </div>
            </div>

            {/* Pricing */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>💰 Pricing</p>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
                💡 Enter the <strong>raw subtotal</strong> from your calculator. Markup ({sub?.markup_percent}%) and GST ({sub?.tax_percent}%) will be added automatically.
              </div>
              <div className="grid-3">
                <div className="field">
                  <label>Subtotal (before markup) {sym}</label>
                  <input type="number" placeholder="e.g. 12500" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: e.target.value })} />
                </div>
                <div className="field">
                  <label>Valid Until</label>
                  <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
                </div>
              </div>

              {/* Live calc preview */}
              {parseFloat(form.subtotal) > 0 && (
                <div style={{ background: '#1A1A1A', borderRadius: 12, padding: 20, marginTop: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    {[
                      { l: `Markup (${sub?.markup_percent}%)`, v: fmt(totals.markupAmount) },
                      { l: `GST (${sub?.tax_percent}%)`, v: fmt(totals.taxAmount) },
                      { l: 'Total incl. GST', v: fmt(totals.total) },
                    ].map(s => (
                      <div key={s.l} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: 14 }}>
                        <p style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{s.l}</p>
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'DM Mono,monospace' }}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>📝 Notes (optional)</p>
              <textarea rows={3} placeholder="Any special instructions, terms, or notes for the customer..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
            </div>

            {/* Save */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn-red" onClick={saveQuote} disabled={saving}>{saving ? 'Saving...' : 'Save Quote →'}</button>
              <button className="btn-outline" onClick={() => setView('list')}>Cancel</button>
              {saveMsg && <span className={saveMsg.startsWith('Error') ? 'err-msg' : 'save-msg'}>✓ {saveMsg}</span>}
            </div>
          </>
        )}

        {/* ─── DETAIL VIEW ─── */}
        {view === 'detail' && selQuote && sub && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn-sm" onClick={() => setView('list')}>← Back</button>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>{selQuote.quote_number}</h2>
                <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: SBG[selQuote.status], color: SC[selQuote.status] }}>{selQuote.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-outline" onClick={handlePrint}>🖨️ Print / PDF</button>
                <select
                  value={selQuote.status}
                  onChange={e => updateStatus(selQuote.id, e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', outline: 'none', cursor: 'pointer' }}
                >
                  {['Draft', 'Sent', 'Converted', 'Expired'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn-del" onClick={() => deleteQuote(selQuote.id)}>Delete</button>
              </div>
            </div>

            {/* Quote preview */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <QuotePrintView quote={selQuote} sub={sub} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
