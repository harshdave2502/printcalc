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

// ─── RESULT BOX ───────────────────────────────────────────────────────
function ResultBox({r,markup,tax,sym,accent}:any){
  if(!r)return null;
  return(
    <div style={{marginTop:16}}>
      <div style={{background:'#1A1A1A',borderRadius:16,padding:24,marginBottom:10,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:140,height:140,background:accent||'#C84B31',borderRadius:'50%',opacity:0.1}}/>
        <p style={{fontSize:12,color:'#666',marginBottom:2}}>Total price (incl. GST)</p>
        <p style={{fontSize:38,fontWeight:600,color:'#fff',letterSpacing:'-0.03em',fontFamily:'DM Mono,monospace',lineHeight:1,marginBottom:20}}>
          <span style={{fontSize:20,verticalAlign:'super',fontWeight:400,marginRight:2}}>{sym||'₹'}</span>
          {r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {r.stats.map((s:any)=>(
            <div key={s.label} style={{background:'rgba(255,255,255,0.06)',borderRadius:8,padding:12}}>
              <p style={{fontSize:11,color:'#666',marginBottom:3}}>{s.label}</p>
              <p style={{fontSize:15,fontWeight:500,color:'#fff',fontFamily:'DM Mono,monospace'}}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:12,border:'1px solid #EBEBEB',overflow:'hidden',marginBottom:10}}>
        <div style={{background:'#F9F9F9',padding:'8px 16px'}}><p style={{fontSize:11,fontWeight:600,color:'#888',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Cost Breakdown</p></div>
        {r.breakdown.map((row:any)=>(
          <div key={row.label} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid #F5F5F5'}}>
            <span style={{fontSize:13,color:'#888'}}>{row.label}</span>
            <span style={{fontSize:13,fontWeight:500,fontFamily:'DM Mono,monospace'}}>{row.value}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',background:'#F9F9F9'}}>
          <span style={{fontSize:13,fontWeight:600}}>Subtotal</span>
          <span style={{fontSize:13,fontWeight:600,fontFamily:'DM Mono,monospace'}}>{sym||'₹'}{r.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
        </div>
      </div>
      <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'8px 16px',background:'#FDE68A'}}><p style={{fontSize:11,fontWeight:600,color:'#78350F',letterSpacing:'0.08em',textTransform:'uppercase',margin:0}}>GST Breakdown</p></div>
        {[{k:`Markup (${markup}%)`,v:`${sym||'₹'}${r.markupAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}`},{k:`GST @ ${tax}%`,v:`${sym||'₹'}${r.taxAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}`}].map(row=>(
          <div key={row.k} style={{display:'flex',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid #FDE68A'}}>
            <span style={{fontSize:13,color:'#92400E'}}>{row.k}</span>
            <span style={{fontSize:13,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{row.v}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'10px 16px'}}>
          <span style={{fontSize:13,fontWeight:600,color:'#78350F'}}>Total incl. GST</span>
          <span style={{fontSize:15,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{sym||'₹'}{r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
        </div>
      </div>
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
  const [tab, setTab] = useState<'paper'|'printing'|'fulljob'>('paper');
  const [notFound, setNotFound] = useState(false);

  // Paper tab state
  const [sheetSizes, setSheetSizes] = useState<any[]>([]);
  const [paperStocks, setPaperStocks] = useState<any[]>([]);
  const [selSheet, setSelSheet] = useState<any>(null);
  const [selPaper, setSelPaper] = useState<any>(null);
  const [paperQty, setPaperQty] = useState('');
  const [paperResult, setPaperResult] = useState<any>(null);

  // Printing tab state
  const [size, setSize] = useState(FINAL_SIZES[2]);
  const [cW, setCW] = useState(''); const [cH, setCH] = useState('');
  const [printQty, setPrintQty] = useState('');
  const [plateRates, setPlateRates] = useState<any[]>([]);
  const [lamRates, setLamRates] = useState<any[]>([]);
  const [uvRates, setUvRates] = useState<any[]>([]);
  const [plateNames, setPlateNames] = useState<string[]>([]);
  const [selPlate, setSelPlate] = useState('');
  const [selColor, setSelColor] = useState('');
  const [colorsByPlate, setColorsByPlate] = useState<string[]>([]);
  const [sides, setSides] = useState<'single'|'double'>('double');
  const [selLam, setSelLam] = useState('none');
  const [selUV, setSelUV] = useState('none');
  const [printResult, setPrintResult] = useState<any>(null);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Full job tab state
  const [fjSize, setFjSize] = useState(FINAL_SIZES[2]);
  const [fjCW, setFjCW] = useState(''); const [fjCH, setFjCH] = useState('');
  const [fjQty, setFjQty] = useState('');
  const [paperCats, setPaperCats] = useState<any[]>([]);
  const [selCat, setSelCat] = useState<any>(null);
  const [catStocks, setCatStocks] = useState<any[]>([]);
  const [selGsm, setSelGsm] = useState(0);
  const [fjSides, setFjSides] = useState<'single'|'double'>('double');
  const [fjSelPlate, setFjSelPlate] = useState('');
  const [fjSelColor, setFjSelColor] = useState('');
  const [fjColorsByPlate, setFjColorsByPlate] = useState<string[]>([]);
  const [fjSelLam, setFjSelLam] = useState('none');
  const [fjSelUV, setFjSelUV] = useState('none');
  const [bindRates, setBindRates] = useState<any[]>([]);
  const [fjResult, setFjResult] = useState<any>(null);

  const accentColor = '#C84B31'; // will use subscriber brand color later

  useEffect(()=>{
    const load = async()=>{
      // Get customer ID from URL params if present
      const urlParams = typeof window!=='undefined' ? new URLSearchParams(window.location.search) : null;
      const customerId = urlParams?.get('c');

      // Load subscriber info
      const {data:profile} = await supabase.from('subscribers').select('*').eq('id', subscriberId).single();
      if(!profile){setNotFound(true);setLoading(false);return;}
      setSub(profile);

      // Load customer info and custom rates if customer ID provided
      if(customerId){
        const [{data:cust},{data:cr}] = await Promise.all([
          supabase.from('customers').select('*').eq('id',customerId).eq('subscriber_id',subscriberId).single(),
          supabase.from('customer_rates').select('*').eq('customer_id',customerId).eq('subscriber_id',subscriberId),
        ]);
        if(cust){setCustomer(cust);setCustRates(cr||[]);}
      }

      // Load all rates for this subscriber
      const [{data:sz},{data:pp},{data:pr},{data:lr},{data:ur},{data:cats},{data:br}] = await Promise.all([
        supabase.from('sheet_sizes').select('*').eq('is_active',true).order('sort_order'),
        supabase.from('paper_stocks').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('printing_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('lamination_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('uv_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('paper_categories').select('*').eq('subscriber_id',subscriberId).order('category'),
        supabase.from('binding_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
      ]);
      if(sz?.length){setSheetSizes(sz);setSelSheet(sz[0]);}
      if(pp?.length){setPaperStocks(pp);setSelPaper(pp[0]);}
      setPlateRates(pr||[]);setLamRates(lr||[]);setUvRates(ur||[]);setPaperCats(cats||[]);setBindRates(br||[]);
      const pnames=[...new Set((pr||[]).map((r:any)=>r.plate_name))] as string[];
      setPlateNames(pnames);
      if(pnames.length){
        setSelPlate(pnames[0]);setFjSelPlate(pnames[0]);
        const cols=(pr||[]).filter((r:any)=>r.plate_name===pnames[0]).map((r:any)=>r.color_option);
        setColorsByPlate(cols);setFjColorsByPlate(cols);
        if(cols.length){setSelColor(cols[0]);setFjSelColor(cols[0]);}
      }
      if(cats?.length){setSelCat(cats[0]);}
      setRatesLoaded(true);
      setLoading(false);
    };
    load();
  },[subscriberId]);

  useEffect(()=>{
    if(!selCat) return;
    supabase.from('paper_stocks').select('*').eq('subscriber_id',subscriberId).eq('category',selCat.category).order('gsm')
      .then(({data})=>{setCatStocks(data||[]);if(data?.length)setSelGsm(data[0].gsm);});
  },[selCat,subscriberId]);

  useEffect(()=>{
    if(!selPlate) return;
    const cols=plateRates.filter(r=>r.plate_name===selPlate).map(r=>r.color_option);
    setColorsByPlate(cols);if(cols.length)setSelColor(cols[0]);
  },[selPlate,plateRates]);

  useEffect(()=>{
    if(!fjSelPlate) return;
    const cols=plateRates.filter(r=>r.plate_name===fjSelPlate).map(r=>r.color_option);
    setFjColorsByPlate(cols);if(cols.length)setFjSelColor(cols[0]);
  },[fjSelPlate,plateRates]);

  if(loading) return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',background:'#F7F6F3'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid #E8E8E8',borderTopColor:'#C84B31',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'#888',fontSize:14}}>Loading calculator...</p>
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

  // Use customer's custom markup if set, otherwise subscriber's default
  const M = customer?.markup_percent!=null ? customer.markup_percent : (sub?.markup_percent||25);
  const T = sub?.tax_percent||18;
  const sym = sub?.currency_symbol||'₹';
  const fmt = (n:number)=>sym+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

  // Helper to get customer-specific rate or fall back to default
  const getCustRate=(type:string,key:string,defaultVal:number)=>{
    const r=custRates.find((x:any)=>x.rate_type===type&&x.rate_key===key);
    return r ? r.custom_value : defaultVal;
  };

  // Paper calc
  const calcPaper = ()=>{
    const q=parseInt(paperQty);
    if(!q||!selSheet||!selPaper)return;
    const wpr=selPaper.gsm*selSheet.factor;
    const cpr=wpr*selPaper.rate_per_kg;
    const cps=cpr/500;
    const raw=cps*q;
    const am=raw*(1+M/100);
    const ta=am*(T/100);
    setPaperResult({finalPrice:am+ta,subtotal:raw,markupAmount:am-raw,taxAmount:ta,
      stats:[{label:'Per sheet',value:sym+cps.toFixed(4)},{label:'Per ream (500)',value:sym+cpr.toFixed(2)},{label:'Total weight',value:((wpr/500)*q).toFixed(2)+' kg'},{label:'Total sheets',value:q.toLocaleString('en-IN')}],
      breakdown:[]});
  };

  // Print calc
  const calcPrint = ()=>{
    const q=parseInt(printQty);
    const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
    const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
    if(!q||!fW||!fH)return;
    const pk=size.id==='custom'?autoSelectPlate(fW,fH):size.plateSize;
    const u=calcUps(fW,fH,pk);
    const ws=Math.ceil(q/u);
    const imp=sides==='double'?ws*2:ws;
    const numPlates=1;
    const rate=plateRates.find(r=>r.plate_name===selPlate&&r.color_option===selColor);
    let pCost=0;
    if(rate){
      const pf=rate.fixed_charge*numPlates;
      const fi=1000*numPlates;
      const ei=Math.max(0,imp-fi);
      const er=Math.ceil(ei/1000)*1000;
      pCost=pf+(er/1000)*rate.per_1000_impression;
    }
    let lCost=0;
    if(selLam!=='none'){
      const lr=lamRates.find(r=>r.lam_name===selLam);
      if(lr){const pd=PLATE_DIMS[pk]||{w:18,h:25};const area=pd.w*pd.h;lCost=Math.max((area/100)*lr.per_100_sqinch*imp,lr.minimum_charge);}
    }
    let uCost=0;
    if(selUV!=='none'){
      const ur=uvRates.find(r=>r.uv_name===selUV);
      if(ur){const pd=PLATE_DIMS[pk]||{w:18,h:25};const area=pd.w*pd.h;uCost=Math.max((area/100)*ur.per_100_sqinch*imp,ur.minimum_charge);}
    }
    const sub2=pCost+lCost+uCost;
    const am=sub2*(1+M/100);const ta=am*(T/100);
    const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1};
    setPrintResult({finalPrice:am+ta,subtotal:sub2,markupAmount:am-sub2,taxAmount:ta,
      stats:[{label:'Per piece',value:sym+(((am+ta)/q).toFixed(2))},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Impressions',value:imp.toLocaleString('en-IN')},{label:'Plate: '+pk,value:u+' ups'}],
      breakdown:[{label:'Printing cost',value:sym+pCost.toFixed(2)},...(lCost>0?[{label:'Lamination',value:sym+lCost.toFixed(2)}]:[]),...(uCost>0?[{label:'UV / Coating',value:sym+uCost.toFixed(2)}]:[])]});
  };

  // Full job calc
  const calcFullJob = ()=>{
    const q=parseInt(fjQty);
    const fW=fjSize.id==='custom'?(parseFloat(fjCW)||0):fjSize.w;
    const fH=fjSize.id==='custom'?(parseFloat(fjCH)||0):fjSize.h;
    if(!q||!fW||!fH||!selCat)return;
    const pk=fjSize.id==='custom'?autoSelectPlate(fW,fH):fjSize.plateSize;
    const u=calcUps(fW,fH,pk);
    const pi=PARENT_SHEETS[pk]||{cuts:1,pw:25,ph:36};
    const ws=Math.ceil(q/u);
    const imp=fjSides==='double'?ws*2:ws;
    const numPlates=1;
    // Paper cost
    const f=(pi.pw*pi.ph*0.2666)/828;
    const papC=((f*selGsm*selCat.rate_per_kg)/500)*(ws/pi.cuts);
    // Print cost
    const rate=plateRates.find(r=>r.plate_name===fjSelPlate&&r.color_option===fjSelColor);
    let prC=0;
    if(rate){
      const pf=rate.fixed_charge*numPlates;
      const fi=1000*numPlates;
      const ei=Math.max(0,imp-fi);
      const er=Math.ceil(ei/1000)*1000;
      prC=pf+(er/1000)*rate.per_1000_impression;
    }
    // Lam cost
    let lC=0;
    if(fjSelLam!=='none'){
      const lr=lamRates.find(r=>r.lam_name===fjSelLam);
      if(lr){const pd=PLATE_DIMS[pk]||{w:18,h:25};const area=pd.w*pd.h;lC=Math.max((area/100)*lr.per_100_sqinch*imp,lr.minimum_charge);}
    }
    let uC=0;
    if(fjSelUV!=='none'){
      const ur=uvRates.find(r=>r.uv_name===fjSelUV);
      if(ur){const pd=PLATE_DIMS[pk]||{w:18,h:25};const area=pd.w*pd.h;uC=Math.max((area/100)*ur.per_100_sqinch*imp,ur.minimum_charge);}
    }
    const sub2=papC+prC+lC+uC;
    const am=sub2*(1+M/100);const ta=am*(T/100);
    setFjResult({finalPrice:am+ta,subtotal:sub2,markupAmount:am-sub2,taxAmount:ta,
      stats:[{label:'Per piece',value:sym+(((am+ta)/q).toFixed(2))},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Parent sheets',value:Math.ceil(ws/pi.cuts).toLocaleString('en-IN')},{label:'Impressions',value:imp.toLocaleString('en-IN')}],
      breakdown:[{label:'Paper cost',value:sym+papC.toFixed(2)},{label:'Printing cost',value:sym+prC.toFixed(2)},...(lC>0?[{label:'Lamination',value:sym+lC.toFixed(2)}]:[]),...(uC>0?[{label:'UV / Coating',value:sym+uC.toFixed(2)}]:[])]});
  };

  const cats=[...new Set(paperStocks.map((p:any)=>p.category))];

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        .etab{padding:12px 18px;font-size:14px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;white-space:nowrap;}
        .etab.active{color:#1A1A1A;border-bottom-color:${accentColor};}
        .etab:hover{color:#1A1A1A;}
      `}</style>

      {/* HEADER — Subscriber branding */}
      <div style={{background:'#1A1A1A',padding:'14px 20px',display:'flex',alignItems:'center',gap:10}}>
        {sub?.logo_url && <img src={sub.logo_url} alt={sub.business_name} style={{height:32,borderRadius:4}}/>}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,background:accentColor,borderRadius:'50%'}}/>
          <span style={{fontSize:15,fontWeight:600,color:'#fff'}}>{sub?.business_name||'Print Calculator'}</span>
          {customer&&<span style={{fontSize:11,color:'#888',background:'rgba(255,255,255,0.1)',padding:'2px 8px',borderRadius:4}}>Hi, {customer.name}</span>}
        </div>
        <span style={{marginLeft:'auto',fontSize:11,color:'#444'}}>Powered by PrintCalc</span>
      </div>

      {/* TABS */}
      <div style={{background:'#fff',borderBottom:'1px solid #EBEBEB',display:'flex',padding:'0 20px',overflowX:'auto'}}>
        {[{id:'paper',l:'📄 Paper'},{id:'printing',l:'🖨️ Printing'},{id:'fulljob',l:'✅ Full Job'}].map(t=>(
          <button key={t.id} className={`etab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id as any)}>{t.l}</button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{padding:'20px 16px 48px',maxWidth:560,margin:'0 auto'}}>

        {/* ── PAPER TAB ── */}
        {tab==='paper'&&(
          <div>
            <div style={CARD}>
              <p style={{fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:14}}>Job Details</p>
              <div style={{marginBottom:14}}>
                <div style={LBL}>Sheet size</div>
                <select value={selSheet?.id||''} onChange={e=>{const s=sheetSizes.find((x:any)=>x.id===e.target.value);if(s)setSelSheet(s);}} style={IS}>
                  {sheetSizes.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <div style={LBL}>Paper type{selPaper&&<span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:600,background:selPaper.in_stock?'#F0FFF4':'#FFF0F0',color:selPaper.in_stock?'#38A169':'#E53E3E',border:`1px solid ${selPaper.in_stock?'#9AE6B4':'#FEB2B2'}`}}>{selPaper.in_stock?'● In stock':'● Out of stock'}</span>}</div>
                <select value={selPaper?.id||''} onChange={e=>{const p=paperStocks.find((x:any)=>x.id===e.target.value);if(p)setSelPaper(p);}} style={IS}>
                  {cats.map((cat:any)=><optgroup key={cat} label={`── ${cat} ──`}>{paperStocks.filter((p:any)=>p.category===cat).map((p:any)=><option key={p.id} value={p.id}>{p.label}{!p.in_stock?' — OUT OF STOCK':''}</option>)}</optgroup>)}
                </select>
              </div>
              <div><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>sheets</span></div>
                <input type="number" placeholder="Enter number of sheets" value={paperQty} onChange={e=>setPaperQty(e.target.value)} style={NIS} min="1"/>
              </div>
            </div>
            <button onClick={calcPaper} style={{width:'100%',padding:13,background:accentColor,color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:4}}>Calculate →</button>
            <ResultBox r={paperResult} markup={M} tax={T} sym={sym} accent={accentColor}/>
          </div>
        )}

        {/* ── PRINTING TAB ── */}
        {tab==='printing'&&(
          <div>
            {!ratesLoaded?<div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>:(
              <>
                <div style={CARD}>
                  <p style={{fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:14}}>Job Details</p>
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Final size{size.id!=='custom'&&<span style={{background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontSize:11,fontFamily:'monospace'}}>{calcUps(size.w,size.h,size.plateSize)} ups</span>}</div>
                    <select value={size.id} onChange={e=>{const s=FINAL_SIZES.find(x=>x.id===e.target.value);if(s){setSize(s);if(s.id==='custom'){const pk=autoSelectPlate(parseFloat(cW)||8.3,parseFloat(cH)||11.7);}}}} style={IS}>
                      <optgroup label="── A Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('a')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── American ──">{FINAL_SIZES.filter(s=>s.id.startsWith('am')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── B Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('b')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── Other ──">{FINAL_SIZES.filter(s=>['vc','dl','custom'].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                    </select>
                    {size.id==='custom'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}><input type="number" placeholder="Width (in)" value={cW} onChange={e=>setCW(e.target.value)} style={NIS}/><input type="number" placeholder="Height (in)" value={cH} onChange={e=>setCH(e.target.value)} style={NIS}/></div>}
                  </div>
                  <div style={{marginBottom:14}}><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div><input type="number" placeholder="Enter quantity" value={printQty} onChange={e=>setPrintQty(e.target.value)} style={NIS}/></div>
                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>
                  <div style={{marginBottom:14}}><div style={LBL}>Plate size</div><select value={selPlate} onChange={e=>setSelPlate(e.target.value)} style={IS}>{plateNames.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                  <div style={{marginBottom:14}}><div style={LBL}>Print colors</div><select value={selColor} onChange={e=>setSelColor(e.target.value)} style={IS}>{colorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div style={{marginBottom:14}}><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single',accentColor)} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double',accentColor)} onClick={()=>setSides('double')}>Front + Back</button></div></div>
                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>
                  <div style={{marginBottom:14}}><div style={LBL}>Lamination</div><select value={selLam} onChange={e=>setSelLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select></div>
                  <div><div style={LBL}>UV / Coating</div><select value={selUV} onChange={e=>setSelUV(e.target.value)} style={IS}><option value="none">No UV / Coating</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
                </div>
                <button onClick={calcPrint} style={{width:'100%',padding:13,background:accentColor,color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:4}}>Calculate →</button>
                <ResultBox r={printResult} markup={M} tax={T} sym={sym} accent={accentColor}/>
              </>
            )}
          </div>
        )}

        {/* ── FULL JOB TAB ── */}
        {tab==='fulljob'&&(
          <div>
            {!ratesLoaded?<div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>:(
              <>
                <div style={CARD}>
                  <p style={{fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:14}}>Job Details</p>
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Final size{fjSize.id!=='custom'&&<span style={{background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontSize:11,fontFamily:'monospace'}}>{calcUps(fjSize.w,fjSize.h,fjSize.plateSize)} ups</span>}</div>
                    <select value={fjSize.id} onChange={e=>{const s=FINAL_SIZES.find(x=>x.id===e.target.value);if(s)setFjSize(s);}} style={IS}>
                      <optgroup label="── A Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('a')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── American ──">{FINAL_SIZES.filter(s=>s.id.startsWith('am')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── B Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('b')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── Other ──">{FINAL_SIZES.filter(s=>['vc','dl','custom'].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                    </select>
                    {fjSize.id==='custom'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}><input type="number" placeholder="Width (in)" value={fjCW} onChange={e=>setFjCW(e.target.value)} style={NIS}/><input type="number" placeholder="Height (in)" value={fjCH} onChange={e=>setFjCH(e.target.value)} style={NIS}/></div>}
                  </div>
                  <div style={{marginBottom:14}}><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div><input type="number" placeholder="Enter quantity" value={fjQty} onChange={e=>setFjQty(e.target.value)} style={NIS}/></div>
                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>
                  <div style={{marginBottom:14}}><div style={LBL}>Paper category</div><select value={selCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setSelCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
                  <div style={{marginBottom:14}}><div style={LBL}>GSM</div><select value={selGsm} onChange={e=>setSelGsm(parseInt(e.target.value))} style={IS}>{catStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM{!s.in_stock?' — OUT OF STOCK':''}</option>)}</select></div>
                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>
                  <div style={{marginBottom:14}}><div style={LBL}>Plate size</div><select value={fjSelPlate} onChange={e=>setFjSelPlate(e.target.value)} style={IS}>{plateNames.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                  <div style={{marginBottom:14}}><div style={LBL}>Print colors</div><select value={fjSelColor} onChange={e=>setFjSelColor(e.target.value)} style={IS}>{fjColorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div style={{marginBottom:14}}><div style={LBL}>Sides</div><div style={TW}><button style={TB(fjSides==='single',accentColor)} onClick={()=>setFjSides('single')}>Single side</button><button style={TB(fjSides==='double',accentColor)} onClick={()=>setFjSides('double')}>Front + Back</button></div></div>
                  <div style={{height:1,background:'#F0F0F0',margin:'14px 0'}}/>
                  <div style={{marginBottom:14}}><div style={LBL}>Lamination</div><select value={fjSelLam} onChange={e=>setFjSelLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select></div>
                  <div><div style={LBL}>UV / Coating</div><select value={fjSelUV} onChange={e=>setFjSelUV(e.target.value)} style={IS}><option value="none">No UV / Coating</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
                </div>
                <button onClick={calcFullJob} style={{width:'100%',padding:13,background:accentColor,color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:4}}>Calculate total price →</button>
                <ResultBox r={fjResult} markup={M} tax={T} sym={sym} accent={accentColor}/>
              </>
            )}
          </div>
        )}

        <p style={{textAlign:'center',fontSize:11,color:'#CCC',marginTop:20}}>Powered by <a href="https://printcalc.app" style={{color:'#CCC'}} target="_blank">PrintCalc</a></p>
      </div>
    </>
  );
}
