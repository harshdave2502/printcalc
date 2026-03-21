'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const FINAL_SIZES = [
  { id: 'a2', label: 'A2 (16.5 × 23.4")', w: 16.5, h: 23.4, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a3', label: 'A3 (11.7 × 16.5")', w: 11.7, h: 16.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a4', label: 'A4 (8.3 × 11.7")', w: 8.3, h: 11.7, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a5', label: 'A5 (5.8 × 8.3")', w: 5.8, h: 8.3, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'a6', label: 'A6 (4.1 × 5.8")', w: 4.1, h: 5.8, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am1', label: '4.25 × 5.5"', w: 4.25, h: 5.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am2', label: '5.5 × 8.5"', w: 5.5, h: 8.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am3', label: 'Letter 8.5 × 11"', w: 8.5, h: 11, plateSize: '18×23"', plateGroup: 'small' },
  { id: 'am4', label: 'Legal 8.5 × 14"', w: 8.5, h: 14, plateSize: '15×20"', plateGroup: 'small' },
  { id: 'am5', label: '11 × 17"', w: 11, h: 17, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'am6', label: '18 × 23"', w: 18, h: 23, plateSize: '18×23"', plateGroup: 'small' },
  { id: 'b3', label: 'B3 (10 × 14")', w: 10, h: 14, plateSize: '20×28"', plateGroup: 'medium' },
  { id: 'b4', label: 'B4 (9.5 × 14")', w: 9.5, h: 14, plateSize: '20×28"', plateGroup: 'medium' },
  { id: 'b5', label: 'B5 (7 × 9.5")', w: 7, h: 9.5, plateSize: '15×20"', plateGroup: 'small' },
  { id: 'b6', label: 'B6 (4.5 × 7")', w: 4.5, h: 7, plateSize: '15×20"', plateGroup: 'small' },
  { id: 'vc', label: 'Visiting Card (3.5 × 2")', w: 3.5, h: 2, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'dl', label: 'DL Envelope (4.3 × 8.5")', w: 4.3, h: 8.5, plateSize: '18×25"', plateGroup: 'small' },
  { id: 'custom', label: 'Custom size...', w: 0, h: 0, plateSize: '18×25"', plateGroup: 'small' },
];

const PAPER_CATEGORIES = [
  { id: 'maplitho', label: 'Maplitho', gsms: [60, 70, 80], ratePerKg: 70 },
  { id: 'art_paper', label: 'Art Paper', gsms: [80, 90, 100, 130], ratePerKg: 88 },
  { id: 'art_card', label: 'Art Card', gsms: [170, 200, 210, 230], ratePerKg: 97 },
  { id: 'art_card_heavy', label: 'Art Card Heavy', gsms: [250, 280, 300, 350, 380], ratePerKg: 106 },
  { id: 'art_card_xheavy', label: 'Art Card Extra Heavy', gsms: [400, 450, 500], ratePerKg: 116 },
  { id: 'fbb', label: 'FBB / Ultima / SBS', gsms: [200, 230, 250, 280, 300, 320, 350, 380, 400], ratePerKg: 128 },
  { id: 'duplex_grey', label: 'Duplex Grey Back', gsms: [200, 230, 250, 280, 300, 320, 350, 380, 400], ratePerKg: 62 },
  { id: 'duplex_white', label: 'Duplex White Back', gsms: [200, 230, 250, 280, 300, 320, 350, 380, 400], ratePerKg: 66 },
];

const COLOR_OPTIONS = [
  { id: 'single', label: 'Single Color' },
  { id: 'two', label: 'Two Color' },
  { id: 'cmyk', label: 'Four Color CMYK' },
  { id: 'five', label: 'Five Color (CMYK + White)' },
  { id: 'five_coater', label: 'Five Color + Coater' },
  { id: 'five_uv', label: 'Five Color + UV Online' },
];

const LAM_OPTIONS = [
  { id: 'none', label: 'No Lamination' },
  { id: 'gloss_thermal', label: 'Gloss Thermal' },
  { id: 'matt_thermal', label: 'Matt Thermal' },
  { id: 'velvet_thermal', label: 'Velvet Thermal' },
  { id: 'bopp_gloss', label: 'BOPP Gloss' },
  { id: 'bopp_matt', label: 'BOPP Matt' },
];

const UV_OPTIONS = [
  { id: 'none', label: 'No UV / Coating' },
  { id: 'full_uv', label: 'Full UV' },
  { id: 'spot_uv', label: 'Spot UV' },
  { id: 'aqueous', label: 'Aqueous Coating' },
  { id: 'varnish', label: 'Varnish' },
  { id: 'uv_online', label: 'UV Dripoff Online' },
  { id: 'uv_offline', label: 'UV Dripoff Offline' },
];

const BINDING_OPTIONS = [
  { id: 'none', label: 'No Binding' },
  { id: 'center_pin', label: 'Center Pin / Saddle Stitch' },
  { id: 'perfect', label: 'Perfect Bind' },
  { id: 'hard', label: 'Hard Bind / Case Bound' },
  { id: 'spiral', label: 'Spiral Bind' },
  { id: 'folding', label: 'Just Folding' },
  { id: 'cutting', label: 'Just Cutting' },
];

const PLATE_DIMS: Record<string, { w: number; h: number }> = {
  '15x20': { w: 15, h: 20 }, '18x23': { w: 18, h: 23 }, '18x25': { w: 18, h: 25 },
  '20x28': { w: 20, h: 28 }, '20x30': { w: 20, h: 30 }, '25x36': { w: 25, h: 36 },
  '15×20"': { w: 15, h: 20 }, '18×23"': { w: 18, h: 23 }, '18×25"': { w: 18, h: 25 },
  '20×28"': { w: 20, h: 28 }, '20×30"': { w: 20, h: 30 }, '25×36"': { w: 25, h: 36 },
};

const PARENT_SHEETS: Record<string, { parent: string; cuts: number; pw: number; ph: number }> = {
  '15×20"': { parent: '20×30"', cuts: 2, pw: 20, ph: 30 },
  '18×23"': { parent: '23×36"', cuts: 2, pw: 23, ph: 36 },
  '18×25"': { parent: '25×36"', cuts: 2, pw: 25, ph: 36 },
  '20×28"': { parent: '20×28"', cuts: 1, pw: 20, ph: 28 },
  '20×30"': { parent: '20×30"', cuts: 1, pw: 20, ph: 30 },
};

const DR = {
  plates: {
    small: { single: { fixed: 500, per1000: 200 }, two: { fixed: 800, per1000: 250 }, cmyk: { fixed: 2000, per1000: 400 }, five: { fixed: 2500, per1000: 450 }, five_coater: { fixed: 2800, per1000: 480 }, five_uv: { fixed: 3000, per1000: 500 } },
    medium: { single: { fixed: 700, per1000: 250 }, two: { fixed: 1200, per1000: 300 }, cmyk: { fixed: 2800, per1000: 500 }, five: { fixed: 3500, per1000: 550 }, five_coater: { fixed: 3800, per1000: 580 }, five_uv: { fixed: 4000, per1000: 600 } },
    large: { single: { fixed: 1000, per1000: 300 }, two: { fixed: 1800, per1000: 400 }, cmyk: { fixed: 4000, per1000: 600 }, five: { fixed: 5000, per1000: 700 }, five_coater: { fixed: 5500, per1000: 750 }, five_uv: { fixed: 6000, per1000: 800 } },
  },
  lam: { gloss_thermal: { min: 800, r: 0.65 }, matt_thermal: { min: 900, r: 0.70 }, velvet_thermal: { min: 1200, r: 0.90 }, bopp_gloss: { min: 600, r: 0.50 }, bopp_matt: { min: 650, r: 0.55 } },
  uv: { full_uv: { min: 1000, r: 0.80 }, spot_uv: { min: 1500, r: 1.20 }, aqueous: { min: 600, r: 0.40 }, varnish: { min: 500, r: 0.35 }, uv_online: { min: 2000, r: 1.50 }, uv_offline: { min: 1800, r: 1.30 } },
  binding: { center_pin: 50, perfect: 80, hard: 150, spiral: 60, folding: 20, cutting: 15 },
  markup: 25, tax: 18,
};

function ups(w: number, h: number, pk: string) {
  const p = PLATE_DIMS[pk]; if (!p) return 1;
  const pw = p.w - 0.5, ph = p.h - 0.5;
  return Math.max(Math.floor(pw/w)*Math.floor(ph/h), Math.floor(pw/h)*Math.floor(ph/w), 1);
}
function pCost(impressions: number, grp: string, col: string) {
  const r = (DR.plates as any)[grp]?.[col]; if (!r) return 0;
  const plates = Math.ceil(impressions/50000);
  const extra = Math.max(0, impressions - 1000*plates);
  return r.fixed*plates + Math.ceil(extra/1000)*r.per1000;
}
function lCost(id: string, area: number, sheets: number, dbl: boolean) {
  if (id==='none') return 0;
  const r = (DR.lam as any)[id]; if (!r) return 0;
  return Math.max((area/100)*r.r*(dbl?2:1)*sheets, r.min);
}
function uCost(id: string, area: number, sheets: number) {
  if (id==='none') return 0;
  const r = (DR.uv as any)[id]; if (!r) return 0;
  return Math.max((area/100)*r.r*sheets, r.min);
}
const fmt = (n: number) => '₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

const IS: any = { width:'100%', padding:'10px 14px', border:'1.5px solid var(--color-border-tertiary,#E8E8E8)', borderRadius:10, fontSize:14, fontFamily:'DM Sans,sans-serif', color:'var(--color-text-primary,#1A1A1A)', background:'var(--color-background-secondary,#FAFAFA)', outline:'none', appearance:'none', WebkitAppearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center', paddingRight:36 };
const NIS: any = {...IS, backgroundImage:'none', paddingRight:14};
const TW: any = {display:'flex',gap:8};
const TB = (a:boolean):any => ({flex:1,padding:'9px',border:`1.5px solid ${a?'#1A1A1A':'var(--color-border-tertiary,#E8E8E8)'}`,borderRadius:10,fontSize:13,fontWeight:500,color:a?'#fff':'var(--color-text-secondary,#888)',background:a?'#1A1A1A':'var(--color-background-secondary,#FAFAFA)',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const});
const FL: any = {display:'flex',justifyContent:'space-between',alignItems:'center'};
const LBL: any = {fontSize:12,fontWeight:500,color:'var(--color-text-secondary,#666)',marginBottom:5};
const SL: any = {fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16};
const CARD: any = {background:'var(--color-background-primary,#fff)',borderRadius:16,padding:24,marginBottom:16,border:'1px solid var(--color-border-tertiary,#EBEBEB)'};

function SizeSelect({size,setSize,customW,setCustomW,customH,setCustomH}:any) {
  const u = (size.w&&size.h)?ups(size.w,size.h,size.plateSize):1;
  const pi = PARENT_SHEETS[size.plateSize];
  return (
    <div style={{marginBottom:16}}>
      <div style={{...FL,...LBL}}>
        Final size
        {size.id!=='custom'&&<span style={{background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontSize:11,fontFamily:'monospace'}}>{u} ups · {pi?.parent||size.plateSize}</span>}
      </div>
      <select value={size.id} onChange={e=>{const s=FINAL_SIZES.find(x=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>
        <optgroup label="── A Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('a')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── American Standard ──">{FINAL_SIZES.filter(s=>s.id.startsWith('am')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── B Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('b')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── Other ──">{FINAL_SIZES.filter(s=>['vc','dl','custom'].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
      </select>
      {size.id==='custom'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}><input type="number" placeholder="Width (in)" value={customW} onChange={e=>setCustomW(e.target.value)} style={NIS}/><input type="number" placeholder="Height (in)" value={customH} onChange={e=>setCustomH(e.target.value)} style={NIS}/></div>}
    </div>
  );
}

function ResultBox({r,markup,tax}:any) {
  if(!r) return null;
  return (
    <div style={{marginTop:20}}>
      <div style={{background:'#1A1A1A',borderRadius:16,padding:28,marginBottom:12,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,background:'#C84B31',borderRadius:'50%',opacity:0.08}}/>
        <p style={{fontSize:13,color:'#666',marginBottom:4}}>Total price (incl. GST)</p>
        <p style={{fontSize:42,fontWeight:600,color:'#fff',letterSpacing:'-0.03em',fontFamily:'DM Mono,monospace',lineHeight:1,marginBottom:24}}>
          <span style={{fontSize:24,verticalAlign:'super',fontWeight:400,marginRight:2}}>₹</span>
          {r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {r.stats.map((s:any)=>(
            <div key={s.label} style={{background:'rgba(255,255,255,0.06)',borderRadius:10,padding:14}}>
              <p style={{fontSize:11,color:'#666',marginBottom:4}}>{s.label}</p>
              <p style={{fontSize:16,fontWeight:500,color:'#fff',fontFamily:'DM Mono,monospace'}}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      {r.breakdown.length>0&&(
        <div style={{background:'var(--color-background-primary,#fff)',borderRadius:16,border:'1px solid var(--color-border-tertiary,#EBEBEB)',overflow:'hidden',marginBottom:12}}>
          <div style={{background:'var(--color-background-secondary,#F9F9F9)',padding:'10px 20px'}}><p style={{fontSize:11,fontWeight:600,color:'var(--color-text-secondary,#888)',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Cost Breakdown</p></div>
          {r.breakdown.map((row:any)=>(
            <div key={row.label} style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid var(--color-border-tertiary,#F5F5F5)'}}>
              <span style={{fontSize:13,color:'var(--color-text-secondary,#888)'}}>{row.label}</span>
              <span style={{fontSize:13,fontWeight:500,fontFamily:'DM Mono,monospace',color:'var(--color-text-primary,#1A1A1A)'}}>{row.value}</span>
            </div>
          ))}
          <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'var(--color-background-secondary,#F9F9F9)'}}>
            <span style={{fontSize:13,fontWeight:600,color:'var(--color-text-primary,#1A1A1A)'}}>Subtotal</span>
            <span style={{fontSize:13,fontWeight:600,fontFamily:'DM Mono,monospace',color:'var(--color-text-primary,#1A1A1A)'}}>{fmt(r.subtotal)}</span>
          </div>
        </div>
      )}
      <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'10px 20px',background:'#FDE68A'}}><p style={{fontSize:11,fontWeight:600,color:'#78350F',letterSpacing:'0.08em',textTransform:'uppercase',margin:0}}>GST / Tax Breakdown</p></div>
        {[{k:'Subtotal (before markup)',v:fmt(r.subtotal)},{k:`Markup (${markup}%)`,v:fmt(r.markupAmount)},{k:`GST @ ${tax}%`,v:fmt(r.taxAmount)}].map(row=>(
          <div key={row.k} style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid #FDE68A'}}>
            <span style={{fontSize:13,color:'#92400E'}}>{row.k}</span>
            <span style={{fontSize:13,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{row.v}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px'}}>
          <span style={{fontSize:13,fontWeight:600,color:'#78350F'}}>Total incl. GST</span>
          <span style={{fontSize:15,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{fmt(r.finalPrice)}</span>
        </div>
      </div>
    </div>
  );
}

function PaperTab() {
  const [sheetSizes,setSheetSizes]=useState<any[]>([]);
  const [paperStocks,setPaperStocks]=useState<any[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [size,setSize]=useState<any>(null);
  const [paper,setPaper]=useState<any>(null);
  const [qty,setQty]=useState('');
  const [showConv,setShowConv]=useState(false);
  const [result,setResult]=useState<any>(null);
  const M=25,T=18;
  useEffect(()=>{
    supabase.from('sheet_sizes').select('*').eq('is_active',true).order('sort_order').then(({data:sz})=>{
      supabase.from('paper_stocks').select('*').order('sort_order').then(({data:pp})=>{
        if(sz?.length&&pp?.length){setSheetSizes(sz);setPaperStocks(pp);setSize(sz[0]);setPaper(pp[0]);setLoaded(true);}
      });
    });
  },[]);
  useEffect(()=>{
    if(!qty||parseInt(qty)<=0||!size||!paper){setResult(null);return;}
    const q=parseInt(qty);
    const wpr=paper.gsm*size.factor;
    const cpr=wpr*paper.rate_per_kg;
    const cps=cpr/500;
    const raw=cps*q;
    const am=raw*(1+M/100);
    const ta=am*(T/100);
    setResult({finalPrice:am+ta,subtotal:raw,markupAmount:am-raw,taxAmount:ta,stats:[{label:'Per sheet',value:'₹'+cps.toFixed(4)},{label:'Per ream (500 sh)',value:'₹'+cpr.toFixed(2)},{label:'Total weight',value:((wpr/500)*q).toFixed(2)+' kg'},{label:'Total sheets',value:q.toLocaleString('en-IN')}],breakdown:[]});
  },[size,paper,qty]);
  const cats=[...new Set(paperStocks.map((p:any)=>p.category))];
  if(!loaded) return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>;
  return (
    <div>
      <div style={CARD}>
        <p style={SL}>Job Details</p>
        <div style={{marginBottom:16}}>
          <div style={{...FL,...LBL}}>Sheet size<span style={{fontSize:11,color:'#AAA',fontWeight:400}}>inches</span></div>
          <select value={size?.id||''} onChange={e=>{const s=sheetSizes.find((x:any)=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>{sheetSizes.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
          {size&&<div style={{...FL,marginTop:6}}>
            <span style={{fontSize:11,color:'#AAA',fontFamily:'monospace'}}>{size.length_inch}" × {size.width_inch}" = {(size.length_inch*size.width_inch).toFixed(0)} sq in</span>
            <button onClick={()=>setShowConv(!showConv)} style={{fontSize:11,color:'#C84B31',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>{showConv?'Hide converter':'Convert to MM / CM'}</button>
          </div>}
          {showConv&&size&&<div style={{background:'#FFF8F6',border:'1px solid #FFD5CC',borderRadius:8,padding:'10px 14px',marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[['Inches',`${size.length_inch}" × ${size.width_inch}"`],['MM',`${(size.length_inch*25.4).toFixed(1)} × ${(size.width_inch*25.4).toFixed(1)}`],['CM',`${(size.length_inch*2.54).toFixed(1)} × ${(size.width_inch*2.54).toFixed(1)}`]].map(([u,v])=>(
              <div key={u} style={{textAlign:'center'}}><p style={{fontSize:10,color:'#C84B31',fontWeight:600,textTransform:'uppercase',marginBottom:2}}>{u}</p><p style={{fontSize:13,fontWeight:500,fontFamily:'monospace'}}>{v}</p></div>
            ))}
          </div>}
        </div>
        <div style={{marginBottom:16}}>
          <div style={{...FL,...LBL}}>Paper type{paper&&<span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:600,background:paper.in_stock?'#F0FFF4':'#FFF0F0',color:paper.in_stock?'#38A169':'#E53E3E',border:`1px solid ${paper.in_stock?'#9AE6B4':'#FEB2B2'}`}}>{paper.in_stock?'● In stock':'● Out of stock'}</span>}</div>
          <select value={paper?.id||''} onChange={e=>{const p=paperStocks.find((x:any)=>x.id===e.target.value);if(p)setPaper(p);}} style={IS}>
            {cats.map((cat:any)=><optgroup key={cat} label={`── ${cat} ──`}>{paperStocks.filter((p:any)=>p.category===cat).map((p:any)=><option key={p.id} value={p.id}>{p.label}{!p.in_stock?' — OUT OF STOCK':''}</option>)}</optgroup>)}
          </select>
        </div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div>
          <div style={{...FL,...LBL}}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>sheets</span></div>
          <input type="number" placeholder="Enter number of sheets" value={qty} onChange={e=>setQty(e.target.value)} style={NIS} min="1"/>
        </div>
      </div>
      {result?<ResultBox r={result} markup={M} tax={T}/>:<div style={{...CARD,textAlign:'center',padding:40}}><p style={{fontSize:32,marginBottom:12}}>📄</p><p style={{fontSize:14,color:'#BBB'}}>Enter quantity above to see instant pricing</p></div>}
    </div>
  );
}

function PrintingTab() {
  const [size,setSize]=useState(FINAL_SIZES[2]);
  const [cW,setCW]=useState('');const [cH,setCH]=useState('');
  const [qty,setQty]=useState('');
  const [col,setCol]=useState('cmyk');
  const [sides,setSides]=useState<'single'|'double'>('double');
  const [lam,setLam]=useState('none');const [lamDbl,setLamDbl]=useState(false);
  const [uv,setUv]=useState('none');
  const [result,setResult]=useState<any>(null);
  const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
  const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
  const calc=()=>{
    const q=parseInt(qty);if(!q||!fW||!fH)return;
    const pk=size.plateSize,pg=size.plateGroup as any;
    const u=ups(fW,fH,pk);
    const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1,pw:25,ph:36};
    const ws=Math.ceil(q/u);
    const imp=sides==='double'?ws*2:ws;
    const pc=pCost(imp,pg,col);
    const lc=lCost(lam,fW*fH,ws,lamDbl);
    const uc=uCost(uv,fW*fH,ws);
    const sub=pc+lc+uc;
    const am=sub*(1+DR.markup/100);
    const ta=am*(DR.tax/100);
    setResult({finalPrice:am+ta,subtotal:sub,markupAmount:am-sub,taxAmount:ta,
      stats:[{label:'Per piece',value:fmt((am+ta)/q)},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Impressions',value:imp.toLocaleString('en-IN')},{label:'Plate: '+pk,value:u+' ups'}],
      breakdown:[{label:'Printing cost',value:fmt(pc)},...(lc>0?[{label:'Lamination',value:fmt(lc)}]:[]),...(uc>0?[{label:'UV / Coating',value:fmt(uc)}]:[])]});
  };
  return (
    <div>
      <div style={CARD}>
        <p style={SL}>Job Details</p>
        <SizeSelect size={size} setSize={setSize} customW={cW} setCustomW={setCW} customH={cH} setCustomH={setCH}/>
        <div style={{marginBottom:16}}><div style={{...FL,...LBL}}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div><input type="number" placeholder="Enter quantity" value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/></div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div style={{marginBottom:16}}><div style={{...LBL}}>Print colors</div><select value={col} onChange={e=>setCol(e.target.value)} style={IS}>{COLOR_OPTIONS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div style={{marginBottom:16}}><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single')} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double')} onClick={()=>setSides('double')}>Front + Back</button></div></div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div style={{marginBottom:16}}><div style={LBL}>Lamination</div><select value={lam} onChange={e=>setLam(e.target.value)} style={IS}>{LAM_OPTIONS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select>{lam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!lamDbl)} onClick={()=>setLamDbl(false)}>Single side</button><button style={TB(lamDbl)} onClick={()=>setLamDbl(true)}>Both sides</button></div>}</div>
        <div><div style={LBL}>UV / Coating</div><select value={uv} onChange={e=>setUv(e.target.value)} style={IS}>{UV_OPTIONS.map(u=><option key={u.id} value={u.id}>{u.label}</option>)}</select></div>
      </div>
      <button onClick={calc} style={{width:'100%',padding:14,background:'#C84B31',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Calculate →</button>
      {result&&<ResultBox r={result} markup={DR.markup} tax={DR.tax}/>}
    </div>
  );
}

function FullJobTab() {
  const [size,setSize]=useState(FINAL_SIZES[2]);
  const [cW,setCW]=useState('');const [cH,setCH]=useState('');
  const [cat,setCat]=useState(PAPER_CATEGORIES[2]);
  const [gsm,setGsm]=useState(300);
  const [qty,setQty]=useState('');
  const [col,setCol]=useState('cmyk');
  const [sides,setSides]=useState<'single'|'double'>('double');
  const [lam,setLam]=useState('none');const [lamDbl,setLamDbl]=useState(false);
  const [uv,setUv]=useState('none');
  const [bind,setBind]=useState('none');
  const [result,setResult]=useState<any>(null);
  const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
  const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;

  const Sec=({title,children,optional}:any)=>(
    <div style={{border:'1.5px solid var(--color-border-tertiary,#E8E8E8)',borderRadius:14,marginBottom:10,overflow:'hidden'}}>
      <div style={{background:'var(--color-background-secondary,#F9F9F9)',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <p style={{fontSize:11,fontWeight:500,color:'var(--color-text-primary,#1A1A1A)',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>{title}</p>
        {optional&&<span style={{fontSize:11,color:'var(--color-text-secondary,#888)',background:'var(--color-background-primary,#fff)',padding:'2px 8px',borderRadius:4}}>Optional</span>}
      </div>
      <div style={{padding:16}}>{children}</div>
    </div>
  );

  const calc=()=>{
    const q=parseInt(qty);if(!q||!fW||!fH)return;
    const pk=size.plateSize,pg=size.plateGroup as any;
    const u=ups(fW,fH,pk);
    const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1,pw:25,ph:36};
    const ws=Math.ceil(q/u);
    const ps=Math.ceil(ws/pi.cuts);
    const f=(pi.pw*pi.ph*0.2666)/828;
    const papC=((f*gsm*cat.ratePerKg)/500)*ps;
    const imp=sides==='double'?ws*2:ws;
    const prC=pCost(imp,pg,col);
    const lc=lCost(lam,fW*fH,ws,lamDbl);
    const uc=uCost(uv,fW*fH,ws);
    const bRate=bind!=='none'?(DR.binding as any)[bind]||0:0;
    const bC=bind!=='none'?Math.ceil(q/(u*2))*bRate*q:0;
    const sub=papC+prC+lc+uc+bC;
    const am=sub*(1+DR.markup/100);
    const ta=am*(DR.tax/100);
    setResult({finalPrice:am+ta,subtotal:sub,markupAmount:am-sub,taxAmount:ta,
      stats:[{label:'Per piece',value:fmt((am+ta)/q)},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Parent sheets',value:ps.toLocaleString('en-IN')+' · '+pi.parent},{label:'Impressions',value:imp.toLocaleString('en-IN')}],
      breakdown:[{label:'Paper cost',value:fmt(papC)},{label:'Printing cost',value:fmt(prC)},...(lc>0?[{label:'Lamination',value:fmt(lc)}]:[]),...(uc>0?[{label:'UV / Coating',value:fmt(uc)}]:[]),...(bC>0?[{label:'Binding',value:fmt(bC)}]:[])]});
  };

  return (
    <div>
      <Sec title="Paper">
        <SizeSelect size={size} setSize={setSize} customW={cW} setCustomW={setCW} customH={cH} setCustomH={setCH}/>
        <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={cat.id} onChange={e=>{const c=PAPER_CATEGORIES.find(x=>x.id===e.target.value);if(c){setCat(c);setGsm(c.gsms[0]);}}} style={IS}>{PAPER_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div style={{marginBottom:12}}><div style={LBL}>GSM</div><select value={gsm} onChange={e=>setGsm(parseInt(e.target.value))} style={IS}>{cat.gsms.map(g=><option key={g} value={g}>{g} GSM</option>)}</select></div>
        <div><div style={{...FL,...LBL}}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div><input type="number" placeholder="Enter quantity" value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/></div>
      </Sec>
      <Sec title="Printing">
        <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={col} onChange={e=>setCol(e.target.value)} style={IS}>{COLOR_OPTIONS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single')} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double')} onClick={()=>setSides('double')}>Front + Back</button></div></div>
      </Sec>
      <Sec title="Finishing" optional>
        <div style={{marginBottom:12}}><div style={LBL}>Lamination</div><select value={lam} onChange={e=>setLam(e.target.value)} style={IS}>{LAM_OPTIONS.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select>{lam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!lamDbl)} onClick={()=>setLamDbl(false)}>Single side</button><button style={TB(lamDbl)} onClick={()=>setLamDbl(true)}>Both sides</button></div>}</div>
        <div><div style={LBL}>UV / Coating</div><select value={uv} onChange={e=>setUv(e.target.value)} style={IS}>{UV_OPTIONS.map(u=><option key={u.id} value={u.id}>{u.label}</option>)}</select></div>
      </Sec>
      <Sec title="Binding" optional>
        <div style={LBL}>Binding type</div>
        <select value={bind} onChange={e=>setBind(e.target.value)} style={IS}>{BINDING_OPTIONS.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select>
      </Sec>
      <button onClick={calc} style={{width:'100%',padding:14,background:'#C84B31',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Calculate total price →</button>
      {result&&<ResultBox r={result} markup={DR.markup} tax={DR.tax}/>}
    </div>
  );
}

export default function Home() {
  const [tab,setTab]=useState<'paper'|'printing'|'fulljob'>('paper');
  const [user,setUser]=useState<any>(null);
  useEffect(()=>{supabase.auth.getUser().then(({data:{user}})=>setUser(user));},[]);
  const handleLogout=async()=>{await supabase.auth.signOut();setUser(null);};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        .topbar{background:#1A1A1A;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:100;}
        .nav-link{font-size:13px;color:#888;text-decoration:none;}
        .nav-link:hover{color:#fff;}
        .nav-btn{font-size:13px;color:#888;background:none;border:none;cursor:pointer;font-family:inherit;}
        .nav-btn:hover{color:#fff;}
        .nav-signup{font-size:13px;font-weight:500;color:#fff;background:#C84B31;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-family:inherit;text-decoration:none;}
        .calc-tabs{background:#fff;border-bottom:1px solid #EBEBEB;display:flex;padding:0 24px;}
        .calc-tab{padding:14px 20px;font-size:14px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;white-space:nowrap;}
        .calc-tab.active{color:#1A1A1A;border-bottom-color:#C84B31;}
        .calc-tab:hover{color:#1A1A1A;}
        .page{min-height:calc(100vh - 100px);padding:28px 16px 64px;}
        .container{max-width:540px;margin:0 auto;}
        .demo-notice{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400E;}
      `}</style>

      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,background:'#C84B31',borderRadius:'50%'}}/>
          <span style={{fontSize:13,fontWeight:500,color:'#fff'}}>PrintCalc</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {user?(
            <><a href="/dashboard" className="nav-link">Dashboard</a><button className="nav-btn" onClick={handleLogout}>Logout</button></>
          ):(
            <><a href="/login" className="nav-link">Login</a><a href="/signup" className="nav-signup">Sign up free</a></>
          )}
        </div>
      </div>

      <div className="calc-tabs">
        {[{id:'paper',label:'📄 Paper'},{id:'printing',label:'🖨️ Printing'},{id:'fulljob',label:'✅ Full Job'}].map(t=>(
          <button key={t.id} className={`calc-tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id as any)}>{t.label}</button>
        ))}
      </div>

      <main className="page">
        <div className="container">
          <div className="demo-notice">⚡ Demo rates shown. Login to use your own rates from dashboard.</div>
          {tab==='paper'&&<PaperTab/>}
          {tab==='printing'&&<PrintingTab/>}
          {tab==='fulljob'&&<FullJobTab/>}
          <p style={{textAlign:'center',fontSize:12,color:'#CCC',marginTop:24}}>PrintCalc · Printing Industry Calculator</p>
        </div>
      </main>
    </>
  );
}
