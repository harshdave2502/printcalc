'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../supabase';

// ─── PLATE DIMS (exact same as subscriber calculator) ─────────────────
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
function calcUps(w:number,h:number,pk:string){const p=PLATE_DIMS[pk];if(!p)return 1;return Math.max(Math.floor(p.w/w)*Math.floor(p.h/h),Math.floor(p.w/h)*Math.floor(p.h/w),1);}

// ─── GSM CONVERTER ────────────────────────────────────────────────────
function gsmInfo(gsm:number):string{
  if(!gsm)return '';
  const ptMap:Record<number,number>={60:4,70:4,80:5,90:5,100:6,115:7,120:7,130:8,150:9,157:9,170:10,200:12,230:13,250:14,300:16,350:18,400:20};
  const pt=ptMap[gsm]||Math.round(gsm/20);
  if(gsm<170){const lb=Math.round(gsm/1.48);return `= ${lb} lb Text · ~${pt}pt`;}
  else{const lb=Math.round(gsm/2.71);return `= ${lb} lb Cover · ~${pt}pt`;}
}

// ─── STYLES ───────────────────────────────────────────────────────────
const IS:any={width:'100%',padding:'10px 14px',border:'1.5px solid #E8E8E8',borderRadius:10,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'#1A1A1A',background:'#FAFAFA',outline:'none',appearance:'none',WebkitAppearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:36};
const NIS:any={...IS,backgroundImage:'none',paddingRight:14,MozAppearance:'textfield'};
const LBL:any={fontSize:12,fontWeight:500,color:'#666',marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center'};
const CARD:any={background:'#fff',borderRadius:14,padding:18,marginBottom:12,border:'1px solid #EBEBEB'};
const TW:any={display:'flex',gap:8};
const TB=(a:boolean,c?:string):any=>({flex:1,padding:'9px',border:`1.5px solid ${a?(c||'#1A1A1A'):'#E8E8E8'}`,borderRadius:10,fontSize:13,fontWeight:500,color:a?'#fff':'#888',background:a?(c||'#1A1A1A'):'#FAFAFA',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const});
function Sec({title,children,accent}:any){return(<div style={{border:`1.5px solid ${accent||'#E8E8E8'}`,borderRadius:14,marginBottom:10,overflow:'hidden'}}><div style={{background:accent?accent+'18':'#F9F9F9',padding:'10px 16px'}}><p style={{fontSize:11,fontWeight:600,color:accent||'#1A1A1A',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:0}}>{title}</p></div><div style={{padding:16}}>{children}</div></div>);}

// ─── CUSTOMER RESULT (no cost breakdown, show job summary + actions) ──
function CustomerResult({r,sym,accent,onPDF,onSaveQuote,onOrderNow,saving,ordering}:any){
  if(!r)return null;
  const qn='QT-'+Date.now().toString().slice(-6);
  return(
    <div style={{marginTop:16}} id="customer-result">
      {/* Price */}
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

      {/* Job summary */}
      <div style={{background:'#F9F9F9',borderRadius:12,border:'1px solid #EBEBEB',padding:16,marginBottom:12}}>
        <p style={{fontSize:11,fontWeight:600,color:'#888',textTransform:'uppercase' as const,letterSpacing:'0.08em',marginBottom:10}}>Job Summary</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {r.summary.map((s:any)=>(
            <div key={s.label}>
              <p style={{fontSize:11,color:'#AAA',marginBottom:1}}>{s.label}</p>
              <p style={{fontSize:13,fontWeight:500,color:'#1A1A1A'}}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Action buttons */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
        <button onClick={onPDF} style={{padding:'12px 8px',background:'#1A1A1A',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          📄 PDF Quote
        </button>
        <button onClick={onSaveQuote} disabled={saving} style={{padding:'12px 8px',background:'#185FA5',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',opacity:saving?0.7:1}}>
          {saving?'Saving...':'📋 Save Quote'}
        </button>
        <button onClick={onOrderNow} disabled={ordering} style={{padding:'12px 8px',background:accent||'#C84B31',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:ordering?'not-allowed':'pointer',fontFamily:'inherit',opacity:ordering?0.7:1}}>
          {ordering?'Placing...':'🛒 Order Now'}
        </button>
      </div>
      <p style={{textAlign:'center',fontSize:11,color:'#AAA'}}>Quote valid for 7 days · {r.businessName}</p>
    </div>
  );
}

// ─── PDF GENERATOR (browser print) ───────────────────────────────────
function printPDF(r:any, sub:any, customer:any, sym:string){
  const date=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const qn='QT-'+Date.now().toString().slice(-6);
  const html=`
    <html><head><title>Quote ${qn}</title>
    <style>
      body{font-family:'DM Sans',sans-serif;margin:0;padding:40px;color:#1A1A1A;background:#fff;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C84B31;padding-bottom:20px;margin-bottom:24px;}
      .biz-name{font-size:24px;font-weight:700;color:#1A1A1A;}
      .qn{font-size:13px;color:#888;}
      .price-box{background:#1A1A1A;color:#fff;padding:24px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;}
      .price-label{font-size:13px;color:#888;margin-bottom:4px;}
      .price-val{font-size:36px;font-weight:700;font-family:monospace;}
      .price-per{font-size:14px;color:#AAA;}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;}
      th{text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;padding:8px 12px;background:#F9F9F9;border-bottom:1px solid #E8E8E8;}
      td{padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:13px;}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E8E8E8;font-size:11px;color:#AAA;text-align:center;}
      .gst-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;font-size:13px;}
      .gst-total{display:flex;justify-content:space-between;padding:10px 0;font-size:15px;font-weight:700;}
      @media print{body{padding:20px;}}
    </style></head>
    <body>
      <div class="header">
        <div>
          <div class="biz-name">${sub?.business_name||'Print Shop'}</div>
          ${customer?`<div style="font-size:13px;color:#888;margin-top:4px;">Prepared for: ${customer.name}${customer.company?' · '+customer.company:''}</div>`:''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:600;">QUOTE</div>
          <div class="qn">${qn}</div>
          <div class="qn">${date}</div>
        </div>
      </div>

      <div class="price-box">
        <div>
          <div class="price-label">Total Price (incl. GST)</div>
          <div class="price-val">${sym}${r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div style="text-align:right;">
          <div class="price-label">Per piece</div>
          <div class="price-per">${sym}${r.perPiece}</div>
        </div>
      </div>

      <table>
        <tr><th colspan="2">Job Details</th></tr>
        ${r.summary.map((s:any)=>`<tr><td style="color:#888;width:40%;">${s.label}</td><td style="font-weight:500;">${s.value}</td></tr>`).join('')}
      </table>

      <div style="background:#F9F9F9;padding:16px;border-radius:8px;margin-bottom:24px;">
        <div class="gst-row"><span>Subtotal (before tax)</span><span>${sym}${r.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
        <div class="gst-row"><span>GST @ ${r.taxPct}%</span><span>${sym}${r.taxAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
        <div class="gst-total"><span>Total incl. GST</span><span style="color:#C84B31;">${sym}${r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
      </div>

      <div class="footer">
        This quote is valid for 7 days from the date of issue.<br/>
        Generated by ${sub?.business_name||'Print Shop'} · Powered by PrintCalc
      </div>
    </body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
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

  // ── JOB TYPE ──────────────────────────────────────────────────
  const [jobType, setJobType] = useState<'single'|'book'>('single');
  const [sizeUnit, setSizeUnit] = useState<'in'|'mm'|'cm'>('in');

  // ── COMMON FIELDS ─────────────────────────────────────────────
  const [size, setSize] = useState(FINAL_SIZES[2]);
  const [cW, setCW] = useState(''); const [cH, setCH] = useState('');
  const [qty, setQty] = useState('');
  const [paperCats, setPaperCats] = useState<any[]>([]);
  const [plateRates, setPlateRates] = useState<any[]>([]);
  const [lamRates, setLamRates] = useState<any[]>([]);
  const [uvRates, setUvRates] = useState<any[]>([]);
  const [bindRates, setBindRates] = useState<any[]>([]);
  const [plateNames, setPlateNames] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // ── SINGLE ITEM FIELDS ────────────────────────────────────────
  const [selCat, setSelCat] = useState<any>(null);
  const [paperStocks, setPaperStocks] = useState<any[]>([]);
  const [gsm, setGsm] = useState(0);
  const [selPlate, setSelPlate] = useState('');
  const [selColor, setSelColor] = useState('');
  const [colorsByPlate, setColorsByPlate] = useState<string[]>([]);
  const [sides, setSides] = useState<'single'|'double'>('double');
  const [selLam, setSelLam] = useState('none');
  const [lamDbl, setLamDbl] = useState(false);
  const [selUV, setSelUV] = useState('none');

  // ── BROCHURE FIELDS ───────────────────────────────────────────
  const [totalPages, setTotalPages] = useState('');
  const [pageError, setPageError] = useState('');
  const [covCat, setCovCat] = useState<any>(null);
  const [covStocks, setCovStocks] = useState<any[]>([]);
  const [covGsm, setCovGsm] = useState(0);
  const [covColor, setCovColor] = useState('');
  const [covColorsByPlate, setCovColorsByPlate] = useState<string[]>([]);
  const [covLam, setCovLam] = useState('none');
  const [covLamDbl, setCovLamDbl] = useState(true);
  const [covUV, setCovUV] = useState('none');
  const [innCat, setInnCat] = useState<any>(null);
  const [innStocks, setInnStocks] = useState<any[]>([]);
  const [innGsm, setInnGsm] = useState(0);
  const [innColor, setInnColor] = useState('');
  const [innColorsByPlate, setInnColorsByPlate] = useState<string[]>([]);
  const [innLam, setInnLam] = useState('none');
  const [selBind, setSelBind] = useState('none');

  // ── ACTIONS ───────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // ── QUOTES & ORDERS ───────────────────────────────────────────
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
      const [{data:cats},{data:pr},{data:lr},{data:ur},{data:br}] = await Promise.all([
        supabase.from('paper_categories').select('*').eq('subscriber_id',subscriberId).order('category'),
        supabase.from('printing_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('lamination_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('uv_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
        supabase.from('binding_rates').select('*').eq('subscriber_id',subscriberId).order('sort_order'),
      ]);
      setPaperCats(cats||[]);setPlateRates(pr||[]);setLamRates(lr||[]);setUvRates(ur||[]);setBindRates(br||[]);
      if(cats?.length){setSelCat(cats[0]);setCovCat(cats[0]);setInnCat(cats[0]);}
      const pnames=[...new Set((pr||[]).map((r:any)=>r.plate_name))] as string[];
      setPlateNames(pnames);
      if(pnames.length){
        setSelPlate(pnames[0]);
        const cols=(pr||[]).filter((r:any)=>r.plate_name===pnames[0]).map((r:any)=>r.color_option);
        setColorsByPlate(cols);setCovColorsByPlate(cols);setInnColorsByPlate(cols);
        if(cols.length){setSelColor(cols[0]);setCovColor(cols[0]);setInnColor(cols[0]);}
      }
      setRatesLoaded(true);setLoading(false);
    };
    load();
  },[subscriberId]);

  // Load paper stocks for single item
  useEffect(()=>{if(!selCat)return;supabase.from('paper_stocks').select('*').eq('subscriber_id',subscriberId).eq('category',selCat.category).order('gsm').then(({data})=>{setPaperStocks(data||[]);if(data?.length)setGsm(data[0].gsm);});},[selCat,subscriberId]);
  // Load cover stocks
  useEffect(()=>{if(!covCat)return;supabase.from('paper_stocks').select('*').eq('subscriber_id',subscriberId).eq('category',covCat.category).order('gsm').then(({data})=>{setCovStocks(data||[]);if(data?.length)setCovGsm(data[0].gsm);});},[covCat,subscriberId]);
  // Load inner stocks
  useEffect(()=>{if(!innCat)return;supabase.from('paper_stocks').select('*').eq('subscriber_id',subscriberId).eq('category',innCat.category).order('gsm').then(({data})=>{setInnStocks(data||[]);if(data?.length)setInnGsm(data[0].gsm);});},[innCat,subscriberId]);
  // Update colors on plate change
  useEffect(()=>{const cols=plateRates.filter(r=>r.plate_name===selPlate).map(r=>r.color_option);setColorsByPlate(cols);setCovColorsByPlate(cols);setInnColorsByPlate(cols);if(cols.length){setSelColor(cols[0]);setCovColor(cols[0]);setInnColor(cols[0]);};},[selPlate,plateRates]);

  // Load quotes/orders when tab opens
  useEffect(()=>{
    if(tab==='quotes'&&!quotesLoaded&&customer){
      supabase.from('quotes').select('*').eq('customer_email',customer.email).eq('subscriber_id',subscriberId).order('created_at',{ascending:false})
        .then(({data})=>{setQuotes(data||[]);setQuotesLoaded(true);});
    }
    if(tab==='orders'&&!ordersLoaded&&customer){
      supabase.from('orders').select('*').eq('customer_email',customer.email).eq('subscriber_id',subscriberId).order('created_at',{ascending:false})
        .then(({data})=>{setOrders(data||[]);setOrdersLoaded(true);});
    }
  },[tab,customer,quotesLoaded,ordersLoaded,subscriberId]);

  const M = customer?.markup_percent!=null ? customer.markup_percent : (sub?.markup_percent||25);
  const T = sub?.tax_percent||18;
  const sym = sub?.currency_symbol||'₹';

  const getCustRate=(type:string,key:string,def:number)=>{
    const r=custRates.find((x:any)=>x.rate_type===type&&x.rate_key===key);
    return r?r.custom_value:def;
  };

  // ── COST HELPERS (exact same as subscriber calculator) ────────
  const paperCost=(cat:any,gsmVal:number,sheets:number,pk:string)=>{
    if(!cat||!gsmVal||!sheets)return 0;
    const catRate=getCustRate('paper',cat.category,cat.rate_per_kg);
    const pi=PARENT_SHEETS[pk]||{cuts:1,pw:25,ph:36};
    const f=(pi.pw*pi.ph*0.2666)/828;
    return((f*gsmVal*catRate)/500)*(sheets/pi.cuts);
  };
  const printCost=(plateName:string,colorOpt:string,numPlates:number,impressions:number)=>{
    if(!plateName||!colorOpt||!numPlates||!impressions)return 0;
    const rate=plateRates.find(r=>r.plate_name===plateName&&r.color_option===colorOpt);
    if(!rate)return 0;
    const rkey=`${rate.plate_name}__${rate.color_option}`;
    const fixedCharge=getCustRate('print_fixed',rkey,rate.fixed_charge);
    const per1000=getCustRate('print_per1000',rkey,rate.per_1000_impression);
    const plateFixed=fixedCharge*numPlates;
    const freeImp=1000*numPlates;
    const extraImp=Math.max(0,impressions-freeImp);
    const extraRounded=Math.ceil(extraImp/1000)*1000;
    return plateFixed+(extraRounded/1000)*per1000;
  };
  const lamCost=(lamName:string,pk:string,impressions:number)=>{
    if(lamName==='none'||!impressions)return 0;
    const lr=lamRates.find(r=>r.lam_name===lamName);if(!lr)return 0;
    const lamRate=getCustRate('lam',lr.lam_name,lr.per_100_sqinch);
    const pd=PLATE_DIMS[pk]||{w:18,h:25};
    return Math.max((pd.w*pd.h/100)*lamRate*impressions,lr.minimum_charge);
  };
  const uvCost=(uvName:string,pk:string,impressions:number)=>{
    if(uvName==='none'||!impressions)return 0;
    const ur=uvRates.find(r=>r.uv_name===uvName);if(!ur)return 0;
    const uvRate=getCustRate('uv',ur.uv_name,ur.per_100_sqinch);
    const pd=PLATE_DIMS[pk]||{w:18,h:25};
    return Math.max((pd.w*pd.h/100)*uvRate*impressions,ur.minimum_charge);
  };

  const validatePages=(v:string)=>{const n=parseInt(v);if(!n){setPageError('');return;}if(n%4!==0)setPageError('Pages must be divisible by 4');else setPageError('');};

  // ── MAIN CALC (exact same formulas as subscriber calculator) ──
  const calc=()=>{
    const q=parseInt(qty);
    const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
    const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
    if(!q||!fW||!fH)return;
    const pk=size.id==='custom'?
      Object.keys(PLATE_DIMS).reduce((best,pk2)=>{const p=PLATE_DIMS[pk2];const ups=Math.max(Math.floor(p.w/fW)*Math.floor(p.h/fH),Math.floor(p.w/fH)*Math.floor(p.h/fW),1);const bups=Math.max(Math.floor(PLATE_DIMS[best].w/fW)*Math.floor(PLATE_DIMS[best].h/fH),Math.floor(PLATE_DIMS[best].w/fH)*Math.floor(PLATE_DIMS[best].h/fW),1);return ups>bups?pk2:best;},'18×25"')
      :size.plateSize;
    const u=calcUps(fW,fH,pk);
    const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1,pw:25,ph:36};

    let finalPrice=0,subtotal=0,taxAmount=0,summary:any[]=[];

    if(jobType==='single'){
      if(!selCat)return;
      const ws=Math.ceil(q/u);
      const imp=sides==='double'?ws*2:ws;
      const papC=paperCost(selCat,gsm,ws,pk);
      const prC=printCost(selPlate,selColor,1,imp);
      const lC=lamCost(selLam,pk,imp);
      const uC=uvCost(selUV,pk,imp);
      const sub2=papC+prC+lC+uC;
      const am=sub2*(1+M/100);
      taxAmount=am*(T/100);
      finalPrice=am+taxAmount;
      subtotal=sub2;
      summary=[
        {label:'Final size',value:size.id==='custom'?`${fW}" × ${fH}"`:size.label},
        {label:'Quantity',value:q.toLocaleString('en-IN')+' pcs'},
        {label:'Paper',value:`${selCat.category} ${gsm} GSM`},
        {label:'Print colors',value:selColor},
        {label:'Sides',value:sides==='double'?'Both Sides':'Single side'},
        {label:'Working sheets',value:ws.toLocaleString('en-IN')},
        ...(selLam!=='none'?[{label:'Lamination',value:selLam}]:[]),
        ...(selUV!=='none'?[{label:'UV / Coating',value:selUV}]:[]),
      ];
    } else {
      const pages=parseInt(totalPages);
      if(!pages||pages%4!==0||!covCat||!innCat)return;
      const coverPages=4;
      const innerPages=pages-4;
      const covWS=(coverPages/(u*2))*q;
      const covImp=covWS*2;
      const covPlatesN=Math.ceil(coverPages/u);
      const covPapC=paperCost(covCat,covGsm,covWS,pk);
      const covPrC=printCost(selPlate,covColor,covPlatesN,covImp);
      const covLC=lamCost(covLam,pk,covImp);
      const covUC=uvCost(covUV,pk,covImp);
      const innSheetsPerCopy=innerPages/(u*2);
      const innWS=innSheetsPerCopy*q;
      const innImp=innWS*2;
      const innPlatesN=Math.ceil(innerPages/u);
      const innPapC=paperCost(innCat,innGsm,innWS,pk);
      const innPrC=printCost(selPlate,innColor,innPlatesN,innImp);
      const innLC=lamCost(innLam,pk,innImp);
      const bindFormatsPerCopy=innSheetsPerCopy+1;
      let bC=0;
      if(selBind!=='none'){const br=bindRates.find(r=>r.binding_name===selBind);if(br)bC=bindFormatsPerCopy*br.per_binding_format*q;}
      const sub2=covPapC+covPrC+covLC+covUC+innPapC+innPrC+innLC+bC;
      const am=sub2*(1+M/100);
      taxAmount=am*(T/100);
      finalPrice=am+taxAmount;
      subtotal=sub2;
      summary=[
        {label:'Job type',value:'Brochure / Book'},
        {label:'Final size',value:size.id==='custom'?`${fW}" × ${fH}"`:size.label},
        {label:'Copies',value:q.toLocaleString('en-IN')},
        {label:'Total pages',value:pages+' pages'},
        {label:'Cover paper',value:`${covCat.category} ${covGsm} GSM`},
        {label:'Inner paper',value:`${innCat.category} ${innGsm} GSM`},
        {label:'Cover colors',value:covColor},
        {label:'Inner colors',value:innColor},
        ...(covLam!=='none'?[{label:'Cover lam',value:covLam}]:[]),
        ...(selBind!=='none'?[{label:'Binding',value:selBind}]:[]),
      ];
    }

    const jobData={
      subscriber_id:subscriberId,
      customer_name:customer?.name||'Customer',
      customer_email:customer?.email||'',
      customer_phone:customer?.phone||'',
      company:customer?.company||'',
      job_title:`${size.id==='custom'?`${fW}×${fH}`:size.label} - ${q} ${jobType==='book'?'copies':'pcs'}`,
      size:`${fW}" × ${fH}"`,
      paper_type:jobType==='single'?`${selCat?.category} ${gsm} GSM`:`Cover: ${covCat?.category} ${covGsm}GSM / Inner: ${innCat?.category} ${innGsm}GSM`,
      quantity:q,
      sides:sides,
      color_option:jobType==='single'?selColor:covColor,
      lamination:jobType==='single'?selLam:covLam,
      total_amount:finalPrice,
      status:'Sent',
      notes:`Via customer calculator. UPS: ${u}`,
    };

    setResult({finalPrice,perPiece:(finalPrice/q).toFixed(2),taxAmount,taxPct:T,subtotal,summary,businessName:sub?.business_name,jobData});
    setSavedMsg('');
  };

  const saveQuote=async()=>{
    if(!result)return;
    setSaving(true);
    await supabase.from('quotes').insert({...result.jobData,status:'Sent'});
    setQuotesLoaded(false); // refresh quotes list
    setSavedMsg('Quote saved! View in My Quotes tab.');
    setSaving(false);
  };

  const orderNow=async()=>{
    if(!result)return;
    setOrdering(true);
    await supabase.from('orders').insert({
      ...result.jobData,
      status:'Pending',
      advance_paid:0,
      due_amount:result.finalPrice,
    });
    setOrdersLoaded(false); // refresh orders list
    setSavedMsg('Order placed! View in My Orders tab.');
    setOrdering(false);
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

  const pages=parseInt(totalPages)||0;
  const fWc=size.id==='custom'?(parseFloat(cW)||0):size.w;
  const fHc=size.id==='custom'?(parseFloat(cH)||0):size.h;
  const u=calcUps(fWc||8.3,fHc||11.7,size.plateSize);
  const innSheetsPerCopy=pages>4?Math.ceil((pages-4)/(u*2)):0;

  const SC:Record<string,string>={Draft:'#888',Sent:'#185FA5',Converted:'#38A169',Expired:'#E53E3E',Pending:'#D97706','In Production':'#185FA5',Ready:'#6B46C1',Delivered:'#38A169'};
  const SBG:Record<string,string>={Draft:'#F5F5F5',Sent:'#EEF4FA',Converted:'#F0FFF4',Expired:'#FFF0F0',Pending:'#FFFBEB','In Production':'#EEF4FA',Ready:'#F5F0FF',Delivered:'#F0FFF4'};

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}input[type=number]{-moz-appearance:textfield;}
        .etab{padding:12px 16px;font-size:13px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;white-space:nowrap;flex-shrink:0;}
        .etab.active{color:#1A1A1A;border-bottom-color:${accentColor};}.etab:hover{color:#1A1A1A;}
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
            {!ratesLoaded?<div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>:(
              <>
                {/* Job type */}
                <div style={CARD}>
                  <p style={{fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:12}}>Job Type</p>
                  <div style={TW}>
                    <button style={TB(jobType==='single',accentColor)} onClick={()=>setJobType('single')}>
                      <div>📄 Single Item</div>
                      <div style={{fontSize:11,fontWeight:400,opacity:0.7,marginTop:2}}>Leaflet / Poster / Card</div>
                    </button>
                    <button style={TB(jobType==='book',accentColor)} onClick={()=>setJobType('book')}>
                      <div>📚 Brochure / Book</div>
                      <div style={{fontSize:11,fontWeight:400,opacity:0.7,marginTop:2}}>Multi page with binding</div>
                    </button>
                  </div>
                </div>

                {/* Job Specs */}
                <Sec title="Job Specs">
                  <div style={{marginBottom:14}}>
                    <div style={LBL}>Final size{size.id!=='custom'&&<span style={{background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontSize:11,fontFamily:'monospace'}}>{u} ups</span>}</div>
                    <select value={size.id} onChange={e=>{const s=FINAL_SIZES.find(x=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>
                      <optgroup label="── A Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('a')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── American ──">{FINAL_SIZES.filter(s=>s.id.startsWith('am')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── B Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('b')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                      <optgroup label="── Other ──">{FINAL_SIZES.filter(s=>['vc','dl','custom'].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
                    </select>
                    {size.id==='custom'&&(
                      <div style={{marginTop:8}}>
                        <div style={{display:'flex',gap:6,marginBottom:8,alignItems:'center'}}>
                          <span style={{fontSize:11,color:'#888'}}>Unit:</span>
                          {(['in','mm','cm'] as const).map(u2=>(
                            <button key={u2} onClick={()=>setSizeUnit(u2)} style={{padding:'3px 10px',fontSize:11,fontWeight:600,border:'1.5px solid',borderColor:sizeUnit===u2?'#1A1A1A':'#E8E8E8',borderRadius:6,background:sizeUnit===u2?'#1A1A1A':'#fff',color:sizeUnit===u2?'#fff':'#888',cursor:'pointer',fontFamily:'inherit',textTransform:'uppercase' as const}}>{u2}</button>
                          ))}
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          <input type="number" placeholder={`Width (${sizeUnit})`} value={cW?(sizeUnit==='mm'?(parseFloat(cW)*25.4).toFixed(1):sizeUnit==='cm'?(parseFloat(cW)*2.54).toFixed(2):cW):''} onChange={e=>{const v=parseFloat(e.target.value)||0;setCW(sizeUnit==='mm'?(v/25.4).toFixed(3):sizeUnit==='cm'?(v/2.54).toFixed(3):e.target.value);}} style={NIS}/>
                          <input type="number" placeholder={`Height (${sizeUnit})`} value={cH?(sizeUnit==='mm'?(parseFloat(cH)*25.4).toFixed(1):sizeUnit==='cm'?(parseFloat(cH)*2.54).toFixed(2):cH):''} onChange={e=>{const v=parseFloat(e.target.value)||0;setCH(sizeUnit==='mm'?(v/25.4).toFixed(3):sizeUnit==='cm'?(v/2.54).toFixed(3):e.target.value);}} style={NIS}/>
                        </div>
                        {cW&&cH&&<p style={{fontSize:11,color:'#888',marginTop:4}}>= {parseFloat(cW).toFixed(2)}" × {parseFloat(cH).toFixed(2)}" (inches)</p>}
                      </div>
                    )}
                  </div>
                  <div style={{marginBottom:jobType==='book'?12:0}}>
                    <div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>{jobType==='book'?'copies':'pieces'}</span></div>
                    <input type="number" placeholder={jobType==='book'?'Enter number of copies':'Enter quantity'} value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/>
                  </div>
                  {jobType==='book'&&(
                    <div style={{marginTop:12}}>
                      <div style={LBL}>Total pages<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>must be ÷ 4 (min 8)</span></div>
                      <input type="number" placeholder="e.g. 8, 12, 16, 24, 32..." value={totalPages} onChange={e=>{setTotalPages(e.target.value);validatePages(e.target.value);}} style={NIS}/>
                      {pageError&&<p style={{fontSize:12,color:'#E53E3E',marginTop:4}}>⚠ {pageError}</p>}
                      {pages>=8&&!pageError&&(
                        <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap' as const}}>
                          <span style={{fontSize:11,background:'#F5F0FF',color:'#6B46C1',borderRadius:4,padding:'2px 8px',fontWeight:500}}>📄 Cover: 4 pages</span>
                          <span style={{fontSize:11,background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontWeight:500}}>📋 Inner: {pages-4} pages</span>
                          <span style={{fontSize:11,background:'#F0FFF4',color:'#276749',borderRadius:4,padding:'2px 8px',fontFamily:'monospace'}}>{innSheetsPerCopy} sheets/copy</span>
                        </div>
                      )}
                    </div>
                  )}
                </Sec>

                {/* ── SINGLE ITEM MODE ── */}
                {jobType==='single'&&(
                  <>
                    <Sec title="Paper">
                      <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={selCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setSelCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
                      <div>
                        <div style={LBL}>GSM{gsm>0&&<span style={{fontSize:11,color:'#888',fontWeight:400,fontFamily:'monospace'}}>{gsmInfo(gsm)}</span>}</div>
                        <select value={gsm} onChange={e=>setGsm(parseInt(e.target.value))} style={IS}>{paperStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM{!s.in_stock?' — OUT OF STOCK':''}</option>)}</select>
                      </div>
                    </Sec>
                    <Sec title="Printing">
                      <div style={{marginBottom:12,padding:'8px 12px',background:'#F0F7FF',borderRadius:8,fontSize:12,color:'#185FA5'}}>🎯 Plate: <strong>{selPlate}</strong> (auto from final size) · {calcUps(size.w||8.3,size.h||11.7,size.plateSize)} ups</div>
                      <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={selColor} onChange={e=>setSelColor(e.target.value)} style={IS}>{colorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                      <div><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single',accentColor)} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double',accentColor)} onClick={()=>setSides('double')}>Both Sides</button></div></div>
                    </Sec>
                    <Sec title="Finishing (Optional)">
                      <div style={{marginBottom:12}}><div style={LBL}>Lamination</div><select value={selLam} onChange={e=>setSelLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select>{selLam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!lamDbl,accentColor)} onClick={()=>setLamDbl(false)}>Single side</button><button style={TB(lamDbl,accentColor)} onClick={()=>setLamDbl(true)}>Both Sides</button></div>}</div>
                      <div><div style={LBL}>UV / Coating</div><select value={selUV} onChange={e=>setSelUV(e.target.value)} style={IS}><option value="none">No UV</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
                    </Sec>
                  </>
                )}

                {/* ── BROCHURE / BOOK MODE ── */}
                {jobType==='book'&&(
                  <>
                    <Sec title="📄 Cover (4 pages — double side)" accent="#6B46C1">
                      <p style={{fontSize:12,color:'#888',marginBottom:12}}>Cover = 1 sheet both sides = 4 pages. Use heavier paper.</p>
                      <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={covCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setCovCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
                      <div style={{marginBottom:12}}><div style={LBL}>GSM{covGsm>0&&<span style={{fontSize:11,color:'#888',fontWeight:400,fontFamily:'monospace'}}>{gsmInfo(covGsm)}</span>}</div><select value={covGsm} onChange={e=>setCovGsm(parseInt(e.target.value))} style={IS}>{covStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM</option>)}</select></div>
                      <div style={{height:1,background:'#F0F0F0',margin:'12px 0'}}/>
                      <div style={{marginBottom:12,padding:'8px 12px',background:'#F5F0FF',borderRadius:8,fontSize:12,color:'#6B46C1'}}>🎯 Plate: <strong>{selPlate}</strong> · Colors: {colorsByPlate.join(', ')}</div>
                      <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={covColor} onChange={e=>setCovColor(e.target.value)} style={IS}>{covColorsByPlate.map((c:string)=><option key={c} value={c}>{c}</option>)}</select></div>
                      <div style={{height:1,background:'#F0F0F0',margin:'12px 0'}}/>
                      <div style={{marginBottom:12}}><div style={LBL}>Lamination</div><select value={covLam} onChange={e=>setCovLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select>{covLam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!covLamDbl,accentColor)} onClick={()=>setCovLamDbl(false)}>Single side</button><button style={TB(covLamDbl,accentColor)} onClick={()=>setCovLamDbl(true)}>Both Sides</button></div>}</div>
                      <div><div style={LBL}>UV / Coating</div><select value={covUV} onChange={e=>setCovUV(e.target.value)} style={IS}><option value="none">No UV</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
                    </Sec>

                    <Sec title={`📋 Inner Pages (${pages>4?pages-4:0} pages — double side)`} accent="#185FA5">
                      <p style={{fontSize:12,color:'#888',marginBottom:12}}>Inner pages both sides. Use lighter paper.</p>
                      <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={innCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setInnCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
                      <div style={{marginBottom:12}}><div style={LBL}>GSM{innGsm>0&&<span style={{fontSize:11,color:'#888',fontWeight:400,fontFamily:'monospace'}}>{gsmInfo(innGsm)}</span>}</div><select value={innGsm} onChange={e=>setInnGsm(parseInt(e.target.value))} style={IS}>{innStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM</option>)}</select></div>
                      <div style={{height:1,background:'#F0F0F0',margin:'12px 0'}}/>
                      <div style={{marginBottom:12,padding:'8px 12px',background:'#EEF4FA',borderRadius:8,fontSize:12,color:'#185FA5'}}>🎯 Plate: <strong>{selPlate}</strong> · Colors: {innColorsByPlate.join(', ')}</div>
                      <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={innColor} onChange={e=>setInnColor(e.target.value)} style={IS}>{innColorsByPlate.map((c:string)=><option key={c} value={c}>{c}</option>)}</select></div>
                      <div><div style={LBL}>Lamination (optional)</div><select value={innLam} onChange={e=>setInnLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select></div>
                    </Sec>

                    <Sec title="📎 Binding">
                      <p style={{fontSize:12,color:'#888',marginBottom:8}}>Binding cost is per format per copy</p>
                      <select value={selBind} onChange={e=>setSelBind(e.target.value)} style={IS}><option value="none">No Binding</option>{bindRates.map(r=><option key={r.id} value={r.binding_name}>{r.binding_name}</option>)}</select>
                    </Sec>
                  </>
                )}

                <button onClick={calc} style={{width:'100%',padding:14,background:accentColor,color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>
                  Calculate total price →
                </button>

                {savedMsg&&(
                  <div style={{background:'#F0FFF4',border:'1px solid #9AE6B4',borderRadius:10,padding:14,marginTop:12,textAlign:'center'}}>
                    <p style={{fontSize:13,fontWeight:600,color:'#276749'}}>✅ {savedMsg}</p>
                  </div>
                )}

                {result&&(
                  <CustomerResult
                    r={result} sym={sym} accent={accentColor}
                    onPDF={()=>printPDF(result,sub,customer,sym)}
                    onSaveQuote={saveQuote}
                    onOrderNow={orderNow}
                    saving={saving}
                    ordering={ordering}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ── MY QUOTES TAB ── */}
        {tab==='quotes'&&(
          <div>
            <p style={{fontSize:16,fontWeight:600,marginBottom:4}}>My Quotes</p>
            <p style={{fontSize:13,color:'#888',marginBottom:16}}>All quotes from {sub?.business_name}</p>
            {!quotesLoaded?<div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>
            :quotes.length===0?(
              <div style={{...CARD,textAlign:'center',padding:40}}>
                <p style={{fontSize:32,marginBottom:12}}>📋</p>
                <p style={{fontSize:15,fontWeight:600,marginBottom:6}}>No quotes yet</p>
                <p style={{fontSize:13,color:'#888'}}>Calculate a price and save a quote!</p>
              </div>
            ):(
              quotes.map((q:any)=>(
                <div key={q.id} style={{...CARD,marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div><p style={{fontWeight:600,fontSize:14}}>{q.job_title||'Print Job'}</p><p style={{fontSize:12,color:'#888',marginTop:2}}>{new Date(q.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p></div>
                    <span className="badge" style={{background:SBG[q.status]||'#F5F5F5',color:SC[q.status]||'#888'}}>{q.status}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[{l:'Size',v:q.size||'—'},{l:'Quantity',v:q.quantity?.toLocaleString('en-IN')||'—'},{l:'Paper',v:q.paper_type||'—'},{l:'Amount',v:q.total_amount?`${sym}${q.total_amount.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'}].map(item=>(
                      <div key={item.l}><p style={{fontSize:11,color:'#AAA'}}>{item.l}</p><p style={{fontSize:13,fontWeight:500}}>{item.v}</p></div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── MY ORDERS TAB ── */}
        {tab==='orders'&&(
          <div>
            <p style={{fontSize:16,fontWeight:600,marginBottom:4}}>My Orders</p>
            <p style={{fontSize:13,color:'#888',marginBottom:16}}>All orders from {sub?.business_name}</p>
            {!ordersLoaded?<div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>
            :orders.length===0?(
              <div style={{...CARD,textAlign:'center',padding:40}}>
                <p style={{fontSize:32,marginBottom:12}}>📦</p>
                <p style={{fontSize:15,fontWeight:600,marginBottom:6}}>No orders yet</p>
                <p style={{fontSize:13,color:'#888'}}>Place an order from the calculator!</p>
              </div>
            ):(
              orders.map((o:any)=>(
                <div key={o.id} style={{...CARD,marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div><p style={{fontWeight:600,fontSize:14}}>{o.job_title||'Print Order'}</p><p style={{fontSize:12,color:'#888',marginTop:2}}>{new Date(o.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p></div>
                    <span className="badge" style={{background:SBG[o.status]||'#F5F5F5',color:SC[o.status]||'#888'}}>{o.status}</span>
                  </div>
                  <div style={{display:'flex',gap:4,marginBottom:10}}>
                    {['Pending','In Production','Ready','Delivered'].map((st,i)=>{
                      const steps=['Pending','In Production','Ready','Delivered'];
                      const curr=steps.indexOf(o.status);
                      const active=i<=curr;
                      return(<div key={st} style={{flex:1}}><div style={{height:3,borderRadius:2,background:active?accentColor:'#E8E8E8',marginBottom:3}}/><p style={{fontSize:9,color:active?accentColor:'#CCC',textAlign:'center' as const}}>{st}</p></div>);
                    })}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[{l:'Total',v:o.total_amount?`${sym}${o.total_amount.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'},{l:'Advance paid',v:o.advance_paid?`${sym}${o.advance_paid.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'},{l:'Due',v:o.due_amount?`${sym}${o.due_amount.toLocaleString('en-IN',{minimumFractionDigits:2})}`:'—'},{l:'Qty',v:o.quantity?.toLocaleString('en-IN')||'—'}].map(item=>(
                      <div key={item.l}><p style={{fontSize:11,color:'#AAA'}}>{item.l}</p><p style={{fontSize:13,fontWeight:500}}>{item.v}</p></div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <p style={{textAlign:'center',fontSize:10,color:'#DDD',marginTop:24}}>Powered by <a href="https://printcalc.app" style={{color:'#DDD'}} target="_blank">PrintCalc</a></p>
      </div>
    </>
  );
}
