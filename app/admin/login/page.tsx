'use client';
import { useState } from 'react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = '/admin';
    } else {
      setError(data.error || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#0F0F0F;}
        input{width:100%;padding:11px 14px;border:1.5px solid #2A2A2A;border-radius:10px;font-size:14px;font-family:'DM Sans',sans-serif;color:#fff;background:#1A1A1A;outline:none;}
        input:focus{border-color:#C84B31;}
        input::placeholder{color:#555;}
      `}</style>
      <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0F0F0F'}}>
        <div style={{width:'100%',maxWidth:400,padding:'0 20px'}}>
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:16}}>
              <div style={{width:10,height:10,background:'#C84B31',borderRadius:'50%'}}/>
              <span style={{fontSize:13,fontWeight:600,color:'#888',letterSpacing:'0.1em',textTransform:'uppercase'}}>PrintCalc Admin</span>
            </div>
            <h1 style={{fontSize:28,fontWeight:600,color:'#fff',letterSpacing:'-0.02em'}}>Admin Console</h1>
            <p style={{fontSize:14,color:'#555',marginTop:6}}>Restricted access — authorized personnel only</p>
          </div>
          <div style={{background:'#1A1A1A',borderRadius:16,padding:28,border:'1px solid #2A2A2A'}}>
            <form onSubmit={handleLogin}>
              {error && <div style={{background:'#3A0000',border:'1px solid #C84B31',color:'#FF6B6B',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:16}}>{error}</div>}
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:6}}>Admin Email</label>
                <input type="email" placeholder="admin@printcalc.app" value={email} onChange={e=>setEmail(e.target.value)} required/>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:6}}>Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required/>
              </div>
              <button type="submit" disabled={loading} style={{width:'100%',padding:13,background:'#C84B31',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',opacity:loading?0.7:1}}>
                {loading ? 'Authenticating...' : 'Access Admin Console →'}
              </button>
            </form>
          </div>
          <p style={{textAlign:'center',fontSize:12,color:'#333',marginTop:16}}>PrintCalc Internal — Not for public access</p>
        </div>
      </main>
    </>
  );
}
