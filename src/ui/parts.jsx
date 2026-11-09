// Report building blocks shared by the current and the pre-restructure report views.
import {useEffect,useState} from "react";
import {dcf} from "../engine/analyze.js";
import {RefBars,nf} from "../Charts.jsx";

export const PILL={unknown:["unknown","manual"],not_detected:["unknown","not detected"]};
export const Check=({c,i})=>{const [cls,txt]=PILL[c.status]||[c.status,c.status];
  return <div className="panel"><h3>{i+1}. {c.title}<span className={"pill "+cls}>{txt}</span></h3>
  <ul>{(c.points||[]).map((p,k)=><li key={k}>{p}</li>)}</ul></div>};
export const List=({t,a})=><><h3>{t}</h3><ul>{(a||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></>;
const f2=x=>x==null||!Number.isFinite(x)?"n/a":x.toLocaleString("en",{maximumFractionDigits:2,minimumFractionDigits:2});

// Every assumption is adjustable. Defaults come from the report where possible (marked "from report").
const SLIDERS=[["g","Revenue growth",-.05,.2,.005],["m","Operating margin",.01,.4,.005],["w","WACC",.07,.25,.005],["tg","Terminal growth",0,.06,.005],
  ["tax","Tax rate",0,.4,.005],["da","D&A, % of revenue",0,.2,.0025],["capex","Capex, % of revenue",0,.25,.0025],
  ["nwc","Working capital per extra rupee of revenue",0,.6,.01],["years","Forecast years",3,10,1]];
export function Dcf({d,onChange}){
  const init={tax:d.inputs.tax,da:d.inputs.da,capex:d.inputs.capex,nwc:d.inputs.nwc??.45,years:5,...d.base};
  const [a,setA]=useState(init);useEffect(()=>{onChange?.(a)},[a]);const set=k=>e=>{const x=parseFloat(e.target.value);setA(s=>({...s,[k]:x}))};
  const ok=Number.isFinite,src=d.base.src||{};
  const inp={...d.inputs,shares:d.inputs.shares??NaN,nd:d.inputs.nd??NaN};
  const ndKnown=ok(inp.nd),perShare=ndKnown&&ok(inp.shares),pr=d.inputs.price;
  const what=perShare?"per share":ndKnown?"(equity value)":"(enterprise value: net debt not available)";
  const v=x=>{const r=dcf(inp,x);return perShare?r.perShare:ndKnown?r.equity:r.ev};
  const baseRun=dcf(inp,a);
  const W=[a.w-.02,a.w,a.w+.02],T=[a.tg-.01,a.tg,a.tg+.01];
  const S=[["Bear",{g:a.g-.03,m:a.m-.02}],["Base",{g:a.g,m:a.m}],["Bull",{g:a.g+.03,m:a.m+.025}]];
  const cls=x=>!ok(x)?"n":ok(pr)&&perShare?(x>=pr?"g":"r"):"n";
  const rng=(k,x)=>k==="years"?String(x):(x*100).toFixed(0)+"%";
  const show=(k,x)=>k==="years"?String(x):(x*100).toFixed(k==="da"||k==="capex"?2:1)+"%";
  return(<div className="panel"><h3>Valuation scenarios</h3>
    <div className="sl">{SLIDERS.map(([k,l,mn,mx,st])=>
      <label key={k} className="sld"><span><b>{l}</b><output>{show(k,a[k])}</output></span>
        <input type="range" min={mn} max={mx} step={st} value={a[k]} onChange={set(k)} aria-label={l}/>
        <small><span>{rng(k,mn)} to {rng(k,mx)}</span><span>{src[k]==="report"?"from report":"default"}</span></small></label>)}
      <button className="rs" onClick={()=>setA(init)}>Reset to report values</button></div>
    {baseRun.invalid&&<p><span className="pill concern">Check inputs</span> {baseRun.invalid}.</p>}
    {d.inputs.debtExclLease&&<p className="mut">Net debt excludes lease liabilities, which were not extracted.</p>}
    <div className="cg">
      <RefBars title={`Scenario value ${what} at ${(a.w*100).toFixed(1)}% WACC`} sub={perShare&&ok(pr)?"Dashed line = share price you entered":perShare?"Enter a share price for the comparison":"Fill in borrowings, cash and EPS for a per-share value"}
        data={S.map(([n,x])=>({label:n,value:v({...a,...x}),accent:n==="Base"}))} refLine={perShare&&ok(pr)?{value:pr,label:`Price ${nf(pr,2)}`}:null}/>
      <figure className="chart"><figcaption><b>Sensitivity: WACC against terminal growth</b><span>{perShare&&ok(pr)?"Green = above the share price, red = below. n/a = WACC not above terminal growth":"Base-case value in each cell. n/a = WACC not above terminal growth"}</span></figcaption>
        <div className="heat" style={{gridTemplateColumns:"1.2fr repeat(3,1fr)"}}>
          <div className="h">WACC \ g</div>{T.map(t=><div className="h" key={t}>{(t*100).toFixed(1)}%</div>)}
          {W.flatMap(w=>[<div className="h" key={"w"+w}>{(w*100).toFixed(1)}%</div>,...T.map(t=>{const x=v({...a,w,tg:t});return <div key={w+"-"+t} className={cls(x)}>{ok(x)?nf(x,2):"n/a"}</div>})])}
        </div></figure></div>
    <p className="mut">{a.years}-year forecast. Each year and the terminal year use one formula: operating profit after tax + D&A − capex − working capital × revenue increase. Terminal value = next year's cash flow ÷ (WACC − terminal growth){ok(baseRun.tvShare)?`, ${(baseRun.tvShare*100).toFixed(0)}% of the base value`:""}. Illustrative only.</p></div>);
}

// Colour = whether the move is good (net debt: lower is better). Arrow = direction of the number.
export const Tile=({m})=>{
  const dir=m.dir!==undefined?m.dir:m.chg==="n/a"?null:m.chg.startsWith("-")?"down":"up";
  const trend=m.trend!==undefined?m.trend:dir&&((m.label==="Net debt")===(dir==="up")?"worse":"better");
  return <div className="tile"><small>{m.label}</small><strong>{m.cur}</strong><span className={trend==="worse"?"dnc":trend==="better"?"up":""}>{dir?(dir==="down"?"▼ ":"▲ ")+m.chg.replace("-",""):""}</span><span className="mut"> was {m.prev}</span></div>};

