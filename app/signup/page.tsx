'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

const DEFAULT_PAPER_CATS = [
  {category:'Maplitho', rate_per_kg:58},{category:'Art Paper', rate_per_kg:72},
  {category:'Art Card', rate_per_kg:85},{category:'Art Card Heavy', rate_per_kg:90},
  {category:'SBS', rate_per_kg:95},{category:'FBB', rate_per_kg:93},{category:'Ultima', rate_per_kg:95},{category:'Duplex Grey Back', rate_per_kg:48},
  {category:'Duplex White Back', rate_per_kg:55},
];
const DEFAULT_PAPER_STOCKS = [
  {category:'Maplitho', gsm:60, label:'Maplitho 60 GSM', rate_per_kg:58, in_stock:true, sort_order:1},
  {category:'Maplitho', gsm:70, label:'Maplitho 70 GSM', rate_per_kg:58, in_stock:true, sort_order:2},
  {category:'Maplitho', gsm:80, label:'Maplitho 80 GSM', rate_per_kg:58, in_stock:true, sort_order:3},
  {category:'Art Paper', gsm:90, label:'Art Paper 90 GSM', rate_per_kg:72, in_stock:true, sort_order:4},
  {category:'Art Paper', gsm:100, label:'Art Paper 100 GSM', rate_per_kg:72, in_stock:true, sort_order:5},
  {category:'Art Paper', gsm:130, label:'Art Paper 130 GSM', rate_per_kg:72, in_stock:true, sort_order:6},
  {category:'Art Card', gsm:170, label:'Art Card 170 GSM', rate_per_kg:85, in_stock:true, sort_order:7},
  {category:'Art Card', gsm:200, label:'Art Card 200 GSM', rate_per_kg:85, in_stock:true, sort_order:8},
  {category:'Art Card', gsm:230, label:'Art Card 230 GSM', rate_per_kg:85, in_stock:true, sort_order:9},
  {category:'Art Card Heavy', gsm:250, label:'Art Card 250 GSM', rate_per_kg:90, in_stock:true, sort_order:10},
  {category:'Art Card Heavy', gsm:300, label:'Art Card 300 GSM', rate_per_kg:90, in_stock:true, sort_order:11},
  {category:'Art Card Heavy', gsm:350, label:'Art Card 350 GSM', rate_per_kg:90, in_stock:true, sort_order:12},
  {category:'SBS', gsm:200, label:'SBS 200 GSM', rate_per_kg:95, in_stock:true, sort_order:13},
  {category:'SBS', gsm:250, label:'SBS 250 GSM', rate_per_kg:95, in_stock:true, sort_order:14},
  {category:'SBS', gsm:300, label:'SBS 300 GSM', rate_per_kg:95, in_stock:true, sort_order:15},
  {category:'FBB', gsm:200, label:'FBB 200 GSM', rate_per_kg:93, in_stock:true, sort_order:16},
  {category:'FBB', gsm:250, label:'FBB 250 GSM', rate_per_kg:93, in_stock:true, sort_order:17},
  {category:'FBB', gsm:300, label:'FBB 300 GSM', rate_per_kg:93, in_stock:true, sort_order:18},
  {category:'Ultima', gsm:200, label:'Ultima 200 GSM', rate_per_kg:95, in_stock:true, sort_order:19},
  {category:'Ultima', gsm:250, label:'Ultima 250 GSM', rate_per_kg:95, in_stock:true, sort_order:20},
  {category:'Ultima', gsm:300, label:'Ultima 300 GSM', rate_per_kg:95, in_stock:true, sort_order:21},
  {category:'Duplex Grey Back', gsm:200, label:'Duplex Grey 200 GSM', rate_per_kg:48, in_stock:true, sort_order:22},
  {category:'Duplex Grey Back', gsm:250, label:'Duplex Grey 250 GSM', rate_per_kg:48, in_stock:true, sort_order:23},
  {category:'Duplex White Back', gsm:200, label:'Duplex White 200 GSM', rate_per_kg:55, in_stock:true, sort_order:24},
  {category:'Duplex White Back', gsm:250, label:'Duplex White 250 GSM', rate_per_kg:55, in_stock:true, sort_order:25},
];
const DEFAULT_PRINTING_RATES = [
  {plate_name:'18x23', color_option:'1 Color', fixed_charge:500, per_1000_impression:200, sort_order:1},
  {plate_name:'18x23', color_option:'2 Color', fixed_charge:800, per_1000_impression:300, sort_order:2},
  {plate_name:'18x23', color_option:'4 Color', fixed_charge:1500, per_1000_impression:500, sort_order:3},
  {plate_name:'18x25', color_option:'1 Color', fixed_charge:600, per_1000_impression:250, sort_order:4},
  {plate_name:'18x25', color_option:'2 Color', fixed_charge:900, per_1000_impression:350, sort_order:5},
  {plate_name:'18x25', color_option:'4 Color', fixed_charge:1800, per_1000_impression:600, sort_order:6},
  {plate_name:'20x28', color_option:'1 Color', fixed_charge:700, per_1000_impression:300, sort_order:7},
  {plate_name:'20x28', color_option:'2 Color', fixed_charge:1100, per_1000_impression:400, sort_order:8},
  {plate_name:'20x28', color_option:'4 Color', fixed_charge:2000, per_1000_impression:700, sort_order:9},
];
const DEFAULT_LAM_RATES = [
  {lam_name:'Matt Lamination', minimum_charge:500, per_100_sqinch:0.8, sort_order:1},
  {lam_name:'Gloss Lamination', minimum_charge:500, per_100_sqinch:0.8, sort_order:2},
  {lam_name:'Soft Touch Lamination', minimum_charge:800, per_100_sqinch:1.2, sort_order:3},
];
const DEFAULT_UV_RATES = [
  {uv_name:'Gloss UV', minimum_charge:400, per_100_sqinch:0.6, sort_order:1},
  {uv_name:'Matte UV', minimum_charge:400, per_100_sqinch:0.6, sort_order:2},
  {uv_name:'Spot UV', minimum_charge:600, per_100_sqinch:0.9, sort_order:3},
];
const DEFAULT_BINDING_RATES = [
  {binding_name:'Saddle Stitch', per_binding_format:2, sort_order:1},
  {binding_name:'Perfect Binding', per_binding_format:5, sort_order:2},
  {binding_name:'Spiral Binding', per_binding_format:8, sort_order:3},
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:#F8F7FF;min-height:100vh;}
.wrap{min-height:100vh;display:flex;}
.left{flex:1;background:#0D0B1A;padding:52px 48px;display:flex;flex-direction:column;justify-content:space-between;min-height:100vh;}
.right{width:500px;background:#fff;border-left:1px solid rgba(124,58,237,0.12);padding:52px 48px;display:flex;flex-direction:column;justify-content:center;overflow-y:auto;}
@media(max-width:900px){.left{display:none;}.right{width:100%;border:none;padding:40px 24px;}}
.logo{display:flex;align-items:center;gap:10px;}
.logo-dot{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#D946EF);}
.logo-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;color:#fff;}
.hero-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 0;}
.big-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:32px;font-weight:800;color:#fff;line-height:1.15;margin-bottom:14px;letter-spacing:-0.02em;}
.big-title span{background:linear-gradient(135deg,#A78BFA 0%,#D946EF 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.big-sub{font-size:14px;color:#6B7280;line-height:1.75;max-width:340px;margin-bottom:28px;}
.feat{display:flex;align-items:center;gap:10px;font-size:13px;color:#9CA3AF;margin-bottom:10px;}
.feat-icon{width:28px;height:28px;border-radius:7px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.25);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
.footer-note{font-size:11px;color:#374151;}
.form-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:700;color:#0F0A1E;margin-bottom:4px;letter-spacing:-0.01em;}
.form-sub{font-size:13px;color:#9CA3AF;margin-bottom:24px;}
.field{margin-bottom:14px;}
.field label{display:block;font-size:11px;font-weight:600;color:#6B7280;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.06em;}
input,select{width:100%;padding:11px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:'Inter',sans-serif;color:#0F0A1E;background:#FAFAFA;outline:none;transition:border-color 0.15s,background 0.15s;appearance:none;-webkit-appearance:none;}
input:focus,select:focus{border-color:#7C3AED;background:#fff;}
input::placeholder{color:#D1D5DB;}
select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;background-color:#FAFAFA;}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,#7C3AED,#9461FB);color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.15s;margin-top:4px;}
.btn:hover{opacity:0.9;}
.btn:disabled{opacity:0.5;cursor:not-allowed;}
.error{background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;}
.link{color:#7C3AED;text-decoration:none;font-weight:500;}
.link:hover{text-decoration:underline;}
.note-box{background:#F8F7FF;border:1px solid rgba(124,58,237,0.15);border-radius:9px;padding:11px 14px;margin-top:14px;font-size:12px;color:#9CA3AF;line-height:1.6;}
.note-box strong{color:#7C3AED;}
.pending-wrap{min-height:100vh;background:#F8F7FF;display:flex;align-items:center;justify-content:center;padding:20px;}
.pending-card{background:#fff;border:1px solid rgba(124,58,237,0.15);border-radius:20px;padding:48px 40px;max-width:460px;width:100%;text-align:center;box-shadow:0 4px 40px rgba(124,58,237,0.06);}
.pending-icon{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(217,70,239,0.08));border:1px solid rgba(124,58,237,0.2);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 20px;}
.pending-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:700;color:#0F0A1E;margin-bottom:8px;}
.pending-sub{font-size:14px;color:#6B7280;line-height:1.65;margin-bottom:24px;}
.steps-box{background:#F8F7FF;border:1px solid rgba(124,58,237,0.12);border-radius:12px;padding:16px 20px;text-align:left;}
.step{display:flex;align-items:center;gap:12px;font-size:13px;color:#4B5563;margin-bottom:8px;}
.step:last-child{margin-bottom:0;}
.step-n{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#9461FB);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
`;

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currencies = [
    {code:'INR',symbol:'₹',name:'Indian Rupee'},{code:'USD',symbol:'$',name:'US Dollar'},
    {code:'GBP',symbol:'£',name:'British Pound'},{code:'EUR',symbol:'€',name:'Euro'},
    {code:'AED',symbol:'د.إ',name:'UAE Dirham'},{code:'SGD',symbol:'S$',name:'Singapore Dollar'},
    {code:'AUD',symbol:'A$',name:'Australian Dollar'},
  ];

  const seedDefaultRates = async (userId: string) => {
    await supabase.from('paper_categories').insert(DEFAULT_PAPER_CATS.map((c,i)=>({...c,subscriber_id:userId,sort_order:i+1})));
    await supabase.from('paper_stocks').insert(DEFAULT_PAPER_STOCKS.map(s=>({...s,subscriber_id:userId,packing_size:500,stock_qty:0})));
    await supabase.from('printing_rates').insert(DEFAULT_PRINTING_RATES.map(r=>({...r,subscriber_id:userId})));
    await supabase.from('lamination_rates').insert(DEFAULT_LAM_RATES.map(r=>({...r,subscriber_id:userId})));
    await supabase.from('uv_rates').insert(DEFAULT_UV_RATES.map(r=>({...r,subscriber_id:userId})));
    await supabase.from('binding_rates').insert(DEFAULT_BINDING_RATES.map(r=>({...r,subscriber_id:userId})));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const {data:authData,error:authError} = await supabase.auth.signUp({email,password});
      if(authError){setError(authError.message);setLoading(false);return;}
      if(authData.user){
        const sel = currencies.find(c=>c.code===currency);
        const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate()+30);
        const {error:profileError} = await supabase.from('subscribers').insert({
          id:authData.user.id,email,business_name:businessName,
          currency,currency_symbol:sel?.symbol||'₹',
          markup_percent:25,tax_percent:18,plan:'free',status:'pending',
          trial_ends_at:trialEnd.toISOString(),
        });
        if(profileError){setError('Profile setup failed. Please contact support.');setLoading(false);return;}
        await seedDefaultRates(authData.user.id);
        await fetch('/api/admin/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'pending',email,business_name:businessName})});
        setSuccess(true);
      }
    } catch(err){setError('Something went wrong. Please try again.');}
    setLoading(false);
  };

  if (success) return (
    <><style>{CSS}</style>
    <div className="pending-wrap">
      <div className="pending-card">
        <div className="pending-icon">⏳</div>
        <div className="pending-title">Application submitted!</div>
        <div className="pending-sub">
          We'll review <strong style={{color:'#0F0A1E'}}>{businessName}</strong> within 24 hours and email you at <strong style={{color:'#7C3AED'}}>{email}</strong> once approved.
        </div>
        <div className="steps-box">
          {[['1','Team reviews your application'],['2','You receive an approval email'],['3','Login and start calculating']].map(([n,t])=>(
            <div key={n} className="step"><div className="step-n">{n}</div>{t}</div>
          ))}
        </div>
        <p style={{fontSize:12,color:'#D1D5DB',marginTop:16}}>Questions? <a href="mailto:support@printcalc.app" className="link" style={{color:'#9CA3AF'}}>support@printcalc.app</a></p>
      </div>
    </div></>
  );

  return (
    <><style>{CSS}</style>
    <div className="wrap">
      <div className="left">
        <div className="logo"><div className="logo-dot"/><span className="logo-name">PrintCalc</span></div>
        <div className="hero-body">
          <div className="big-title">Built for<br/><span>print businesses</span></div>
          <div className="big-sub">Set up your rates, share a link with customers, and let them get instant quotes 24/7 — without calling you.</div>
          {[['⚡','Instant job calculator'],['🔗','Customer embed links'],['💰','Per-customer rate cards'],['📋','Quotes & orders dashboard']].map(([i,t])=>(
            <div key={t} className="feat"><div className="feat-icon">{i}</div>{t}</div>
          ))}
        </div>
        <div className="footer-note">© {new Date().getFullYear()} PrintCalc · The Printing Industry Calculator</div>
      </div>
      <div className="right">
        <div className="form-title">Create your account</div>
        <div className="form-sub">Free to start · Approval required · No credit card</div>
        <form onSubmit={handleSignup}>
          {error && <div className="error">{error}</div>}
          <div className="field"><label>Business name</label><input type="text" placeholder="e.g. Mehta Printers" value={businessName} onChange={e=>setBusinessName(e.target.value)} required/></div>
          <div className="field"><label>Email address</label><input type="email" placeholder="you@yourshop.com" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div className="field"><label>Password</label><input type="password" placeholder="Minimum 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/></div>
          <div className="field"><label>Currency</label>
            <select value={currency} onChange={e=>setCurrency(e.target.value)}>
              {currencies.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>)}
            </select>
          </div>
          <button type="submit" className="btn" disabled={loading}>{loading?'Setting up your account...':'Apply for free →'}</button>
        </form>
        <div className="note-box">✓ Default rates loaded automatically &nbsp;·&nbsp; <strong>Customise anytime</strong> in your dashboard</div>
        <p style={{textAlign:'center',fontSize:13,color:'#9CA3AF',marginTop:16}}>Already have an account? <a href="/login" className="link">Login</a></p>
      </div>
    </div></>
  );
}
