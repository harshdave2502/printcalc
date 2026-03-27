'use client';
import { useState } from 'react';
import { supabase } from '../../supabase';

export default function CustomerSignup() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    if (authData.user) {
      const { error: profileError } = await supabase.from('customers').insert({
        id: authData.user.id,
        email,
        name,
        company,
        phone,
      });
      if (profileError) {
        setError('Account created but profile setup failed. Please contact your printer.');
        setLoading(false);
        return;
      }
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
      `}</style>
      <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid #EBEBEB' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>Account created!</h2>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
            Welcome to PrintCalc! Your printer will link your orders and quotes to your account.
          </p>
          <a href="/customer/login" style={{ display: 'block', background: '#1A1A1A', color: '#fff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            Go to Login
          </a>
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
        input { width: 100%; padding: 11px 14px; border: 1.5px solid #E8E8E8; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; }
        input:focus { border-color: #C84B31; background: #fff; }
        input::placeholder { color: #CCC; }
        .btn { width: 100%; padding: 13px; background: #C84B31; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { background: #FFF0F0; border: 1px solid #FEB2B2; color: #E53E3E; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media(max-width:480px) { .grid-2 { grid-template-columns: 1fr; } }
      `}</style>

      <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PrintCalc · Customer Portal</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.02em' }}>Create your account</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Track your print orders and quotes</p>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #EBEBEB' }}>
            <form onSubmit={handleSignup}>
              {error && <div className="error">{error}</div>}
              <div className="grid-2">
                <div className="field">
                  <label>Your Name *</label>
                  <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Company</label>
                  <input placeholder="Company (optional)" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Email address *</label>
                <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label>Phone</label>
                <input placeholder="Phone number (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="field">
                <label>Password *</label>
                <input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <button type="submit" className="btn" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Creating account...' : 'Create account →'}
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
              Already have an account?{' '}
              <a href="/customer/login" style={{ color: '#C84B31', textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#CCC', marginTop: 20 }}>
            Are you a printer?{' '}
            <a href="/signup" style={{ color: '#AAA', textDecoration: 'none' }}>Sign up here</a>
          </p>
        </div>
      </main>
    </>
  );
}
