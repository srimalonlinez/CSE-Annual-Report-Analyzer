import {useEffect,useRef,useState} from "react";
import {readPages} from "./pdf.js";
import {extractFigures,scanSignals} from "./engine/extract.js";
import {dcf} from "./engine/analyze.js";
import tickers from "./tickers.json";
import "./styles.css";

const EIGHT=[["Revenue trajectory","CAGR, segment mix, year-on-year growth."],["Margin direction","Gross, operating and net margin trajectory."],["Cash flow quality","Op CF / PAT: is profit turning into cash?"],["Debt structure","D/E, maturity, interest cover, change in borrowings."],["Working capital health","Inventory, receivable and payable days; customer advances."],["Related-party flows","Parent, sister and associate transactions."],["Returns & valuation","ROE and ROCE trajectory against history."],["Disclosure quality","Contingent liabilities, going concern, audit flags."]];

function TickerBox({value,onChange,onPick}){
  const [open,setOpen]=useState(false),[hi,setHi]=useState(-1);
  const q=value.trim().toUpperCase();
  const list=q?tickers.filter(c=>c.s.startsWith(q)||c.n.toUpperCase().startsWith(q))
    .sort((a,b)=>(b.s.startsWith(q)-a.s.startsWith(q))||a.s.localeCompare(b.s)||a.x-b.x):[];
  const pick=c=>{onPick(c);setOpen(false);setHi(-1)};
  const key=e=>{
    if(!open||!list.length)return;
    if(e.key==="ArrowDown"){e.preventDefault();setHi(h=>Math.min(h+1,list.length-1))}
    else if(e.key==="ArrowUp"){e.preventDefault();setHi(h=>Math.max(h-1,0))}
    else if(e.key==="Enter"&&hi>=0){e.preventDefault();pick(list[hi])}
    else if(e.key==="Escape")setOpen(false);
  };
  return(<div className="tw">
    <input type="text" value={value} autoComplete="off" role="combobox" aria-expanded={open&&!!q} aria-controls="tl"
      placeholder="Ticker, e.g. CSLK.N0000 (optional). Type a letter to see CSE companies"
      onChange={e=>{onChange(e.target.value);setOpen(true);setHi(-1)}} onFocus={()=>setOpen(true)}
      onBlur={()=>setTimeout(()=>setOpen(false),120)} onKeyDown={key}/>
    {open&&q&&<ul id="tl" role="listbox">
      {list.length?list.map((c,i)=><li key={c.t} role="option" aria-selected={i===hi} className={i===hi?"on":""}
        onMouseDown={e=>{e.preventDefault();pick(c)}}><b>{c.t}</b><span>{c.n}</span></li>)
        :<li className="none">No match in the list. “{value}” will be used as typed.</li>}
    </ul>}
  </div>);
}

const LABELS=[["Income statement"],["rev","Revenue"],["cogs","Cost of sales"],["gp","Gross profit"],["oi","Other income"],["dist","Distribution expenses"],["admin","Administrative expenses"],["op","Operating profit"],["fin","Finance cost"],["pbt","Profit before tax"],["tax","Income tax"],["pat","Profit after tax"],["eps","EPS (per share)"],["da","Depreciation + amortisation"],
 ["Cash flow"],["cfo","Operating cash flow"],["capex","Capex"],["div","Dividends paid"],
 ["Balance sheet"],["inv","Inventories"],["rec","Trade + other receivables"],["pay","Trade + other payables"],["cash","Cash and bank"],["debt","Borrowings + overdraft"],["ta","Total assets"],["ca","Current assets"],["cl","Current liabilities"],["tl","Total liabilities"],["eq","Total equity"],["re","Retained earnings"]];
const fmt=x=>Number.isFinite(x)?+x.toFixed(3):"";

const Check=({c,i})=><div className="panel"><h3>{i+1}. {c.title}<span className={"pill "+(c.status==="unknown"?"unknown":c.status)}>{c.status==="unknown"?"manual":c.status}</span></h3>
  <ul>{(c.points||[]).map((p,k)=><li key={k}>{p}</li>)}</ul></div>;
const List=({t,a})=><><h3>{t}</h3><ul>{(a||[]).map((x,i)=><li key={i}>{x}</li>)}</ul></>;
const f2=x=>x==null||!Number.isFinite(x)?"n/a":x.toLocaleString("en",{maximumFractionDigits:2,minimumFractionDigits:2});

function Dcf({d}){
  const [a,setA]=useState(d.base);const set=k=>e=>setA({...a,[k]:parseFloat(e.target.value)});
  const inp={...d.inputs,shares:d.inputs.shares??NaN,nd:d.inputs.nd??0};
  const v=(x)=>{const r=dcf(inp,x);return Number.isFinite(r.perShare)?r.perShare:r.equity};
  const unit=Number.isFinite(inp.shares)?"per share":"equity value (add a share price/EPS for per-share)";
  const pr=d.inputs.price;
  const W=[a.w-.02,a.w,a.w+.02],T=[a.tg-.01,a.tg,a.tg+.01];
  const S=[["Bear",{g:a.g-.03,m:a.m-.02}],["Base",{g:a.g,m:a.m}],["Bull",{g:a.g+.03,m:a.m+.025}]];
  return(<div className="panel"><h3>Valuation scenarios and sensitivity</h3>
    <div className="sl">{[["g","Revenue growth",-.05,.2,.005],["m","Operating margin",.03,.35,.005],["w","WACC",.07,.25,.005],["tg","Terminal growth",0,.06,.005]].map(([k,l,mn,mx,st])=>
      <label key={k}>{l} {(a[k]*100).toFixed(1)}%<input type="range" min={mn} max={mx} step={st} value={a[k]} onChange={set(k)}/></label>)}</div>
    <p>DCF {unit}: <b>{f2(v(a))}</b>{Number.isFinite(pr)&&Number.isFinite(inp.shares)&&<> vs price {f2(pr)} ({((v(a)/pr-1)*100).toFixed(0)}%)</>}</p>
    <div className="wrap"><table><thead><tr><th>WACC \ terminal g</th>{T.map(t=><th key={t}>{(t*100).toFixed(1)}%</th>)}</tr></thead>
      <tbody>{W.map(w=><tr key={w}><td>{(w*100).toFixed(1)}%</td>{T.map(t=><td key={t}>{f2(v({...a,w,tg:t}))}</td>)}</tr>)}</tbody></table></div>
    <h3>Scenarios by WACC</h3><div className="wrap"><table><thead><tr><th>Scenario</th>{W.map(w=><th key={w}>{(w*100).toFixed(1)}%</th>)}</tr></thead>
      <tbody>{S.map(([n,x])=><tr key={n}><td>{n} ({(x.g*100).toFixed(0)}% growth, {(x.m*100).toFixed(1)}% margin)</td>{W.map(w=><td key={w}>{f2(v({...a,...x,w}))}</td>)}</tr>)}</tbody></table></div>
    <p className="mut">Five-year forecast; tax at the reported rate; working capital 45% of incremental revenue; capex and depreciation held at this year’s share of revenue. Illustrative only.</p></div>);
}

function Report({r,paid,onUnlock,email,setEmail,busy}){
  const br=r.bridge||[],mx=Math.max(1,...br.map(b=>Math.abs(+b.delta||0)));
  const full=paid&&<>
    {(r.checks||[]).slice(2).map((c,i)=><Check key={i} c={c} i={i+2}/>)}
    <div className="panel"><h3>Quality of earnings</h3><div className="wrap"><table><thead><tr><th>Ratio</th><th>This year</th><th>Last year</th></tr></thead>
      <tbody>{r.qoe.rows.map((x,i)=><tr key={i}><td>{x[0]}</td><td>{x[1]}</td><td>{x[2]}</td></tr>)}</tbody></table></div>
      <h3>Piotroski F-score: {r.qoe.piotroski.score} of 9</h3><div className="wrap"><table><tbody>{r.qoe.piotroski.tests.map((t,i)=><tr key={i}><td>{t.name}</td><td><span className={"pill "+(t.pass?"healthy":"concern")}>{t.pass?"Pass":"Fail"}</span></td></tr>)}</tbody></table></div>
      <p className="mut">Altman above 2.99 (market-value form) or 5.85 (Z″) is the safe zone. Scored on year-end balances.</p></div>
    <div className="panel"><h3>PAT bridge: what changed and why</h3>{br.map((b,i)=>{const d=+b.delta||0,w=Math.abs(d)/mx*50;
      return <div key={i} style={{display:"grid",gridTemplateColumns:"minmax(110px,190px) 1fr 70px",gap:8,alignItems:"center",margin:"4px 0"}}>
        <span>{b.driver}</span><div className="bar"><i style={{[d>=0?"left":"right"]:"50%",width:w+"%",background:`var(--${d>=0?"g":"r"})`}}/></div>
        <span>{d>=0?"+":""}{d.toLocaleString()}</span></div>})}</div>
    {r.dcf&&<Dcf d={r.dcf}/>}
    <div className="panel"><List t="Positive observations" a={r.positives}/><List t="Areas of concern" a={r.concerns}/></div>
    <div className="panel"><h3>Questions to ask the company</h3><ol>{(r.questions||[]).map((x,i)=><li key={i}>{x}</li>)}</ol></div>
    <div className="panel"><p className="mut">Every figure is extracted by rules from the PDF and every ratio is calculated by formula; nothing is generated by AI. Related-party and disclosure checks only flag where to read. Check numbers against the report. Not investment advice.</p></div>
    <button onClick={()=>window.print()}>Print / save as PDF</button></>;
  return(<div id="res">
    <div className="panel"><h3>{r.company||"Report"} {r.period&&"· "+r.period}</h3><p>{r.verdict}</p><div className="wrap"><table>
      <thead><tr><th>Metric</th><th>Current</th><th>Prior</th><th>Change</th></tr></thead>
      <tbody>{(r.metrics||[]).map((m,i)=><tr key={i}><td>{m.label}</td><td>{m.cur}</td><td>{m.prev}</td><td>{m.chg}</td></tr>)}</tbody></table></div></div>
    {(r.checks||[]).slice(0,2).map((c,i)=><Check key={i} c={c} i={i}/>)}
    {paid?full:<div className="lock"><div className="blur"><div className="panel"><h3>3. Cash flow quality</h3><ul><li>locked locked locked locked</li><li>locked locked locked</li></ul></div>
      <div className="panel"><h3>Quality of earnings</h3><ul><li>locked locked locked locked</li></ul></div></div>
      <div className="gate"><b style={{fontSize:18}}>Unlock the full report</b>
        <span className="mut">6 more checks, earnings quality, Piotroski and Altman, PAT bridge, DCF scenarios and investor questions.</span>
        <input type="text" placeholder="Email for the payment receipt" value={email} onChange={e=>setEmail(e.target.value)} style={{maxWidth:320}}/>
        <button className="p" disabled={busy} onClick={onUnlock}>Pay LKR 99 and unlock</button></div></div>}
  </div>);
}

export default function App(){
  const [file,setFile]=useState(null),[tk,setTk]=useState(""),[cn,setCn]=useState(""),[email,setEmail]=useState("");
  const [px,setPx]=useState({cur:"",prev:""}),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const [ext,setExt]=useState(null),[vals,setVals]=useState({}),[res,setRes]=useState(null),[job,setJob]=useState(null);
  const fi=useRef();

  const status=async id=>{
    const r=await fetch(`/api/status?id=${id}`);
    if(!r.ok){setMsg("This report link has expired. Please upload again.");return false}
    setRes(await r.json());setMsg("");return true;
  };
  // returning from PayHere (?job=…): the notify webhook can arrive a few seconds late, so retry briefly
  useEffect(()=>{
    const id=new URLSearchParams(location.search).get("job");if(!id)return;
    setJob(id);setMsg("Checking your payment…");let n=0,t;
    const go=async()=>{const ok=await status(id);if(ok){const j=await(await fetch(`/api/status?id=${id}`)).json();if(!j.paid&&n++<10){setMsg("Waiting for payment confirmation…");t=setTimeout(go,3000)}else setMsg("")}};
    go();return()=>clearTimeout(t);
  },[]);

  async function read(){
    setBusy(true);setRes(null);setExt(null);
    try{
      const pages=await readPages(file,(i,n)=>setMsg(`Reading page ${i} of ${n}…`));
      const e=extractFigures(pages);e.signals=scanSignals(pages);
      const v={};for(const[k,o]of Object.entries(e.fields))v[k]={cur:fmt(o.cur),prev:fmt(o.prev)};
      setExt(e);setVals(v);setMsg("");
    }catch(err){setMsg("Could not read the PDF. It needs selectable text; scanned PDFs are not supported.")}
    setBusy(false);
  }
  async function run(){
    setBusy(true);setMsg("Running the analysis…");
    const id=crypto.randomUUID();
    const r=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,fields:vals,price:px,signals:ext.signals,company:cn})});
    if(!r.ok){setBusy(false);setMsg(await r.text());return}
    setJob(id);history.replaceState(null,"",`?job=${id}`);await status(id);setBusy(false);
  }
  async function unlock(){
    setBusy(true);
    const r=await fetch("/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:job,email})});
    if(!r.ok){setBusy(false);setMsg("Enter a valid email address first.");return}
    const {action,fields}=await r.json();
    const f=document.createElement("form");f.method="POST";f.action=action;
    Object.entries(fields).forEach(([k,v])=>{const i=document.createElement("input");i.type="hidden";i.name=k;i.value=v;f.appendChild(i)});
    document.body.appendChild(f);f.submit();
  }
  const setV=(k,w)=>e=>setVals(v=>({...v,[k]:{...v[k],[w]:e.target.value}}));
  const bad=ext?.validation.filter(x=>!x.ok)||[];

  return(<div className="w">
    <h1>Upload an annual report.<br/><em>See what the numbers are hiding.</em></h1>
    <p className="sub">Drop in a CSE-listed company’s annual report. The statements are read by rules and every ratio is calculated by formula: quality of earnings, cash flow, debt, working capital, Piotroski, Altman and DCF.</p>
    <div className="note"><b>Analytical tool, not investment advice.</b> Output reflects what the financial statements show. It does not tell you to buy, sell or hold. Verify against the primary document and consult a licensed advisor.</div>
    <div className="drop" tabIndex={0} role="button" onClick={()=>fi.current.click()} onKeyDown={e=>(e.key==="Enter"||e.key===" ")&&fi.current.click()}
      onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setFile(e.dataTransfer.files[0]);setExt(null)}}>
      <b>{file?file.name:"Drop annual report PDF here"}</b>
      <span>{file?`${(file.size/1048576).toFixed(1)} MB. Click to change.`:"Or click to browse. The report includes the prior-year figures, so one PDF is enough."}</span></div>
    <input ref={fi} type="file" accept="application/pdf" hidden onChange={e=>{setFile(e.target.files[0]);setExt(null);setRes(null)}}/>
    <TickerBox value={tk} onChange={setTk} onPick={c=>{setTk(c.t);setCn(c.n)}}/>
    <input type="text" value={cn} onChange={e=>setCn(e.target.value)} placeholder="Company name (optional)"/>
    <div className="price"><div><strong>LKR 99</strong><div className="mut">One price, one full analysed report. No packages, no subscription.</div></div>
      <button className="p" disabled={busy||!file} onClick={read}>Read report</button></div>
    <p className="mut" role="status">{msg}</p>
    {ext&&<div className="panel"><h3>Check the extracted figures</h3>
      <p className="mut">Amounts in millions of the report currency, Group column. Pages: income statement p.{ext.pages.is??"?"}, balance sheet p.{ext.pages.bs??"?"}, cash flow p.{ext.pages.cf??"?"}. Fix any value, then run the analysis.</p>
      {ext.missing.length>0&&<p><span className="pill concern">Not found</span> {ext.missing.join(", ")}. Fill them in below.</p>}
      {ext.validation.map((x,i)=><div key={i}><span className={"pill "+(x.ok?"healthy":"concern")}>{x.ok?"OK":"Mismatch"}</span> {x.name}: {x.detail}</div>)}
      {bad.length>0&&<p className="mut">A mismatch means a figure was probably misread. Correct it before you continue.</p>}
      <div className="wrap" style={{marginTop:12}}><table><thead><tr><th>Item</th><th>This year</th><th>Last year</th><th>Page</th></tr></thead><tbody>
        {LABELS.map(l=>l.length===1?<tr key={l[0]}><th colSpan={4} style={{textAlign:"left",paddingTop:12}}>{l[0]}</th></tr>
          :<tr key={l[0]}><td>{l[1]}</td>{["cur","prev"].map(w=><td key={w}><input type="number" step="any" value={vals[l[0]]?.[w]??""} onChange={setV(l[0],w)} style={{width:110,textAlign:"right"}} aria-label={`${l[1]} ${w}`}/></td>)}<td className="mut">{ext.fields[l[0]]?.page??"manual"}</td></tr>)}</tbody></table></div>
      <h3>Share price (optional, for P/E, P/B, Altman and DCF per share)</h3>
      <input type="number" step="any" placeholder="Price at this year end" value={px.cur} onChange={e=>setPx({...px,cur:e.target.value})} style={{maxWidth:260}}/>
      <input type="number" step="any" placeholder="Price at last year end" value={px.prev} onChange={e=>setPx({...px,prev:e.target.value})} style={{maxWidth:260,marginLeft:8}}/>
      <div style={{marginTop:14}}><button className="p" disabled={busy} onClick={run}>Run analysis</button></div></div>}
    {res&&<Report r={res.report} paid={res.paid} onUnlock={unlock} email={email} setEmail={setEmail} busy={busy}/>}
    <h2>Eight checks, the same lens an institutional analyst uses</h2>
    <div className="g8">{EIGHT.map((t,i)=><div className="c8" key={i}><i>0{i+1}</i><b>{t[0]}</b><p>{t[1]}</p></div>)}</div>
  </div>);
}
