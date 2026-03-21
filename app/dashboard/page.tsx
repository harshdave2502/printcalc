'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const GSM_RANGES: Record<string,string> = {
  'Maplitho':'60 GSM – 80 GSM','Art Paper':'80 GSM – 130 GSM','Art Card':'170 GSM – 230 GSM',
  'Art Card Heavy':'250 GSM – 380 GSM','Art Card Extra Heavy':'400 GSM – 500 GSM',
  'FBB / Ultima / SBS':'200 GSM – 400 GSM','Duplex Grey Back':'200 GSM – 400 GSM','Duplex White Back':'200 GSM – 400 GSM',
};
const PLATE_GROUPS=[{id:'small',label:'Small Plates (15×20, 18×23, 18×25)'},{id:'medium',label:'Medium Plates (20×28, 20×30)'},{id:'large',label:'Large Plates (25×36, 28×40)'}];
const COLOR_OPTIONS=[{id:'single',label:'Single Color'},{id:'two',label:'Two Color'},{id:'cmyk',label:'Four Color CMYK'},{id:'five',label:'Five Color (CMYK + White)'},{id:'five_coater',label:'Five Color + Coater'},{id:'five_uv',label:'Five Color + UV Online'}];
const LAM_LABELS:Record<string,string>={gloss_thermal:'Gloss Thermal',matt_thermal:'Matt Thermal',velvet_thermal:'Velvet Thermal',bopp_gloss:'BOPP Gloss',bopp_matt:'BOPP Matt'};
const UV_LABELS:Record<string,string>={full_uv:'Full UV',spot_uv:'Spot UV',aqueous:'Aqueous Coating',varnish:'Varnish',uv_online:'UV Dripoff Online',uv_offline:'UV Dripoff Offline'};
const BINDING_LABELS:Record<string,string>={center_pin:'Center Pin',perfect:'Perfect Bind',hard:'Hard Bind',spiral:'Spiral Bind',folding:'Just Folding',cutting:'Just Cutting'};
const SAMPLE_CUSTOMERS=[{id:'1',name:'Raj Printers',email:'raj@rajprinters.com',phone:'9876543210',company:'Raj Printers Pvt Ltd',total_quotes:12,total_orders:5,last_active:'2 days ago'},{id:'2',name:'Mumbai Print House',email:'info@mumbaiprint.com',phone:'9123456789',company:'Mumbai Print House',total_quotes:8,total_orders:3,last_active:'5 days ago'},{id:'3',name:'Sharma Packaging',email:'sharma@packaging.com',phone:'9988776655',company:'Sharma Packaging Works',total_quotes:20,total_orders:14,last_active:'Today'}];
const SAMPLE_QUOTES=[{id:'Q001',customer:'Raj Printers',paper:'Art Card 300 GSM',size:'23 × 36"',qty:5000,amount:'₹18,450',date:'20 Mar 2026',status:'Sent'},{id:'Q002',customer:'Mumbai Print House',paper:'Maplitho 70 GSM',size:'25 × 36"',qty:10000,amount:'₹12,200',date:'19 Mar 2026',status:'Converted'},{id:'Q003',customer:'Sharma Packaging',paper:'FBB 300 GSM',size:'31.5 × 41.5"',qty:2000,amount:'₹24,800',date:'18 Mar 2026',status:'Draft'},{id:'Q004',customer:'Raj Printers',paper:'Art Paper 130 GSM',size:'23 × 36"',qty:8000,amount:'₹15,600',date:'17 Mar 2026',status:'Expired'}];
const SAMPLE_ORDERS=[{id:'ORD001',customer:'Mumbai Print House',paper:'Maplitho 70 GSM',qty:10000,amount:'₹12,200',date:'19 Mar 2026',status:'In Production'},{id:'ORD002',customer:'Sharma Packaging',paper:'FBB 250 GSM',qty:5000,amount:'₹31,500',date:'15 Mar 2026',status:'Ready'},{id:'ORD003',customer:'Raj Printers',paper:'Art Card 250 GSM',qty:3000,amount:'₹9,800',date:'10 Mar 2026',status:'Delivered'}];
const SC:Record<string,string>={Draft:'#888',Sent:'#185FA5',Converted:'#38A169',Expired:'#E53E3E',Pending:'#D97706','In Production':'#185FA5',Ready:'#6B46C1',Delivered:'#38A169'};
const SBG:Record<string,string>={Draft:'#F5F5F5',Sent:'#EEF4FA',Converted:'#F0FFF4',Expired:'#FFF0F0',Pending:'#FFFBEB','In Production':'#EEF4FA',Ready:'#F5F0FF',Delivered:'#F0FFF4'};

export default function DashboardPage() {
  const [subscriber,setSubscriber]=useState<any>(null);
  const [paperCategories,setPaperCategories]=useState<any[]>([]);
  const [paperStocks,setPaperStocks]=useState<any[]>([]);
  const [printingRates,setPrintingRates]=useState<any[]>([]);
  const [lamRates,setLamRates]=useState<any[]>([]);
  const [uvRates,setUvRates]=useState<any[]>([]);
  const [bindingRates,setBindingRates]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [activeTab,setActiveTab]=useState('overview');
  const [editingCat,setEditingCat]=useState<any>(null);
  const [editingStock,setEditingStock]=useState<any>(null);
  const [editingPrint,setEditingPrint]=useState<any>(null);
  const [editingLam,setEditingLam]=useState<any>(null);
  const [editingUV,setEditingUV]=useState<any>(null);
  const [editingBind,setEditingBind]=useState<any>(null);
  const [saving,setSaving]=useState(false);
  const [saveMsg,setSaveMsg]=useState('');
  const [selectedCustomer,setSelectedCustomer]=useState<any>(null);

  useEffect(()=>{loadDashboard();},[]);

  const loadDashboard=async()=>{
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href='/login';return;}
    const {data:profile}=await supabase.from('subscribers').select('*').eq('id',user.id).single();
    if(profile)setSubscriber(profile);
    const {data:cats}=await supabase.from('paper_categories').select('*').eq('subscriber_id',user.id).order('category');
    setPaperCategories(cats||[]);
    const {data:stocks}=await supabase.from('paper_stocks').select('*').eq('subscriber_id',user.id).order('sort_order');
    setPaperStocks(stocks||[]);
    const {data:pr}=await supabase.from('printing_rates').select('*').eq('subscriber_id',user.id).order('plate_group').order('color_option');
    setPrintingRates(pr||[]);
    const {data:lr}=await supabase.from('lamination_rates').select('*').eq('subscriber_id',user.id);
    setLamRates(lr||[]);
    const {data:ur}=await supabase.from('uv_rates').select('*').eq('subscriber_id',user.id);
    setUvRates(ur||[]);
    const {data:br}=await supabase.from('binding_rates').select('*').eq('subscriber_id',user.id);
    setBindingRates(br||[]);
    setLoading(false);
  };

  const handleLogout=async()=>{await supabase.auth.signOut();window.location.href='/login';};
  const saved=(msg:string)=>{setSaveMsg(msg);setTimeout(()=>setSaveMsg(''),2000);};

  const saveCat=async(cat:any)=>{setSaving(true);const{error}=await supabase.from('paper_categories').update({rate_per_kg:cat.rate_per_kg}).eq('id',cat.id);if(!error){setPaperCategories(p=>p.map(c=>c.id===cat.id?cat:c));saved('Rate saved!');}setSaving(false);setEditingCat(null);};
  const saveStock=async(s:any)=>{setSaving(true);const{error}=await supabase.from('paper_stocks').update({packing_size:s.packing_size,in_stock:s.in_stock,stock_qty:s.stock_qty}).eq('id',s.id);if(!error){setPaperStocks(p=>p.map(x=>x.id===s.id?s:x));saved('Saved!');}setSaving(false);setEditingStock(null);};
  const savePrint=async(r:any)=>{setSaving(true);const{error}=await supabase.from('printing_rates').update({fixed_charge:r.fixed_charge,per_1000_impression:r.per_1000_impression}).eq('id',r.id);if(!error){setPrintingRates(p=>p.map(x=>x.id===r.id?r:x));saved('Rate saved!');}setSaving(false);setEditingPrint(null);};
  const saveLam=async(r:any)=>{setSaving(true);const{error}=await supabase.from('lamination_rates').update({minimum_charge:r.minimum_charge,per_100_sqinch:r.per_100_sqinch}).eq('id',r.id);if(!error){setLamRates(p=>p.map(x=>x.id===r.id?r:x));saved('Rate saved!');}setSaving(false);setEditingLam(null);};
  const saveUV=async(r:any)=>{setSaving(true);const{error}=await supabase.from('uv_rates').update({minimum_charge:r.minimum_charge,per_100_sqinch:r.per_100_sqinch}).eq('id',r.id);if(!error){setUvRates(p=>p.map(x=>x.id===r.id?r:x));saved('Rate saved!');}setSaving(false);setEditingUV(null);};
  const saveBind=async(r:any)=>{setSaving(true);const{error}=await supabase.from('binding_rates').update({per_binding_format:r.per_binding_format}).eq('id',r.id);if(!error){setBindingRates(p=>p.map(x=>x.id===r.id?r:x));saved('Rate saved!');}setSaving(false);setEditingBind(null);};
  const saveSettings=async()=>{if(!subscriber)return;setSaving(true);const{error}=await supabase.from('subscribers').update({business_name:subscriber.business_name,markup_percent:subscriber.markup_percent,tax_percent:subscriber.tax_percent}).eq('id',subscriber.id);if(!error)saved('Settings saved!');setSaving(false);};

  if(loading) return <main style={{minHeight:'100vh',background:'#F7F6F3',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}><p style={{color:'#888'}}>Loading dashboard...</p></main>;

  const stockCats=[...new Set(paperStocks.map((p:any)=>p.category))];
  const tabs=[{id:'overview',label:'Overview'},{id:'print_rates',label:'Printing Rates'},{id:'customers',label:'Customers'},{id:'quotes',label:'Quotes'},{id:'orders',label:'Orders'},{id:'rates',label:'Paper Rates'},{id:'stocks',label:'Stock Management'},{id:'settings',label:'Settings'}];
  const SBadge=({status}:any)=><span style={{padding:'3px 10px',borderRadius:4,fontSize:11,fontWeight:600,background:SBG[status],color:SC[status]}}>{status}</span>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        .nav{background:#1A1A1A;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:100;}
        .tabs-wrap{background:#fff;border-bottom:1px solid #EBEBEB;padding:0 24px;display:flex;overflow-x:auto;scrollbar-width:none;}
        .tabs-wrap::-webkit-scrollbar{display:none;}
        .tab{padding:14px 16px;font-size:13px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;white-space:nowrap;flex-shrink:0;}
        .tab.active{color:#1A1A1A;border-bottom-color:#C84B31;}
        .tab:hover{color:#1A1A1A;}
        .content{max-width:1000px;margin:0 auto;padding:28px 24px;}
        .card{background:#fff;border-radius:12px;border:1px solid #EBEBEB;padding:24px;margin-bottom:16px;}
        .card-title{font-size:15px;font-weight:600;color:#1A1A1A;margin-bottom:4px;}
        .card-sub{font-size:12px;color:#AAA;margin-bottom:16px;}
        .field{margin-bottom:14px;}
        .field label{display:block;font-size:12px;font-weight:500;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em;}
        input[type="text"],input[type="number"],input[type="email"]{padding:9px 12px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#FAFAFA;outline:none;}
        input:focus{border-color:#C84B31;background:#fff;}
        input[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;}
        .btn-primary{padding:8px 18px;background:#1A1A1A;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;}
        .btn-sm{padding:5px 12px;background:#F5F5F5;color:#555;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;}
        .btn-cancel{padding:5px 12px;background:none;color:#888;border:1px solid #E8E8E8;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;margin-left:6px;}
        .btn-danger{padding:9px 20px;background:#FFF0F0;color:#E53E3E;border:1px solid #FEB2B2;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;}
        .save-msg{color:#38A169;font-size:13px;}
        .stat-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;}
        .stat-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;}
        .stat-card{background:#fff;border:1px solid #EBEBEB;border-radius:10px;padding:16px;}
        .stat-label{font-size:11px;color:#999;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;}
        .stat-value{font-size:24px;font-weight:600;color:#1A1A1A;font-family:'DM Mono',monospace;}
        .stat-sub{font-size:11px;color:#AAA;margin-top:4px;}
        .section-header{background:#F9F9F9;border-bottom:1px solid #F0F0F0;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;}
        .section-title{font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.08em;}
        .table{width:100%;border-collapse:collapse;}
        .table th{text-align:left;font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.06em;padding:10px 16px;border-bottom:1px solid #F0F0F0;}
        .table td{padding:11px 16px;border-bottom:1px solid #F8F8F8;font-size:13px;color:#1A1A1A;vertical-align:middle;}
        .table tr:last-child td{border-bottom:none;}
        .table tbody tr:hover td{background:#FAFAFA;}
        .badge-in{display:inline-block;padding:2px 8px;background:#F0FFF4;color:#38A169;border:1px solid #9AE6B4;border-radius:4px;font-size:11px;font-weight:600;}
        .badge-out{display:inline-block;padding:2px 8px;background:#FFF0F0;color:#E53E3E;border:1px solid #FEB2B2;border-radius:4px;font-size:11px;font-weight:600;}
        .info-box{background:#F0FFF4;border:1px solid #9AE6B4;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#276749;}
        .coming-box{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400E;}
        .gsm-range{display:inline-block;padding:2px 8px;background:#F5F0FF;color:#6B46C1;border-radius:4px;font-size:11px;font-weight:500;font-family:'DM Mono',monospace;}
        .plate-badge{display:inline-block;padding:2px 8px;background:#EEF4FA;color:#185FA5;border-radius:4px;font-size:11px;font-weight:500;}
        .select-sm{padding:5px 8px;border:1.5px solid #E8E8E8;border-radius:6px;font-size:12px;font-family:inherit;background:#FAFAFA;outline:none;}
        .avatar{width:36px;height:36px;background:#1A1A1A;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;flex-shrink:0;}
        .back-btn{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#888;background:none;border:none;cursor:pointer;font-family:inherit;margin-bottom:16px;padding:0;}
        .back-btn:hover{color:#1A1A1A;}
        .plan-badge{display:inline-block;padding:3px 10px;background:#EEF4FA;color:#185FA5;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;}
        @media(max-width:768px){.stat-grid-4{grid-template-columns:repeat(2,1fr);}.stat-grid-3{grid-template-columns:repeat(2,1fr);}.content{padding:20px 16px;}}
      `}</style>

      <nav className="nav">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,background:'#C84B31',borderRadius:'50%'}}/>
          <span style={{fontSize:14,fontWeight:500,color:'#fff'}}>PrintCalc</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <a href="/" style={{fontSize:13,color:'#888',textDecoration:'none'}}>← Calculator</a>
          <span style={{fontSize:13,color:'#888'}}>{subscriber?.business_name}</span>
          <span className="plan-badge">{subscriber?.plan}</span>
          <button style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="tabs-wrap">
        {tabs.map(t=><button key={t.id} className={`tab ${activeTab===t.id?'active':''}`} onClick={()=>{setActiveTab(t.id);setSelectedCustomer(null);}}>{t.label}</button>)}
      </div>

      <div className="content">
        {saveMsg&&<p className="save-msg" style={{marginBottom:16}}>✓ {saveMsg}</p>}

        {/* OVERVIEW */}
        {activeTab==='overview'&&(
          <div>
            <div className="stat-grid-4">
              {[{label:'Plan',value:subscriber?.plan,sm:true},{label:'Markup',value:`${subscriber?.markup_percent}%`},{label:'GST / Tax',value:`${subscriber?.tax_percent}%`},{label:'Currency',value:`${subscriber?.currency_symbol} ${subscriber?.currency}`,sm:true}].map(s=>(
                <div key={s.label} className="stat-card"><p className="stat-label">{s.label}</p><p className="stat-value" style={{fontSize:s.sm?18:24,textTransform:'capitalize'}}>{s.value}</p></div>
              ))}
            </div>
            <div className="stat-grid-4">
              <div className="stat-card"><p className="stat-label">Customers</p><p className="stat-value">{SAMPLE_CUSTOMERS.length}</p><p className="stat-sub">Active accounts</p></div>
              <div className="stat-card"><p className="stat-label">Quotes</p><p className="stat-value">{SAMPLE_QUOTES.length}</p><p className="stat-sub">This month</p></div>
              <div className="stat-card"><p className="stat-label">Orders</p><p className="stat-value">{SAMPLE_ORDERS.length}</p><p className="stat-sub">This month</p></div>
              <div className="stat-card"><p className="stat-label">Revenue</p><p className="stat-value" style={{fontSize:20}}>₹53.5k</p><p className="stat-sub">This month</p></div>
            </div>
            <div className="card">
              <p className="card-title">Quick links</p>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}>
                <a href="/" style={{padding:'10px 18px',background:'#1A1A1A',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:500}}>View Calculator</a>
                {tabs.slice(1).map(t=><button key={t.id} className="btn-sm" style={{padding:'10px 16px',fontSize:13}} onClick={()=>setActiveTab(t.id)}>{t.label}</button>)}
              </div>
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="section-header"><p className="section-title">Recent Orders</p><button className="btn-sm" onClick={()=>setActiveTab('orders')}>View all</button></div>
              <table className="table">
                <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{SAMPLE_ORDERS.map(o=><tr key={o.id}><td style={{fontFamily:'monospace',color:'#888',fontSize:12}}>{o.id}</td><td style={{fontWeight:500}}>{o.customer}</td><td style={{fontFamily:'monospace',fontWeight:500}}>{o.amount}</td><td style={{fontSize:12,color:'#888'}}>{o.date}</td><td><SBadge status={o.status}/></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRINTING RATES */}
        {activeTab==='print_rates'&&(
          <div>
            <div className="info-box">💡 Set your rates for each plate size and color combination. These rates are used in all printing calculations. Customers never see these rates.</div>

            {/* PLATE RATES */}
            {PLATE_GROUPS.map(pg=>(
              <div key={pg.id} className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
                <div className="section-header">
                  <p className="section-title">{pg.label}</p>
                  <span className="plate-badge">{pg.id}</span>
                </div>
                <table className="table">
                  <thead><tr><th>Color Option</th><th>Fixed Charge ({subscriber?.currency_symbol})</th><th>Per 1000 Impressions ({subscriber?.currency_symbol})</th><th>Action</th></tr></thead>
                  <tbody>
                    {COLOR_OPTIONS.map(col=>{
                      const rate=printingRates.find(r=>r.plate_group===pg.id&&r.color_option===col.id);
                      if(!rate) return null;
                      const isEditing=editingPrint?.id===rate.id;
                      return (
                        <tr key={col.id}>
                          <td style={{fontWeight:500}}>{col.label}</td>
                          <td>{isEditing?<input type="number" value={editingPrint.fixed_charge} onChange={e=>setEditingPrint({...editingPrint,fixed_charge:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace'}}>{subscriber?.currency_symbol}{rate.fixed_charge}</span>}</td>
                          <td>{isEditing?<input type="number" value={editingPrint.per_1000_impression} onChange={e=>setEditingPrint({...editingPrint,per_1000_impression:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace'}}>{subscriber?.currency_symbol}{rate.per_1000_impression}</span>}</td>
                          <td>{isEditing?<><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}} onClick={()=>savePrint(editingPrint)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditingPrint(null)}>Cancel</button></>:<button className="btn-sm" onClick={()=>setEditingPrint(rate)}>Edit</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            {/* LAMINATION RATES */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
              <div className="section-header"><p className="section-title">Lamination Rates</p></div>
              <table className="table">
                <thead><tr><th>Lamination Type</th><th>Minimum Charge ({subscriber?.currency_symbol})</th><th>Per 100 sq inch ({subscriber?.currency_symbol})</th><th>Action</th></tr></thead>
                <tbody>
                  {lamRates.map(rate=>{
                    const isEditing=editingLam?.id===rate.id;
                    return (
                      <tr key={rate.id}>
                        <td style={{fontWeight:500}}>{LAM_LABELS[rate.lam_type]||rate.lam_type}</td>
                        <td>{isEditing?<input type="number" value={editingLam.minimum_charge} onChange={e=>setEditingLam({...editingLam,minimum_charge:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace'}}>{subscriber?.currency_symbol}{rate.minimum_charge}</span>}</td>
                        <td>{isEditing?<input type="number" value={editingLam.per_100_sqinch} onChange={e=>setEditingLam({...editingLam,per_100_sqinch:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace'}}>{subscriber?.currency_symbol}{rate.per_100_sqinch}</span>}</td>
                        <td>{isEditing?<><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}} onClick={()=>saveLam(editingLam)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditingLam(null)}>Cancel</button></>:<button className="btn-sm" onClick={()=>setEditingLam(rate)}>Edit</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* UV RATES */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
              <div className="section-header"><p className="section-title">UV / Coating Rates</p></div>
              <table className="table">
                <thead><tr><th>UV / Coating Type</th><th>Minimum Charge ({subscriber?.currency_symbol})</th><th>Per 100 sq inch ({subscriber?.currency_symbol})</th><th>Action</th></tr></thead>
                <tbody>
                  {uvRates.map(rate=>{
                    const isEditing=editingUV?.id===rate.id;
                    return (
                      <tr key={rate.id}>
                        <td style={{fontWeight:500}}>{UV_LABELS[rate.uv_type]||rate.uv_type}</td>
                        <td>{isEditing?<input type="number" value={editingUV.minimum_charge} onChange={e=>setEditingUV({...editingUV,minimum_charge:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace'}}>{subscriber?.currency_symbol}{rate.minimum_charge}</span>}</td>
                        <td>{isEditing?<input type="number" value={editingUV.per_100_sqinch} onChange={e=>setEditingUV({...editingUV,per_100_sqinch:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace'}}>{subscriber?.currency_symbol}{rate.per_100_sqinch}</span>}</td>
                        <td>{isEditing?<><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}} onClick={()=>saveUV(editingUV)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditingUV(null)}>Cancel</button></>:<button className="btn-sm" onClick={()=>setEditingUV(rate)}>Edit</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BINDING RATES */}
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="section-header"><p className="section-title">Binding Rates</p></div>
              <table className="table">
                <thead><tr><th>Binding Type</th><th>Per Binding Format ({subscriber?.currency_symbol})</th><th>Action</th></tr></thead>
                <tbody>
                  {bindingRates.map(rate=>{
                    const isEditing=editingBind?.id===rate.id;
                    return (
                      <tr key={rate.id}>
                        <td style={{fontWeight:500}}>{BINDING_LABELS[rate.binding_type]||rate.binding_type}</td>
                        <td>{isEditing?<input type="number" value={editingBind.per_binding_format} onChange={e=>setEditingBind({...editingBind,per_binding_format:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace'}}>{subscriber?.currency_symbol}{rate.per_binding_format}</span>}</td>
                        <td>{isEditing?<><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}} onClick={()=>saveBind(editingBind)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditingBind(null)}>Cancel</button></>:<button className="btn-sm" onClick={()=>setEditingBind(rate)}>Edit</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMERS */}
        {activeTab==='customers'&&!selectedCustomer&&(
          <div>
            <div className="coming-box">⚡ Customer login portal coming in next phase. Sample data shown.</div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="section-header"><p className="section-title">All Customers ({SAMPLE_CUSTOMERS.length})</p><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}}>+ Add Customer</button></div>
              <table className="table">
                <thead><tr><th>Customer</th><th>Contact</th><th>Quotes</th><th>Orders</th><th>Last Active</th><th>Action</th></tr></thead>
                <tbody>
                  {SAMPLE_CUSTOMERS.map(c=>(
                    <tr key={c.id} style={{cursor:'pointer'}} onClick={()=>setSelectedCustomer(c)}>
                      <td><div style={{display:'flex',alignItems:'center',gap:10}}><div className="avatar">{c.name[0]}</div><div><p style={{fontWeight:500}}>{c.name}</p><p style={{fontSize:11,color:'#AAA'}}>{c.company}</p></div></div></td>
                      <td><p style={{fontSize:12}}>{c.email}</p><p style={{fontSize:12,color:'#AAA'}}>{c.phone}</p></td>
                      <td style={{fontFamily:'monospace',fontWeight:500}}>{c.total_quotes}</td>
                      <td style={{fontFamily:'monospace',fontWeight:500}}>{c.total_orders}</td>
                      <td style={{fontSize:12,color:'#888'}}>{c.last_active}</td>
                      <td><button className="btn-sm">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMER DETAIL */}
        {activeTab==='customers'&&selectedCustomer&&(
          <div>
            <button className="back-btn" onClick={()=>setSelectedCustomer(null)}>← Back to customers</button>
            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}><div className="avatar" style={{width:48,height:48,fontSize:18}}>{selectedCustomer.name[0]}</div><div><p style={{fontSize:18,fontWeight:600}}>{selectedCustomer.name}</p><p style={{fontSize:13,color:'#888'}}>{selectedCustomer.company}</p></div></div>
              <table style={{width:'100%',fontSize:13}}><tbody>{[['Email',selectedCustomer.email],['Phone',selectedCustomer.phone],['Total Quotes',selectedCustomer.total_quotes],['Total Orders',selectedCustomer.total_orders],['Last Active',selectedCustomer.last_active]].map(([k,v])=><tr key={k as string} style={{borderBottom:'1px solid #F5F5F5'}}><td style={{padding:'10px 0',color:'#888',width:'40%'}}>{k}</td><td style={{padding:'10px 0',fontWeight:500}}>{v}</td></tr>)}</tbody></table>
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="section-header"><p className="section-title">Quote History</p></div>
              <table className="table"><thead><tr><th>Quote ID</th><th>Paper</th><th>Qty</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>{SAMPLE_QUOTES.filter(q=>q.customer===selectedCustomer.name).map(q=><tr key={q.id}><td style={{fontFamily:'monospace',color:'#888',fontSize:12}}>{q.id}</td><td>{q.paper}</td><td style={{fontFamily:'monospace'}}>{q.qty.toLocaleString()}</td><td style={{fontFamily:'monospace',fontWeight:500}}>{q.amount}</td><td style={{fontSize:12,color:'#888'}}>{q.date}</td><td><SBadge status={q.status}/></td></tr>)}</tbody></table>
            </div>
          </div>
        )}

        {/* QUOTES */}
        {activeTab==='quotes'&&(
          <div>
            <div className="coming-box">⚡ Quote generation and PDF export coming in next phase. Sample data shown.</div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="section-header"><p className="section-title">All Quotes ({SAMPLE_QUOTES.length})</p><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}}>+ New Quote</button></div>
              <table className="table"><thead><tr><th>Quote ID</th><th>Customer</th><th>Paper</th><th>Qty</th><th>Amount</th><th>Date</th><th>Status</th><th>PDF</th></tr></thead>
              <tbody>{SAMPLE_QUOTES.map(q=><tr key={q.id}><td style={{fontFamily:'monospace',color:'#888',fontSize:12}}>{q.id}</td><td style={{fontWeight:500}}>{q.customer}</td><td style={{fontSize:12}}>{q.paper}</td><td style={{fontFamily:'monospace'}}>{q.qty.toLocaleString()}</td><td style={{fontFamily:'monospace',fontWeight:500}}>{q.amount}</td><td style={{fontSize:12,color:'#888'}}>{q.date}</td><td><SBadge status={q.status}/></td><td><button className="btn-sm">↓ PDF</button></td></tr>)}</tbody></table>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {activeTab==='orders'&&(
          <div>
            <div className="coming-box">⚡ Live order management coming in next phase. Sample data shown.</div>
            <div className="stat-grid-3">
              {[{label:'In Production',value:'1',color:'#185FA5'},{label:'Ready for Pickup',value:'1',color:'#6B46C1'},{label:'Delivered',value:'1',color:'#38A169'}].map(s=><div key={s.label} className="stat-card"><p className="stat-label">{s.label}</p><p className="stat-value" style={{color:s.color}}>{s.value}</p></div>)}
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="section-header"><p className="section-title">All Orders ({SAMPLE_ORDERS.length})</p></div>
              <table className="table"><thead><tr><th>Order ID</th><th>Customer</th><th>Paper</th><th>Qty</th><th>Amount</th><th>Date</th><th>Status</th><th>Update</th></tr></thead>
              <tbody>{SAMPLE_ORDERS.map(o=><tr key={o.id}><td style={{fontFamily:'monospace',color:'#888',fontSize:12}}>{o.id}</td><td style={{fontWeight:500}}>{o.customer}</td><td style={{fontSize:12}}>{o.paper}</td><td style={{fontFamily:'monospace'}}>{o.qty.toLocaleString()}</td><td style={{fontFamily:'monospace',fontWeight:500}}>{o.amount}</td><td style={{fontSize:12,color:'#888'}}>{o.date}</td><td><SBadge status={o.status}/></td><td><select className="select-sm"><option>Pending</option><option>In Production</option><option>Ready</option><option>Delivered</option></select></td></tr>)}</tbody></table>
            </div>
          </div>
        )}

        {/* PAPER RATES */}
        {activeTab==='rates'&&(
          <div>
            <div className="info-box">💡 One rate per kg for each paper category — applies to all GSM variants. Customers never see these rates.</div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="section-header"><p className="section-title">Paper Category Rates</p><p style={{fontSize:12,color:'#AAA'}}>{paperCategories.length} categories</p></div>
              <table className="table"><thead><tr><th>Paper Category</th><th>GSM Range</th><th>Rate per kg ({subscriber?.currency_symbol})</th><th>Action</th></tr></thead>
              <tbody>{paperCategories.map(cat=>{
                const isE=editingCat?.id===cat.id;
                return <tr key={cat.id}><td style={{fontWeight:500}}>{cat.category}</td><td><span className="gsm-range">{GSM_RANGES[cat.category]||'—'}</span></td><td>{isE?<input type="number" value={editingCat.rate_per_kg} onChange={e=>setEditingCat({...editingCat,rate_per_kg:parseFloat(e.target.value)})} style={{width:100}}/>:<span style={{fontFamily:'monospace',fontWeight:500}}>{subscriber?.currency_symbol}{cat.rate_per_kg.toFixed(2)}/kg</span>}</td><td>{isE?<><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}} onClick={()=>saveCat(editingCat)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditingCat(null)}>Cancel</button></>:<button className="btn-sm" onClick={()=>setEditingCat(cat)}>Edit rate</button>}</td></tr>;
              })}</tbody></table>
            </div>
          </div>
        )}

        {/* STOCK MANAGEMENT */}
        {activeTab==='stocks'&&(
          <div>
            <div className="info-box">💡 Stock tracking is optional. Enter stock in kg — auto marks out of stock when depleted.</div>
            {stockCats.map(cat=>(
              <div key={cat as string} className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
                <div className="section-header"><p className="section-title">{cat as string} &nbsp;<span className="gsm-range">{GSM_RANGES[cat as string]||''}</span></p></div>
                <table className="table"><thead><tr><th>Paper</th><th>GSM</th><th>Packing</th><th>Stock (kg)</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{paperStocks.filter((p:any)=>p.category===cat).map((stock:any)=>{
                  const isE=editingStock?.id===stock.id;
                  return <tr key={stock.id}>{isE?<><td>{stock.label}</td><td>{stock.gsm}</td><td><input type="number" value={editingStock.packing_size} onChange={e=>setEditingStock({...editingStock,packing_size:parseInt(e.target.value)})} style={{width:70}}/></td><td><input type="number" value={editingStock.stock_qty??''} placeholder="Optional" onChange={e=>setEditingStock({...editingStock,stock_qty:e.target.value?parseFloat(e.target.value):null})} style={{width:100}}/></td><td><select className="select-sm" value={editingStock.in_stock?'true':'false'} onChange={e=>setEditingStock({...editingStock,in_stock:e.target.value==='true'})}><option value="true">In Stock</option><option value="false">Out of Stock</option></select></td><td><button className="btn-primary" style={{padding:'6px 14px',fontSize:12}} onClick={()=>saveStock(editingStock)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditingStock(null)}>Cancel</button></td></>:<><td>{stock.label}</td><td style={{fontFamily:'monospace'}}>{stock.gsm}</td><td style={{fontFamily:'monospace'}}>{stock.packing_size} sh</td><td style={{fontFamily:'monospace',color:stock.stock_qty?'#1A1A1A':'#CCC'}}>{stock.stock_qty?`${stock.stock_qty} kg`:'—'}</td><td>{stock.in_stock?<span className="badge-in">In Stock</span>:<span className="badge-out">Out of Stock</span>}</td><td><button className="btn-sm" onClick={()=>setEditingStock(stock)}>Edit</button></td></>}</tr>;
                })}</tbody></table>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {activeTab==='settings'&&subscriber&&(
          <div>
            <div className="card">
              <p className="card-title">Business settings</p>
              <p className="card-sub">These settings affect all price calculations</p>
              <div className="field"><label>Business name</label><input type="text" value={subscriber.business_name||''} onChange={e=>setSubscriber({...subscriber,business_name:e.target.value})} style={{width:'100%'}}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="field"><label>Markup %</label><input type="number" value={subscriber.markup_percent} onChange={e=>setSubscriber({...subscriber,markup_percent:parseFloat(e.target.value)})} style={{width:'100%'}}/></div>
                <div className="field"><label>Tax / GST %</label><input type="number" value={subscriber.tax_percent} onChange={e=>setSubscriber({...subscriber,tax_percent:parseFloat(e.target.value)})} style={{width:'100%'}}/></div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginTop:8}}>
                <button className="btn-primary" onClick={saveSettings} disabled={saving}>{saving?'Saving...':'Save settings'}</button>
                {saveMsg&&<span className="save-msg">✓ {saveMsg}</span>}
              </div>
            </div>
            <div className="card">
              <p className="card-title">Account</p>
              <p style={{fontSize:13,color:'#888',marginBottom:16}}>Logged in as <strong style={{color:'#1A1A1A'}}>{subscriber.email}</strong></p>
              <button className="btn-danger" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
