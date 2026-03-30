'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../supabase';

// ─── PLATE DIMS ───────────────────────────────────────────────────────
const PLATE_DIMS: Record<string,{w:number;h:number}> = {
  '15×20"': {w:14.5, h:19.5},
  '18×23"': {w:17.5, h:22.5},
  '18×25"': {w:17.5, h:24.5},
  '20×28"': {w:19.5, h:27.5},
  '20×30"': {w:19.5, h:29.5},
  '25×36"': {w:24.5, h:35.5},
};
const PARENT_SHEETS: Record<string,{parent:string;cuts:number;pw:number;ph:number}> = {
  '15×20"': {parent:'20×30"',cuts:2,pw:20,ph:30},
  '18×23"': {parent:'23×36"',cuts:2,pw:23,ph:36},
  '18×25"': {parent:'25×36"',cuts:2,pw:25,ph:36},
  '20×28"': {parent:'20×30"',cuts:1,pw:20,ph:30},
  '20×30"': {parent:'20×30"',cuts:1,pw:20,ph:30},
  '25×36"': {parent:'25×36"',cuts:1,pw:25,ph:36},
};
const FINAL_SIZES = [
  {id:'a2', label:'A2 (16.5 x 23.4")',   w:16.5, h:23.4,  plateSize:'25×36"'},
  {id:'a3', label:'A3 (11.7 x 16.5")',   w:11.7, h:16.5,  plateSize:'18×25"'},
  {id:'a4', label:'A4 (8.3 x 11.7")',    w:8.3,  h:11.7,  plateSize:'18×25"'},
  {id:'a5', label:'A5 (5.8 x 8.3")',     w:5.8,  h:8.3,   plateSize:'18×25"'},
  {id:'a6', label:'A6 (4.1 x 5.8")',     w:4.1,  h:5.8,   plateSize:'18×25"'},
  {id:'am1',label:'4.25 x 5.5"',         w:4.25, h:5.5,   plateSize:'18×25"'},
  {id:'am2',label:'5.5 x 8.5"',          w:5.5,  h:8.5,   plateSize:'18×25"'},
  {id:'am3',label:'Letter 8.5 x 11"',    w:8.5,  h:11,    plateSize:'18×23"'},
  {id:'am4',label:'Legal 8.5 x 14"',     w:8.5,  h:14,    plateSize:'18×23"'},
  {id:'am5',label:'11 x 17"',            w:11,   h:17,    plateSize:'18×25"'},
  {id:'am6',label:'18 x 23"',            w:18,   h:23,    plateSize:'18×23"'},
  {id:'b3', label:'B3 (13.5 x 19.5")',   w:13.5, h:19.5,  plateSize:'20×28"'},
  {id:'b4', label:'B4 (9.75 x 13.75")',  w:9.75, h:13.75, plateSize:'20×28"'},
  {id:'b5', label:'B5 (6.85 x 9.75")',   w:6.85, h:9.75,  plateSize:'20×28"'},
  {id:'b6', label:'B6 (4.85 x 6.85")',   w:4.85, h:6.85,  plateSize:'20×28"'},
  {id:'vc', label:'Visiting Card (3.5 x 2")',  w:3.5,  h:2,    plateSize:'18×25"'},
  {id:'dl', label:'DL Envelope (4.3 x 8.5")', w:4.3,  h:8.5,  plateSize:'18×25"'},
  {id:'custom',label:'Custom size...',         w:0,    h:0,    plateSize:'18×25"'},
];

function calcUps(w:number,h:number,pk:string){
  const p=PLATE_DIMS[pk];if(!p)return 1;
  return Math.max(Math.floor(p.w/w)*Math.floor(p.h/h),Math.floor(p.w/h)*Math.floor(p.h/w),1);
}
function autoSelectPlate(w:number,h:number):string{
  let best='18×25"';let bestUps=0;
  for(const pk of Object.keys(PLATE_DIMS)){
    const p=PLATE_DIMS[pk];
    const ups=Math.max(Math.floor(p.w/w)*Math.floor(p.h/h),Math.floor(p.w/h)*Math.floor(p.h/w),1);
    if(ups>bestUps||(ups===bestUps&&p.w*p.h<PLATE_DIMS[best].w*PLATE_DIMS[best].h)){bestUps=ups;best=pk;}
  }
  return best;
}

// ─── STYLES ───────────────────────────────────────────────────────────
const IS:any={width:'100%',padding:'10px 14px',border:'1.5px solid #E8E8E8',borderRadius:10,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#1A1A1A',background:'#FAFAFA',outline:'none',appearance:'none',WebkitAppearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:36};
const NIS:any={...IS,backgroundImage:'none',paddingRight:14,MozAppearance:'textfield'};
const LBL:any={fontSize:12,fontWeight:500,color:'#666',marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center'};
const CARD:any={background:'#fff',borderRadius:16,padding:20,marginBottom:12,border:'1px solid #EBEBEB'};
const TW:any={display:'flex',gap:8};
const TB=(a:boolean,c?:string):any=>({flex:1,padding:'9px',border:`1.5px solid ${a?(c||'#1A1A1A'):'#E8E8E8'}`,borderRadius:10,fontSize:13,fontWeight:500,color:a?'#fff':'#888',background:a?(c||'#1A1A1A'):'#FAFAFA',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const});

// ─── CUSTOMER RESULT BOX (shows price + description, hides cost breakdown) ──
function CustomerResult({r,sym,accent,onRequestQuote,requesting}:any){
  if(!r)return null;
  return(
    <div style={{marginTop:16}}>
      {/* Price card */}
      <div style={{background:'#1A1A1A',borderRadius:16,padding:24,marginBottom:10,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:140,height:140,background:accent||'#C84B31',borderRadius:'50%',opacity:0.1}}/>
        <p style={{fontSize:12,color:'#888',marginBottom:2}}>Your price (incl. GST)</p>
        <p style={{fontSize:38,fontWeight:600,color:'#fff',letterSpacing:'-0.03em',fontFamily:'DM Mono,monospace',lineHeight:1,marginBottom:20}}>
          <span style={{fontSize:20,verticalAlign:'super',fontWeight:400,marginRight:2}}>{sym}</span>
          {r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:8,padding:12}}>
            <p style={{fontSize:11,color:'#888',marginBottom:3}}>Per piece</p>
            <p style={{fontSize:16,fontWeight:600,color:'#fff',fontFamily:'DM Mono,monospace'}}>{sym}{r.perPiece}</p>
          </div>
          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:8,padding:12}}>
            <p style={{fontSize:11,color:'#888',marginBottom:3}}>GST ({r.taxPct}%)</p>
            <p style={{fontSize:16,fontWeight:600,color:'#fff',fontFamily:'DM Mono,monospace'}}>{sym}{r.taxAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}</p>
          </div>
        </div>
      </div>

      {/* Job summary — what they entered */}
      <div style={{background:'#F9F9F9',borderRadius:12,border:'1px solid #EBEBEB',padding:16,marginBottom:10}}>
        <p style={{fontSize:11,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Job Summary</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {r.summary.map((s:any)=>(
            <div key={s.label} style={{display:'flex',flexDirection:'column' as const}}>
              <span style={{fontSize:11,color:'#AAA'}}>{s.label}</span>
              <span style={{fontSize:13,fontWeight:500,color:'#1A1A1A'}}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request Quote button */}
      <button onClick={onRequestQuote} disabled={requesting} style={{width:'100%',padding:14,background:accent||'#C84B31',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:requesting?'not-allowed':'pointer',fontFamily:'inherit',opacity:requesting?0.7:1}}>
        {requesting?'Sending request...':'📋 Request this Quote'}
      </button>
      <p style={{textAlign:'center',fontSize:11,color:'#AAA',marginTop:8}}>Your request will be sent to {r.businessName}</p>
    </div>
  );
}

// ─── MAIN EMBED PAGE ──────────────────────────────────────────────────
export default function EmbedPage(){
  const params = useParams();
  const subscriberId = params?.subscriberId as string;

  const [sub, setSub] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [custRates, setCustRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'calculator'|'quotes'|'orders'>('calculator');
  const [notFound, setNotFound] = useState(false);
  const [customerId, setCustomerId] = useState<string|null>(null);

  // Calculator state
  const [jobType, setJobType] = useState<'single'|'book'>('single');
  const [size, setSize] = useState(FINAL_SIZES[2]);
  const [cW, setCW] = useState(''); const [cH, setCH] = useState('');
  const [qty, setQty] = useState('');
  const [sides, setSides] = useState<'single'|'double'>('double');
  const [plateRates, setPlateRates] = useState<any[]>([]);
  const [lamRates, setLamRates] = useState<any[]>([]);
  const [uvRates, setUvRates] = useState<any[]>([]);
  const [paperCats, setPaperCats] = useState<any[]>([]);
  const [catStocks, setCatStocks] = useState<any[]>([]);
  const [selCat, setSelCat] = useState<any>(null);
  const [selGsm, setSelGsm] = useState(0);
  const [plateNames, setPlateNames] = useState<string[]>([]);
  const [selPlate, setSelPlate] = useState('');
  const [selColor, setSelColor] = useState('');
  const [colorsByPlate, setColorsByPlate] = useState<string[]>([]);
  const [selLam, setSelLam] = useState('none');
  const [selUV, setSelUV] = useState('none');
  const [bindRates, setBindRates] = useState<any[]>([]);
  const [selBind, setSelBind] = useState('none');
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Quotes & Orders
  const [quotes, setQuotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);

  const accentColor = '#C84B31';

  useEffect(()=>{
    const load = async()=>{
      const urlParams = typeof window!=='undefined' ? new URLSearchParams(window.location.search) : null;
      const cid = urlParams?.get('c');
      setCustomerId(cid||null);

      const {data:profile} = await supabase.from('subscribers').select('*').eq('id', subscriberId).single();
      if(!profile){setNotFound(true);setLoading(false);return;}
      setSub(profile);

      if(cid){
        const [{data:cust},{data:cr}] = await Promise.all([
          supabase.from('customers').select('*').eq('id',cid).eq('subscriber_id',subscriberId).single(),
          supabase.from('customer_rates').select('*').eq('customer_id',cid).eq('subscriber_id',subscriberId),
        ]);
        if(cust){setCustomer(cust);setCustRates(cr||[]);}
      }

      const [{data:pr},{data:lr},{data:ur},{data:cats},{data:br}] = await Promise.all([
        supabase.from('printing_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('lamination_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('uv_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('paper_categories').select('*').eq('subscriber_id',subscriberId).order('category'),
        supabase.from('binding_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
      ]);
      setPlateRates(pr||[]);setLamRates(lr||[]);setUvRates(ur||[]);setPaperCats(cats||[]);setBindRates(br||[]);
      if(cats?.length)setSelCat(cats[0]);
      const pnames=[...new Set((pr||[]).map((r:any)=>r.plate_name))] as string[];
      setPlateNames(pnames);
      if(pnames.length){
        setSelPlate(pnames[0]);
        const cols=(pr||[]).filter((r:any)=>r.plate_name===pnames[0]).map((r:any)=>r.color_option);
        setColorsByPlate(cols);
        if(cols.length)setSelColor(cols[0]);
      }
      setRatesLoaded(true);
      setLoading(false);
    };
    load();
  },[subscriberId]);

  useEffect(()=>{
    if(!selCat)return;
    supabase.from('paper_stocks').select('*').eq('subscriber_id',subscriberId).eq('category',selCat.category).order('gsm')
      .then(({data})=>{setCatStocks(data||[]);if(data?.length)setSelGsm(data[0].gsm);});
  },[selCat,subscriberId]);

  useEffect(()=>{
    if(!selPlate)return;
    const cols=plateRates.filter(r=>r.plate_name===selPlate).map(r=>r.color_option);
    setColorsByPlate(cols);if(cols.length)setSelColor(cols[0]);
  },[selPlate,plateRates]);

  // Load quotes when tab opens
  useEffect(()=>{
    if(tab==='quotes'&&!quotesLoaded&&customerId){
      supabase.from('quotes').select('*').eq('customer_email',customer?.email).eq('subscriber_id',subscriberId).order('created_at',{ascending:false})
        .then(({data})=>{setQuotes(data||[]);setQuotesLoaded(true);});
    }
  },[tab,quotesLoaded,customerId]);

  // Load orders when tab opens
  useEffect(()=>{
    if(tab==='orders'&&!ordersLoaded&&customerId){
      supabase.from('orders').select('*').eq('customer_email',customer?.email).eq('subscriber_id',subscriberId).order('created_at',{ascending:false})
        .then(({data})=>{setOrders(data||[]);setOrdersLoaded(true);});
    }
  },[tab,ordersLoaded,customerId]);

  const M = customer?.markup_percent!=null ? customer.markup_percent : (sub?.markup_percent||25);
  const T = sub?.tax_percent||18;
  const sym = sub?.currency_symbol||'₹';

  const getCustRate=(type:string,key:string,defaultVal:number)=>{
    const r=custRates.find((x:any)=>x.rate_type===type&&x.rate_key===key);
    return r ? r.custom_value : defaultVal;
  };

  const calc=()=>{
    const q=parseInt(qty);
    const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
    const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
    if(!q||!fW||!fH||!selCat)return;
    const pk=size.id==='custom'?autoSelectPlate(fW,fH):size.plateSize;
    const u=calcUps(fW,fH,pk);
    const pi=PARENT_SHEETS[pk]||{cuts:1,pw:25,ph:36};
    const ws=Math.ceil(q/u);
    const imp=sides==='double'?ws*2:ws;
    const numPlates=1;

    // Paper cost using customer rate if set
    const catRate=getCustRate('paper',selCat.category,selCat.rate_per_kg);
    const f=(pi.pw*pi.ph*0.2666)/828;
    const papC=((f*selGsm*catRate)/500)*(ws/pi.cuts);

    // Print cost using customer rate if set
    const rate=plateRates.find(r=>r.plate_name===selPlate&&r.color_option===selColor);
    let prC=0;
    if(rate){
      const rkey=`${rate.plate_name}__${rate.color_option}`;
      const fixedCharge=getCustRate('print_fixed',rkey,rate.fixed_charge);
      const per1000=getCustRate('print_per1000',rkey,rate.per_1000_impression);
      const pf=fixedCharge*numPlates;
      const fi=1000*numPlates;
      const ei=Math.max(0,imp-fi);
      const er=Math.ceil(ei/1000)*1000;
      prC=pf+(er/1000)*per1000;
    }

    // Lam cost
    let lC=0;
    if(selLam!=='none'){
      const lr=lamRates.find(r=>r.lam_name===selLam);
      if(lr){
        const lamRate=getCustRate('lam',lr.lam_name,lr.per_100_sqinch);
        const pd=PLATE_DIMS[pk]||{w:18,h:25};
        lC=Math.max((pd.w*pd.h/100)*lamRate*imp,lr.minimum_charge);
      }
    }

    // UV cost
    let uC=0;
    if(selUV!=='none'){
      const ur=uvRates.find(r=>r.uv_name===selUV);
      if(ur){
        const uvRate=getCustRate('uv',ur.uv_name,ur.per_100_sqinch);
        const pd=PLATE_DIMS[pk]||{w:18,h:25};
        uC=Math.max((pd.w*pd.h/100)*uvRate*imp,ur.minimum_charge);
      }
    }

    // Binding
    let bC=0;
    if(selBind!=='none'){
      const br=bindRates.find(r=>r.binding_name===selBind);
      if(br)bC=br.per_binding_format*q;
    }

    const sub2=papC+prC+lC+uC+bC;
    const am=sub2*(1+M/100);
    const ta=am*(T/100);
    const finalPrice=am+ta;

    setResult({
      finalPrice,
      perPiece:(finalPrice/q).toFixed(2),
      taxAmount:ta,
      taxPct:T,
      businessName:sub?.business_name,
      summary:[
        {label:'Final size',value:size.id==='custom'?`${fW}" × ${fH}"`:size.label},
        {label:'Quantity',value:q.toLocaleString('en-IN')+' pcs'},
        {label:'Paper',value:`${selCat?.category} ${selGsm} GSM`},
        {label:'Print colors',value:selColor},
        {label:'Sides',value:sides==='double'?'Front + Back':'Single side'},
        ...(selLam!=='none'?[{label:'Lamination',value:selLam}]:[]),
        ...(selUV!=='none'?[{label:'UV / Coating',value:selUV}]:[]),
        ...(selBind!=='none'?[{label:'Binding',value:selBind}]:[]),
        {label:'Job type',value:jobType==='book'?'Brochure / Book':'Single item'},
      ],
      // Internal details for quote (not shown to customer)
      _internal:{papC,prC,lC,uC,bC,sub2,markup:M,ws,imp,u,pk,fW,fH,q,sides,selCat,selGsm,selPlate,selColor,selLam,selUV,selBind,sizeName:size.label},
    });
    setRequestSent(false);
  };

  const requestQuote=async()=>{
    if(!result)return;
    setRequesting(true);
    try{
      await supabase.from('quotes').insert({
        subscriber_id:subscriberId,
        customer_name:customer?.name||'Customer',
        customer_email:customer?.email||'',
        customer_phone:customer?.phone||'',
        company:customer?.company||'',
        job_title:`${result._internal.sizeName} - ${result._internal.q} pcs`,
        size:`${result._internal.fW}" × ${result._internal.fH}"`,
        paper_type:`${result._internal.selCat?.category} ${result._internal.selGsm} GSM`,
        quantity:result._internal.q,
        sides:result._internal.sides,
        color_option:result._internal.selColor,
        lamination:result._internal.selLam,
        uv_coating:result._internal.selUV,
        binding:result._internal.selBind,
        total_amount:result.finalPrice,
        status:'Sent',
        notes:`Requested via calculator. UPS: ${result._internal.u}, Working sheets: ${result._internal.ws}`,
      });
      setRequestSent(true);
    }catch(e){console.error(e);}
    setRequesting(false);
  };

  if(loading) return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',background:'#F7F6F3'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid #E8E8E8',borderTopColor:'#C84B31',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'#888',fontSize:14}}>Loading...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if(notFound) return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',background:'#F7F6F3'}}>
      <div style={{textAlign:'center',padding:40}}>
        <p style={{fontSize:32,marginBottom:12}}>🖨️</p>
        <p style={{fontSize:16,color:'#888'}}>Calculator not found</p>
      </div>
    </div>
  );

  const SC:Record<string,string>={Draft:'#888',Sent:'#185FA5',Converted:'#38A169',Expired:'#E53E3E',Pending:'#D97706','In Production':'#185FA5',Ready:'#6B46C1',Delivered:'#38A169'};
  const SBG:Record<string,string>={Draft:'#F5F5F5',Sent:'#EEF4FA',Converted:'#F0FFF4',Expired:'#FFF0F0',Pending:'#FFFBEB','In Production':'#EEF4FA',Ready:'#F5F0FF',Delivered:'#F0FFF4'};

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        .etab{padding:12px 16px;font-size:13px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;white-space:nowrap;flex-shrink:0;}
        .etab.active{color:#1A1A1A;border-bottom-color:${accentColor};}
        .etab:hover{color:#1A1A1A;}
        .badge{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;}
      `}</style>

      {/* HEADER */}
      <div style={{background:'#1A1A1A',padding:'14px 20px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:100}}>
        <div style={{width:8,height:8,background:accentColor,borderRadius:'50%'}}/>
        <span style={{fontSize:15,fontWeight:600,color:'#fff'}}>{sub?.business_name||'Print Calculator'}</span>
        {customer&&<span style={{fontSize:11,color:'#888',background:'rgba(255,255,255,0.1)',padding:'2px 10px',borderRadius:20,marginLeft:4}}>Hi, {customer.name} 👋</span>}
        <span style={{marginLeft:'auto',fontSize:10,color:'#444'}}>Powered by PrintCalc</span>
      </div>

      {/* TABS */}
      <div style={{background:'#fff',borderBottom:'1px solid #EBEBEB',display:'flex',padding:'0 20px',overflowX:'auto'}}>
        <button className={`etab ${tab==='calculator'?'active':''}`} onClick={()=>setTab('calculator')}>🖨️ Calculator</button>
        {customerId&&<button className={`etab ${tab==='quotes'?'active':''}`} onClick={()=>setTab('quotes')}>📋 My Quotes</button>}
        {customerId&&<button className={`etab ${tab==='orders'?'active':''}`} onClick={()=>setTab('orders')}>📦 My Orders</button>}
      </div>

      <div style={{padding:'20px 16px 60px',maxWidth:580,margin:'0 auto'}}>

        {/* ── CALCULATOR TAB ── */}
        {tab==='calculator'&&(
          <div>
            {!ratesLoaded?(
              <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>
            ):(
              <>
                {/* Job type toggle */}
                <div style={CARD}>
                  <p style={{fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:12}}>Job Type</p>
                  <div style={TW}>
                    <button style={TB(jobType==='single',accentColor)} onClick={()=>setJobType('single')}>
                      <div>📄 Single Item</div>
                      <div style={{fontSize:11,fontWeight:400,opacity:0.7,marginTop:2}}>Leaflet · Poster · Card</div>
                    </button>
                    <button style={TB(jobType==='book',accentColor)} onClick={()=>setJobType('book')}>
                      <div>📚 Brochure / Book</div>
                      <div style={{fontSize:11,fontWeight:400,opacity:0.7,marginTop:2}}>Multi-page with binding</div>
                    </button>
                  </div>
                </div>

                {/* Job details */}
                <div style={CARD}>
                  <p style={{fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:14}}>Job Details</p>

                  {/* Size */}
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Final size{size.id!=='custom'&&<span style={{background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontSize:11,fontFamily:'monospace'}}>{calcUps(size.w,size.h,size.plateSize)} ups</span>}</div>
                    <select value={size.id} onChange={e=>{const s=FINAL_SIZES.find(x=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>
                      <optgroup label="── A Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('a')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── American ──">{FINAL_SIZES.filter(s=>s.id.startsWith('am')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── B Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('b')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── Other ──">{FINAL_SIZES.filter(s=>['vc','dl','custom'].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                    </select>
                    {size.id==='custom'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}><input type="number" placeholder="Width (in)" value={cW} onChange={e=>setCW(e.target.value)} style={NIS}/><input type="number" placeholder="Height (in)" value={cH} onChange={e=>setCH(e.target.value)} style={NIS}/></div>}
                  </div>

                  {/* Quantity */}
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div>
                    <input type="number" placeholder="Enter quantity" value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/>
                  </div>

                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>

                  {/* Paper */}
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Paper category</div>
                    <select value={selCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setSelCat(c);}} style={IS}>
                      {paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>GSM</div>
                    <select value={selGsm} onChange={e=>setSelGsm(parseInt(e.target.value))} style={IS}>
                      {catStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM{!s.in_stock?' — OUT OF STOCK':''}</option>)}
                    </select>
                  </div>

                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>

                  {/* Print */}
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Plate size</div>
                    <select value={selPlate} onChange={e=>setSelPlate(e.target.value)} style={IS}>
                      {plateNames.map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Print colors</div>
                    <select value={selColor} onChange={e=>setSelColor(e.target.value)} style={IS}>
                      {colorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Sides</div>
                    <div style={TW}>
                      <button style={TB(sides==='single',accentColor)} onClick={()=>setSides('single')}>Single side</button>
                      <button style={TB(sides==='double',accentColor)} onClick={()=>setSides('double')}>Front + Back</button>
                    </div>
                  </div>

                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>

                  {/* Finishing */}
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Lamination</div>
                    <select value={selLam} onChange={e=>setSelLam(e.target.value)} style={IS}>
                      <option value="none">No Lamination</option>
                      {lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>UV / Coating</div>
                    <select value={selUV} onChange={e=>setSelUV(e.target.value)} style={IS}>
                      <option value="none">No UV</option>
                      {uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}
                    </select>
                  </div>
                  {jobType==='book'&&(
                    <div>
                      <div style={LBL}>Binding</div>
                      <select value={selBind} onChange={e=>setSelBind(e.target.value)} style={IS}>
                        <option value="none">No Binding</option>
                        {bindRates.map(r=><option key={r.id} value={r.binding_name}>{r.binding_name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <button onClick={calc} style={{width:'100%',padding:14,background:accentColor,color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:4}}>
                  Calculate price →
                </button>

                {requestSent&&(
                  <div style={{background:'#F0FFF4',border:'1px solid #9AE6B4',borderRadius:12,padding:16,textAlign:'center',marginTop:12}}>
                    <p style={{fontSize:16,fontWeight:600,color:'#276749',marginBottom:4}}>✅ Quote requested!</p>
                    <p style={{fontSize:13,color:'#276749'}}>{sub?.business_name} will contact you soon.</p>
                  </div>
                )}

                {!requestSent&&result&&(
                  <CustomerResult r={result} sym={sym} accent={accentColor} onRequestQuote={requestQuote} requesting={requesting}/>
                )}
              </>
            )}
          </div>
        )}

        {/* ── MY QUOTES TAB ── */}
        {tab==='quotes'&&(
          <div>
            <p style={{fontSize:16,fontWeight:600,marginBottom:4}}>My Quotes</p>
            <p style={{fontSize:13,color:'#888',marginBottom:16}}>Quotes from {sub?.business_name}</p>
            {!quotesLoaded?(
              <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading quotes...</div>
            ):quotes.length===0?(
              <div style={{...CARD,textAlign:'center',padding:40}}>
                <p style={{fontSize:32,marginBottom:12}}>📋</p>
                <p style={{fontSize:15,fontWeight:600,marginBottom:6}}>No quotes yet</p>
                <p style={{fontSize:13,color:'#888'}}>Use the calculator to request your first quote!</p>
              </div>
            ):(
              <div>
                {quotes.map((q:any)=>(
                  <div key={q.id} style={{...CARD,marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div>
                        <p style={{fontWeight:600,fontSize:14}}>{q.job_title||'Print Job'}</p>
                        <p style={{fontSize:12,color:'#888',marginTop:2}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                      </div>
                      <span className="badge" style={{background:SBG[q.status]||'#F5F5F5',color:SC[q.status]||'#888'}}>{q.status}</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[
                        {l:'Size',v:q.size||'—'},
                        {l:'Quantity',v:q.quantity?.toLocaleString('en-IN')||'—'},
                        {l:'Paper',v:q.paper_type||'—'},
                        {l:'Amount',v:q.total_amount?`${sym}${q.total_amount.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'},
                      ].map(item=>(
                        <div key={item.l}>
                          <p style={{fontSize:11,color:'#AAA'}}>{item.l}</p>
                          <p style={{fontSize:13,fontWeight:500}}>{item.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY ORDERS TAB ── */}
        {tab==='orders'&&(
          <div>
            <p style={{fontSize:16,fontWeight:600,marginBottom:4}}>My Orders</p>
            <p style={{fontSize:13,color:'#888',marginBottom:16}}>Orders from {sub?.business_name}</p>
            {!ordersLoaded?(
              <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading orders...</div>
            ):orders.length===0?(
              <div style={{...CARD,textAlign:'center',padding:40}}>
                <p style={{fontSize:32,marginBottom:12}}>📦</p>
                <p style={{fontSize:15,fontWeight:600,marginBottom:6}}>No orders yet</p>
                <p style={{fontSize:13,color:'#888'}}>Your confirmed orders will appear here.</p>
              </div>
            ):(
              <div>
                {orders.map((o:any)=>(
                  <div key={o.id} style={{...CARD,marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div>
                        <p style={{fontWeight:600,fontSize:14}}>{o.job_title||'Print Order'}</p>
                        <p style={{fontSize:12,color:'#888',marginTop:2}}>{new Date(o.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                      </div>
                      <span className="badge" style={{background:SBG[o.status]||'#F5F5F5',color:SC[o.status]||'#888'}}>{o.status}</span>
                    </div>
                    {/* Progress tracker */}
                    <div style={{display:'flex',gap:4,marginBottom:12}}>
                      {['Pending','In Production','Ready','Delivered'].map((st,i)=>{
                        const steps=['Pending','In Production','Ready','Delivered'];
                        const curr=steps.indexOf(o.status);
                        const active=i<=curr;
                        return(
                          <div key={st} style={{flex:1}}>
                            <div style={{height:3,borderRadius:2,background:active?accentColor:'#E8E8E8',marginBottom:4}}/>
                            <p style={{fontSize:9,color:active?accentColor:'#CCC',textAlign:'center'}}>{st}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[
                        {l:'Amount',v:o.total_amount?`${sym}${o.total_amount.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'},
                        {l:'Advance paid',v:o.advance_paid?`${sym}${o.advance_paid.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'},
                        {l:'Due amount',v:o.due_amount?`${sym}${o.due_amount.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'},
                        {l:'Quantity',v:o.quantity?.toLocaleString('en-IN')||'—'},
                      ].map(item=>(
                        <div key={item.l}>
                          <p style={{fontSize:11,color:'#AAA'}}>{item.l}</p>
                          <p style={{fontSize:13,fontWeight:500}}>{item.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p style={{textAlign:'center',fontSize:10,color:'#DDD',marginTop:24}}>Powered by <a href="https://printcalc.app" style={{color:'#DDD'}} target="_blank">PrintCalc</a></p>
      </div>
    </>
  );
}
