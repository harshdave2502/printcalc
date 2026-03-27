'use client';
import { useState } from 'react';
import { supabase } from '../../supabase';

export default function CustomerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    // Check they are a customer (not a subscriber/printer)
    const { data: profile } = await supabase.from('customers').select('id').eq('email', email).single();
    if (!profile) {
      await supabase.auth.signOut();
      setError('No customer account found. Are you a printer? Login at /login');
      setLoading(false);
      return;
    }
    window.location.href = '/customer';
  };

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
        .btn { width: 100%; padding: 13px; background: #1A1A1A; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { background: #FFF0F0; border: 1px solid #FEB2B2; color: #E53E3E; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
      `}</style>

      <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: 420, width: '100%' }}>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PrintCalc · Customer Portal</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.02em' }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Sign in to track your orders & quotes</p>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #EBEBEB' }}>
            <form onSubmit={handleLogin}>
              {error && <div className="error">{error}</div>}
              <div className="field">
                <label>Email address</label>
                <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Signing in...' : 'Sign in to portal'}
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
              New customer?{' '}
              <a href="/customer/signup" style={{ color: '#C84B31', textDecoration: 'none', fontWeight: 500 }}>Create account</a>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#CCC', marginTop: 20 }}>
            Are you a printer?{' '}
            <a href="/login" style={{ color: '#AAA', textDecoration: 'none' }}>Login here</a>
          </p>
        </div>
      </main>
    </>
  );
}
