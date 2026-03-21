'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

// ─── PLATE DIMS FOR UPS CALCULATION ──────────────────────────────────
const PLATE_DIMS: Record<string,{w:number;h:number}> = {
  '15×20"':{w:15,h:20},'18×23"':{w:18,h:23},'18×25"':{w:18,h:25},
  '20×28"':{w:20,h:28},'20×30"':{w:20,h:30},'25×36"':{w:25,h:36},
};
const PARENT_SHEETS: Record<string,{parent:string;cuts:number;pw:number;ph:number}> = {
  '15×20"':{parent:'20×30"',cuts:2,pw:20,ph:30},
  '18×23"':{parent:'23×36"',cuts:2,pw:23,ph:36},
  '18×25"':{parent:'25×36"',cuts:2,pw:25,ph:36},
  '20×28"':{parent:'20×28"',cuts:1,pw:20,ph:28},
  '20×30"':{parent:'20×30"',cuts:1,pw:20,ph:30},
};
const FINAL_SIZES = [
  {id:'a2',label:'A2 (16.5 × 23.4")',w:16.5,h:23.4,plateSize:'18×25"'},
  {id:'a3',label:'A3 (11.7 × 16.5")',w:11.7,h:16.5,plateSize:'18×25"'},
  {id:'a4',label:'A4 (8.3 × 11.7")',w:8.3,h:11.7,plateSize:'18×25"'},
  {id:'a5',label:'A5 (5.8 × 8.3")',w:5.8,h:8.3,plateSize:'18×25"'},
  {id:'a6',label:'A6 (4.1 × 5.8")',w:4.1,h:5.8,plateSize:'18×25"'},
  {id:'am1',label:'4.25 × 5.5"',w:4.25,h:5.5,plateSize:'18×25"'},
  {id:'am2',label:'5.5 × 8.5"',w:5.5,h:8.5,plateSize:'18×25"'},
  {id:'am3',label:'Letter 8.5 × 11"',w:8.5,h:11,plateSize:'18×23"'},
  {id:'am4',label:'Legal 8.5 × 14"',w:8.5,h:14,plateSize:'15×20"'},
  {id:'am5',label:'11 × 17"',w:11,h:17,plateSize:'18×25"'},
  {id:'am6',label:'18 × 23"',w:18,h:23,plateSize:'18×23"'},
  {id:'b3',label:'B3 (10 × 14")',w:10,h:14,plateSize:'20×28"'},
  {id:'b4',label:'B4 (9.5 × 14")',w:9.5,h:14,plateSize:'20×28"'},
  {id:'b5',label:'B5 (7 × 9.5")',w:7,h:9.5,plateSize:'15×20"'},
  {id:'b6',label:'B6 (4.5 × 7")',w:4.5,h:7,plateSize:'15×20"'},
  {id:'vc',label:'Visiting Card (3.5 × 2")',w:3.5,h:2,plateSize:'18×25"'},
  {id:'dl',label:'DL Envelope (4.3 × 8.5")',w:4.3,h:8.5,plateSize:'18×25"'},
  {id:'custom',label:'Custom size...',w:0,h:0,plateSize:'18×25"'},
];

function calcUps(w:number,h:number,pk:string){
  const p=PLATE_DIMS[pk];if(!p)return 1;
  const pw=p.w-0.5,ph=p.h-0.5;
  return Math.max(Math.floor(pw/w)*Math.floor(ph/h),Math.floor(pw/h)*Math.floor(ph/w),1);
}
const fmt=(n:number)=>'₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

// ─── STYLES ───────────────────────────────────────────────────────────
const IS:any={width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-border-tertiary,#E8E8E8)',borderRadius:10,fontSize:14,fontFamily:'DM Sans,sans-serif',color:'var(--color-text-primary,#1A1A1A)',background:'var(--color-background-secondary,#FAFAFA)',outline:'none',appearance:'none',WebkitAppearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:36};
const NIS:any={...IS,backgroundImage:'none',paddingRight:14};
const TW:any={display:'flex',gap:8};
const TB=(a:boolean):any=>({flex:1,padding:'9px',border:`1.5px solid ${a?'#1A1A1A':'var(--color-border-tertiary,#E8E8E8)'}`,borderRadius:10,fontSize:13,fontWeight:500,color:a?'#fff':'var(--color-text-secondary,#888)',background:a?'#1A1A1A':'var(--color-background-secondary,#FAFAFA)',cursor:'pointer',fontFamily:'inherit',textAlign:'center' as const});
const CARD:any={background:'var(--color-background-primary,#fff)',borderRadius:16,padding:24,marginBottom:16,border:'1px solid var(--color-border-tertiary,#EBEBEB)'};
const SL:any={fontSize:11,fontWeight:600,color:'#999',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16};
const LBL:any={fontSize:12,fontWeight:500,color:'var(--color-text-secondary,#666)',marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center'};

// ─── RESULT BOX ───────────────────────────────────────────────────────
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
            <span style={{fontSize:13,fontWeight:600,fontFamily:'DM Mono,monospace',color:'var(--color-text-primary,#1A1A1A)'}}>{sym||'₹'}{r.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </div>
        </div>
      )}
      <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'10px 20px',background:'#FDE68A'}}><p style={{fontSize:11,fontWeight:600,color:'#78350F',letterSpacing:'0.08em',textTransform:'uppercase',margin:0}}>GST / Tax Breakdown</p></div>
        {[{k:`Subtotal (before markup)`,v:`${sym||'₹'}${r.subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}`},{k:`Markup (${markup}%)`,v:`${sym||'₹'}${r.markupAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}`},{k:`GST @ ${tax}%`,v:`${sym||'₹'}${r.taxAmount.toLocaleString('en-IN',{minimumFractionDigits:2})}`}].map(row=>(
          <div key={row.k} style={{display:'flex',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid #FDE68A'}}>
            <span style={{fontSize:13,color:'#92400E'}}>{row.k}</span>
            <span style={{fontSize:13,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{row.v}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',padding:'12px 20px'}}>
          <span style={{fontSize:13,fontWeight:600,color:'#78350F'}}>Total incl. GST</span>
          <span style={{fontSize:15,fontWeight:600,color:'#92400E',fontFamily:'DM Mono,monospace'}}>{sym||'₹'}{r.finalPrice.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SIZE SELECTOR ────────────────────────────────────────────────────
function SizeSelect({size,setSize,cW,setCW,cH,setCH}:any){
  const u=(size.w&&size.h)?calcUps(size.w,size.h,size.plateSize):1;
  const pi=PARENT_SHEETS[size.plateSize];
  return(
    <div style={{marginBottom:16}}>
      <div style={LBL}>Final size{size.id!=='custom'&&<span style={{background:'#EEF4FA',color:'#185FA5',borderRadius:4,padding:'2px 8px',fontSize:11,fontFamily:'monospace'}}>{u} ups · {pi?.parent||size.plateSize}</span>}</div>
      <select value={size.id} onChange={e=>{const s=FINAL_SIZES.find(x=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>
        <optgroup label="── A Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('a')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── American Standard ──">{FINAL_SIZES.filter(s=>s.id.startsWith('am')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── B Series ──">{FINAL_SIZES.filter(s=>s.id.startsWith('b')).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
        <optgroup label="── Other ──">{FINAL_SIZES.filter(s=>['vc','dl','custom'].includes(s.id)).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</optgroup>
      </select>
      {size.id==='custom'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}><input type="number" placeholder="Width (in)" value={cW} onChange={e=>setCW(e.target.value)} style={NIS}/><input type="number" placeholder="Height (in)" value={cH} onChange={e=>setCH(e.target.value)} style={NIS}/></div>}
    </div>
  );
}

// ─── PAPER TAB ────────────────────────────────────────────────────────
function PaperTab({subData}:any){
  const [sheetSizes,setSheetSizes]=useState<any[]>([]);
  const [paperStocks,setPaperStocks]=useState<any[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [size,setSize]=useState<any>(null);
  const [paper,setPaper]=useState<any>(null);
  const [qty,setQty]=useState('');
  const [showConv,setShowConv]=useState(false);
  const [result,setResult]=useState<any>(null);

  const M=subData?.markup_percent||25;
  const T=subData?.tax_percent||18;
  const sym=subData?.currency_symbol||'₹';

  useEffect(()=>{
    const load=async()=>{
      const {data:sz}=await supabase.from('sheet_sizes').select('*').eq('is_active',true).order('sort_order');
      // If subscriber logged in, load their paper stocks, else load master
      const sid=subData?.id||'00000000-0000-0000-0000-000000000001';
      const {data:pp}=await supabase.from('paper_stocks').select('*').eq('subscriber_id',sid).order('sort_order');
      if(sz?.length&&pp?.length){setSheetSizes(sz);setPaperStocks(pp);setSize(sz[0]);setPaper(pp[0]);setLoaded(true);}
    };
    load();
  },[subData]);

  useEffect(()=>{
    if(!qty||parseInt(qty)<=0||!size||!paper){setResult(null);return;}
    const q=parseInt(qty);
    const wpr=paper.gsm*size.factor;
    const cpr=wpr*paper.rate_per_kg;
    const cps=cpr/500;
    const raw=cps*q;
    const am=raw*(1+M/100);
    const ta=am*(T/100);
    setResult({finalPrice:am+ta,subtotal:raw,markupAmount:am-raw,taxAmount:ta,
      stats:[{label:'Per sheet',value:sym+cps.toFixed(4)},{label:'Per ream (500 sh)',value:sym+cpr.toFixed(2)},{label:'Total weight',value:((wpr/500)*q).toFixed(2)+' kg'},{label:'Total sheets',value:q.toLocaleString('en-IN')}],
      breakdown:[]});
  },[size,paper,qty,M,T]);

  const cats=[...new Set(paperStocks.map((p:any)=>p.category))];
  if(!loaded)return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>;

  return(
    <div>
      <div style={CARD}>
        <p style={SL}>Job Details</p>
        <div style={{marginBottom:16}}>
          <div style={LBL}>Sheet size<span style={{fontSize:11,color:'#AAA',fontWeight:400}}>inches</span></div>
          <select value={size?.id||''} onChange={e=>{const s=sheetSizes.find((x:any)=>x.id===e.target.value);if(s)setSize(s);}} style={IS}>{sheetSizes.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
          {size&&<div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:11,color:'#AAA',fontFamily:'monospace'}}>{size.length_inch}" × {size.width_inch}" = {(size.length_inch*size.width_inch).toFixed(0)} sq in</span>
            <button onClick={()=>setShowConv(!showConv)} style={{fontSize:11,color:'#C84B31',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>{showConv?'Hide':'Convert to MM / CM'}</button>
          </div>}
          {showConv&&size&&<div style={{background:'#FFF8F6',border:'1px solid #FFD5CC',borderRadius:8,padding:'10px 14px',marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[['Inches',`${size.length_inch}" × ${size.width_inch}"`],['MM',`${(size.length_inch*25.4).toFixed(1)} × ${(size.width_inch*25.4).toFixed(1)}`],['CM',`${(size.length_inch*2.54).toFixed(1)} × ${(size.width_inch*2.54).toFixed(1)}`]].map(([u,v])=>(
              <div key={u} style={{textAlign:'center'}}><p style={{fontSize:10,color:'#C84B31',fontWeight:600,textTransform:'uppercase',marginBottom:2}}>{u}</p><p style={{fontSize:13,fontWeight:500,fontFamily:'monospace'}}>{v}</p></div>
            ))}
          </div>}
        </div>
        <div style={{marginBottom:16}}>
          <div style={LBL}>Paper type{paper&&<span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:600,background:paper.in_stock?'#F0FFF4':'#FFF0F0',color:paper.in_stock?'#38A169':'#E53E3E',border:`1px solid ${paper.in_stock?'#9AE6B4':'#FEB2B2'}`}}>{paper.in_stock?'● In stock':'● Out of stock'}</span>}</div>
          <select value={paper?.id||''} onChange={e=>{const p=paperStocks.find((x:any)=>x.id===e.target.value);if(p)setPaper(p);}} style={IS}>
            {cats.map((cat:any)=><optgroup key={cat} label={`── ${cat} ──`}>{paperStocks.filter((p:any)=>p.category===cat).map((p:any)=><option key={p.id} value={p.id}>{p.label}{!p.in_stock?' — OUT OF STOCK':''}</option>)}</optgroup>)}
          </select>
        </div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>sheets</span></div><input type="number" placeholder="Enter number of sheets" value={qty} onChange={e=>setQty(e.target.value)} style={NIS} min="1"/></div>
      </div>
      {result?<ResultBox r={result} markup={M} tax={T} sym={sym}/>:<div style={{...CARD,textAlign:'center',padding:40}}><p style={{fontSize:32,marginBottom:12}}>📄</p><p style={{fontSize:14,color:'#BBB'}}>Enter quantity above to see instant pricing</p></div>}
    </div>
  );
}

// ─── PRINTING TAB ─────────────────────────────────────────────────────
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
  const [selLam,setSelLam]=useState('none');
  const [lamDbl,setLamDbl]=useState(false);
  const [selUV,setSelUV]=useState('none');
  const [result,setResult]=useState<any>(null);
  const [loaded,setLoaded]=useState(false);

  const M=subData?.markup_percent||25;
  const T=subData?.tax_percent||18;
  const sym=subData?.currency_symbol||'₹';

  useEffect(()=>{
    const load=async()=>{
      const sid=subData?.id||'00000000-0000-0000-0000-000000000001';
      const [{data:pr},{data:lr},{data:ur}]=await Promise.all([
        supabase.from('printing_rates').select('*').eq('subscriber_id',sid).order('sort_order'),
        supabase.from('lamination_rates').select('*').eq('subscriber_id',sid).order('sort_order'),
        supabase.from('uv_rates').select('*').eq('subscriber_id',sid).order('sort_order'),
      ]);
      setPlateRates(pr||[]);setLamRates(lr||[]);setUvRates(ur||[]);
      const pnames=[...new Set((pr||[]).map((r:any)=>r.plate_name))] as string[];
      setPlateNames(pnames);
      if(pnames.length>0){
        setSelPlate(pnames[0]);
        const cols=(pr||[]).filter((r:any)=>r.plate_name===pnames[0]).map((r:any)=>r.color_option);
        setColorsByPlate(cols);
        if(cols.length>0)setSelColor(cols[0]);
      }
      setLoaded(true);
    };
    load();
  },[subData]);

  useEffect(()=>{
    if(!selPlate)return;
    const cols=plateRates.filter(r=>r.plate_name===selPlate).map(r=>r.color_option);
    setColorsByPlate(cols);
    if(cols.length>0)setSelColor(cols[0]);
  },[selPlate,plateRates]);

  const calc=()=>{
    const q=parseInt(qty);
    const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
    const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
    if(!q||!fW||!fH||!selPlate||!selColor)return;
    const pk=size.plateSize;
    const u=calcUps(fW,fH,pk);
    const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1,pw:25,ph:36};
    const ws=Math.ceil(q/u);
    const imp=sides==='double'?ws*2:ws;
    // Get plate rate from DB
    const rate=plateRates.find(r=>r.plate_name===selPlate&&r.color_option===selColor);
    let pCost=0;
    if(rate){
      const plates=Math.ceil(imp/50000);
      const plateFixed=rate.fixed_charge*plates;
      const freeImp=1000*plates;
      const extraImp=Math.max(0,imp-freeImp);
      const extraRounded=Math.ceil(extraImp/1000)*1000;
      pCost=plateFixed+(extraRounded/1000)*rate.per_1000_impression;
    }
    // Lamination
    let lCost=0;
    if(selLam!=='none'){
      const lr=lamRates.find(r=>r.lam_name===selLam);
      if(lr){const area=fW*fH;const perSheet=(area/100)*lr.per_100_sqinch*(lamDbl?2:1);lCost=Math.max(perSheet*ws,lr.minimum_charge);}
    }
    // UV
    let uCost=0;
    if(selUV!=='none'){
      const ur=uvRates.find(r=>r.uv_name===selUV);
      if(ur){const area=fW*fH;uCost=Math.max((area/100)*ur.per_100_sqinch*ws,ur.minimum_charge);}
    }
    const sub=pCost+lCost+uCost;
    const am=sub*(1+M/100);
    const ta=am*(T/100);
    setResult({finalPrice:am+ta,subtotal:sub,markupAmount:am-sub,taxAmount:ta,
      stats:[{label:'Per piece',value:sym+(((am+ta)/q).toFixed(2))},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Impressions',value:imp.toLocaleString('en-IN')},{label:'Plate: '+pk,value:u+' ups'}],
      breakdown:[{label:'Printing cost',value:sym+pCost.toFixed(2)},...(lCost>0?[{label:'Lamination',value:sym+lCost.toFixed(2)}]:[]),...(uCost>0?[{label:'UV / Coating',value:sym+uCost.toFixed(2)}]:[])]});
  };

  if(!loaded)return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>;

  return(
    <div>
      <div style={CARD}>
        <p style={SL}>Job Details</p>
        <SizeSelect size={size} setSize={setSize} cW={cW} setCW={setCW} cH={cH} setCH={setCH}/>
        <div style={{marginBottom:16}}><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div><input type="number" placeholder="Enter quantity" value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/></div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div style={{marginBottom:16}}>
          <div style={LBL}>Plate size</div>
          <select value={selPlate} onChange={e=>setSelPlate(e.target.value)} style={IS}>
            {plateNames.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{marginBottom:16}}>
          <div style={LBL}>Print colors</div>
          <select value={selColor} onChange={e=>setSelColor(e.target.value)} style={IS}>
            {colorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{marginBottom:16}}><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single')} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double')} onClick={()=>setSides('double')}>Front + Back</button></div></div>
        <div style={{height:1,background:'var(--color-border-tertiary,#F0F0F0)',margin:'16px 0'}}/>
        <div style={{marginBottom:16}}>
          <div style={LBL}>Lamination</div>
          <select value={selLam} onChange={e=>setSelLam(e.target.value)} style={IS}>
            <option value="none">No Lamination</option>
            {lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}
          </select>
          {selLam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!lamDbl)} onClick={()=>setLamDbl(false)}>Single side</button><button style={TB(lamDbl)} onClick={()=>setLamDbl(true)}>Both sides</button></div>}
        </div>
        <div><div style={LBL}>UV / Coating</div><select value={selUV} onChange={e=>setSelUV(e.target.value)} style={IS}><option value="none">No UV / Coating</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
      </div>
      <button onClick={calc} style={{width:'100%',padding:14,background:'#C84B31',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Calculate →</button>
      {result&&<ResultBox r={result} markup={M} tax={T} sym={sym}/>}
    </div>
  );
}

// ─── FULL JOB TAB ─────────────────────────────────────────────────────
function FullJobTab({subData}:any){
  const [size,setSize]=useState(FINAL_SIZES[2]);
  const [cW,setCW]=useState('');const [cH,setCH]=useState('');
  const [paperCats,setPaperCats]=useState<any[]>([]);
  const [selCat,setSelCat]=useState<any>(null);
  const [gsm,setGsm]=useState(0);
  const [qty,setQty]=useState('');
  const [plateRates,setPlateRates]=useState<any[]>([]);
  const [lamRates,setLamRates]=useState<any[]>([]);
  const [uvRates,setUvRates]=useState<any[]>([]);
  const [bindRates,setBindRates]=useState<any[]>([]);
  const [plateNames,setPlateNames]=useState<string[]>([]);
  const [selPlate,setSelPlate]=useState('');
  const [selColor,setSelColor]=useState('');
  const [colorsByPlate,setColorsByPlate]=useState<string[]>([]);
  const [sides,setSides]=useState<'single'|'double'>('double');
  const [selLam,setSelLam]=useState('none');
  const [lamDbl,setLamDbl]=useState(false);
  const [selUV,setSelUV]=useState('none');
  const [selBind,setSelBind]=useState('none');
  const [result,setResult]=useState<any>(null);
  const [loaded,setLoaded]=useState(false);

  const M=subData?.markup_percent||25;
  const T=subData?.tax_percent||18;
  const sym=subData?.currency_symbol||'₹';

  useEffect(()=>{
    const load=async()=>{
      const sid=subData?.id||'00000000-0000-0000-0000-000000000001';
      const [{data:cats},{data:pr},{data:lr},{data:ur},{data:br}]=await Promise.all([
        supabase.from('paper_categories').select('*').eq('subscriber_id',sid).order('category'),
        supabase.from('printing_rates').select('*').eq('subscriber_id',sid).order('sort_order'),
        supabase.from('lamination_rates').select('*').eq('subscriber_id',sid).order('sort_order'),
        supabase.from('uv_rates').select('*').eq('subscriber_id',sid).order('sort_order'),
        supabase.from('binding_rates').select('*').eq('subscriber_id',sid).order('sort_order'),
      ]);
      setPaperCats(cats||[]);setPlateRates(pr||[]);setLamRates(lr||[]);setUvRates(ur||[]);setBindRates(br||[]);
      if(cats?.length){setSelCat(cats[0]);setGsm(0);}
      const pnames=[...new Set((pr||[]).map((r:any)=>r.plate_name))] as string[];
      setPlateNames(pnames);
      if(pnames.length>0){
        setSelPlate(pnames[0]);
        const cols=(pr||[]).filter((r:any)=>r.plate_name===pnames[0]).map((r:any)=>r.color_option);
        setColorsByPlate(cols);
        if(cols.length>0)setSelColor(cols[0]);
      }
      setLoaded(true);
    };
    load();
  },[subData]);

  useEffect(()=>{
    if(!selPlate)return;
    const cols=plateRates.filter(r=>r.plate_name===selPlate).map(r=>r.color_option);
    setColorsByPlate(cols);
    if(cols.length>0)setSelColor(cols[0]);
  },[selPlate,plateRates]);

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
    const q=parseInt(qty);
    const fW=size.id==='custom'?(parseFloat(cW)||0):size.w;
    const fH=size.id==='custom'?(parseFloat(cH)||0):size.h;
    if(!q||!fW||!fH||!selCat)return;
    const pk=size.plateSize;
    const u=calcUps(fW,fH,pk);
    const pi=PARENT_SHEETS[pk]||{parent:pk,cuts:1,pw:25,ph:36};
    const ws=Math.ceil(q/u);
    const ps=Math.ceil(ws/pi.cuts);
    // Paper cost
    const f=(pi.pw*pi.ph*0.2666)/828;
    const paperC=((f*(gsm||selCat?.rate_per_kg||0)*selCat?.rate_per_kg)/500)*ps;
    const gsmVal=gsm||300;
    const papC=((f*gsmVal*selCat.rate_per_kg)/500)*ps;
    // Print cost
    const imp=sides==='double'?ws*2:ws;
    const rate=plateRates.find(r=>r.plate_name===selPlate&&r.color_option===selColor);
    let prC=0;
    if(rate){const plates=Math.ceil(imp/50000);const pf=rate.fixed_charge*plates;const extra=Math.max(0,imp-1000*plates);prC=pf+Math.ceil(extra/1000)*rate.per_1000_impression;}
    // Lam
    let lC=0;
    if(selLam!=='none'){const lr=lamRates.find(r=>r.lam_name===selLam);if(lr){const area=fW*fH;lC=Math.max((area/100)*lr.per_100_sqinch*(lamDbl?2:1)*ws,lr.minimum_charge);}}
    // UV
    let uC=0;
    if(selUV!=='none'){const ur=uvRates.find(r=>r.uv_name===selUV);if(ur){const area=fW*fH;uC=Math.max((area/100)*ur.per_100_sqinch*ws,ur.minimum_charge);}}
    // Binding
    let bC=0;
    if(selBind!=='none'){const br=bindRates.find(r=>r.binding_name===selBind);if(br){const bf=q/(u*2);bC=Math.ceil(bf)*br.per_binding_format*q;}}
    const sub=papC+prC+lC+uC+bC;
    const am=sub*(1+M/100);const ta=am*(T/100);
    setResult({finalPrice:am+ta,subtotal:sub,markupAmount:am-sub,taxAmount:ta,
      stats:[{label:'Per piece',value:sym+(((am+ta)/q).toFixed(2))},{label:'Working sheets',value:ws.toLocaleString('en-IN')},{label:'Parent sheets',value:ps.toLocaleString('en-IN')+' · '+pi.parent},{label:'Impressions',value:imp.toLocaleString('en-IN')}],
      breakdown:[{label:'Paper cost',value:sym+papC.toFixed(2)},{label:'Printing cost',value:sym+prC.toFixed(2)},...(lC>0?[{label:'Lamination',value:sym+lC.toFixed(2)}]:[]),...(uC>0?[{label:'UV / Coating',value:sym+uC.toFixed(2)}]:[]),...(bC>0?[{label:'Binding',value:sym+bC.toFixed(2)}]:[])]});
  };

  if(!loaded)return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading rates...</div>;

  // GSM options from paper stocks
  const [paperStocks,setPaperStocks]=useState<any[]>([]);
  useEffect(()=>{
    if(!subData&&!selCat)return;
    const sid=subData?.id||'00000000-0000-0000-0000-000000000001';
    supabase.from('paper_stocks').select('*').eq('subscriber_id',sid).eq('category',selCat?.category||'').order('gsm').then(({data})=>{setPaperStocks(data||[]);if(data?.length)setGsm(data[0].gsm);});
  },[selCat,subData]);

  return(
    <div>
      <Sec title="Paper">
        <SizeSelect size={size} setSize={setSize} cW={cW} setCW={setCW} cH={cH} setCH={setCH}/>
        <div style={{marginBottom:12}}><div style={LBL}>Paper category</div><select value={selCat?.id||''} onChange={e=>{const c=paperCats.find((x:any)=>x.id===e.target.value);if(c)setSelCat(c);}} style={IS}>{paperCats.map((c:any)=><option key={c.id} value={c.id}>{c.category}</option>)}</select></div>
        <div style={{marginBottom:12}}><div style={LBL}>GSM</div><select value={gsm} onChange={e=>setGsm(parseInt(e.target.value))} style={IS}>{paperStocks.map((s:any)=><option key={s.id} value={s.gsm}>{s.gsm} GSM{!s.in_stock?' — OUT OF STOCK':''}</option>)}</select></div>
        <div><div style={LBL}>Quantity<span style={{fontWeight:400,color:'#AAA',fontSize:11}}>pieces</span></div><input type="number" placeholder="Enter quantity" value={qty} onChange={e=>setQty(e.target.value)} style={NIS}/></div>
      </Sec>
      <Sec title="Printing">
        <div style={{marginBottom:12}}><div style={LBL}>Plate size</div><select value={selPlate} onChange={e=>setSelPlate(e.target.value)} style={IS}>{plateNames.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
        <div style={{marginBottom:12}}><div style={LBL}>Print colors</div><select value={selColor} onChange={e=>setSelColor(e.target.value)} style={IS}>{colorsByPlate.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div><div style={LBL}>Sides</div><div style={TW}><button style={TB(sides==='single')} onClick={()=>setSides('single')}>Single side</button><button style={TB(sides==='double')} onClick={()=>setSides('double')}>Front + Back</button></div></div>
      </Sec>
      <Sec title="Finishing" optional>
        <div style={{marginBottom:12}}><div style={LBL}>Lamination</div><select value={selLam} onChange={e=>setSelLam(e.target.value)} style={IS}><option value="none">No Lamination</option>{lamRates.map(r=><option key={r.id} value={r.lam_name}>{r.lam_name}</option>)}</select>{selLam!=='none'&&<div style={{...TW,marginTop:8}}><button style={TB(!lamDbl)} onClick={()=>setLamDbl(false)}>Single side</button><button style={TB(lamDbl)} onClick={()=>setLamDbl(true)}>Both sides</button></div>}</div>
        <div><div style={LBL}>UV / Coating</div><select value={selUV} onChange={e=>setSelUV(e.target.value)} style={IS}><option value="none">No UV / Coating</option>{uvRates.map(r=><option key={r.id} value={r.uv_name}>{r.uv_name}</option>)}</select></div>
      </Sec>
      <Sec title="Binding" optional>
        <div style={LBL}>Binding type</div>
        <select value={selBind} onChange={e=>setSelBind(e.target.value)} style={IS}><option value="none">No Binding</option>{bindRates.map(r=><option key={r.id} value={r.binding_name}>{r.binding_name}</option>)}</select>
      </Sec>
      <button onClick={calc} style={{width:'100%',padding:14,background:'#C84B31',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Calculate total price →</button>
      {result&&<ResultBox r={result} markup={M} tax={T} sym={sym}/>}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────
export default function Home(){
  const [tab,setTab]=useState<'paper'|'printing'|'fulljob'>('paper');
  const [user,setUser]=useState<any>(null);
  const [subData,setSubData]=useState<any>(null);

  useEffect(()=>{
    supabase.auth.getUser().then(async({data:{user}})=>{
      setUser(user);
      if(user){
        const {data}=await supabase.from('subscribers').select('*').eq('id',user.id).single();
        setSubData(data);
      }
    });
  },[]);

  const logout=async()=>{await supabase.auth.signOut();setUser(null);setSubData(null);};

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'DM Sans',sans-serif;background:#F7F6F3;}
        .topbar{background:#1A1A1A;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:100;}
        .nav-link{font-size:13px;color:#888;text-decoration:none;}.nav-link:hover{color:#fff;}
        .nav-btn{font-size:13px;color:#888;background:none;border:none;cursor:pointer;font-family:inherit;}.nav-btn:hover{color:#fff;}
        .nav-signup{font-size:13px;font-weight:500;color:#fff;background:#C84B31;border:none;padding:7px 16px;border-radius:6px;cursor:pointer;font-family:inherit;text-decoration:none;}
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
          {user?(<><a href="/dashboard" className="nav-link">Dashboard</a><button className="nav-btn" onClick={logout}>Logout</button></>):(<><a href="/login" className="nav-link">Login</a><a href="/signup" className="nav-signup">Sign up free</a></>)}
        </div>
      </div>

      <div className="calc-tabs">
        {[{id:'paper',l:'📄 Paper'},{id:'printing',l:'🖨️ Printing'},{id:'fulljob',l:'✅ Full Job'}].map(t=>(
          <button key={t.id} className={`calc-tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id as any)}>{t.l}</button>
        ))}
      </div>

      <main className="page">
        <div className="container">
          {subData?(
            <div className="live-badge">✅ Using your live rates — {subData.business_name} · {subData.markup_percent}% markup · GST {subData.tax_percent}%</div>
          ):(
            <div className="demo-notice">⚡ Demo rates shown. <a href="/login" style={{color:'#C84B31',fontWeight:500}}>Login</a> to use your own rates.</div>
          )}
          {tab==='paper'&&<PaperTab subData={subData}/>}
          {tab==='printing'&&<PrintingTab subData={subData}/>}
          {tab==='fulljob'&&<FullJobTab subData={subData}/>}
          <p style={{textAlign:'center',fontSize:12,color:'#CCC',marginTop:24}}>PrintCalc · Printing Industry Calculator</p>
        </div>
      </main>
    </>
  );
}
