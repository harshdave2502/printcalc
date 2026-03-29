'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

const DEFAULT_PAPER_CATS = [
  {category:'Maplitho', rate_per_kg:58},
  {category:'Art Paper', rate_per_kg:72},
  {category:'Art Card', rate_per_kg:85},
  {category:'Art Card Heavy', rate_per_kg:90},
  {category:'FBB / Ultima / SBS', rate_per_kg:95},
  {category:'Duplex Grey Back', rate_per_kg:48},
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
  {category:'FBB / Ultima / SBS', gsm:200, label:'FBB 200 GSM', rate_per_kg:95, in_stock:true, sort_order:13},
  {category:'FBB / Ultima / SBS', gsm:250, label:'FBB 250 GSM', rate_per_kg:95, in_stock:true, sort_order:14},
  {category:'FBB / Ultima / SBS', gsm:300, label:'FBB 300 GSM', rate_per_kg:95, in_stock:true, sort_order:15},
  {category:'Duplex Grey Back', gsm:200, label:'Duplex Grey 200 GSM', rate_per_kg:48, in_stock:true, sort_order:16},
  {category:'Duplex Grey Back', gsm:250, label:'Duplex Grey 250 GSM', rate_per_kg:48, in_stock:true, sort_order:17},
  {category:'Duplex White Back', gsm:200, label:'Duplex White 200 GSM', rate_per_kg:55, in_stock:true, sort_order:18},
  {category:'Duplex White Back', gsm:250, label:'Duplex White 250 GSM', rate_per_kg:55, in_stock:true, sort_order:19},
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

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currencies = [
    {code:'INR',symbol:'₹',name:'Indian Rupee'},
    {code:'USD',symbol:'$',name:'US Dollar'},
    {code:'GBP',symbol:'£',name:'British Pound'},
    {code:'EUR',symbol:'€',name:'Euro'},
    {code:'AED',symbol:'د.إ',name:'UAE Dirham'},
    {code:'SGD',symbol:'S$',name:'Singapore Dollar'},
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
    setLoading(true);
    setError('');
    try {
      const {data:authData,error:authError} = await supabase.auth.signUp({email,password});
      if(authError){setError(authError.message);setLoading(false);return;}
      if(authData.user){
        const sel = currencies.find(c=>c.code===currency);
        const {error:profileError} = await supabase.from('subscribers').insert({
          id:authData.user.id,email,business_name:businessName,
          currency,currency_symbol:sel?.symbol||'₹',
          markup_percent:25,tax_percent:18,plan:'free',plan_status:'active',
        });
        if(profileError){setError('Profile setup failed. Please contact support.');setLoading(false);return;}
        await seedDefaultRates(authData.user.id);
        setSuccess(true);
      }
    } catch(err){setError('Something went wrong. Please try again.');}
    setLoading(false);
  };

  if(success){return(
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}`}</style>
      <main style={{minHeight:'100vh',background:'#F7F6F3',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{background:'#fff',borderRadius:16,padding:40,maxWidth:420,width:'100%',textAlign:'center',border:'1px solid #EBEBEB'}}>
          <div style={{fontSize:48,marginBottom:16}}>🎉</div>
          <h2 style={{fontSize:22,fontWeight:600,color:'#1A1A1A',marginBottom:8}}>Welcome to PrintCalc!</h2>
          <p style={{fontSize:14,color:'#888',marginBottom:6}}>{businessName} is all set up.</p>
          <p style={{fontSize:13,color:'#AAA',marginBottom:24}}>Default rates loaded. Customise them anytime in your dashboard.</p>
          <a href="/login" style={{display:'block',background:'#C84B31',color:'#fff',padding:'12px 24px',borderRadius:8,textDecoration:'none',fontSize:14,fontWeight:500}}>Login to calculator →</a>
        </div>
      </main>
    </>
  );}

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        .field{margin-bottom:16px;}.field label{display:block;font-size:13px;font-weight:500;color:#555;margin-bottom:6px;}
        input,select{width:100%;padding:11px 14px;border:1.5px solid #E8E8E8;border-radius:10px;font-size:14px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#FAFAFA;outline:none;transition:border-color 0.15s;appearance:none;-webkit-appearance:none;}
        input:focus,select:focus{border-color:#C84B31;background:#fff;}input::placeholder{color:#CCC;}
        select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px;background-color:#FAFAFA;}
        .btn{width:100%;padding:13px;background:#1A1A1A;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;}.btn:disabled{opacity:0.5;cursor:not-allowed;}
        .error{background:#FFF0F0;border:1px solid #FEB2B2;color:#E53E3E;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;}
      `}</style>
      <main style={{minHeight:'100vh',background:'#F7F6F3',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{maxWidth:420,width:'100%'}}>
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:8,height:8,background:'#C84B31',borderRadius:'50%'}}/>
              <span style={{fontSize:12,fontWeight:500,color:'#888',letterSpacing:'0.08em',textTransform:'uppercase'}}>PrintCalc</span>
            </div>
            <h1 style={{fontSize:26,fontWeight:600,color:'#1A1A1A',letterSpacing:'-0.02em'}}>Create your account</h1>
            <p style={{fontSize:14,color:'#888',marginTop:6}}>Default rates set up automatically on signup</p>
          </div>
          <div style={{background:'#fff',borderRadius:16,padding:28,border:'1px solid #EBEBEB'}}>
            <form onSubmit={handleSignup}>
              {error&&<div className="error">{error}</div>}
              <div className="field"><label>Business name</label><input type="text" placeholder="e.g. Mehta Printers" value={businessName} onChange={e=>setBusinessName(e.target.value)} required/></div>
              <div className="field"><label>Email address</label><input type="email" placeholder="you@yourshop.com" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
              <div className="field"><label>Password</label><input type="password" placeholder="Minimum 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/></div>
              <div className="field"><label>Currency</label>
                <select value={currency} onChange={e=>setCurrency(e.target.value)}>
                  {currencies.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>)}
                </select>
              </div>
              <button type="submit" className="btn" disabled={loading} style={{marginTop:8}}>{loading?'Setting up your account...':'Create free account →'}</button>
            </form>
            <p style={{textAlign:'center',fontSize:13,color:'#888',marginTop:20}}>Already have an account? <a href="/login" style={{color:'#C84B31',textDecoration:'none',fontWeight:500}}>Login</a></p>
          </div>
          <div style={{background:'#F0FFF4',border:'1px solid #9AE6B4',borderRadius:12,padding:14,marginTop:16}}>
            <p style={{fontSize:12,color:'#276749',fontWeight:600,marginBottom:6}}>What you get instantly:</p>
            <p style={{fontSize:12,color:'#276749',lineHeight:1.8}}>✅ 7 paper categories with default rates<br/>✅ 19 paper stocks ready to use<br/>✅ Printing rates for 3 plate sizes<br/>✅ Lamination and UV rates<br/>✅ All customisable in your dashboard</p>
          </div>
          <p style={{textAlign:'center',fontSize:12,color:'#CCC',marginTop:20}}>Free forever plan · No credit card required</p>
        </div>
      </main>
    </>
  );
}
