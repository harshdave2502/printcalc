'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

const PLATE_DIMS: Record<string,{w:number;h:number}> = {
  '15×20"': {w:14.5, h:19.5},
  '18×23"': {w:17.5, h:22.5},
  '18×25"': {w:17.5, h:24.5},
  '20×28"': {w:19.5, h:27.5},
  '20×30"': {w:19.5, h:29.5},
  '25×36"': {w:24.5, h:35.5},
};
const PARENT_SHEETS: Record<string,{parent:string;cuts:number;pw:number;ph:number}> = {
  '15×20"': {parent:'20×30"', cuts:2, pw:20, ph:30},
  '18×23"': {parent:'23×36"', cuts:2, pw:23, ph:36},
  '18×25"': {parent:'25×36"', cuts:2, pw:25, ph:36},
  '20×28"': {parent:'20×30"', cuts:1, pw:20, ph:30},
  '20×30"': {parent:'20×30"', cuts:1, pw:20, ph:30},
  '25×36"': {parent:'25×36"', cuts:1, pw:25, ph:36},
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
  const plates=Object.keys(PLATE_DIMS);let bestPlate='18×25"';let bestUps=0;
  for(const pk of plates){const p=PLATE_DIMS[pk];const ups=Math.max(Math.floor(p.w/w)*Math.floor(p.h/h),Math.floor(p.w/h)*Math.floor(p.h/w),1);if(ups>bestUps||(ups===bestUps&&p.w*p.h<PLATE_DIMS[bestPlate].w*PLATE_DIMS[bestPlate].h)){bestUps=ups;bestPlate=pk;}}
  return bestPlate;
}
const fmt=(n:number)=>'₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
// Board papers: one smooth side, one rough — cannot use Work & Turn, need 2 separate plates for both sides
const BOARD_PAPER_CATS=['SBS','FBB','Ultima','Duplex Grey Back','Duplex White Back'];

function Sec({title,children,optional,accent}:any){
  return(
    <div style={{border:`1.5px solid ${accent||'var(--color-border-tertiary,#E8E8E8)'}`,borderRadius:14,marginBottom:10,overflow:'hidden'}}>
      <div style={{background:accent?accent+'18':'var(--color-background-secondary,#F9F9F9)',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <p style={{fontSize:11,fontWeight:600,color:accent||'var(--color-text-primary,#1A1A1A)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:0}}>{title}</p>
        {optional&&<span style={{fontSize:11,color:'var(--color-text-secondary,#888)',background:'var(--color-background-primary,#fff)',padding:'2px 8px',borderRadius:4}}>Optional</span>}
      </div>
      <div style={{padding:16}}>{children}</div>
    </div>
  );
}

const IS:any={width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-border-tertiary,#E8E8E8)',borderRadius:10,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'var(--color-text-primary,#1A1A1A)',background:'var(--color-background-secondary,#FAFAFA)',outline:'none',appearance:'none',WebkitAppearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:36};
const NIS:any={...IS,backgroundImage:'none',paddingRight:14,MozAppearance:'textfield'};
const TW:any={display:'flex',gap:8};
const TB=(a:boolean):any=>({flex:1,padding:'9px',border:`1.5px solid ${a?'#1A1A1A':'var(--color-border-tertiary,#E8E8E8)'}`,borderRadius:10,fontSize:13,fontWeight:500,color:a?'#fff':'var(--color-text-secondary,#888)',background:a?'#1A1A1A':'var(--color-background-secondary,#FAFAFA)',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const});
const CARD:any={background:'var(--color-background-primary,#fff)',borderRadius:16,padding:24,marginBottom:16,border:'1px solid var(--color-border-tertiary,#EBEBEB)'};
const SL:any={fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:16};
const LBL:any={fontSize:12,fontWeight:500,color:'var(--color-text-secondary,#666)',marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center'};

// ─── GSM INFO HELPER ─────────────────────────────────────────────────
function gsmInfo(gsm:number):string{
  if(!gsm)return '';
  const ptMap:Record<number,number>={60:4,70:4,80:5,90:5,100:6,115:7,120:7,130:8,150:9,157:9,170:10,200:12,230:13,250:14,300:16,350:18,400:20};
  const pt=ptMap[gsm]||Math.round(gsm/20);
  if(gsm<170){const lb=Math.round(gsm/1.48);return `= ${lb} lb Text · ~${pt}pt`;}
  else{const lb=Math.round(gsm/2.71);return `= ${lb} lb Cover · ~${pt}pt`;}
}

// ─── RESULT BOX ──────────────────────────────────────────────────────
function ResultBox({r,markup,tax,sym}:any){
  if(!r)return null;
  return(
    <div style={{marginTop:20}}>
      <div style={{background:'#1A1A1A',borderRadius:16,padding:28,marginBottom:12,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,background:'#C84B31',borderRadius:'50%',opacity:0.08}}/>
        <p style={{fontSize:13,color:'#666',marginBottom:4}}>Total price (incl. GST)</p>
        <p style={{fontSize:42,fontWeight:600,color:'#fff',letterSpacing:'-0.03em',fontFamily:'DM Mono,monospace',lineHeight:1,marginBottom:24}}>
          <span style={{fontSize:24,verticalAlign:'super',fontWeight:400,marginRight:2}}>{sym||'₹'}</span>
          {r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {r.stats.map((s:any)=>(<div key={s.label} style={{background:'rgba(255,255,255,0.06)',borderRadius:10,padding:14}}><p style={{fontSize:11,color:'#666',marginBottom:4}}>{s.label}</p><p style={{fontSize:16,fontWeight:500,color:'#fff',fontFamily:'DM Mono,monospace'}}>{s.value}</p></div>))}
        </div>
      </div>
      {r.breakdown.length>0&&(
        <div style={{background:'var(--color-background-primary,#fff)',borderRadius:16,border:'1px solid var(--color-border-tertiary,#EBEBEB)',overflow:'hidden',marginBottom:12}}>
          <div style={{background:'var(--color-background-secondary,#F9F9F9)',padding:'10px 20px'}}><p style={{fontSize:11,fontWeight:600,color:'var(--color-text-secondary,#888)',textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:0}}>Cost Breakdown</p></div>
          {r.breakdown.map((row:any)=>(<div key={row.label} style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid var(--color-border-tertiary,#F5F5F5)'}}><span style={{fontSize:13,color:'var(--color-text-secondary,#888)'}}>{row.label}</span><span style={{fontSize:13,fontWeight:500,fontFamily:'DM Mono,monospace',color:'var(--color-text-primary,#1A1A1A)'}}>{row.value}</span></div>))}
          <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',background:'var(--color-background-secondary,#F9F9F9)'}}><span style={{fontSize:13,fontWeight:600,color:'var(--color-text-primary,#1A1A1A)'}}>Subtotal</span><span style={{fontSize:13,fontWeight:600,fontFamily:'DM Mono,monospace',color:'var(--color-text-primary,#1A1A1A)'}}>{sym||'₹'}{r.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
        </div>
      )}
      <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'10px 20px',background:'#FDE68A'}}><p style={{fontSize:11,fontWeight:600,color:'#78350F',letterSpacing:'0.08em',textTransform:'uppercase' as const,margin:0}}>GST / Tax Breakdown</p></div>
        {[{k:`Subtotal (before markup)`,v:`${sym||'₹'}${r.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}`},{k:`Markup (${markup}%)`,v:`${sym||'₹'}${r.markupAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}`},{k:`GST @ ${tax}%`,v:`${sym||'₹'}${r.taxAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}`}].map(row=>(<div key={row.k} style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid #FDE68A'}}><span style={{fontSize:13,color:'#92400E'}}>{row.k}</span><span style={{fontSize:13,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{row.v}</span></div>))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px'}}><span style={{fontSize:13,fontWeight:600,color:'#78350F'}}>Total incl. GST</span><span style={{fontSize:15,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{sym||'₹'}{r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
      </div>
    </div>
  );
}

// ─── SIZE SELECTOR with IN/MM/CM converter ───────────────────────────
function SizeSelect({size,setSize,cW,setCW,cH,setCH}:any){
  const [unit,setUnit]=useState<'in'|'mm'|'cm'>('in');
  const u=(size.w&&size.h)?calcUps(size.w,size.h,size.plateSize):1;
  const pi=PARENT_SHEETS[size.plateSize];
  const toIn=(v:string)=>{const n=parseFloat(v)||0;if(unit==='mm')return(n/25.4).toFixed(3);if(unit==='cm')return(n/2.54).toFixed(3);return v;};
  const fromIn=(v:string)=>{const n=parseFloat(v)||0;if(unit==='mm')return(n*25.4).toFixed(1);if(unit==='cm')return(n*2.54).toFixed(2);return v;};
  const UB=(u2:'in'|'mm'|'cm'):any=>({padding:'4px 10px',fontSize:11,fontWeight:600,border:'1.5px solid',borderColor:unit===u2?'#1A1A1A':'#E8E8E8',borderRadius:6,background:unit===u2?'#1A1A1A':'#fff',color:unit===u2?'#fff':'#888',cursor:'pointer',fontFamily:'inherit'});
  return(
    <div style={{marginBottom:16}}>
      <div style={LBL}>Final size{size.id!=='custom'&&<span style={{background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontSize:11,fontFamily:'monospace'}}>{u} ups · {pi?.parent||size.plateSize}</span>}</div>
      <select value={size.id} onChange={e=>{const s=FINAL_SIZES.find(x=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>
        <optgroup label="── A Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('a')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── American Standard ──">{FINAL_SIZES.filter(s=>s.id.startsWith('am')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── B Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('b')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── Other ──">{FINAL_SIZES.filter(s=>['vc','dl','custom'].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
      </select>
      {size.id==='custom'&&(
        <div style={{marginTop:8}}>
          <div style={{display:'flex',gap:6,marginBottom:8,alignItems:'center'}}>
            <span style={{fontSize:11,color:'#888'}}>Unit:</span>
            <button style={UB('in')} onClick={()=>setUnit('in')}>IN</button>
            <button style={UB('mm')} onClick={()=>setUnit('mm')}>MM</button>
            <button style={UB('cm')} onClick={()=>setUnit('cm')}>CM</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <input type="number" placeholder={`Width (${unit})`} value={cW?fromIn(cW):''} onChange={e=>setCW(toIn(e.target.value))} style={NIS}/>
            <input type="number" placeholder={`Height (${unit})`} value={cH?fromIn(cH):''} onChange={e=>setCH(toIn(e.target.value))} style={NIS}/>
          </div>
          {cW&&cH&&<p style={{fontSize:11,color:'#888',marginTop:4}}>= {parseFloat(cW).toFixed(2)}" × {parseFloat(cH).toFixed(2)}" (inches)</p>}
        </div>
      )}
    </div>
  );
}

// ─── PAPER TAB ───────────────────────────────────────────────────────
function PaperTab({subData}:any){
  const [sheetSizes,setSheetSizes]=useState<any[]>([]);
  const [paperStocks,setPaperStocks]=useState<any[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [size,setSize]=useState<any>(null);
  const [paper,setPaper]=useState<any>(null);
  const [qty,setQty]=useState('');
  const [showConv,setShowConv]=useState(false);
  const [result,setResult]=useState<any>(null);
  const M=subData?.markup_percent||25;const T=subData?.tax_percent||18;const sym=subData?.currency_symbol||'₹';
  useEffect(()=>{const load=async()=>{const {data:sz}=await supabase.from('sheet_sizes').select('*').eq('is_active',true).order('sort_order');const sid=subData?.id||'00000000-0000-0000-0000-000000000001';const {data:pp}=await supabase.from('paper_stocks').select('*').eq('subscriber_id',sid).order('sort_order');if(sz?.length&&pp?.length){setSheetSizes(sz);setPaperStocks(pp);setSize(sz[0]);setPaper(pp[0]);setLoaded(true);}};load();},[subData]);
  useEffect(()=>{if(!qty||parseInt(qty)<=0||!size||!paper){setResult(null);return;}const q=parseInt(qty);const wpr=paper.gsm*size.factor;const cpr=wpr*paper.rate_per_kg;const cps=cpr/500;const raw=cps*q;const am=raw*(1+M/100);const ta=am*(T/100);setResult({finalPrice:am+ta,subtotal:raw,markupAmount:am-raw,taxAmount:ta,stats:[{label:'Per sheet',value:sym+cps.toFixed(4)},{label:'Per ream (500 sh)',value:sym+cpr.toFixed(2)},{label:'Total weight',value:((wpr/500)*q).toFixed(2)+' kg'},{label:'Total sheets',value:q.toLocaleString('en-IN')}],breakdown:[]});},[size,paper,qty,M,T]);
  const cats=[...new Set(paperStocks.map((p:any)=>p.category))];
  if(!loaded)return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>;
  return(
    <div>
      <div style={CARD}>
        <p style={SL}>Job Details</p>
        <div style={{marginBottom:16}}>
          <div style={LBL}>Sheet size<span style={{fontSize:11,color:'#AAA',fontWeight:400}}>inches</span></div>
          <select value={size?.id||''} onChange={e=>{const s=sheetSizes.find((x:any)=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>{sheetSizes.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
          {size&&<div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><span style={{fontSize:11,color:'#AAA',fontFamily:'monospace'}}>{size.length_inch}" × {size.width_inch}" = {(size.length_inch*size.width_inch).toFixed(0)} sq in</span><button onClick={()=>setShowConv(!showConv)} style={{fontSize:11,color:'#C84B31',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>{showConv?'Hide':'Convert to MM / CM'}</button></div>}
          {showConv&&size&&<div style={{background:'#FFF8F6',border:'1px solid #FFD5CC',borderRadius:8,padding:'10px 14px',marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>{[['Inches',`${size.length_inch}" × ${size.width_inch}"`],['MM',`${(size.length_inch*25.4).toFixed(1)} × ${(size.width_inch*25.4).toFixed(1)}`],['CM',`${(size.length_inch*2.54).toFixed(1)} × ${(size.width_inch*2.54).toFixed(1)}`]].map(([u,v])=>(<div key={u} style={{textAlign:'center'}}><p style={{fontSize:10,color:'#C84B31',fontWeight:600,textTransform:'uppercase' as const,marginBottom:2}}>{u}</p><p style={{fontSize:13,fontWeight:500,fontFamily:'monospace'}}>{v}</p></div>))}</div>}
        </div>
        <div style={{marginBottom:16}}>
          <div style={LBL}>Paper type{paper&&<span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:600,background:paper.in_stock?'#F0FFF4':'#FFF0F0',color:paper.in_stock?'#38A169':'#E53E3E',border:`1px solid ${paper.in_stock?'#9AE6B4':'#FEB2B2'}`}}>{paper.in_stock?'● In stock':'● Out of stock'}</span>}</div>
          <select value={paper?.id||''} onChange={e=>{const p=paperStocks.find((x:any)=>x.id===e.target.value);if(p)setPaper(p);}} style={IS}>{cats.map((cat:any)=><optgroup key={cat} label={`── ${cat} ──`}>{paperStocks.filter((p:any)=>p.category===cat).map((p:any)=><option key={p.id} value={p.id}>{p.label}{!p.in_stock?' — OUT OF STOCK':''}</option>)}</optgroup>)}</select>
        </div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>sheets</span></div><input type="number" placeholder="Enter number of sheets" value={qty} onChange={e=>setQty(e.target.value)} style={NIS} min="1"/></div>
      </div>
      {result?<ResultBox r={result} markup={M} tax={T} sym={sym}/>:<div style={{...CARD,textAlign:'center',padding:40}}><p style={{fontSize:32,marginBottom:12}}>📄</p><p style={{fontSize:14,color:'#BBB'}}>Enter quantity above to see instant pricing</p></div>}
    </div>
  );
}

// ─── PRINTING TAB ────────────────────────────────────────────────────
function PrintingTab({subData}:any){
  const [size,setSize]=useState(FINAL_SIZES[2]);
  const [cW,setCW]=useState('');const [cH,setCH]=useState('');
  const [qty,setQty]=useState('');
  const [plateRates,setPlateRates]=useState<any[]>([]);
  const [lamRates,setLamRates]=useState<any[]>([]);
  const [uvRates,setUvRates]=useState<any[]>([]);
  const [plateNames,setPlateNames]=useState<string[]>([]);
  const [selPlate,setSelPlate]=useState('');
  const [selColor,setSelColor]=useState('');
  const [colorsByPlate,setColorsByPlate]=useState<string[]>([]);
  const [sides,setSides]=useState<'single'|'double'>('double');
  const [paperType,setPaperType]=useState<'normal'|'board'>('normal');
  const [selLam,setSelLam]=useState('none');
  const [lamDbl,setLamDbl]=useState(false);
  const [selUV,setSelUV]=useState('none');
  const [result,setResult]=useState<any>(null);
  const [loaded,setLoaded]=useState(false);
  const M=subData?.markup_percent||25;const T=subData?.tax_percent||18;const sym=subData?.currency_symbol||'₹';
  useEffect(()=>{const load=async()=>{const sid=subData?.id||'00000000-0000-0000-0000-000000000001';const [{data:pr},{data:lr},{data:ur}]=await Promise.all([supabase.from('printing_rates').select('*').eq('subscriber_id',sid).order('sort_order'),supabase.from('lamination_rates').select('*').eq('subscriber_id',sid).order('sort_order'),supabase.from('uv_rates').select('*').eq('subscriber_id',sid).order('sort_order')]);setPlateRates(pr||[]);setLamRates(lr||[]);setUvRates(ur||[]);const pnames=[...new Set((pr||[]).map((r:any)=>r.plate_name))] as string[];setPlateNames(pnames);if(pnames.length>0){setSelPlate(pnames[0]);const cols=(pr||[]).filter((r:any)=>r.plate_name===pnames[0]).map((r:any)=>r.color_option);setColorsByPlate(cols);if(cols.length>0)setSelColor(cols[0]);}setLoaded(true);};load();},[subData]);
  useEffect(()=>{if(!selPlate)return;const cols=plateRates.filter(r=>r.plate_name===selPlate).map(r=>r.color_option);setColorsByPlate(cols);if(cols.length>0)setSelColor(cols[0]);},[selPlate,plateRates]);
  const calc=()=>{
    const q=parseInt(qty);const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
    if(!q||!fW||!fH||!selPlate||!selColor)return;
    const pk=size.id==='custom'?autoSelectPlate(fW,fH):size.plateSize;
    const u=calcUps(fW,fH,pk);const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1,pw:25,ph:36};
    const ws=Math.ceil(q/u);const useDoublePlate=paperType==='board'&&sides==='double';const imp=useDoublePlate?ws:(sides==='double'?ws*2:ws);const numPl=useDoublePlate?2:1;
    const rate=plateRates.find(r=>r.plate_name===selPlate&&r.color_option===selColor);
    let pCost=0;
    if(rate){const pf=rate.fixed_charge*numPl;const fi=1000*numPl;const ei=Math.max(0,imp-fi);const er=Math.ceil(ei/1000)*1000;pCost=pf+(er/1000)*rate.per_1000_impression;}
    let lCost=0;
    if(selLam!=='none'){const lr=lamRates.find(r=>r.lam_name===selLam);if(lr){const pd=PLATE_DIMS[pk]||{w:18,h:25};lCost=Math.max((pd.w*pd.h/100)*lr.per_100_sqinch*imp,lr.minimum_charge);}}
    let uCost=0;
    if(selUV!=='none'){const ur=uvRates.find(r=>r.uv_name===selUV);if(ur){const pd=PLATE_DIMS[pk]||{w:18,h:25};uCost=Math.max((pd.w*pd.h/100)*ur.per_100_sqinch*imp,ur.minimum_charge);}}
    const sub=pCost+lCost+uCost;const am=sub*(1+M/100);const ta=am*(T/100);
    setResult({finalPrice:am+ta,subtotal:sub,markupAmount:am-sub,taxAmount:ta,
      stats:[{label:'Per piece',value:sym+(((am+ta)/q).toFixed(2))},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Impressions',value:imp.toLocaleString('en-IN')},{label:numPl+' plate(s) · '+pk,value:u+' ups'}],
      breakdown:[{label:'Printing ('+numPl+' plate'+(numPl>1?'s':'')+' · '+selColor+')',value:sym+pCost.toFixed(2)},...(lCost>0?[{label:selLam,value:sym+lCost.toFixed(2)}]:[]),...(uCost>0?[{label:selUV,value:sym+uCost.toFixed(2)}]:[])]});
  };
  if(!loaded)return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>;
  return(
    <div>
      <div style={CARD}>
        <p style={SL}>Job Details</p>
        <SizeSelect size={size} setSize={setSize} cW={cW} setCW={setCW} cH={cH} setCH={setCH}/>
        <div style={{marginBottom:16}}><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div><input type="number" placeholder="Enter quantity" value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/></div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div style={{marginBottom:16,padding:'8px 12px',background:'#F0F7FF',borderRadius:8,fontSize:12,color:'#185FA5'}}>🎯 Plate: <strong>{selPlate}</strong> (auto from final size) · {calcUps(size.w||8.3,size.h||11.7,size.plateSize)} ups</div>
        <div style={{marginBottom:16}}><div style={LBL}>Print colors</div><select value={selColor} onChange={e=>setSelColor(e.target.value)} style={IS}>{colorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div style={{marginBottom:16}}><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single')} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double')} onClick={()=>setSides('double')}>Both Sides</button></div></div>
        <div style={{marginBottom:16}}><div style={LBL}>Paper type</div><div style={TW}><button style={TB(paperType==='normal')} onClick={()=>setPaperType('normal')}>Normal Paper</button><button style={TB(paperType==='board')} onClick={()=>setPaperType('board')}>Board Paper (FBB / SBS / Duplex)</button></div>{paperType==='board'&&sides==='double'&&<div style={{marginTop:8,padding:'8px 12px',background:'#FFF8E1',border:'1px solid #FFD54F',borderRadius:8,fontSize:12,color:'#7B5800'}}>⚠️ Board paper has one smooth side &amp; one rough side — 2 separate plates will be used for Both Sides (no Work &amp; Turn)</div>}</div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div style={{marginBottom:16}}><div style={LBL}>Lamination</div><select value={selLam} onChange={e=>setSelLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select>{selLam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!lamDbl)} onClick={()=>setLamDbl(false)}>Single side</button><button style={TB(lamDbl)} onClick={()=>setLamDbl(true)}>Both Sides</button></div>}</div>
        <div><div style={LBL}>UV / Coating</div><select value={selUV} onChange={e=>setSelUV(e.target.value)} style={IS}><option value="none">No UV / Coating</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
      </div>
      <button onClick={calc} style={{width:'100%',padding:14,background:'#C84B31',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Calculate →</button>
      {result&&<ResultBox r={result} markup={M} tax={T} sym={sym}/>}
    </div>
  );
}

// ─── FULL JOB TAB ────────────────────────────────────────────────────
function FullJobTab({subData}:any){
  const [jobType,setJobType]=useState<'single'|'book'>('single');
  const [size,setSize]=useState(FINAL_SIZES[2]);
  const [cW,setCW]=useState('');const [cH,setCH]=useState('');
  const [qty,setQty]=useState('');
  const [paperCats,setPaperCats]=useState<any[]>([]);
  const [plateRates,setPlateRates]=useState<any[]>([]);
  const [lamRates,setLamRates]=useState<any[]>([]);
  const [uvRates,setUvRates]=useState<any[]>([]);
  const [bindRates,setBindRates]=useState<any[]>([]);
  const [plateNames,setPlateNames]=useState<string[]>([]);
  const [result,setResult]=useState<any>(null);
  const [loaded,setLoaded]=useState(false);
  const [selCat,setSelCat]=useState<any>(null);
  const [paperStocks,setPaperStocks]=useState<any[]>([]);
  const [gsm,setGsm]=useState(0);
  const [selPlate,setSelPlate]=useState('');
  const [selColor,setSelColor]=useState('');
  const [colorsByPlate,setColorsByPlate]=useState<string[]>([]);
  const [sides,setSides]=useState<'single'|'double'>('double');
  const [selLam,setSelLam]=useState('none');
  const [lamDbl,setLamDbl]=useState(false);
  const [selUV,setSelUV]=useState('none');
  const [totalPages,setTotalPages]=useState('');
  const [pageError,setPageError]=useState('');
  const [covCat,setCovCat]=useState<any>(null);
  const [covStocks,setCovStocks]=useState<any[]>([]);
  const [covGsm,setCovGsm]=useState(0);
  const [covColor,setCovColor]=useState('');
  const [covColorsByPlate,setCovColorsByPlate]=useState<string[]>([]);
  const [covLam,setCovLam]=useState('none');
  const [covLamDbl,setCovLamDbl]=useState(true);
  const [covUV,setCovUV]=useState('none');
  const [innCat,setInnCat]=useState<any>(null);
  const [innStocks,setInnStocks]=useState<any[]>([]);
  const [innGsm,setInnGsm]=useState(0);
  const [innColor,setInnColor]=useState('');
  const [innColorsByPlate,setInnColorsByPlate]=useState<string[]>([]);
  const [innLam,setInnLam]=useState('none');
  const [selBind,setSelBind]=useState('none');
  const M=subData?.markup_percent||25;const T=subData?.tax_percent||18;const sym=subData?.currency_symbol||'₹';

  useEffect(()=>{
    const load=async()=>{
      const sid=subData?.id||'00000000-0000-0000-0000-000000000001';
      const [{data:cats},{data:pr},{data:lr},{data:ur},{data:br}]=await Promise.all([supabase.from('paper_categories').select('*').eq('subscriber_id',sid).order('category'),supabase.from('printing_rates').select('*').eq('subscriber_id',sid).order('sort_order'),supabase.from('lamination_rates').select('*').eq('subscriber_id',sid).order('sort_order'),supabase.from('uv_rates').select('*').eq('subscriber_id',sid).order('sort_order'),supabase.from('binding_rates').select('*').eq('subscriber_id',sid).order('sort_order')]);
      setPaperCats(cats||[]);setPlateRates(pr||[]);setLamRates(lr||[]);setUvRates(ur||[]);setBindRates(br||[]);
      if(cats?.length){setSelCat(cats[0]);setCovCat(cats[0]);setInnCat(cats[0]);}
      const pnames=[...new Set((pr||[]).map((r:any)=>r.plate_name))] as string[];
      setPlateNames(pnames);
      if(pnames.length>0){const fp=pnames[0];const cols=(pr||[]).filter((r:any)=>r.plate_name===fp).map((r:any)=>r.color_option);setSelPlate(fp);setColorsByPlate(cols);setCovColorsByPlate(cols);setInnColorsByPlate(cols);if(cols.length>0){setSelColor(cols[0]);setCovColor(cols[0]);setInnColor(cols[0]);}}
      setLoaded(true);
    };load();
  },[subData]);
  useEffect(()=>{if(!selCat)return;const sid=subData?.id||'00000000-0000-0000-0000-000000000001';supabase.from('paper_stocks').select('*').eq('subscriber_id',sid).eq('category',selCat.category).order('gsm').then(({data})=>{setPaperStocks(data||[]);if(data?.length)setGsm(data[0].gsm);});},[selCat,subData]);
  useEffect(()=>{if(!covCat)return;const sid=subData?.id||'00000000-0000-0000-0000-000000000001';supabase.from('paper_stocks').select('*').eq('subscriber_id',sid).eq('category',covCat.category).order('gsm').then(({data})=>{setCovStocks(data||[]);if(data?.length)setCovGsm(data[0].gsm);});},[covCat,subData]);
  useEffect(()=>{if(!innCat)return;const sid=subData?.id||'00000000-0000-0000-0000-000000000001';supabase.from('paper_stocks').select('*').eq('subscriber_id',sid).eq('category',innCat.category).order('gsm').then(({data})=>{setInnStocks(data||[]);if(data?.length)setInnGsm(data[0].gsm);});},[innCat,subData]);
  useEffect(()=>{const cols=plateRates.filter(r=>r.plate_name===selPlate).map(r=>r.color_option);setColorsByPlate(cols);setCovColorsByPlate(cols);setInnColorsByPlate(cols);if(cols.length>0){setSelColor(cols[0]);setCovColor(cols[0]);setInnColor(cols[0]);};},[selPlate,plateRates]);

  const validatePages=(v:string)=>{const n=parseInt(v);if(!n){setPageError('');return;}if(n%4!==0)setPageError('Pages must be divisible by 4');else setPageError('');};

  const paperCost=(cat:any,gsmVal:number,sheets:number,pk:string)=>{if(!cat||!gsmVal||!sheets)return 0;const pi=PARENT_SHEETS[pk]||{cuts:1,pw:25,ph:36};const f=(pi.pw*pi.ph*0.2666)/828;return((f*gsmVal*cat.rate_per_kg)/500)*(sheets/pi.cuts);};
  const printCost=(plateName:string,colorOpt:string,numPlates:number,impressions:number)=>{if(!plateName||!colorOpt||!numPlates||!impressions)return 0;const rate=plateRates.find(r=>r.plate_name===plateName&&r.color_option===colorOpt);if(!rate)return 0;const pf=rate.fixed_charge*numPlates;const fi=1000*numPlates;const ei=Math.max(0,impressions-fi);const er=Math.ceil(ei/1000)*1000;return pf+(er/1000)*rate.per_1000_impression;};
  const lamCost=(lamName:string,pk:string,impressions:number)=>{if(lamName==='none'||!impressions)return 0;const lr=lamRates.find(r=>r.lam_name===lamName);if(!lr)return 0;const pd=PLATE_DIMS[pk]||{w:18,h:25};return Math.max((pd.w*pd.h/100)*lr.per_100_sqinch*impressions,lr.minimum_charge);};
  const uvCost=(uvName:string,pk:string,impressions:number)=>{if(uvName==='none'||!impressions)return 0;const ur=uvRates.find(r=>r.uv_name===uvName);if(!ur)return 0;const pd=PLATE_DIMS[pk]||{w:18,h:25};return Math.max((pd.w*pd.h/100)*ur.per_100_sqinch*impressions,ur.minimum_charge);};

  const calc=()=>{
    const q=parseInt(qty);const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
    if(!q||!fW||!fH)return;
    const pk=size.id==='custom'?autoSelectPlate(fW,fH):size.plateSize;
    const u=calcUps(fW,fH,pk);const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1,pw:25,ph:36};
    if(jobType==='single'){
      if(!selCat)return;
      const ws=Math.ceil(q/u);const isBoardPaper=BOARD_PAPER_CATS.includes(selCat?.category||'');const useDoublePlate=isBoardPaper&&sides==='double';const imp=useDoublePlate?ws:(sides==='double'?ws*2:ws);const numPl=useDoublePlate?2:1;
      const papC=paperCost(selCat,gsm,ws,pk);const prC=printCost(selPlate,selColor,numPl,imp);const lC=lamCost(selLam,pk,imp);const uC=uvCost(selUV,pk,imp);
      const sub=papC+prC+lC+uC;const am=sub*(1+M/100);const ta=am*(T/100);
      setResult({finalPrice:am+ta,subtotal:sub,markupAmount:am-sub,taxAmount:ta,
        stats:[{label:'Per piece',value:sym+(((am+ta)/q).toFixed(2))},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Parent sheets',value:Math.ceil(ws/pi.cuts).toLocaleString('en-IN')+' · '+pi.parent},{label:'Impressions',value:imp.toLocaleString('en-IN')}],
        breakdown:[{label:'Paper cost',value:sym+papC.toFixed(2)},{label:'Printing ('+numPl+' plate'+(numPl>1?'s':'')+' · '+selColor+')',value:sym+prC.toFixed(2)},...(lC>0?[{label:selLam,value:sym+lC.toFixed(2)}]:[]),...(uC>0?[{label:selUV,value:sym+uC.toFixed(2)}]:[])]});
    } else {
      const pages=parseInt(totalPages);if(!pages||pages%4!==0||!covCat||!innCat)return;
      const coverPages=4;const innerPages=pages-4;
      const covWS=(coverPages/(u*2))*q;const covImp=covWS*2;const covPlates=Math.ceil(coverPages/u);
      const covPapC=paperCost(covCat,covGsm,covWS,pk);const covPrC=printCost(selPlate,covColor,covPlates,covImp);const covLC=lamCost(covLam,pk,covImp);const covUC=uvCost(covUV,pk,covImp);
      const innSheetsPerCopy=innerPages/(u*2);const innWS=innSheetsPerCopy*q;const innImp=innWS*2;const innPlates=Math.ceil(innerPages/u);
      const innPapC=paperCost(innCat,innGsm,innWS,pk);const innPrC=printCost(selPlate,innColor,innPlates,innImp);const innLC=lamCost(innLam,pk,innImp);
      const bindFormatsPerCopy=innSheetsPerCopy+1;let bC=0;
      if(selBind!=='none'){const br=bindRates.find(r=>r.binding_name===selBind);if(br)bC=bindFormatsPerCopy*br.per_binding_format*q;}
      const sub=covPapC+covPrC+covLC+covUC+innPapC+innPrC+innLC+bC;const am=sub*(1+M/100);const ta=am*(T/100);
      setResult({finalPrice:am+ta,subtotal:sub,markupAmount:am-sub,taxAmount:ta,
        stats:[{label:'Per copy',value:sym+(((am+ta)/q).toFixed(2))},{label:'Cover: '+covPlates+' plate(s)',value:covWS.toLocaleString('en-IN',{maximumFractionDigits:1})+' WS · '+covImp.toLocaleString('en-IN')+' imp'},{label:'Inner: '+innPlates+' plate(s)',value:innWS.toLocaleString('en-IN',{maximumFractionDigits:1})+' WS · '+innImp.toLocaleString('en-IN')+' imp'},{label:'Binding formats/copy',value:bindFormatsPerCopy.toFixed(2)}],
        breakdown:[{label:'Cover paper',value:sym+covPapC.toFixed(2)},{label:'Cover printing ('+covPlates+' plates)',value:sym+covPrC.toFixed(2)},...(covLC>0?[{label:covLam+' (cover)',value:sym+covLC.toFixed(2)}]:[]),...(covUC>0?[{label:covUV+' (cover)',value:sym+covUC.toFixed(2)}]:[]),{label:'Inner paper',value:sym+innPapC.toFixed(2)},{label:'Inner printing ('+innPlates+' plates)',value:sym+innPrC.toFixed(2)},...(innLC>0?[{label:innLam+' (inner)',value:sym+innLC.toFixed(2)}]:[]),...(bC>0?[{label:selBind+' ('+bindFormatsPerCopy.toFixed(2)+' fmt/copy)',value:sym+bC.toFixed(2)}]:[])]});
    }
  };

  if(!loaded)return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>;
  const pages=parseInt(totalPages)||0;
  const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
  const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
  const u=calcUps(fW||8.3,fH||11.7,size.plateSize);
  const innSheetsPerCopy=pages>4?Math.ceil((pages-4)/(u*2)):0;

  return(
    <div>
      <div style={CARD}>
        <p style={SL}>Job Type</p>
        <div style={TW}>
          <button style={TB(jobType==='single')} onClick={()=>setJobType('single')}><div>📄 Single Item</div><div style={{fontSize:11,fontWeight:400,opacity:0.7,marginTop:2}}>Leaflet / Poster / Card</div></button>
          <button style={TB(jobType==='book')} onClick={()=>setJobType('book')}><div>📚 Brochure / Book</div><div style={{fontSize:11,fontWeight:400,opacity:0.7,marginTop:2}}>Multi page with binding</div></button>
        </div>
      </div>
      <Sec title="Job Specs">
        <SizeSelect size={size} setSize={setSize} cW={cW} setCW={setCW} cH={cH} setCH={setCH}/>
        <div style={{marginBottom:jobType==='book'?12:0}}>
          <div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>{jobType==='book'?'copies':'pieces'}</span></div>
          <input type="number" placeholder={jobType==='book'?'Enter number of copies':'Enter quantity'} value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/>
        </div>
        {jobType==='book'&&(
          <div style={{marginTop:12}}>
            <div style={LBL}>Total pages<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>must be ÷ 4 (min 8)</span></div>
            <input type="number" placeholder="e.g. 8, 12, 16, 24, 32..." value={totalPages} onChange={e=>{setTotalPages(e.target.value);validatePages(e.target.value);}} style={NIS}/>
            {pageError&&<p style={{fontSize:12,color:'#E53E3E',marginTop:4}}>⚠ {pageError}</p>}
            {pages>=8&&!pageError&&(<div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap' as const}}><span style={{fontSize:11,background:'#F5F0FF',color:'#6B46C1',borderRadius:4,padding:'2px 8px',fontWeight:500}}>📄 Cover: 4 pages</span><span style={{fontSize:11,background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontWeight:500}}>📋 Inner: {pages-4} pages</span><span style={{fontSize:11,background:'#F0FFF4',color:'#276749',borderRadius:4,padding:'2px 8px',fontFamily:'monospace'}}>{innSheetsPerCopy} inner sheets/copy · {(innSheetsPerCopy+1)} binding formats</span></div>)}
          </div>
        )}
      </Sec>
      {jobType==='single'&&(
        <>
          <Sec title="Paper">
            <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={selCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setSelCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
            <div><div style={LBL}>GSM{gsm>0&&<span style={{fontSize:11,color:'#888',fontWeight:400,fontFamily:'monospace'}}>{gsmInfo(gsm)}</span>}</div><select value={gsm} onChange={e=>setGsm(parseInt(e.target.value))} style={IS}>{paperStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM{!s.in_stock?' — OUT OF STOCK':''}</option>)}</select></div>
          </Sec>
          <Sec title="Printing">
            <div style={{marginBottom:12,padding:'8px 12px',background:'#F0F7FF',borderRadius:8,fontSize:12,color:'#185FA5'}}>🎯 Plate: <strong>{selPlate}</strong> (auto from final size) · {u} ups</div>
            <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={selColor} onChange={e=>setSelColor(e.target.value)} style={IS}>{colorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single')} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double')} onClick={()=>setSides('double')}>Both Sides</button></div>{BOARD_PAPER_CATS.includes(selCat?.category||'')&&sides==='double'&&<div style={{marginTop:8,padding:'8px 12px',background:'#FFF8E1',border:'1px solid #FFD54F',borderRadius:8,fontSize:12,color:'#7B5800'}}>⚠️ Board paper detected — 2 separate plates used for both sides (smooth front + rough back). Cost calculated accordingly.</div>}</div>
          </Sec>
          <Sec title="Finishing" optional>
            <div style={{marginBottom:12}}><div style={LBL}>Lamination</div><select value={selLam} onChange={e=>setSelLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select>{selLam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!lamDbl)} onClick={()=>setLamDbl(false)}>Single side</button><button style={TB(lamDbl)} onClick={()=>setLamDbl(true)}>Both Sides</button></div>}</div>
            <div><div style={LBL}>UV / Coating</div><select value={selUV} onChange={e=>setSelUV(e.target.value)} style={IS}><option value="none">No UV / Coating</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
          </Sec>
        </>
      )}
      {jobType==='book'&&(
        <>
          <Sec title="📄 Cover (4 pages — always double side)" accent="#6B46C1">
            <p style={{marginBottom:12,fontSize:12,color:'#888'}}>Cover = 1 sheet printed both sides = 4 pages. Select heavier paper (Art Card / FBB etc.)</p>
            <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={covCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setCovCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
            <div style={{marginBottom:12}}><div style={LBL}>GSM{covGsm>0&&<span style={{fontSize:11,color:'#888',fontWeight:400,fontFamily:'monospace'}}>{gsmInfo(covGsm)}</span>}</div><select value={covGsm} onChange={e=>setCovGsm(parseInt(e.target.value))} style={IS}>{covStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM{!s.in_stock?' — OUT OF STOCK':''}</option>)}</select></div>
            <div style={{height:1,background:'#F0F0F0',margin:'12px 0'}}/>
            <div style={{marginBottom:12,padding:'8px 12px',background:'#F5F0FF',borderRadius:8,fontSize:12,color:'#6B46C1'}}>🎯 Plate: <strong>{selPlate}</strong> (auto from final size) · Colors: {colorsByPlate.join(', ')}</div>
            <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={covColor} onChange={e=>setCovColor(e.target.value)} style={IS}>{covColorsByPlate.map((c:string)=><option key={c} value={c}>{c}</option>)}</select></div>
            <div style={{height:1,background:'#F0F0F0',margin:'12px 0'}}/>
            <div style={{marginBottom:12}}><div style={LBL}>Lamination (cover)</div><select value={covLam} onChange={e=>setCovLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select>{covLam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!covLamDbl)} onClick={()=>setCovLamDbl(false)}>Single side</button><button style={TB(covLamDbl)} onClick={()=>setCovLamDbl(true)}>Both Sides</button></div>}</div>
            <div><div style={LBL}>UV / Coating (cover)</div><select value={covUV} onChange={e=>setCovUV(e.target.value)} style={IS}><option value="none">No UV / Coating</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
          </Sec>
          <Sec title={`📋 Inner Pages (${pages>4?pages-4:0} pages — double side)`} accent="#185FA5">
            <p style={{marginBottom:12,fontSize:12,color:'#888'}}>Inner pages printed both sides. Usually lighter paper (Art Paper / Maplitho).</p>
            <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={innCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setInnCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
            <div style={{marginBottom:12}}><div style={LBL}>GSM{innGsm>0&&<span style={{fontSize:11,color:'#888',fontWeight:400,fontFamily:'monospace'}}>{gsmInfo(innGsm)}</span>}</div><select value={innGsm} onChange={e=>setInnGsm(parseInt(e.target.value))} style={IS}>{innStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM{!s.in_stock?' — OUT OF STOCK':''}</option>)}</select></div>
            <div style={{height:1,background:'#F0F0F0',margin:'12px 0'}}/>
            <div style={{marginBottom:12,padding:'8px 12px',background:'#EEF4FA',borderRadius:8,fontSize:12,color:'#185FA5'}}>🎯 Plate: <strong>{selPlate}</strong> (auto from final size) · Colors: {innColorsByPlate.join(', ')}</div>
            <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={innColor} onChange={e=>setInnColor(e.target.value)} style={IS}>{innColorsByPlate.map((c:string)=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><div style={LBL}>Lamination (inner) — optional</div><select value={innLam} onChange={e=>setInnLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select></div>
          </Sec>
          <Sec title="📎 Binding" optional>
            <p style={{marginBottom:8,fontSize:12,color:'#888'}}>Binding cost is per binding format per copy</p>
            <select value={selBind} onChange={e=>setSelBind(e.target.value)} style={IS}><option value="none">No Binding</option>{bindRates.map(r=><option key={r.id} value={r.binding_name}>{r.binding_name}</option>)}</select>
          </Sec>
        </>
      )}
      <button onClick={calc} style={{width:'100%',padding:14,background:'#C84B31',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Calculate total price →</button>
      {result&&<ResultBox r={result} markup={M} tax={T} sym={sym}/>}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────
export default function Home(){
  const [tab,setTab]=useState<'paper'|'printing'|'fulljob'>('paper');
  const [user,setUser]=useState<any>(null);
  const [subData,setSubData]=useState<any>(null);
  useEffect(()=>{supabase.auth.getUser().then(async({data:{user}})=>{setUser(user);if(user){const {data}=await supabase.from('subscribers').select('*').eq('id',user.id).single();setSubData(data);}});},[]);
  const logout=async()=>{await supabase.auth.signOut();setUser(null);setSubData(null);};
  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}
        input[type=number]{-moz-appearance:textfield;}
        .topbar{background:#1A1A1A;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:100;}
        .nav-link{font-size:13px;color:#888;text-decoration:none;}.nav-link:hover{color:#fff;}
        .nav-btn{font-size:13px;color:#888;background:none;border:none;cursor:pointer;font-family:inherit;}.nav-btn:hover{color:#fff;}
        .calc-tabs{background:#fff;border-bottom:1px solid #EBEBEB;display:flex;padding:0 24px;}
        .calc-tab{padding:14px 20px;font-size:14px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;white-space:nowrap;}
        .calc-tab.active{color:#1A1A1A;border-bottom-color:#C84B31;}.calc-tab:hover{color:#1A1A1A;}
        .page{min-height:calc(100vh - 100px);padding:28px 16px 64px;}
        .container{max-width:540px;margin:0 auto;}
        .live-badge{background:#F0FFF4;border:1px solid #9AE6B4;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#276749;}
        .demo-notice{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400E;}
      `}</style>
      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,background:'#C84B31',borderRadius:'50%'}}/>
          <span style={{fontSize:13,fontWeight:500,color:'#fff'}}>PrintCalc</span>
          {subData&&<span style={{fontSize:11,color:'#888',marginLeft:4}}>· {subData.business_name}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {user?(<><a href="/quotes" className="nav-link">Quotes</a><a href="/orders" className="nav-link">Orders</a><a href="/dashboard" className="nav-link">Dashboard</a><button className="nav-btn" onClick={logout}>Logout</button></>):(<><a href="/login" className="nav-link">Login</a><a href="/signup" style={{fontSize:13,fontWeight:500,color:'#fff',background:'#C84B31',border:'none',padding:'7px 16px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',textDecoration:'none'}}>Sign up free</a></>)}
        </div>
      </div>
      <div className="calc-tabs">
        {[{id:'paper',l:'📄 Paper'},{id:'printing',l:'🖨️ Printing'},{id:'fulljob',l:'✅ Full Job'}].map(t=>(<button key={t.id} className={`calc-tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id as any)}>{t.l}</button>))}
      </div>
      <main className="page">
        <div className="container">
          {subData?(<div className="live-badge">✅ Using your live rates — {subData.business_name} · {subData.markup_percent}% markup · GST {subData.tax_percent}%</div>):(<div className="demo-notice">⚡ Demo rates shown. <a href="/login" style={{color:'#C84B31',fontWeight:500}}>Login</a> to use your own rates.</div>)}
          {tab==='paper'&&<PaperTab subData={subData}/>}
          {tab==='printing'&&<PrintingTab subData={subData}/>}
          {tab==='fulljob'&&<FullJobTab subData={subData}/>}
          <p style={{textAlign:'center',fontSize:12,color:'#CCC',marginTop:24}}>PrintCalc · Printing Industry Calculator</p>
        </div>
      </main>
    </>
  );
}
