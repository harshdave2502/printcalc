'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// ─── TYPES ───────────────────────────────────────────────────────────
type Subscriber = {
  id: string; email: string; business_name: string;
  status: 'pending'|'active'|'disabled'|'suspended';
  plan: 'free'|'solo'|'press_pro'|'enterprise';
  plan_expires_at: string|null; trial_ends_at: string|null;
  approved_at: string|null; admin_notes: string|null;
  created_at: string; markup_percent: number; tax_percent: number;
};
type Setting = { key: string; value: string };

const PLAN_LABELS: Record<string,string> = {
  free:'Free', solo:'Solo', press_pro:'Press Pro', enterprise:'Enterprise'
};
const STATUS_COLOR: Record<string,string> = {
  pending:'#D97706', active:'#38A169', disabled:'#E53E3E', suspended:'#888'
};
const STATUS_BG: Record<string,string> = {
  pending:'#FFFBEB', active:'#F0FFF4', disabled:'#FFF0F0', suspended:'#F5F5F5'
};

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────
function Sidebar({tab,setTab}:any){
  const nav=[
    {id:'overview',icon:'📊',label:'Overview'},
    {id:'subscribers',icon:'👥',label:'Subscribers'},
    {id:'pricing',icon:'💰',label:'Pricing'},
    {id:'announcements',icon:'📢',label:'Announcements'},
    {id:'settings',icon:'⚙️',label:'Settings'},
  ];
  return(
    <div style={{width:220,background:'#0F0F0F',height:'100vh',position:'fixed',top:0,left:0,borderRight:'1px solid #1A1A1A',display:'flex',flexDirection:'column' as const}}>
      <div style={{padding:'24px 20px',borderBottom:'1px solid #1A1A1A'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,background:'#C84B31',borderRadius:'50%'}}/>
          <span style={{fontSize:14,fontWeight:600,color:'#fff'}}>PrintCalc</span>
        </div>
        <p style={{fontSize:11,color:'#555',marginTop:4,letterSpacing:'0.08em',textTransform:'uppercase' as const}}>Admin Console</p>
      </div>
      <nav style={{padding:'16px 12px',flex:1}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,border:'none',background:tab===n.id?'#1A1A1A':'transparent',color:tab===n.id?'#fff':'#555',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:tab===n.id?500:400,marginBottom:2,textAlign:'left' as const}}>
            <span style={{fontSize:16}}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{padding:'16px 20px',borderTop:'1px solid #1A1A1A'}}>
        <button onClick={async()=>{await fetch('/api/admin/auth',{method:'DELETE'});window.location.href='/admin/login';}} style={{width:'100%',padding:'8px',background:'transparent',border:'1px solid #2A2A2A',borderRadius:8,color:'#555',cursor:'pointer',fontFamily:'inherit',fontSize:12}}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────
function OverviewTab({subscribers,settings}:{subscribers:Subscriber[];settings:Record<string,string>}){
  const total=subscribers.length;
  const active=subscribers.filter(s=>s.status==='active').length;
  const pending=subscribers.filter(s=>s.status==='pending').length;
  const disabled=subscribers.filter(s=>s.status==='disabled').length;
  const currency=settings.currency||'$';

  const planPrices:Record<string,number>={solo:parseFloat(settings.price_solo||'6'),press_pro:parseFloat(settings.price_press_pro||'24')};
  const mrr=subscribers.filter(s=>s.status==='active'&&s.plan!=='free'&&s.plan!=='enterprise').reduce((sum,s)=>sum+(planPrices[s.plan]||0),0);

  const stats=[
    {label:'Total Subscribers',value:total,icon:'👥',color:'#185FA5'},
    {label:'Active',value:active,icon:'✅',color:'#38A169'},
    {label:'Pending Approval',value:pending,icon:'⏳',color:'#D97706'},
    {label:'Disabled',value:disabled,icon:'🚫',color:'#E53E3E'},
    {label:'MRR',value:`${currency}${mrr.toFixed(0)}`,icon:'💰',color:'#6B46C1'},
  ];

  const recent=subscribers.slice().sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,5);

  return(
    <div>
      <h2 style={{fontSize:22,fontWeight:600,color:'#fff',marginBottom:6}}>Overview</h2>
      <p style={{fontSize:13,color:'#555',marginBottom:24}}>PrintCalc platform at a glance</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:28}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:'#1A1A1A',borderRadius:12,padding:18,border:'1px solid #2A2A2A'}}>
            <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
            <p style={{fontSize:26,fontWeight:600,color:s.color,fontFamily:'DM Mono,monospace'}}>{s.value}</p>
            <p style={{fontSize:11,color:'#555',marginTop:4}}>{s.label}</p>
          </div>
        ))}
      </div>

      {pending>0&&(
        <div style={{background:'#2A1A00',border:'1px solid #D97706',borderRadius:12,padding:16,marginBottom:20}}>
          <p style={{fontSize:14,fontWeight:600,color:'#FBBF24',marginBottom:4}}>⚠️ {pending} subscriber{pending>1?'s':''} awaiting approval</p>
          <p style={{fontSize:12,color:'#D97706'}}>Go to Subscribers tab to review and approve pending accounts.</p>
        </div>
      )}

      <div style={{background:'#1A1A1A',borderRadius:12,border:'1px solid #2A2A2A',overflow:'hidden'}}>
        <div style={{padding:'14px 20px',borderBottom:'1px solid #2A2A2A'}}><p style={{fontSize:12,fontWeight:600,color:'#888',textTransform:'uppercase' as const,letterSpacing:'0.08em'}}>Recent Signups</p></div>
        <table style={{width:'100%',borderCollapse:'collapse' as const}}>
          <thead><tr style={{background:'#111'}}><th style={TH}>Business</th><th style={TH}>Email</th><th style={TH}>Plan</th><th style={TH}>Status</th><th style={TH}>Joined</th></tr></thead>
          <tbody>
            {recent.map(s=>(
              <tr key={s.id} style={{borderBottom:'1px solid #1A1A1A'}}>
                <td style={TD}><span style={{fontWeight:500,color:'#fff'}}>{s.business_name||'—'}</span></td>
                <td style={TD}><span style={{color:'#888',fontSize:12}}>{s.email}</span></td>
                <td style={TD}><span style={{fontSize:11,fontWeight:600,color:'#C84B31',background:'rgba(200,75,49,0.1)',padding:'2px 8px',borderRadius:4}}>{PLAN_LABELS[s.plan]||s.plan}</span></td>
                <td style={TD}><span style={{fontSize:11,fontWeight:600,color:STATUS_COLOR[s.status],background:STATUS_BG[s.status]+'33',padding:'2px 8px',borderRadius:4}}>{s.status}</span></td>
                <td style={TD}><span style={{color:'#555',fontSize:12}}>{new Date(s.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SUBSCRIBERS TAB ─────────────────────────────────────────────────
function SubscribersTab({subscribers,onRefresh}:{subscribers:Subscriber[];onRefresh:()=>void}){
  const [search,setSearch]=useState('');
  const [filterStatus,setFilterStatus]=useState('all');
  const [filterPlan,setFilterPlan]=useState('all');
  const [sel,setSel]=useState<Subscriber|null>(null);
  const [notes,setNotes]=useState('');
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState('');

  const filtered=subscribers.filter(s=>{
    const matchSearch=!search||(s.email+s.business_name).toLowerCase().includes(search.toLowerCase());
    const matchStatus=filterStatus==='all'||s.status===filterStatus;
    const matchPlan=filterPlan==='all'||s.plan===filterPlan;
    return matchSearch&&matchStatus&&matchPlan;
  });

  const updateSubscriber=async(id:string,updates:any)=>{
    setSaving(true);
    await supabase.from('subscribers').update(updates).eq('id',id);
    setMsg('Saved!');setTimeout(()=>setMsg(''),2000);
    onRefresh();setSaving(false);
  };

  const approve=async(s:Subscriber)=>{
    await updateSubscriber(s.id,{status:'active',approved_at:new Date().toISOString()});
    // Send approval email via API
    await fetch('/api/admin/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'approved',email:s.email,business_name:s.business_name})});
  };

  return(
    <div style={{display:'flex',gap:20}}>
      <div style={{flex:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div><h2 style={{fontSize:22,fontWeight:600,color:'#fff'}}>Subscribers</h2><p style={{fontSize:13,color:'#555'}}>{filtered.length} of {subscribers.length} shown</p></div>
        </div>
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          <input type="text" placeholder="Search by email or business..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,padding:'9px 14px',background:'#1A1A1A',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{padding:'9px 14px',background:'#1A1A1A',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="suspended">Suspended</option>
          </select>
          <select value={filterPlan} onChange={e=>setFilterPlan(e.target.value)} style={{padding:'9px 14px',background:'#1A1A1A',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}>
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="solo">Solo</option>
            <option value="press_pro">Press Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div style={{background:'#1A1A1A',borderRadius:12,border:'1px solid #2A2A2A',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse' as const}}>
            <thead><tr style={{background:'#111'}}><th style={TH}>Business</th><th style={TH}>Plan</th><th style={TH}>Status</th><th style={TH}>Joined</th><th style={TH}>Actions</th></tr></thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id} onClick={()=>{setSel(s);setNotes(s.admin_notes||'');}} style={{borderBottom:'1px solid #1A1A1A',cursor:'pointer',background:sel?.id===s.id?'#111':'transparent'}}>
                  <td style={TD}><p style={{fontWeight:500,color:'#fff',fontSize:13}}>{s.business_name||'(no name)'}</p><p style={{fontSize:11,color:'#555'}}>{s.email}</p></td>
                  <td style={TD}><span style={{fontSize:11,fontWeight:600,color:'#C84B31',background:'rgba(200,75,49,0.1)',padding:'2px 8px',borderRadius:4}}>{PLAN_LABELS[s.plan]}</span></td>
                  <td style={TD}><span style={{fontSize:11,fontWeight:600,color:STATUS_COLOR[s.status],background:STATUS_BG[s.status]+'33',padding:'2px 8px',borderRadius:4}}>{s.status}</span></td>
                  <td style={TD}><span style={{color:'#555',fontSize:12}}>{new Date(s.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></td>
                  <td style={TD}>
                    <div style={{display:'flex',gap:6}}>
                      {s.status==='pending'&&<button onClick={e=>{e.stopPropagation();approve(s);}} style={ABtn('#38A169')}>Approve</button>}
                      {s.status==='active'&&<button onClick={e=>{e.stopPropagation();updateSubscriber(s.id,{status:'disabled'});}} style={ABtn('#E53E3E')}>Disable</button>}
                      {(s.status==='disabled'||s.status==='suspended')&&<button onClick={e=>{e.stopPropagation();updateSubscriber(s.id,{status:'active'});}} style={ABtn('#38A169')}>Enable</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {sel&&(
        <div style={{width:320,background:'#1A1A1A',borderRadius:12,border:'1px solid #2A2A2A',padding:20,height:'fit-content',position:'sticky',top:20}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
            <p style={{fontSize:14,fontWeight:600,color:'#fff'}}>Subscriber Details</p>
            <button onClick={()=>setSel(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>×</button>
          </div>
          {msg&&<p style={{color:'#38A169',fontSize:12,marginBottom:10}}>✓ {msg}</p>}
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,color:'#555',marginBottom:3}}>Business</p>
            <p style={{fontSize:14,fontWeight:500,color:'#fff'}}>{sel.business_name||'—'}</p>
          </div>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,color:'#555',marginBottom:3}}>Email</p>
            <p style={{fontSize:13,color:'#888'}}>{sel.email}</p>
          </div>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,color:'#555',marginBottom:6}}>Status</p>
            <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
              {(['active','pending','disabled','suspended'] as const).map(st=>(
                <button key={st} onClick={()=>updateSubscriber(sel.id,{status:st})} disabled={saving} style={{...ABtn(STATUS_COLOR[st]),opacity:sel.status===st?1:0.4}}>{st}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,color:'#555',marginBottom:6}}>Plan</p>
            <select value={sel.plan} onChange={e=>{updateSubscriber(sel.id,{plan:e.target.value});setSel({...sel,plan:e.target.value as any});}} style={{width:'100%',padding:'8px 12px',background:'#111',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}>
              <option value="free">Free</option>
              <option value="solo">Solo</option>
              <option value="press_pro">Press Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,color:'#555',marginBottom:6}}>Trial ends</p>
            <input type="date" value={sel.trial_ends_at?.slice(0,10)||''} onChange={e=>updateSubscriber(sel.id,{trial_ends_at:e.target.value||null})} style={{width:'100%',padding:'8px 12px',background:'#111',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
          </div>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,color:'#555',marginBottom:6}}>Admin notes</p>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{width:'100%',padding:'8px 12px',background:'#111',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:12,outline:'none',resize:'vertical' as const}}/>
            <button onClick={()=>updateSubscriber(sel.id,{admin_notes:notes})} style={{...ABtn('#185FA5'),marginTop:6,width:'100%'}}>Save notes</button>
          </div>
          <div style={{paddingTop:14,borderTop:'1px solid #2A2A2A'}}>
            <p style={{fontSize:11,color:'#555',marginBottom:6}}>Markup: {sel.markup_percent}% · GST: {sel.tax_percent}%</p>
            {sel.approved_at&&<p style={{fontSize:11,color:'#555'}}>Approved: {new Date(sel.approved_at).toLocaleDateString('en-IN')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRICING TAB ─────────────────────────────────────────────────────
function PricingTab({settings,onSave}:{settings:Record<string,string>;onSave:(key:string,value:string)=>void}){
  const [vals,setVals]=useState({...settings});
  const [msg,setMsg]=useState('');

  const save=(key:string)=>{
    onSave(key,vals[key]||'');
    setMsg('Saved!');setTimeout(()=>setMsg(''),2000);
  };

  const Field=({label,k,type='text',note}:{label:string;k:string;type?:string;note?:string})=>(
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:6}}>{label}{note&&<span style={{fontWeight:400,color:'#555',marginLeft:6}}>{note}</span>}</label>
      <div style={{display:'flex',gap:8}}>
        <input type={type} value={vals[k]||''} onChange={e=>setVals({...vals,[k]:e.target.value})} style={{flex:1,padding:'9px 14px',background:'#111',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
        <button onClick={()=>save(k)} style={ABtn('#38A169')}>Save</button>
      </div>
    </div>
  );

  return(
    <div style={{maxWidth:600}}>
      <h2 style={{fontSize:22,fontWeight:600,color:'#fff',marginBottom:6}}>Pricing Control</h2>
      <p style={{fontSize:13,color:'#555',marginBottom:24}}>All pricing changes take effect immediately on the landing page</p>
      {msg&&<p style={{color:'#38A169',fontSize:13,marginBottom:16}}>✓ {msg}</p>}

      <Section title="Currency & Display">
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:6}}>Currency Symbol</label>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            {['$','₹','£','€','AED'].map(c=>(
              <button key={c} onClick={()=>{setVals({...vals,currency:c});onSave('currency',c);}} style={{padding:'8px 16px',background:vals.currency===c?'#C84B31':'#111',border:`1.5px solid ${vals.currency===c?'#C84B31':'#2A2A2A'}`,borderRadius:8,color:vals.currency===c?'#fff':'#888',cursor:'pointer',fontFamily:'inherit',fontSize:14,fontWeight:600}}>{c}</button>
            ))}
          </div>
        </div>
        <Field label="Currency Code" k="currency_code" note="(e.g. USD, INR, GBP)"/>
      </Section>

      <Section title="Plan Prices (per month)">
        <Field label="Free Plan Price" k="price_free" type="number" note="(usually 0)"/>
        <Field label="Solo Plan Price" k="price_solo" type="number"/>
        <Field label="Press Pro Plan Price" k="price_press_pro" type="number"/>
        <Field label="Enterprise Label" k="price_enterprise" note="(shown as text, e.g. 'Contact us')"/>
      </Section>

      <Section title="Plan Names & Descriptions">
        <Field label="Solo Plan Name" k="name_solo"/>
        <Field label="Press Pro Plan Name" k="name_press_pro"/>
        <Field label="Free Tagline" k="tagline_free"/>
        <Field label="Solo Tagline" k="tagline_solo"/>
        <Field label="Press Pro Tagline" k="tagline_press_pro"/>
      </Section>

      <Section title="Promo Settings">
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:8}}>Promo Active (free 1st month for all plans)</label>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setVals({...vals,promo_active:'true'});onSave('promo_active','true');}} style={{...ABtn('#38A169'),opacity:vals.promo_active==='true'?1:0.4}}>ON</button>
            <button onClick={()=>{setVals({...vals,promo_active:'false'});onSave('promo_active','false');}} style={{...ABtn('#E53E3E'),opacity:vals.promo_active==='false'?1:0.4}}>OFF</button>
          </div>
        </div>
        <Field label="Promo Banner Text" k="promo_text" note="(shown on pricing page)"/>
        <Field label="Promo Duration (days)" k="promo_days" type="number"/>
      </Section>

      <Section title="Customer Limits per Plan">
        <Field label="Free — Max Customers" k="limit_free_customers" type="number"/>
        <Field label="Solo — Max Customers" k="limit_solo_customers" type="number"/>
        <Field label="Press Pro — Max Customers" k="limit_pro_customers" type="number" note="(0 = unlimited)"/>
      </Section>
    </div>
  );
}

// ─── ANNOUNCEMENTS TAB ───────────────────────────────────────────────
function AnnouncementsTab({settings,onSave}:{settings:Record<string,string>;onSave:(k:string,v:string)=>void}){
  const [banner,setBanner]=useState(settings.announcement||'');
  const [bannerType,setBannerType]=useState(settings.announcement_type||'info');
  const [maintenance,setMaintenance]=useState(settings.maintenance_mode||'false');
  const [msg,setMsg]=useState('');

  const save=async()=>{
    onSave('announcement',banner);
    onSave('announcement_type',bannerType);
    setMsg('Saved!');setTimeout(()=>setMsg(''),2000);
  };

  return(
    <div style={{maxWidth:600}}>
      <h2 style={{fontSize:22,fontWeight:600,color:'#fff',marginBottom:6}}>Announcements</h2>
      <p style={{fontSize:13,color:'#555',marginBottom:24}}>Show banners to all subscribers on their calculator page</p>
      {msg&&<p style={{color:'#38A169',fontSize:13,marginBottom:16}}>✓ {msg}</p>}

      <Section title="Global Banner">
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,color:'#888',marginBottom:6}}>Banner type</label>
          <div style={{display:'flex',gap:8}}>
            {[{id:'info',c:'#185FA5',l:'ℹ️ Info'},{id:'warning',c:'#D97706',l:'⚠️ Warning'},{id:'success',c:'#38A169',l:'✅ Success'},{id:'error',c:'#E53E3E',l:'🚫 Error'}].map(t=>(
              <button key={t.id} onClick={()=>setBannerType(t.id)} style={{padding:'6px 12px',background:bannerType===t.id?t.c:'#111',border:`1.5px solid ${bannerType===t.id?t.c:'#2A2A2A'}`,borderRadius:8,color:'#fff',cursor:'pointer',fontFamily:'inherit',fontSize:12}}>{t.l}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,color:'#888',marginBottom:6}}>Message (leave blank to hide)</label>
          <textarea value={banner} onChange={e=>setBanner(e.target.value)} rows={3} placeholder="e.g. 🎉 New feature: Brochure calculator is now live!" style={{width:'100%',padding:'10px 14px',background:'#111',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none',resize:'vertical' as const}}/>
        </div>
        <button onClick={save} style={ABtn('#38A169')}>Save Banner</button>
        {banner&&<div style={{marginTop:12,padding:'10px 14px',background:'#111',border:`1px solid #2A2A2A`,borderRadius:8,borderLeft:`3px solid #185FA5`}}><p style={{fontSize:12,color:'#888'}}>Preview: {banner}</p></div>}
      </Section>

      <Section title="Maintenance Mode">
        <p style={{fontSize:13,color:'#555',marginBottom:12}}>When ON, all subscribers see a maintenance message instead of the calculator.</p>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>{setMaintenance('true');onSave('maintenance_mode','true');}} style={{...ABtn('#E53E3E'),opacity:maintenance==='true'?1:0.4}}>Turn ON</button>
          <button onClick={()=>{setMaintenance('false');onSave('maintenance_mode','false');}} style={{...ABtn('#38A169'),opacity:maintenance==='false'?1:0.4}}>Turn OFF</button>
          <span style={{fontSize:12,color:maintenance==='true'?'#E53E3E':'#38A169',fontWeight:600}}>Currently: {maintenance==='true'?'ON':'OFF'}</span>
        </div>
      </Section>
    </div>
  );
}

// ─── SETTINGS TAB ────────────────────────────────────────────────────
function SettingsTab({settings,onSave}:{settings:Record<string,string>;onSave:(k:string,v:string)=>void}){
  const [vals,setVals]=useState({...settings});
  const [msg,setMsg]=useState('');
  const save=(k:string)=>{onSave(k,vals[k]||'');setMsg('Saved!');setTimeout(()=>setMsg(''),2000);};

  const Field=({label,k,type='text',note}:{label:string;k:string;type?:string;note?:string})=>(
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:6}}>{label}{note&&<span style={{fontWeight:400,color:'#555',marginLeft:6}}>{note}</span>}</label>
      <div style={{display:'flex',gap:8}}>
        <input type={type} value={vals[k]||''} onChange={e=>setVals({...vals,[k]:e.target.value})} style={{flex:1,padding:'9px 14px',background:'#111',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
        <button onClick={()=>save(k)} style={ABtn('#38A169')}>Save</button>
      </div>
    </div>
  );

  return(
    <div style={{maxWidth:600}}>
      <h2 style={{fontSize:22,fontWeight:600,color:'#fff',marginBottom:6}}>Settings</h2>
      <p style={{fontSize:13,color:'#555',marginBottom:24}}>Admin and platform configuration</p>
      {msg&&<p style={{color:'#38A169',fontSize:13,marginBottom:16}}>✓ {msg}</p>}

      <Section title="Admin Access">
        <Field label="Admin Email" k="admin_email"/>
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:12,color:'#888',marginBottom:6}}>Change Admin Password</label>
          <div style={{display:'flex',gap:8}}>
            <input type="password" placeholder="New password" value={vals['admin_password_new']||''} onChange={e=>setVals({...vals,admin_password_new:e.target.value})} style={{flex:1,padding:'9px 14px',background:'#111',border:'1.5px solid #2A2A2A',borderRadius:8,color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
            <button onClick={async()=>{await fetch('/api/admin/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:vals.admin_password_new})});setMsg('Password updated!');setTimeout(()=>setMsg(''),2000);}} style={ABtn('#C84B31')}>Update</button>
          </div>
        </div>
      </Section>

      <Section title="Payment Providers">
        <Field label="Lemon Squeezy Store ID" k="ls_store_id"/>
        <Field label="Lemon Squeezy API Key" k="ls_api_key" type="password"/>
        <Field label="Razorpay Key ID" k="rp_key_id"/>
        <Field label="Razorpay Key Secret" k="rp_key_secret" type="password"/>
      </Section>

      <Section title="Email (Resend)">
        <Field label="Resend API Key" k="resend_api_key" type="password"/>
        <Field label="From Email" k="email_from" note="e.g. noreply@printcalc.app"/>
      </Section>

      <Section title="Platform">
        <Field label="App Name" k="app_name" note="shown in UI"/>
        <Field label="Support Email" k="support_email"/>
        <div style={{marginBottom:16,padding:14,background:'#111',borderRadius:8,border:'1px solid #2A2A2A'}}>
          <p style={{fontSize:12,color:'#555',marginBottom:4}}>Approval Mode</p>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setVals({...vals,require_approval:'true'});onSave('require_approval','true');}} style={{...ABtn('#C84B31'),opacity:vals.require_approval!=='false'?1:0.4}}>Manual Approval</button>
            <button onClick={()=>{setVals({...vals,require_approval:'false'});onSave('require_approval','false');}} style={{...ABtn('#38A169'),opacity:vals.require_approval==='false'?1:0.4}}>Auto Approve</button>
          </div>
          <p style={{fontSize:11,color:'#555',marginTop:8}}>Manual: new signups need your approval. Auto: instantly activated.</p>
        </div>
      </Section>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────
const TH:any={padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:'#555',textTransform:'uppercase',letterSpacing:'0.06em'};
const TD:any={padding:'12px 16px',fontSize:13,color:'#888'};
const ABtn=(c:string):any=>({padding:'6px 12px',background:'transparent',border:`1.5px solid ${c}`,borderRadius:6,color:c,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:500});
function Section({title,children}:any){
  return(
    <div style={{background:'#1A1A1A',borderRadius:12,border:'1px solid #2A2A2A',marginBottom:16,overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid #2A2A2A'}}><p style={{fontSize:11,fontWeight:600,color:'#555',textTransform:'uppercase' as const,letterSpacing:'0.08em'}}>{title}</p></div>
      <div style={{padding:16}}>{children}</div>
    </div>
  );
}

// ─── MAIN ADMIN PAGE ─────────────────────────────────────────────────
export default function AdminPage(){
  const [tab,setTab]=useState('overview');
  const [subscribers,setSubscribers]=useState<Subscriber[]>([]);
  const [settings,setSettings]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [authed,setAuthed]=useState(false);

  useEffect(()=>{
    // Check admin auth
    fetch('/api/admin/auth').then(r=>r.json()).then(d=>{
      if(d.authed){setAuthed(true);loadData();}
      else window.location.href='/admin/login';
    });
  },[]);

  const loadData=async()=>{
    setLoading(true);
    const [{data:subs},{data:settingsData}]=await Promise.all([
      supabase.from('subscribers').select('*').order('created_at',{ascending:false}),
      supabase.from('admin_settings').select('*'),
    ]);
    setSubscribers(subs||[]);
    const sObj:Record<string,string>={};
    (settingsData||[]).forEach((s:Setting)=>{sObj[s.key]=s.value;});
    // Set defaults if not in DB
    const defaults:Record<string,string>={currency:'$',currency_code:'USD',price_free:'0',price_solo:'6',price_press_pro:'24',price_enterprise:'Contact us',promo_active:'true',promo_days:'30',promo_text:'🎉 First month FREE for all plans — limited time offer!',limit_free_customers:'0',limit_solo_customers:'10',limit_pro_customers:'0',require_approval:'true',app_name:'PrintCalc',announcement:'',announcement_type:'info',maintenance_mode:'false',name_solo:'Solo',name_press_pro:'Press Pro'};
    setSettings({...defaults,...sObj});
    setLoading(false);
  };

  const saveSetting=async(key:string,value:string)=>{
    await supabase.from('admin_settings').upsert({key,value},{onConflict:'key'});
    setSettings(p=>({...p,[key]:value}));
  };

  if(!authed||loading)return(
    <div style={{background:'#0F0F0F',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}><div style={{width:40,height:40,border:'3px solid #2A2A2A',borderTopColor:'#C84B31',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/><p style={{color:'#555'}}>Loading...</p><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
    </div>
  );

  return(
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#0F0F0F;color:#fff;}`}</style>
      <Sidebar tab={tab} setTab={setTab}/>
      <main style={{marginLeft:220,padding:32,minHeight:'100vh',background:'#0F0F0F'}}>
        {tab==='overview'&&<OverviewTab subscribers={subscribers} settings={settings}/>}
        {tab==='subscribers'&&<SubscribersTab subscribers={subscribers} onRefresh={loadData}/>}
        {tab==='pricing'&&<PricingTab settings={settings} onSave={saveSetting}/>}
        {tab==='announcements'&&<AnnouncementsTab settings={settings} onSave={saveSetting}/>}
        {tab==='settings'&&<SettingsTab settings={settings} onSave={saveSetting}/>}
      </main>
    </>
  );
}
