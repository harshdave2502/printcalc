'use client';
import { useState } from 'react';
import { supabase } from '../supabase';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Create subscriber profile
        const selectedCurrency = currencies.find(c => c.code === currency);
        const { error: profileError } = await supabase
          .from('subscribers')
          .insert({
            id: authData.user.id,
            email,
            business_name: businessName,
            currency: currency,
            currency_symbol: selectedCurrency?.symbol || '₹',
            markup_percent: 25,
            tax_percent: 18,
            plan: 'free',
            plan_status: 'active',
          });

        if (profileError) {
          setError('Account created but profile setup failed. Please contact support.');
          setLoading(false);
          return;
        }

        setSuccess(true);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  if (success) {
    return (
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
            <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Welcome to PrintCalc. You can now login to your dashboard.</p>
            <a href="/login" style={{ display: 'block', background: '#1A1A1A', color: '#fff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              Go to Login
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F6F3; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 13px; font-weight: 500; color: #555; margin-bottom: 6px; }
        input, select { width: 100%; padding: 11px 14px; border: 1.5px solid #E8E8E8; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #1A1A1A; background: #FAFAFA; outline: none; transition: border-color 0.15s; appearance: none; -webkit-appearance: none; }
        input:focus, select:focus { border-color: #C84B31; background: #fff; }
        input::placeholder { color: #CCC; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; background-color: #FAFAFA; }
        .btn { width: 100%; padding: 13px; background: #1A1A1A; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s; }
        .btn:hover { opacity: 0.85; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { background: #FFF0F0; border: 1px solid #FEB2B2; color: #E53E3E; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
      `}</style>

      <main style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: 420, width: '100%' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, background: '#C84B31', borderRadius: '50%' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>PrintCalc</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.02em' }}>Create your account</h1>
            <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Start with a free plan — upgrade anytime</p>
          </div>

          {/* Form */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #EBEBEB' }}>
            <form onSubmit={handleSignup}>
              {error && <div className="error">{error}</div>}

              <div className="field">
                <label>Business name</label>
                <input
                  type="text"
                  placeholder="Your print shop name"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  required
                />
              </div>

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
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="field">
                <label>Your currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Creating account...' : 'Create free account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: '#C84B31', textDecoration: 'none', fontWeight: 500 }}>Login</a>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#CCC', marginTop: 20 }}>
            Free plan includes 1 calculator module · No credit card required
          </p>
        </div>
      </main>
    </>
  );
}
