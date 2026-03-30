'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusScreen, setStatusScreen] = useState<'pending'|'disabled'|null>(null);
  const [businessName, setBusinessName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    // Check subscriber status
    const { data: profile } = await supabase.from('subscribers').select('status,business_name').eq('email', email).single();

    if (profile?.status === 'pending') {
      setBusinessName(profile.business_name || '');
      setStatusScreen('pending');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile?.status === 'disabled' || profile?.status === 'suspended') {
      setBusinessName(profile.business_name || '');
      setStatusScreen('disabled');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    window.location.href = '/calculator';
  };

  // Pending approval screen
  if (statusScreen === 'pending') return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}`}</style>
      <main style={{minHeight:'100vh',background:'#F7F6F3',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{maxWidth:460,width:'100%',background:'#fff',borderRadius:16,padding:40,border:'1px solid #EBEBEB',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>⏳</div>
          <h2 style={{fontSize:22,fontWeight:600,color:'#1A1A1A',marginBottom:8}}>Awaiting Approval</h2>
          <p style={{fontSize:14,color:'#555',marginBottom:16}}>Hi <strong>{businessName}</strong>, your account is currently under review.</p>
          <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,padding:16,marginBottom:20,textAlign:'left'}}>
            <p style={{fontSize:13,color:'#92400E',lineHeight:1.7}}>
              Our team typically approves accounts within 24 hours. You'll receive an email at <strong>{email}</strong> once your account is approved.
            </p>
          </div>
          <button onClick={()=>setStatusScreen(null)} style={{background:'none',border:'1.5px solid #E8E8E8',borderRadius:8,padding:'10px 20px',color:'#888',cursor:'pointer',fontFamily:'inherit',fontSize:13}}>← Back to login</button>
          <p style={{fontSize:12,color:'#AAA',marginTop:16}}>Need help? Email support@printcalc.app</p>
        </div>
      </main>
    </>
  );

  // Disabled screen
  if (statusScreen === 'disabled') return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}`}</style>
      <main style={{minHeight:'100vh',background:'#F7F6F3',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
        <div style={{maxWidth:460,width:'100%',background:'#fff',borderRadius:16,padding:40,border:'1px solid #EBEBEB',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>🚫</div>
          <h2 style={{fontSize:22,fontWeight:600,color:'#1A1A1A',marginBottom:8}}>Account Disabled</h2>
          <p style={{fontSize:14,color:'#555',marginBottom:16}}>Your PrintCalc account has been disabled.</p>
          <div style={{background:'#FFF0F0',border:'1px solid #FEB2B2',borderRadius:10,padding:16,marginBottom:20}}>
            <p style={{fontSize:13,color:'#E53E3E'}}>Please contact support@printcalc.app if you believe this is a mistake.</p>
          </div>
          <button onClick={()=>setStatusScreen(null)} style={{background:'none',border:'1.5px solid #E8E8E8',borderRadius:8,padding:'10px 20px',color:'#888',cursor:'pointer',fontFamily:'inherit',fontSize:13}}>← Back to login</button>
        </div>
      </main>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 13px; font-weight: 500; color: #555; margin-bottom: 6px; }
        input { width: 100%; padding: 11px 14px; border: 1.5px solid #E8E8E8; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; transition: border-color 0.15s; }
        input:focus { border-color: #C84B31; background: #fff; }
        input::placeholder { color: #CCC; }
        .btn { width: 100%; padding: 13px; background: #1A1A1A; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s; }
        .btn:hover { opacity: 0.85; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { background: #FFF0F0; border: 1px solid #FEB2B2; color: #E53E3E; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
      `}</style>

      <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: 420, width: '100%' }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PrintCalc</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.02em' }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Login to use your calculator</p>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #EBEBEB' }}>
            <form onSubmit={handleLogin}>
              {error && <div className="error">{error}</div>}

              <div className="field">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@yourshop.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Logging in...' : 'Login →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
              Don't have an account?{' '}
              <a href="/signup" style={{ color: '#C84B31', textDecoration: 'none', fontWeight: 500 }}>Sign up free</a>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#CCC', marginTop: 20 }}>
            PrintCalc — Printing Industry Calculator
          </p>
        </div>
      </main>
    </>
  );
}
