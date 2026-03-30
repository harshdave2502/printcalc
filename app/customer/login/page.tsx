'use client';
import { useState } from 'react';
import { supabase } from '../../supabase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:#F8F7FF;min-height:100vh;}
.wrap{min-height:100vh;display:flex;}
.left{flex:1;background:#0D0B1A;padding:52px 48px;display:flex;flex-direction:column;justify-content:space-between;min-height:100vh;}
.right{width:480px;background:#fff;border-left:1px solid rgba(124,58,237,0.12);padding:52px 48px;display:flex;flex-direction:column;justify-content:center;}
@media(max-width:900px){.left{display:none;}.right{width:100%;border:none;padding:40px 24px;}}
.logo{display:flex;align-items:center;gap:10px;}
.logo-dot{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#D946EF);}
.logo-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;color:#fff;}
.hero-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 0;}
.big-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:34px;font-weight:800;color:#fff;line-height:1.15;margin-bottom:14px;letter-spacing:-0.02em;}
.big-title span{background:linear-gradient(135deg,#A78BFA 0%,#D946EF 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.big-sub{font-size:14px;color:#6B7280;line-height:1.75;max-width:340px;margin-bottom:32px;}
.feat{display:flex;align-items:center;gap:10px;font-size:13px;color:#9CA3AF;margin-bottom:11px;}
.feat-icon{width:28px;height:28px;border-radius:7px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.25);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
.footer-note{font-size:11px;color:#374151;}
.form-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:700;color:#0F0A1E;margin-bottom:4px;letter-spacing:-0.01em;}
.form-sub{font-size:13px;color:#9CA3AF;margin-bottom:28px;}
.field{margin-bottom:16px;}
.field label{display:block;font-size:11px;font-weight:600;color:#6B7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em;}
input{width:100%;padding:11px 14px;border:1.5px solid #E5E7EB;border-radius:9px;font-size:14px;font-family:'Inter',sans-serif;color:#0F0A1E;background:#FAFAFA;outline:none;transition:border-color 0.15s,background 0.15s;}
input:focus{border-color:#7C3AED;background:#fff;}
input::placeholder{color:#D1D5DB;}
.btn{width:100%;padding:12px;background:linear-gradient(135deg,#7C3AED,#9461FB);color:#fff;border:none;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity 0.15s;margin-top:4px;}
.btn:hover{opacity:0.9;}
.btn:disabled{opacity:0.5;cursor:not-allowed;}
.error{background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;}
.link{color:#7C3AED;text-decoration:none;font-weight:500;}
.link:hover{text-decoration:underline;}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;}
.divider-line{flex:1;height:1px;background:#F3F4F6;}
.divider-text{font-size:12px;color:#D1D5DB;}
.status-wrap{min-height:100vh;background:#F8F7FF;display:flex;align-items:center;justify-content:center;padding:20px;}
.status-card{background:#fff;border:1px solid rgba(124,58,237,0.15);border-radius:20px;padding:48px 40px;max-width:460px;width:100%;text-align:center;box-shadow:0 4px 40px rgba(124,58,237,0.06);}
.status-icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 20px;}
.status-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:700;color:#0F0A1E;margin-bottom:8px;}
.status-sub{font-size:14px;color:#6B7280;line-height:1.65;margin-bottom:24px;}
.steps-box{background:#F8F7FF;border:1px solid rgba(124,58,237,0.12);border-radius:12px;padding:16px 20px;text-align:left;margin-bottom:20px;}
.step{display:flex;align-items:center;gap:12px;font-size:13px;color:#4B5563;margin-bottom:8px;}
.step:last-child{margin-bottom:0;}
.step-n{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#9461FB);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.back-btn{background:transparent;border:1.5px solid #E5E7EB;color:#9CA3AF;padding:9px 22px;border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;transition:all 0.15s;}
.back-btn:hover{border-color:#7C3AED;color:#7C3AED;}
`;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusScreen, setStatusScreen] = useState<'pending'|'disabled'|null>(null);
  const [businessName, setBusinessName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) { setError(loginError.message); setLoading(false); return; }
    const { data: profile } = await supabase.from('subscribers').select('status,business_name').eq('email', email).single();
    if (profile?.status === 'pending') { setBusinessName(profile.business_name||''); setStatusScreen('pending'); await supabase.auth.signOut(); setLoading(false); return; }
    if (profile?.status === 'disabled' || profile?.status === 'suspended') { setBusinessName(profile.business_name||''); setStatusScreen('disabled'); await supabase.auth.signOut(); setLoading(false); return; }
    window.location.href = '/calculator';
  };

  if (statusScreen === 'pending') return (
    <><style>{CSS}</style>
    <div className="status-wrap">
      <div className="status-card">
        <div className="status-icon" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(217,70,239,0.1))'}}>⏳</div>
        <div className="status-title">Awaiting approval</div>
        <div className="status-sub">Hi <strong style={{color:'#0F0A1E'}}>{businessName}</strong>, your account is under review. We'll email <strong style={{color:'#7C3AED'}}>{email}</strong> within 24 hours.</div>
        <div className="steps-box">
          {[['1','Team reviews your application'],['2','You receive an approval email'],['3','Login and start calculating']].map(([n,t])=>(
            <div key={n} className="step"><div className="step-n">{n}</div>{t}</div>
          ))}
        </div>
        <button className="back-btn" onClick={()=>setStatusScreen(null)}>← Back to login</button>
      </div>
    </div></>
  );

  if (statusScreen === 'disabled') return (
    <><style>{CSS}</style>
    <div className="status-wrap">
      <div className="status-card">
        <div className="status-icon" style={{background:'#FEF2F2'}}>🚫</div>
        <div className="status-title">Account disabled</div>
        <div className="status-sub">Your PrintCalc account has been disabled. Contact <a href="mailto:support@printcalc.app" className="link">support@printcalc.app</a> if you believe this is a mistake.</div>
        <button className="back-btn" onClick={()=>setStatusScreen(null)}>← Back to login</button>
      </div>
    </div></>
  );

  return (
    <><style>{CSS}</style>
    <div className="wrap">
      <div className="left">
        <div className="logo"><div className="logo-dot"/><span className="logo-name">PrintCalc</span></div>
        <div className="hero-body">
          <div className="big-title">Your print shop's<br/><span>quoting engine</span></div>
          <div className="big-sub">Set your rates once. Share a link. Customers calculate their own prices — no more quote calls at odd hours.</div>
          {[['⚡','Full job calculator — paper, print, lam, UV'],['🔗','Customer embed links with your rates'],['📋','Quotes & orders in one dashboard'],['💰','Per-customer custom rate cards']].map(([i,t])=>(
            <div key={t} className="feat"><div className="feat-icon">{i}</div>{t}</div>
          ))}
        </div>
        <div className="footer-note">© {new Date().getFullYear()} PrintCalc · The Printing Industry Calculator</div>
      </div>
      <div className="right">
        <div className="form-title">Welcome back</div>
        <div className="form-sub">Login to your PrintCalc account</div>
        <form onSubmit={handleLogin}>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label>Email address</label>
            <input type="email" placeholder="you@yourshop.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} required/>
          </div>
          <button type="submit" className="btn" disabled={loading}>{loading?'Signing in...':'Sign in →'}</button>
        </form>
        <div className="divider"><div className="divider-line"/><span className="divider-text">or</span><div className="divider-line"/></div>
        <p style={{textAlign:'center',fontSize:13,color:'#9CA3AF'}}>No account? <a href="/signup" className="link">Apply for free</a></p>
        <p style={{textAlign:'center',fontSize:12,color:'#D1D5DB',marginTop:10}}>Customer? <a href="/customer/login" style={{color:'#D1D5DB',textDecoration:'none'}}>Login here →</a></p>
      </div>
    </div></>
  );
}
