'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const GSM_RANGES: Record<string,string> = {
  'Maplitho':'60 GSM – 80 GSM','Art Paper':'80 GSM – 130 GSM','Art Card':'170 GSM – 230 GSM',
  'Art Card Heavy':'250 GSM – 380 GSM','Art Card Extra Heavy':'400 GSM – 500 GSM',
  'FBB / Ultima / SBS':'200 GSM – 400 GSM','Duplex Grey Back':'200 GSM – 400 GSM','Duplex White Back':'200 GSM – 400 GSM',
};

const SC:Record<string,string>={Draft:'#888',Sent:'#185FA5',Converted:'#38A169',Expired:'#E53E3E',Pending:'#D97706','In Production':'#185FA5',Ready:'#6B46C1',Delivered:'#38A169'};
const SBG:Record<string,string>={Draft:'#F5F5F5',Sent:'#EEF4FA',Converted:'#F0FFF4',Expired:'#FFF0F0',Pending:'#FFFBEB','In Production':'#EEF4FA',Ready:'#F5F0FF',Delivered:'#F0FFF4'};

// ─── CUSTOMER TAB COMPONENT ───────────────────────────────────────────
function CustomerTab({sub,subId,sym,paperCats,printRates,lamRates,uvRates,IS}:any){
  const [customers,setCustomers]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [selCust,setSelCust]=useState<any>(null);
  const [showAdd,setShowAdd]=useState(false);
  const [custRates,setCustRates]=useState<any[]>([]);
  const [savingRate,setSavingRate]=useState(false);
  const [saveMsg,setSaveMsg]=useState('');
  const [newCust,setNewCust]=useState({name:'',email:'',phone:'',company:'',markup_percent:''});
  const [adding,setAdding]=useState(false);
  const [activeRateTab,setActiveRateTab]=useState<'default'|'paper'|'printing'|'lam'>('default');
  // Store edits as objects keyed by rate key — no hooks in loops
  const [paperEdits,setPaperEdits]=useState<Record<string,number>>({});
  const [printFixedEdits,setPrintFixedEdits]=useState<Record<string,number>>({});
  const [printPerEdits,setPrintPerEdits]=useState<Record<string,number>>({});
  const [lamEdits,setLamEdits]=useState<Record<string,number>>({});
  const [uvEdits,setUvEdits]=useState<Record<string,number>>({});

  const saved=(m:string)=>{setSaveMsg(m);setTimeout(()=>setSaveMsg(''),2500);};
  const IS2:any={padding:'7px 10px',border:'1.5px solid #E8E8E8',borderRadius:8,fontSize:13,fontFamily:'DM Sans,sans-serif',color:'#1A1A1A',background:'#FAFAFA',outline:'none',width:'100%'};

  useEffect(()=>{
    if(!subId)return;
    supabase.from('customers').select('*').eq('subscriber_id',subId).order('created_at',{ascending:false})
      .then(({data})=>{ setCustomers(data||[]); setLoading(false); });
  },[subId]);

  const loadCustRates=async(custId:string)=>{
    const {data}=await supabase.from('customer_rates').select('*').eq('customer_id',custId);
    const rates=data||[];
    setCustRates(rates);
    // Pre-populate edit fields with existing custom values
    const pe:Record<string,number>={};
    const pfe:Record<string,number>={};
    const ppe:Record<string,number>={};
    const le:Record<string,number>={};
    const ue:Record<string,number>={};
    rates.forEach((r:any)=>{
      if(r.rate_type==='paper') pe[r.rate_key]=r.custom_value;
      if(r.rate_type==='print_fixed') pfe[r.rate_key]=r.custom_value;
      if(r.rate_type==='print_per1000') ppe[r.rate_key]=r.custom_value;
      if(r.rate_type==='lam') le[r.rate_key]=r.custom_value;
      if(r.rate_type==='uv') ue[r.rate_key]=r.custom_value;
    });
    setPaperEdits(pe);setPrintFixedEdits(pfe);setPrintPerEdits(ppe);setLamEdits(le);setUvEdits(ue);
  };

  const selectCust=async(c:any)=>{
    setSelCust(c);
    await loadCustRates(c.id);
    setActiveRateTab('default');
  };

  const addCustomer=async()=>{
    if(!newCust.name||!newCust.email)return;
    setAdding(true);
    const {data}=await supabase.from('customers').insert({
      subscriber_id:subId,
      name:newCust.name,email:newCust.email,phone:newCust.phone,
      company:newCust.company,
      markup_percent:newCust.markup_percent?parseFloat(newCust.markup_percent):null,
    }).select().single();
    if(data){setCustomers(p=>[data,...p]);setNewCust({name:'',email:'',phone:'',company:'',markup_percent:''});setShowAdd(false);saved('Customer added!');}
    setAdding(false);
  };

  const getCustRate=(type:string,key:string)=>{
    const r=custRates.find((x:any)=>x.rate_type===type&&x.rate_key===key);
    return r?r.custom_value:null;
  };

  const saveCustRate=async(type:string,key:string,value:number)=>{
    if(!value&&value!==0)return;
    setSavingRate(true);
    const existing=custRates.find((x:any)=>x.rate_type===type&&x.rate_key===key);
    if(existing){
      await supabase.from('customer_rates').update({custom_value:value}).eq('id',existing.id);
      setCustRates(p=>p.map((x:any)=>x.id===existing.id?{...x,custom_value:value}:x));
    } else {
      const {data}=await supabase.from('customer_rates').insert({
        subscriber_id:subId,customer_id:selCust.id,rate_type:type,rate_key:key,custom_value:value
      }).select().single();
      if(data)setCustRates(p=>[...p,data]);
    }
    saved('Rate saved!');setSavingRate(false);
  };

  const deleteCustRate=async(type:string,key:string)=>{
    const existing=custRates.find((x:any)=>x.rate_type===type&&x.rate_key===key);
    if(existing){
      await supabase.from('customer_rates').delete().eq('id',existing.id);
      setCustRates(p=>p.filter((x:any)=>x.id!==existing.id));
      saved('Reset to default!');
    }
  };

  const saveMarkup=async()=>{
    setSavingRate(true);
    const markup=selCust.markup_percent?parseFloat(selCust.markup_percent):null;
    await supabase.from('customers').update({markup_percent:markup,notes:selCust.notes||''}).eq('id',selCust.id);
    setCustomers(p=>p.map((x:any)=>x.id===selCust.id?{...x,markup_percent:markup,notes:selCust.notes}:x));
    saved('Saved!');setSavingRate(false);
  };

  const embedUrl=typeof window!=='undefined'?`${window.location.origin}/embed/${subId}?c=${selCust?.id}`:'';

  if(loading)return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading customers...</div>;

  // ── CUSTOMER DETAIL VIEW ──────────────────────────────────────────
  if(selCust)return(
    <div>
      <button className="back-btn" onClick={()=>{setSelCust(null);setCustRates([]);}}>← Back to customers</button>
      {saveMsg&&<p style={{color:'#38A169',fontSize:13,marginBottom:12}}>✓ {saveMsg}</p>}

      {/* Customer header */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
          <div className="avatar" style={{width:48,height:48,fontSize:18,background:'#C84B31'}}>{selCust.name[0]}</div>
          <div style={{flex:1}}>
            <p style={{fontSize:18,fontWeight:600,color:'#1A1A1A'}}>{selCust.name}</p>
            <p style={{fontSize:13,color:'#888'}}>{selCust.company||selCust.email}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:11,color:'#AAA',marginBottom:4}}>Customer calculator link</p>
            <button className="btn-primary" style={{fontSize:11,padding:'6px 12px'}} onClick={()=>{navigator.clipboard.writeText(embedUrl).then(()=>alert('Link copied! Share with '+selCust.name));}}>
              📋 Copy link
            </button>
          </div>
        </div>
        <div style={{background:'#F9F9F9',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#888',fontFamily:'monospace',wordBreak:'break-all' as const}}>
          {embedUrl}
        </div>
      </div>

      {/* Rate tabs */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap' as const}}>
        {[{id:'default',l:'⚙️ Markup'},{id:'paper',l:'📄 Paper Rates'},{id:'printing',l:'🖨️ Printing Rates'},{id:'lam',l:'✨ Lam & UV'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveRateTab(t.id as any)} style={{padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',border:'1.5px solid',borderColor:activeRateTab===t.id?'#1A1A1A':'#E8E8E8',background:activeRateTab===t.id?'#1A1A1A':'#fff',color:activeRateTab===t.id?'#fff':'#666'}}>{t.l}</button>
        ))}
      </div>

      {/* ── MARKUP ── */}
      {activeRateTab==='default'&&(
        <div className="card">
          <p style={{fontSize:13,fontWeight:600,marginBottom:16}}>Settings for {selCust.name}</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:6}}>Custom Markup % (blank = use default {sub?.markup_percent}%)</label>
              <input type="number" placeholder={`${sub?.markup_percent}`} value={selCust.markup_percent||''} onChange={e=>setSelCust({...selCust,markup_percent:e.target.value})} style={IS2}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:500,color:'#888',marginBottom:6}}>Notes (internal only)</label>
              <input type="text" placeholder="e.g. Bulk customer..." value={selCust.notes||''} onChange={e=>setSelCust({...selCust,notes:e.target.value})} style={IS2}/>
            </div>
          </div>
          <button className="btn-primary" onClick={saveMarkup} disabled={savingRate}>{savingRate?'Saving...':'Save'}</button>
          <div style={{marginTop:16,padding:12,background:'#FFFBEB',borderRadius:8,border:'1px solid #FDE68A',fontSize:12,color:'#92400E',lineHeight:1.7}}>
            ℹ️ Custom rates in other tabs override your defaults for this customer only. Blank = uses your default rate.
          </div>
        </div>
      )}

      {/* ── PAPER RATES ── */}
      {activeRateTab==='paper'&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="sh"><p className="st">Paper Rates for {selCust.name}</p><span style={{fontSize:11,color:'#888'}}>Blank = your default rate</span></div>
          <table className="table">
            <thead><tr><th>Category</th><th>Your Default</th><th>Custom for {selCust.name}</th><th>Action</th></tr></thead>
            <tbody>
              {paperCats.map((cat:any)=>{
                const key=cat.category;
                const customVal=getCustRate('paper',key);
                return(
                  <tr key={cat.id}>
                    <td style={{fontWeight:500}}>{cat.category}</td>
                    <td style={{fontFamily:'monospace',color:'#888'}}>{sym}{cat.rate_per_kg}/kg</td>
                    <td><input type="number" placeholder={`${cat.rate_per_kg}`} value={paperEdits[key]??''} onChange={e=>setPaperEdits(p=>({...p,[key]:parseFloat(e.target.value)}))} style={{...IS2,width:130}}/></td>
                    <td>
                      <button className="btn-primary" style={{fontSize:11,padding:'5px 12px'}} disabled={savingRate} onClick={()=>saveCustRate('paper',key,paperEdits[key])}>Save</button>
                      {customVal!==null&&<button className="btn-del" style={{fontSize:11,marginLeft:4}} onClick={()=>{setPaperEdits(p=>{const n={...p};delete n[key];return n;});deleteCustRate('paper',key);}}>Reset</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PRINTING RATES ── */}
      {activeRateTab==='printing'&&(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="sh"><p className="st">Printing Rates for {selCust.name}</p></div>
          <table className="table">
            <thead><tr><th>Plate / Color</th><th>Default Fixed</th><th>Custom Fixed</th><th>Default /1000</th><th>Custom /1000</th><th>Action</th></tr></thead>
            <tbody>
              {printRates.map((r:any)=>{
                const key=`${r.plate_name}__${r.color_option}`;
                const hasCustom=getCustRate('print_fixed',key)!==null||getCustRate('print_per1000',key)!==null;
                return(
                  <tr key={r.id}>
                    <td><span style={{fontWeight:500}}>{r.plate_name}</span><br/><span style={{fontSize:11,color:'#888'}}>{r.color_option}</span></td>
                    <td style={{fontFamily:'monospace',color:'#888'}}>{sym}{r.fixed_charge}</td>
                    <td><input type="number" placeholder={`${r.fixed_charge}`} value={printFixedEdits[key]??''} onChange={e=>setPrintFixedEdits(p=>({...p,[key]:parseFloat(e.target.value)}))} style={{...IS2,width:90}}/></td>
                    <td style={{fontFamily:'monospace',color:'#888'}}>{sym}{r.per_1000_impression}</td>
                    <td><input type="number" placeholder={`${r.per_1000_impression}`} value={printPerEdits[key]??''} onChange={e=>setPrintPerEdits(p=>({...p,[key]:parseFloat(e.target.value)}))} style={{...IS2,width:90}}/></td>
                    <td>
                      <button className="btn-primary" style={{fontSize:11,padding:'5px 10px'}} disabled={savingRate} onClick={()=>{
                        if(printFixedEdits[key])saveCustRate('print_fixed',key,printFixedEdits[key]);
                        if(printPerEdits[key])saveCustRate('print_per1000',key,printPerEdits[key]);
                      }}>Save</button>
                      {hasCustom&&<button className="btn-del" style={{fontSize:11,marginLeft:4}} onClick={()=>{
                        setPrintFixedEdits(p=>{const n={...p};delete n[key];return n;});
                        setPrintPerEdits(p=>{const n={...p};delete n[key];return n;});
                        deleteCustRate('print_fixed',key);deleteCustRate('print_per1000',key);
                      }}>Reset</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LAM & UV ── */}
      {activeRateTab==='lam'&&(
        <div>
          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:12}}>
            <div className="sh"><p className="st">Lamination Rates for {selCust.name}</p></div>
            <table className="table">
              <thead><tr><th>Type</th><th>Default /100sqin</th><th>Custom /100sqin</th><th>Action</th></tr></thead>
              <tbody>
                {lamRates.map((r:any)=>{
                  const key=r.lam_name;
                  const hasCustom=getCustRate('lam',key)!==null;
                  return(
                    <tr key={r.id}>
                      <td style={{fontWeight:500}}>{r.lam_name}</td>
                      <td style={{fontFamily:'monospace',color:'#888'}}>{sym}{r.per_100_sqinch}</td>
                      <td><input type="number" placeholder={`${r.per_100_sqinch}`} value={lamEdits[key]??''} onChange={e=>setLamEdits(p=>({...p,[key]:parseFloat(e.target.value)}))} style={{...IS2,width:120}}/></td>
                      <td>
                        <button className="btn-primary" style={{fontSize:11,padding:'5px 12px'}} disabled={savingRate} onClick={()=>saveCustRate('lam',key,lamEdits[key])}>Save</button>
                        {hasCustom&&<button className="btn-del" style={{fontSize:11,marginLeft:4}} onClick={()=>{setLamEdits(p=>{const n={...p};delete n[key];return n;});deleteCustRate('lam',key);}}>Reset</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="sh"><p className="st">UV Rates for {selCust.name}</p></div>
            <table className="table">
              <thead><tr><th>Type</th><th>Default /100sqin</th><th>Custom /100sqin</th><th>Action</th></tr></thead>
              <tbody>
                {uvRates.map((r:any)=>{
                  const key=r.uv_name;
                  const hasCustom=getCustRate('uv',key)!==null;
                  return(
                    <tr key={r.id}>
                      <td style={{fontWeight:500}}>{r.uv_name}</td>
                      <td style={{fontFamily:'monospace',color:'#888'}}>{sym}{r.per_100_sqinch}</td>
                      <td><input type="number" placeholder={`${r.per_100_sqinch}`} value={uvEdits[key]??''} onChange={e=>setUvEdits(p=>({...p,[key]:parseFloat(e.target.value)}))} style={{...IS2,width:120}}/></td>
                      <td>
                        <button className="btn-primary" style={{fontSize:11,padding:'5px 12px'}} disabled={savingRate} onClick={()=>saveCustRate('uv',key,uvEdits[key])}>Save</button>
                        {hasCustom&&<button className="btn-del" style={{fontSize:11,marginLeft:4}} onClick={()=>{setUvEdits(p=>{const n={...p};delete n[key];return n;});deleteCustRate('uv',key);}}>Reset</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ── CUSTOMER LIST VIEW ─────────────────────────────────────────────
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <p style={{fontSize:18,fontWeight:600}}>Customers</p>
          <p style={{fontSize:13,color:'#888'}}>{customers.length} customers · Each gets their own calculator link</p>
        </div>
        <button className="btn-primary" onClick={()=>setShowAdd(!showAdd)}>+ Add Customer</button>
      </div>

      {saveMsg&&<p style={{color:'#38A169',fontSize:13,marginBottom:12}}>✓ {saveMsg}</p>}

      {showAdd&&(
        <div className="card" style={{marginBottom:16,border:'1.5px solid #C84B31'}}>
          <p style={{fontSize:14,fontWeight:600,marginBottom:14}}>Add New Customer</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={{display:'block',fontSize:12,color:'#888',marginBottom:4}}>Name *</label><input type="text" placeholder="Raj Shah" value={newCust.name} onChange={e=>setNewCust({...newCust,name:e.target.value})} style={IS2}/></div>
            <div><label style={{display:'block',fontSize:12,color:'#888',marginBottom:4}}>Email *</label><input type="email" placeholder="raj@example.com" value={newCust.email} onChange={e=>setNewCust({...newCust,email:e.target.value})} style={IS2}/></div>
            <div><label style={{display:'block',fontSize:12,color:'#888',marginBottom:4}}>Phone</label><input type="text" placeholder="+91 98765 43210" value={newCust.phone} onChange={e=>setNewCust({...newCust,phone:e.target.value})} style={IS2}/></div>
            <div><label style={{display:'block',fontSize:12,color:'#888',marginBottom:4}}>Company</label><input type="text" placeholder="Company name" value={newCust.company} onChange={e=>setNewCust({...newCust,company:e.target.value})} style={IS2}/></div>
            <div><label style={{display:'block',fontSize:12,color:'#888',marginBottom:4}}>Custom Markup % (optional)</label><input type="number" placeholder={`Default: ${sub?.markup_percent}%`} value={newCust.markup_percent} onChange={e=>setNewCust({...newCust,markup_percent:e.target.value})} style={IS2}/></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-primary" onClick={addCustomer} disabled={adding}>{adding?'Adding...':'Add Customer'}</button>
            <button className="btn-cancel" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {customers.length===0?(
        <div className="card" style={{textAlign:'center',padding:48}}>
          <p style={{fontSize:32,marginBottom:12}}>👥</p>
          <p style={{fontSize:16,fontWeight:600,marginBottom:8}}>No customers yet</p>
          <p style={{fontSize:13,color:'#888',marginBottom:20}}>Add customers to give them their own calculator link with custom rates</p>
          <button className="btn-primary" onClick={()=>setShowAdd(true)}>+ Add First Customer</button>
        </div>
      ):(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="sh"><p className="st">All Customers ({customers.length})</p></div>
          <table className="table">
            <thead><tr><th>Customer</th><th>Contact</th><th>Markup</th><th>Calculator Link</th><th>Action</th></tr></thead>
            <tbody>
              {customers.map((c:any)=>(
                <tr key={c.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:10}}><div className="avatar">{c.name[0]}</div><div><p style={{fontWeight:500}}>{c.name}</p><p style={{fontSize:11,color:'#AAA'}}>{c.company||'—'}</p></div></div></td>
                  <td><p style={{fontSize:12}}>{c.email}</p><p style={{fontSize:12,color:'#AAA'}}>{c.phone||'—'}</p></td>
                  <td><span style={{fontFamily:'monospace',fontWeight:500}}>{c.markup_percent!=null?`${c.markup_percent}%`:`${sub?.markup_percent}% (default)`}</span></td>
                  <td><button style={{fontSize:11,padding:'4px 10px',background:'#EEF4FA',color:'#185FA5',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{const url=`${window.location.origin}/embed/${subId}?c=${c.id}`;navigator.clipboard.writeText(url).then(()=>alert(`Link copied for ${c.name}!`));}}>📋 Copy link</button></td>
                  <td><button className="btn-sm" onClick={()=>selectCust(c)}>Manage Rates →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [sub,setSub]=useState<any>(null);
  const [paperCats,setPaperCats]=useState<any[]>([]);
  const [paperStocks,setPaperStocks]=useState<any[]>([]);
  const [printRates,setPrintRates]=useState<any[]>([]);
  const [lamRates,setLamRates]=useState<any[]>([]);
  const [uvRates,setUvRates]=useState<any[]>([]);
  const [bindRates,setBindRates]=useState<any[]>([]);
  const [colorOpts,setColorOpts]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('overview');
  const [saving,setSaving]=useState(false);
  const [saveMsg,setSaveMsg]=useState('');
  const [selCust,setSelCust]=useState<any>(null);
  // live data
  const [liveOrders,setLiveOrders]=useState<any[]>([]);
  const [liveQuotes,setLiveQuotes]=useState<any[]>([]);
  // editing states
  const [editCat,setEditCat]=useState<any>(null);
  const [editStock,setEditStock]=useState<any>(null);
  const [editPrint,setEditPrint]=useState<any>(null);
  const [editLam,setEditLam]=useState<any>(null);
  const [editUV,setEditUV]=useState<any>(null);
  const [editBind,setEditBind]=useState<any>(null);
  const [editColor,setEditColor]=useState<any>(null);
  // add new states
  const [addPrint,setAddPrint]=useState(false);
  const [addLam,setAddLam]=useState(false);
  const [addUV,setAddUV]=useState(false);
  const [addBind,setAddBind]=useState(false);
  const [addColor,setAddColor]=useState(false);
  const [newPrint,setNewPrint]=useState({plate_name:'',color_option:'',fixed_charge:'',per_1000_impression:''});
  const [newLam,setNewLam]=useState({lam_name:'',minimum_charge:'',per_100_sqinch:''});
  const [newUV,setNewUV]=useState({uv_name:'',minimum_charge:'',per_100_sqinch:''});
  const [newBind,setNewBind]=useState({binding_name:'',per_binding_format:''});
  const [newColor,setNewColor]=useState({color_name:''});

  useEffect(()=>{load();},[]);

  const load=async()=>{
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href='/login';return;}
    const {data:profile}=await supabase.from('subscribers').select('*').eq('id',user.id).single();
    if(profile)setSub(profile);
    const [{data:cats},{data:stocks},{data:pr},{data:lr},{data:ur},{data:br},{data:co}]=await Promise.all([
      supabase.from('paper_categories').select('*').eq('subscriber_id',user.id).order('category'),
      supabase.from('paper_stocks').select('*').eq('subscriber_id',user.id).order('sort_order'),
      supabase.from('printing_rates').select('*').eq('subscriber_id',user.id).order('sort_order'),
      supabase.from('lamination_rates').select('*').eq('subscriber_id',user.id).order('sort_order'),
      supabase.from('uv_rates').select('*').eq('subscriber_id',user.id).order('sort_order'),
      supabase.from('binding_rates').select('*').eq('subscriber_id',user.id).order('sort_order'),
      supabase.from('color_options').select('*').eq('subscriber_id',user.id).order('sort_order'),
    ]);
    setPaperCats(cats||[]);setPaperStocks(stocks||[]);setPrintRates(pr||[]);
    setLamRates(lr||[]);setUvRates(ur||[]);setBindRates(br||[]);setColorOpts(co||[]);
    // load live orders + quotes for overview
    const [{data:ord},{data:quo}]=await Promise.all([
      supabase.from('orders').select('*').eq('subscriber_id',user.id).order('created_at',{ascending:false}),
      supabase.from('quotes').select('*').eq('subscriber_id',user.id).order('created_at',{ascending:false}),
    ]);
    setLiveOrders(ord||[]);
    setLiveQuotes(quo||[]);
    setLoading(false);
  };

  const logout=async()=>{await supabase.auth.signOut();window.location.href='/login';};
  const saved=(m:string)=>{setSaveMsg(m);setTimeout(()=>setSaveMsg(''),2500);};

  // Save helpers
  const saveCat=async(r:any)=>{setSaving(true);await supabase.from('paper_categories').update({rate_per_kg:r.rate_per_kg}).eq('id',r.id);setPaperCats(p=>p.map(x=>x.id===r.id?r:x));saved('Saved!');setSaving(false);setEditCat(null);};
  const saveStock=async(r:any)=>{setSaving(true);await supabase.from('paper_stocks').update({packing_size:r.packing_size,in_stock:r.in_stock,stock_qty:r.stock_qty}).eq('id',r.id);setPaperStocks(p=>p.map(x=>x.id===r.id?r:x));saved('Saved!');setSaving(false);setEditStock(null);};
  const savePrint=async(r:any)=>{setSaving(true);await supabase.from('printing_rates').update({plate_name:r.plate_name,color_option:r.color_option,fixed_charge:r.fixed_charge,per_1000_impression:r.per_1000_impression}).eq('id',r.id);setPrintRates(p=>p.map(x=>x.id===r.id?r:x));saved('Saved!');setSaving(false);setEditPrint(null);};
  const saveLam=async(r:any)=>{setSaving(true);await supabase.from('lamination_rates').update({lam_name:r.lam_name,minimum_charge:r.minimum_charge,per_100_sqinch:r.per_100_sqinch}).eq('id',r.id);setLamRates(p=>p.map(x=>x.id===r.id?r:x));saved('Saved!');setSaving(false);setEditLam(null);};
  const saveUV=async(r:any)=>{setSaving(true);await supabase.from('uv_rates').update({uv_name:r.uv_name,minimum_charge:r.minimum_charge,per_100_sqinch:r.per_100_sqinch}).eq('id',r.id);setUvRates(p=>p.map(x=>x.id===r.id?r:x));saved('Saved!');setSaving(false);setEditUV(null);};
  const saveBind=async(r:any)=>{setSaving(true);await supabase.from('binding_rates').update({binding_name:r.binding_name,per_binding_format:r.per_binding_format}).eq('id',r.id);setBindRates(p=>p.map(x=>x.id===r.id?r:x));saved('Saved!');setSaving(false);setEditBind(null);};
  const saveColor=async(r:any)=>{setSaving(true);await supabase.from('color_options').update({color_name:r.color_name}).eq('id',r.id);setColorOpts(p=>p.map(x=>x.id===r.id?r:x));saved('Saved!');setSaving(false);setEditColor(null);};

  // Delete helpers
  const delPrint=async(id:string)=>{if(!confirm('Delete this rate?'))return;await supabase.from('printing_rates').delete().eq('id',id);setPrintRates(p=>p.filter(x=>x.id!==id));saved('Deleted!');};
  const delLam=async(id:string)=>{if(!confirm('Delete this?'))return;await supabase.from('lamination_rates').delete().eq('id',id);setLamRates(p=>p.filter(x=>x.id!==id));saved('Deleted!');};
  const delUV=async(id:string)=>{if(!confirm('Delete this?'))return;await supabase.from('uv_rates').delete().eq('id',id);setUvRates(p=>p.filter(x=>x.id!==id));saved('Deleted!');};
  const delBind=async(id:string)=>{if(!confirm('Delete this?'))return;await supabase.from('binding_rates').delete().eq('id',id);setBindRates(p=>p.filter(x=>x.id!==id));saved('Deleted!');};
  const delColor=async(id:string)=>{if(!confirm('Delete this color option?'))return;await supabase.from('color_options').delete().eq('id',id);setColorOpts(p=>p.filter(x=>x.id!==id));saved('Deleted!');};

  // Add helpers
  const addPrintRate=async()=>{
    if(!newPrint.plate_name||!newPrint.color_option)return;
    const {data:{user}}=await supabase.auth.getUser();
    const {data}=await supabase.from('printing_rates').insert({subscriber_id:user!.id,plate_name:newPrint.plate_name,color_option:newPrint.color_option,fixed_charge:parseFloat(newPrint.fixed_charge)||0,per_1000_impression:parseFloat(newPrint.per_1000_impression)||0,sort_order:printRates.length+1}).select().single();
    if(data){setPrintRates(p=>[...p,data]);setNewPrint({plate_name:'',color_option:'',fixed_charge:'',per_1000_impression:''});setAddPrint(false);saved('Added!');}
  };
  const addLamRate=async()=>{
    if(!newLam.lam_name)return;
    const {data:{user}}=await supabase.auth.getUser();
    const {data}=await supabase.from('lamination_rates').insert({subscriber_id:user!.id,lam_name:newLam.lam_name,minimum_charge:parseFloat(newLam.minimum_charge)||0,per_100_sqinch:parseFloat(newLam.per_100_sqinch)||0,sort_order:lamRates.length+1}).select().single();
    if(data){setLamRates(p=>[...p,data]);setNewLam({lam_name:'',minimum_charge:'',per_100_sqinch:''});setAddLam(false);saved('Added!');}
  };
  const addUVRate=async()=>{
    if(!newUV.uv_name)return;
    const {data:{user}}=await supabase.auth.getUser();
    const {data}=await supabase.from('uv_rates').insert({subscriber_id:user!.id,uv_name:newUV.uv_name,minimum_charge:parseFloat(newUV.minimum_charge)||0,per_100_sqinch:parseFloat(newUV.per_100_sqinch)||0,sort_order:uvRates.length+1}).select().single();
    if(data){setUvRates(p=>[...p,data]);setNewUV({uv_name:'',minimum_charge:'',per_100_sqinch:''});setAddUV(false);saved('Added!');}
  };
  const addBindRate=async()=>{
    if(!newBind.binding_name)return;
    const {data:{user}}=await supabase.auth.getUser();
    const {data}=await supabase.from('binding_rates').insert({subscriber_id:user!.id,binding_name:newBind.binding_name,per_binding_format:parseFloat(newBind.per_binding_format)||0,sort_order:bindRates.length+1}).select().single();
    if(data){setBindRates(p=>[...p,data]);setNewBind({binding_name:'',per_binding_format:''});setAddBind(false);saved('Added!');}
  };
  const addColorOpt=async()=>{
    if(!newColor.color_name)return;
    const {data:{user}}=await supabase.auth.getUser();
    const {data}=await supabase.from('color_options').insert({subscriber_id:user!.id,color_name:newColor.color_name,sort_order:colorOpts.length+1}).select().single();
    if(data){setColorOpts(p=>[...p,data]);setNewColor({color_name:''});setAddColor(false);saved('Added!');}
  };
  const saveSettings=async()=>{if(!sub)return;setSaving(true);await supabase.from('subscribers').update({business_name:sub.business_name,markup_percent:sub.markup_percent,tax_percent:sub.tax_percent}).eq('id',sub.id);saved('Settings saved!');setSaving(false);};

  if(loading) return <main style={{minHeight:'100vh',background:'#F7F6F3',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}><p style={{color:'#888'}}>Loading...</p></main>;

  const stockCats=[...new Set(paperStocks.map((p:any)=>p.category))];
  const platenames=[...new Set(printRates.map(r=>r.plate_name))];
  const SBadge=({s}:any)=><span style={{padding:'3px 10px',borderRadius:4,fontSize:11,fontWeight:600,background:SBG[s]||'#F5F5F5',color:SC[s]||'#888'}}>{s}</span>;
  const tabs=[{id:'overview',l:'Overview'},{id:'print_rates',l:'Printing Rates'},{id:'customers',l:'Customers'},{id:'quotes',l:'Quotes'},{id:'orders',l:'Orders'},{id:'rates',l:'Paper Rates'},{id:'stocks',l:'Stock Management'},{id:'embed',l:'🔗 Embed & API'},{id:'settings',l:'Settings'}];

  // Shared input style
  const IS:any={padding:'8px 10px',border:'1.5px solid #E8E8E8',borderRadius:8,fontSize:13,fontFamily:'DM Sans,sans-serif',color:'#1A1A1A',background:'#FAFAFA',outline:'none'};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        .nav{background:#1A1A1A;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:100;}
        .tabs-wrap{background:#fff;border-bottom:1px solid #EBEBEB;padding:0 24px;display:flex;overflow-x:auto;scrollbar-width:none;}
        .tabs-wrap::-webkit-scrollbar{display:none;}
        .tab{padding:13px 16px;font-size:13px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;white-space:nowrap;flex-shrink:0;}
        .tab.active{color:#1A1A1A;border-bottom-color:#C84B31;}.tab:hover{color:#1A1A1A;}
        .content{max-width:1000px;margin:0 auto;padding:28px 24px;}
        .card{background:#fff;border-radius:12px;border:1px solid #EBEBEB;padding:24px;margin-bottom:16px;}
        .field{margin-bottom:14px;}.field label{display:block;font-size:12px;font-weight:500;color:#888;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em;}
        input[type="text"],input[type="number"],input[type="email"]{padding:9px 12px;border:1.5px solid #E8E8E8;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;color:#1A1A1A;background:#FAFAFA;outline:none;}
        input:focus{border-color:#C84B31;background:#fff;}input[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;}
        .btn-primary{padding:8px 18px;background:#1A1A1A;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;}
        .btn-add{padding:6px 14px;background:#F0FFF4;color:#276749;border:1px solid #9AE6B4;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;}
        .btn-sm{padding:5px 12px;background:#F5F5F5;color:#555;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;}
        .btn-del{padding:5px 10px;background:#FFF0F0;color:#E53E3E;border:1px solid #FEB2B2;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;margin-left:6px;}
        .btn-cancel{padding:5px 12px;background:none;color:#888;border:1px solid #E8E8E8;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;margin-left:6px;}
        .btn-danger{padding:9px 20px;background:#FFF0F0;color:#E53E3E;border:1px solid #FEB2B2;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;}
        .save-msg{color:#38A169;font-size:13px;}
        .stat-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;}
        .stat-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;}
        .stat-card{background:#fff;border:1px solid #EBEBEB;border-radius:10px;padding:16px;}
        .stat-label{font-size:11px;color:#999;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;}
        .stat-value{font-size:24px;font-weight:600;color:#1A1A1A;font-family:'DM Mono',monospace;}
        .stat-sub{font-size:11px;color:#AAA;margin-top:4px;}
        .sh{background:#F9F9F9;border-bottom:1px solid #F0F0F0;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;}
        .st{font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.08em;}
        .table{width:100%;border-collapse:collapse;}
        .table th{text-align:left;font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.06em;padding:10px 16px;border-bottom:1px solid #F0F0F0;}
        .table td{padding:11px 16px;border-bottom:1px solid #F8F8F8;font-size:13px;color:#1A1A1A;vertical-align:middle;}
        .table tr:last-child td{border-bottom:none;}.table tbody tr:hover td{background:#FAFAFA;}
        .badge-in{display:inline-block;padding:2px 8px;background:#F0FFF4;color:#38A169;border:1px solid #9AE6B4;border-radius:4px;font-size:11px;font-weight:600;}
        .badge-out{display:inline-block;padding:2px 8px;background:#FFF0F0;color:#E53E3E;border:1px solid #FEB2B2;border-radius:4px;font-size:11px;font-weight:600;}
        .info-box{background:#F0FFF4;border:1px solid #9AE6B4;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#276749;}
        .coming-box{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400E;}
        .gsm-range{display:inline-block;padding:2px 8px;background:#F5F0FF;color:#6B46C1;border-radius:4px;font-size:11px;font-weight:500;font-family:'DM Mono',monospace;}
        .plan-badge{display:inline-block;padding:3px 10px;background:#EEF4FA;color:#185FA5;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;}
        .add-row{background:#F9FFF9;border-top:1px solid #E8F5E9;}
        .select-sm{padding:5px 8px;border:1.5px solid #E8E8E8;border-radius:6px;font-size:12px;font-family:inherit;background:#FAFAFA;outline:none;}
        .avatar{width:36px;height:36px;background:#1A1A1A;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600;flex-shrink:0;}
        .back-btn{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#888;background:none;border:none;cursor:pointer;font-family:inherit;margin-bottom:16px;padding:0;}
        @media(max-width:768px){.stat-grid-4{grid-template-columns:repeat(2,1fr);}.stat-grid-3{grid-template-columns:repeat(2,1fr);}.content{padding:20px 16px;}}
      `}</style>

      <nav className="nav">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,background:'#C84B31',borderRadius:'50%'}}/>
          <span style={{fontSize:14,fontWeight:500,color:'#fff'}}>PrintCalc</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <a href="/calculator" style={{fontSize:13,color:'#888',textDecoration:'none'}}>← Calculator</a>
          <span style={{fontSize:13,color:'#888'}}>{sub?.business_name}</span>
          <span className="plan-badge">{sub?.plan}</span>
          <button style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}} onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="tabs-wrap">
        {tabs.map(t=><button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>{setTab(t.id);setSelCust(null);}}>{t.l}</button>)}
      </div>

      <div className="content">
        {saveMsg&&<p className="save-msg" style={{marginBottom:16}}>✓ {saveMsg}</p>}

        {/* OVERVIEW */}
        {tab==='overview'&&(()=>{
          const sym=sub?.currency_symbol||'₹';
          const fmt=(n:number)=>sym+(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
          const activeOrders=liveOrders.filter(o=>!['Delivered','Cancelled'].includes(o.status));
          const totalRevenue=liveOrders.filter(o=>o.status!=='Cancelled').reduce((s:number,o:any)=>s+(o.total_amount||0),0);
          const totalDue=liveOrders.filter(o=>o.status!=='Cancelled').reduce((s:number,o:any)=>s+(o.due_amount||0),0);
          const thisMonth=new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
          const ordersThisMonth=liveOrders.filter(o=>new Date(o.created_at)>=thisMonth).length;
          const quotesThisMonth=liveQuotes.filter(q=>new Date(q.created_at)>=thisMonth).length;
          return(
          <div>
            {/* Business settings row */}
            <div className="stat-grid-4">
              {[{l:'Plan',v:sub?.plan,sm:true},{l:'Markup',v:`${sub?.markup_percent}%`},{l:'GST / Tax',v:`${sub?.tax_percent}%`},{l:'Currency',v:`${sub?.currency_symbol} ${sub?.currency}`,sm:true}].map(s=>(
                <div key={s.l} className="stat-card"><p className="stat-label">{s.l}</p><p className="stat-value" style={{fontSize:s.sm?18:24,textTransform:'capitalize'}}>{s.v}</p></div>
              ))}
            </div>
            {/* Live stats row */}
            <div className="stat-grid-4">
              <div className="stat-card">
                <p className="stat-label">Quotes</p>
                <p className="stat-value">{liveQuotes.length}</p>
                <p className="stat-sub">{quotesThisMonth} this month</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Orders</p>
                <p className="stat-value">{liveOrders.length}</p>
                <p className="stat-sub">{ordersThisMonth} this month · {activeOrders.length} active</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Revenue</p>
                <p className="stat-value" style={{fontSize:18,fontFamily:'DM Mono,monospace'}}>{fmt(totalRevenue)}</p>
                <p className="stat-sub">all orders</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Balance Due</p>
                <p className="stat-value" style={{fontSize:18,fontFamily:'DM Mono,monospace',color:totalDue>0?'#E53E3E':'#38A169'}}>{fmt(totalDue)}</p>
                <p className="stat-sub">pending collection</p>
              </div>
            </div>
            {/* Quick links */}
            <div className="card">
              <p style={{fontSize:15,fontWeight:600,marginBottom:12}}>Quick links</p>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <a href="/calculator" style={{padding:'10px 18px',background:'#1A1A1A',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:500}}>🖩 Calculator</a>
                <a href="/quotes" style={{padding:'10px 18px',background:'#EEF4FA',color:'#185FA5',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:500}}>📋 Quotes ({liveQuotes.length})</a>
                <a href="/orders" style={{padding:'10px 18px',background:'#F5F0FF',color:'#6B46C1',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:500}}>📦 Orders ({liveOrders.length})</a>
                <a href="/customer/login" style={{padding:'10px 18px',background:'#F0FFF4',color:'#276749',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:500}}>👤 Customer Portal</a>
                {tabs.slice(1).map(t=><button key={t.id} className="btn-sm" style={{padding:'10px 14px',fontSize:13}} onClick={()=>setTab(t.id)}>{t.l}</button>)}
              </div>
            </div>
            {/* Active orders */}
            {activeOrders.length>0&&(
              <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
                <div className="sh"><p className="st">⚙️ Active Orders</p><a href="/orders" className="btn-sm" style={{textDecoration:'none'}}>View all</a></div>
                <table className="table"><thead><tr><th>Order #</th><th>Customer</th><th>Job</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>{activeOrders.slice(0,5).map((o:any)=>(
                  <tr key={o.id} style={{cursor:'pointer'}} onClick={()=>window.location.href='/orders'}>
                    <td style={{fontFamily:'monospace',color:'#C84B31',fontSize:12,fontWeight:600}}>{o.order_number}</td>
                    <td style={{fontWeight:500}}>{o.customer_name}</td>
                    <td style={{fontSize:12,color:'#888'}}>{o.job_title||'—'}</td>
                    <td style={{fontFamily:'monospace',fontWeight:500}}>{fmt(o.total_amount)}</td>
                    <td style={{fontFamily:'monospace',color:o.due_amount>0?'#E53E3E':'#38A169',fontWeight:500}}>{fmt(o.due_amount)}</td>
                    <td><SBadge s={o.status}/></td>
                  </tr>
                ))}</tbody>
                </table>
              </div>
            )}
            {/* Recent quotes */}
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="sh"><p className="st">📋 Recent Quotes</p><a href="/quotes" className="btn-sm" style={{textDecoration:'none'}}>View all →</a></div>
              {liveQuotes.length===0?(
                <div style={{textAlign:'center',padding:32,color:'#AAA',fontSize:13}}>No quotes yet — <a href="/quotes" style={{color:'#C84B31',textDecoration:'none'}}>create your first quote</a></div>
              ):(
                <table className="table"><thead><tr><th>Quote #</th><th>Customer</th><th>Job</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{liveQuotes.slice(0,5).map((q:any)=>(
                  <tr key={q.id} style={{cursor:'pointer'}} onClick={()=>window.location.href='/quotes'}>
                    <td style={{fontFamily:'monospace',color:'#C84B31',fontSize:12,fontWeight:600}}>{q.quote_number}</td>
                    <td style={{fontWeight:500}}>{q.customer_name}</td>
                    <td style={{fontSize:12,color:'#888'}}>{q.job_title||'—'}</td>
                    <td style={{fontFamily:'monospace',fontWeight:500}}>{q.currency_symbol}{q.total_amount?.toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                    <td style={{fontSize:12,color:'#888'}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td><SBadge s={q.status}/></td>
                  </tr>
                ))}</tbody>
                </table>
              )}
            </div>
          </div>
          );
        })()}

        {/* PRINTING RATES — Full add/edit/delete */}
        {tab==='print_rates'&&(
          <div>
            <div className="info-box">💡 Manage all your printing rates. Add, edit or remove any plate, lamination, UV or binding option. These rates are used in all calculations.</div>

            {/* COLOR OPTIONS */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
              <div className="sh">
                <p className="st">Color Options</p>
                <button className="btn-add" onClick={()=>setAddColor(true)}>+ Add color</button>
              </div>
              <table className="table">
                <thead><tr><th>Color Name</th><th>Action</th></tr></thead>
                <tbody>
                  {colorOpts.map(r=>(
                    <tr key={r.id}>
                      <td>{editColor?.id===r.id?<input type="text" value={editColor.color_name} onChange={e=>setEditColor({...editColor,color_name:e.target.value})} style={{...IS,width:250}}/>:<span style={{fontWeight:500}}>{r.color_name}</span>}</td>
                      <td>{editColor?.id===r.id?<><button className="btn-primary" style={{padding:'5px 14px',fontSize:12}} onClick={()=>saveColor(editColor)} disabled={saving}>Save</button><button className="btn-cancel" onClick={()=>setEditColor(null)}>Cancel</button></>:<><button className="btn-sm" onClick={()=>setEditColor(r)}>Edit</button><button className="btn-del" onClick={()=>delColor(r.id)}>Delete</button></>}</td>
                    </tr>
                  ))}
                  {addColor&&(
                    <tr className="add-row">
                      <td><input type="text" placeholder="e.g. Six Color CMYK+W+V" value={newColor.color_name} onChange={e=>setNewColor({color_name:e.target.value})} style={{...IS,width:250}}/></td>
                      <td><button className="btn-add" onClick={addColorOpt}>Add</button><button className="btn-cancel" onClick={()=>setAddColor(false)}>Cancel</button></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PRINTING RATES — grouped by plate name */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
              <div className="sh">
                <p className="st">Plate & Impression Rates</p>
                <button className="btn-add" onClick={()=>setAddPrint(true)}>+ Add rate</button>
              </div>
              <table className="table">
                <thead><tr><th>Plate Name</th><th>Color Option</th><th>Fixed Charge (₹)</th><th>Per 1000 Imp (₹)</th><th>Action</th></tr></thead>
                <tbody>
                  {printRates.map(r=>(
                    <tr key={r.id}>
                      {editPrint?.id===r.id?(
                        <>
                          <td><input type="text" value={editPrint.plate_name} onChange={e=>setEditPrint({...editPrint,plate_name:e.target.value})} style={{...IS,width:200}}/></td>
                          <td><input type="text" value={editPrint.color_option} onChange={e=>setEditPrint({...editPrint,color_option:e.target.value})} style={{...IS,width:160}}/></td>
                          <td><input type="number" value={editPrint.fixed_charge??''} onChange={e=>setEditPrint({...editPrint,fixed_charge:parseFloat(e.target.value)||0})} style={{...IS,width:90}}/></td>
                          <td><input type="number" value={editPrint.per_1000_impression??''} onChange={e=>setEditPrint({...editPrint,per_1000_impression:parseFloat(e.target.value)||0})} style={{...IS,width:90}}/></td>
                          <td><button className="btn-primary" style={{padding:'5px 14px',fontSize:12}} onClick={()=>savePrint(editPrint)} disabled={saving}>Save</button><button className="btn-cancel" onClick={()=>setEditPrint(null)}>Cancel</button></td>
                        </>
                      ):(
                        <>
                          <td style={{fontWeight:500,fontSize:12}}>{r.plate_name}</td>
                          <td style={{fontSize:12}}>{r.color_option}</td>
                          <td style={{fontFamily:'monospace'}}>₹{r.fixed_charge}</td>
                          <td style={{fontFamily:'monospace'}}>₹{r.per_1000_impression}</td>
                          <td><button className="btn-sm" onClick={()=>setEditPrint({...r})}>Edit</button><button className="btn-del" onClick={()=>delPrint(r.id)}>Delete</button></td>
                        </>
                      )}
                    </tr>
                  ))}
                  {addPrint&&(
                    <tr className="add-row">
                      <td><input type="text" placeholder="Plate name" value={newPrint.plate_name} onChange={e=>setNewPrint({...newPrint,plate_name:e.target.value})} style={{...IS,width:180}}/></td>
                      <td><input type="text" placeholder="Color option" value={newPrint.color_option} onChange={e=>setNewPrint({...newPrint,color_option:e.target.value})} style={{...IS,width:150}}/></td>
                      <td><input type="number" placeholder="Fixed" value={newPrint.fixed_charge} onChange={e=>setNewPrint({...newPrint,fixed_charge:e.target.value})} style={{...IS,width:80}}/></td>
                      <td><input type="number" placeholder="Per 1000" value={newPrint.per_1000_impression} onChange={e=>setNewPrint({...newPrint,per_1000_impression:e.target.value})} style={{...IS,width:80}}/></td>
                      <td><button className="btn-add" onClick={addPrintRate}>Add</button><button className="btn-cancel" onClick={()=>setAddPrint(false)}>Cancel</button></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* LAMINATION RATES */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
              <div className="sh"><p className="st">Lamination Rates</p><button className="btn-add" onClick={()=>setAddLam(true)}>+ Add lamination</button></div>
              <table className="table">
                <thead><tr><th>Lamination Name</th><th>Min Charge (₹)</th><th>Per 100 sq in (₹)</th><th>Action</th></tr></thead>
                <tbody>
                  {lamRates.map(r=>(
                    <tr key={r.id}>
                      {editLam?.id===r.id?(
                        <><td><input type="text" value={editLam.lam_name} onChange={e=>setEditLam({...editLam,lam_name:e.target.value})} style={{...IS,width:200}}/></td><td><input type="number" value={editLam.minimum_charge??''} onChange={e=>setEditLam({...editLam,minimum_charge:parseFloat(e.target.value)||0})} style={{...IS,width:90}}/></td><td><input type="number" value={editLam.per_100_sqinch??''} onChange={e=>setEditLam({...editLam,per_100_sqinch:parseFloat(e.target.value)||0})} style={{...IS,width:90}}/></td><td><button className="btn-primary" style={{padding:'5px 14px',fontSize:12}} onClick={()=>saveLam(editLam)} disabled={saving}>Save</button><button className="btn-cancel" onClick={()=>setEditLam(null)}>Cancel</button></td></>
                      ):(
                        <><td style={{fontWeight:500}}>{r.lam_name}</td><td style={{fontFamily:'monospace'}}>₹{r.minimum_charge}</td><td style={{fontFamily:'monospace'}}>₹{r.per_100_sqinch}</td><td><button className="btn-sm" onClick={()=>setEditLam({...r})}>Edit</button><button className="btn-del" onClick={()=>delLam(r.id)}>Delete</button></td></>
                      )}
                    </tr>
                  ))}
                  {addLam&&(
                    <tr className="add-row"><td><input type="text" placeholder="e.g. Matt BOPP Premium" value={newLam.lam_name} onChange={e=>setNewLam({...newLam,lam_name:e.target.value})} style={{...IS,width:200}}/></td><td><input type="number" placeholder="Min" value={newLam.minimum_charge} onChange={e=>setNewLam({...newLam,minimum_charge:e.target.value})} style={{...IS,width:80}}/></td><td><input type="number" placeholder="Per 100" value={newLam.per_100_sqinch} onChange={e=>setNewLam({...newLam,per_100_sqinch:e.target.value})} style={{...IS,width:80}}/></td><td><button className="btn-add" onClick={addLamRate}>Add</button><button className="btn-cancel" onClick={()=>setAddLam(false)}>Cancel</button></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* UV RATES */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
              <div className="sh"><p className="st">UV / Coating Rates</p><button className="btn-add" onClick={()=>setAddUV(true)}>+ Add UV / Coating</button></div>
              <table className="table">
                <thead><tr><th>UV / Coating Name</th><th>Min Charge (₹)</th><th>Per 100 sq in (₹)</th><th>Action</th></tr></thead>
                <tbody>
                  {uvRates.map(r=>(
                    <tr key={r.id}>
                      {editUV?.id===r.id?(
                        <><td><input type="text" value={editUV.uv_name} onChange={e=>setEditUV({...editUV,uv_name:e.target.value})} style={{...IS,width:200}}/></td><td><input type="number" value={editUV.minimum_charge??''} onChange={e=>setEditUV({...editUV,minimum_charge:parseFloat(e.target.value)||0})} style={{...IS,width:90}}/></td><td><input type="number" value={editUV.per_100_sqinch??''} onChange={e=>setEditUV({...editUV,per_100_sqinch:parseFloat(e.target.value)||0})} style={{...IS,width:90}}/></td><td><button className="btn-primary" style={{padding:'5px 14px',fontSize:12}} onClick={()=>saveUV(editUV)} disabled={saving}>Save</button><button className="btn-cancel" onClick={()=>setEditUV(null)}>Cancel</button></td></>
                      ):(
                        <><td style={{fontWeight:500}}>{r.uv_name}</td><td style={{fontFamily:'monospace'}}>₹{r.minimum_charge}</td><td style={{fontFamily:'monospace'}}>₹{r.per_100_sqinch}</td><td><button className="btn-sm" onClick={()=>setEditUV({...r})}>Edit</button><button className="btn-del" onClick={()=>delUV(r.id)}>Delete</button></td></>
                      )}
                    </tr>
                  ))}
                  {addUV&&(
                    <tr className="add-row"><td><input type="text" placeholder="e.g. Matte UV" value={newUV.uv_name} onChange={e=>setNewUV({...newUV,uv_name:e.target.value})} style={{...IS,width:200}}/></td><td><input type="number" placeholder="Min" value={newUV.minimum_charge} onChange={e=>setNewUV({...newUV,minimum_charge:e.target.value})} style={{...IS,width:80}}/></td><td><input type="number" placeholder="Per 100" value={newUV.per_100_sqinch} onChange={e=>setNewUV({...newUV,per_100_sqinch:e.target.value})} style={{...IS,width:80}}/></td><td><button className="btn-add" onClick={addUVRate}>Add</button><button className="btn-cancel" onClick={()=>setAddUV(false)}>Cancel</button></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* BINDING RATES */}
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="sh"><p className="st">Binding Rates</p><button className="btn-add" onClick={()=>setAddBind(true)}>+ Add binding</button></div>
              <table className="table">
                <thead><tr><th>Binding Name</th><th>Per Binding Format (₹)</th><th>Action</th></tr></thead>
                <tbody>
                  {bindRates.map(r=>(
                    <tr key={r.id}>
                      {editBind?.id===r.id?(
                        <><td><input type="text" value={editBind.binding_name} onChange={e=>setEditBind({...editBind,binding_name:e.target.value})} style={{...IS,width:200}}/></td><td><input type="number" value={editBind.per_binding_format??''} onChange={e=>setEditBind({...editBind,per_binding_format:parseFloat(e.target.value)||0})} style={{...IS,width:90}}/></td><td><button className="btn-primary" style={{padding:'5px 14px',fontSize:12}} onClick={()=>saveBind(editBind)} disabled={saving}>Save</button><button className="btn-cancel" onClick={()=>setEditBind(null)}>Cancel</button></td></>
                      ):(
                        <><td style={{fontWeight:500}}>{r.binding_name}</td><td style={{fontFamily:'monospace'}}>₹{r.per_binding_format}</td><td><button className="btn-sm" onClick={()=>setEditBind({...r})}>Edit</button><button className="btn-del" onClick={()=>delBind(r.id)}>Delete</button></td></>
                      )}
                    </tr>
                  ))}
                  {addBind&&(
                    <tr className="add-row"><td><input type="text" placeholder="e.g. Wire-O Binding" value={newBind.binding_name} onChange={e=>setNewBind({...newBind,binding_name:e.target.value})} style={{...IS,width:200}}/></td><td><input type="number" placeholder="Per format" value={newBind.per_binding_format} onChange={e=>setNewBind({...newBind,per_binding_format:e.target.value})} style={{...IS,width:90}}/></td><td><button className="btn-add" onClick={addBindRate}>Add</button><button className="btn-cancel" onClick={()=>setAddBind(false)}>Cancel</button></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOMERS */}
        {tab==='customers'&&(
          <div>
            {(!sub?.plan || sub.plan === 'free') ? (
              <div className="card" style={{textAlign:'center',padding:48}}>
                <p style={{fontSize:48,marginBottom:12}}>🔒</p>
                <p style={{fontSize:18,fontWeight:600,marginBottom:8}}>Customer Management</p>
                <p style={{fontSize:13,color:'#888',marginBottom:16}}>Add customers and share unique calculator links — available on Solo plan and above.</p>
                <a href="/#pricing" style={{display:'inline-block',background:'linear-gradient(135deg,#7C3AED,#9461FB)',color:'#fff',padding:'10px 24px',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none'}}>Upgrade to Solo →</a>
              </div>
            ) : (
              <CustomerTab sub={sub} subId={sub?.id} sym={sub?.currency_symbol||'₹'} paperCats={paperCats} printRates={printRates} lamRates={lamRates} uvRates={uvRates} IS={IS}/>
            )}
          </div>
        )}

        {/* QUOTES */}
        {tab==='quotes'&&(
          <div>
            <div className="info-box">💡 Manage all your quotes from the dedicated Quotes page.</div>
            <div className="card" style={{textAlign:'center',padding:40}}>
              <p style={{fontSize:32,marginBottom:12}}>📋</p>
              <p style={{fontSize:16,fontWeight:600,marginBottom:8}}>Quote Management</p>
              <p style={{fontSize:13,color:'#888',marginBottom:20}}>Create quotes, generate PDFs and track status.</p>
              <a href="/quotes" className="btn-primary" style={{textDecoration:'none',display:'inline-block'}}>Go to Quotes Page →</a>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab==='orders'&&(
          <div>
            <div className="info-box">💡 Manage all your orders from the dedicated Orders page.</div>
            <div className="card" style={{textAlign:'center',padding:40}}>
              <p style={{fontSize:32,marginBottom:12}}>📦</p>
              <p style={{fontSize:16,fontWeight:600,marginBottom:8}}>Order Management</p>
              <p style={{fontSize:13,color:'#888',marginBottom:20}}>Track orders, manage payments and update delivery status.</p>
              <a href="/orders" className="btn-primary" style={{textDecoration:'none',display:'inline-block'}}>Go to Orders Page →</a>
            </div>
          </div>
        )}

        {/* PAPER RATES */}
        {tab==='rates'&&(
          <div>
            <div className="info-box">💡 One rate per kg for each paper category.</div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div className="sh"><p className="st">Paper Category Rates</p></div>
              <table className="table"><thead><tr><th>Category</th><th>GSM Range</th><th>Rate per kg</th><th>Action</th></tr></thead>
              <tbody>{paperCats.map(r=>{const isE=editCat?.id===r.id;return <tr key={r.id}><td style={{fontWeight:500}}>{r.category}</td><td><span className="gsm-range">{GSM_RANGES[r.category]||'—'}</span></td><td>{isE?<input type="number" value={editCat.rate_per_kg} onChange={e=>setEditCat({...editCat,rate_per_kg:parseFloat(e.target.value)})} style={{...IS,width:100}}/>:<span style={{fontFamily:'monospace'}}>{sub?.currency_symbol}{r.rate_per_kg.toFixed(2)}/kg</span>}</td><td>{isE?<><button className="btn-primary" style={{padding:'5px 14px',fontSize:12}} onClick={()=>saveCat(editCat)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditCat(null)}>Cancel</button></>:<button className="btn-sm" onClick={()=>setEditCat(r)}>Edit</button>}</td></tr>;})}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* STOCK MANAGEMENT */}
        {tab==='stocks'&&(
          <div>
            <div className="info-box">💡 Stock tracking is optional.</div>
            {stockCats.map(cat=>(
              <div key={cat as string} className="card" style={{padding:0,overflow:'hidden',marginBottom:16}}>
                <div className="sh"><p className="st">{cat as string} &nbsp;<span className="gsm-range">{GSM_RANGES[cat as string]||''}</span></p></div>
                <table className="table"><thead><tr><th>Paper</th><th>GSM</th><th>Packing</th><th>Stock (kg)</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{paperStocks.filter((p:any)=>p.category===cat).map((s:any)=>{const isE=editStock?.id===s.id;return <tr key={s.id}>{isE?<><td>{s.label}</td><td>{s.gsm}</td><td><input type="number" value={editStock.packing_size} onChange={e=>setEditStock({...editStock,packing_size:parseInt(e.target.value)})} style={{...IS,width:70}}/></td><td><input type="number" value={editStock.stock_qty??''} placeholder="Optional" onChange={e=>setEditStock({...editStock,stock_qty:e.target.value?parseFloat(e.target.value):null})} style={{...IS,width:90}}/></td><td><select className="select-sm" value={editStock.in_stock?'true':'false'} onChange={e=>setEditStock({...editStock,in_stock:e.target.value==='true'})}><option value="true">In Stock</option><option value="false">Out of Stock</option></select></td><td><button className="btn-primary" style={{padding:'5px 14px',fontSize:12}} onClick={()=>saveStock(editStock)} disabled={saving}>{saving?'...':'Save'}</button><button className="btn-cancel" onClick={()=>setEditStock(null)}>Cancel</button></td></>:<><td>{s.label}</td><td style={{fontFamily:'monospace'}}>{s.gsm}</td><td style={{fontFamily:'monospace'}}>{s.packing_size} sh</td><td style={{fontFamily:'monospace',color:s.stock_qty?'#1A1A1A':'#CCC'}}>{s.stock_qty?`${s.stock_qty} kg`:'—'}</td><td>{s.in_stock?<span className="badge-in">In Stock</span>:<span className="badge-out">Out of Stock</span>}</td><td><button className="btn-sm" onClick={()=>setEditStock(s)}>Edit</button></td></>}</tr>;})}</tbody>
              </table>
            </div>
            ))}
          </div>
        )}

        {/* EMBED & API */}
        {tab==='embed'&&sub&&(
          <div>
            {(!sub?.plan || sub.plan === 'free') ? (
              <div className="card" style={{textAlign:'center',padding:48}}>
                <p style={{fontSize:48,marginBottom:12}}>🔒</p>
                <p style={{fontSize:18,fontWeight:600,marginBottom:8}}>Embed Calculator</p>
                <p style={{fontSize:13,color:'#888',marginBottom:16}}>Give customers their own calculator link — available on Solo plan and above.</p>
                <a href="/#pricing" style={{display:'inline-block',background:'linear-gradient(135deg,#7C3AED,#9461FB)',color:'#fff',padding:'10px 24px',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none'}}>Upgrade to Solo →</a>
              </div>
            ) : (
            <div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                <div style={{width:40,height:40,background:'#EEF4FA',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🔗</div>
                <div>
                  <p style={{fontSize:16,fontWeight:600,color:'#1A1A1A'}}>iFrame Embed</p>
                  <p style={{fontSize:13,color:'#888'}}>Embed your branded calculator on any website</p>
                </div>
              </div>
              <div style={{background:'#F9F9F9',border:'1px solid #E8E8E8',borderRadius:10,padding:16,marginBottom:16}}>
                <p style={{fontSize:12,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Your Calculator URL</p>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <code style={{flex:1,background:'#fff',border:'1px solid #E8E8E8',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#185FA5',wordBreak:'break-all' as const}}>
                    {typeof window!=='undefined'?window.location.origin:''}/embed/{sub.id}
                  </code>
                  <button className="btn-primary" style={{padding:'10px 16px',fontSize:12,flexShrink:0}} onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/embed/${sub.id}`).then(()=>alert('URL copied!'));}}>Copy</button>
                </div>
              </div>
              <div style={{background:'#F9F9F9',border:'1px solid #E8E8E8',borderRadius:10,padding:16,marginBottom:16}}>
                <p style={{fontSize:12,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Embed Code — paste on your website</p>
                <pre style={{background:'#1A1A1A',color:'#A78BFA',borderRadius:8,padding:16,fontSize:12,overflowX:'auto' as const,lineHeight:1.6}}>
{`<iframe
  src="${typeof window!=='undefined'?window.location.origin:''}/embed/${sub.id}"
  width="100%"
  height="700px"
  style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);"
  title="${sub.business_name} Print Calculator"
></iframe>`}
                </pre>
                <button className="btn-primary" style={{marginTop:10,fontSize:12}} onClick={()=>{
                  const code=`<iframe\n  src="${window.location.origin}/embed/${sub.id}"\n  width="100%"\n  height="700px"\n  style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);"\n  title="${sub.business_name} Print Calculator"\n></iframe>`;
                  navigator.clipboard.writeText(code).then(()=>alert('Embed code copied!'));
                }}>Copy Embed Code</button>
              </div>
              <div style={{background:'#F0FFF4',border:'1px solid #9AE6B4',borderRadius:10,padding:14}}>
                <p style={{fontSize:13,color:'#276749',fontWeight:500,marginBottom:6}}>✅ How to use:</p>
                <ol style={{fontSize:13,color:'#276749',paddingLeft:16,lineHeight:1.8}}>
                  <li>Copy the embed code above</li>
                  <li>Go to your website editor (WordPress, Wix, etc.)</li>
                  <li>Add an HTML block or custom code section</li>
                  <li>Paste the code — your branded calculator appears!</li>
                </ol>
              </div>
            </div>

            {/* Preview */}
            <div className="card">
              <p style={{fontSize:15,fontWeight:600,marginBottom:4}}>Preview your embed</p>
              <p style={{fontSize:13,color:'#888',marginBottom:16}}>This is exactly how it looks on your website</p>
              <div style={{border:'2px dashed #E8E8E8',borderRadius:12,overflow:'hidden'}}>
                <iframe
                  src={`${typeof window!=='undefined'?window.location.origin:''}/embed/${sub.id}`}
                  width="100%"
                  height="600px"
                  style={{border:'none',display:'block'}}
                  title="Calculator Preview"
                />
              </div>
            </div>

            {/* API section - coming soon */}
            <div className="card" style={{background:'#F9F9F9',border:'1.5px dashed #E8E8E8'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:40,height:40,background:'#F5F0FF',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>⚡</div>
                <div>
                  <p style={{fontSize:16,fontWeight:600,color:'#1A1A1A'}}>API Access</p>
                  <p style={{fontSize:13,color:'#888'}}>For developers — integrate directly into your own system</p>
                </div>
                <span style={{marginLeft:'auto',background:'#FDE68A',color:'#78350F',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:100,textTransform:'uppercase' as const,letterSpacing:'0.08em'}}>Coming Soon</span>
              </div>
              <p style={{fontSize:13,color:'#888',lineHeight:1.6,marginBottom:12}}>
                Get a unique API key and let your developers connect your ordering system, website or app directly to your PrintCalc rates. Perfect for enterprises and large businesses.
              </p>
              <div style={{background:'#1A1A1A',borderRadius:8,padding:14,fontFamily:'monospace',fontSize:12,color:'#A78BFA',lineHeight:1.7}}>
                <span style={{color:'#666'}}>// Example API call</span><br/>
                POST /api/calculate<br/>
                <span style={{color:'#38A169'}}>{'{'} "size": "A4", "gsm": 300, "qty": 5000 {'}'}</span><br/>
                <span style={{color:'#666'}}>// Returns calculated price instantly</span>
              </div>
            </div>
            </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab==='settings'&&sub&&(
          <div>
            <div className="card">
              <p style={{fontSize:15,fontWeight:600,marginBottom:4}}>Business settings</p>
              <p style={{fontSize:12,color:'#AAA',marginBottom:16}}>These settings affect all price calculations</p>
              <div className="field"><label>Business name</label><input type="text" value={sub.business_name||''} onChange={e=>setSub({...sub,business_name:e.target.value})} style={{width:'100%'}}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="field"><label>Markup %</label><input type="number" value={sub.markup_percent} onChange={e=>setSub({...sub,markup_percent:parseFloat(e.target.value)})} style={{width:'100%'}}/></div>
                <div className="field"><label>Tax / GST %</label><input type="number" value={sub.tax_percent} onChange={e=>setSub({...sub,tax_percent:parseFloat(e.target.value)})} style={{width:'100%'}}/></div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginTop:8}}>
                <button className="btn-primary" onClick={saveSettings} disabled={saving}>{saving?'Saving...':'Save settings'}</button>
                {saveMsg&&<span className="save-msg">✓ {saveMsg}</span>}
              </div>
            </div>
            <div className="card">
              <p style={{fontSize:15,fontWeight:600,marginBottom:12}}>Account</p>
              <p style={{fontSize:13,color:'#888',marginBottom:16}}>Logged in as <strong style={{color:'#1A1A1A'}}>{sub.email}</strong></p>
              <button className="btn-danger" onClick={logout}>Logout</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
