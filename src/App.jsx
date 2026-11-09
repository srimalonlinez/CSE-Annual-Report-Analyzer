import {useEffect,useRef,useState} from "react";
import {readPages} from "./pdf.js";
import {extractFigures,scanSignals,UNITS,FIELD_STMT} from "./engine/extract.js";
import tickers from "./tickers.json";
import {GroupedBars,Donut,Waterfall,Piotroski,ZBand,RefBars,nf,pctF} from "./Charts.jsx";
import "./styles.css";
import {PILL,Check,List,Dcf,Tile} from "./ui/parts.jsx";
import {LABELS as LABELS_BY_ENGINE,LABEL_OF,STATE_TEXT} from "./ui/labels.js";
import {SectorPanel,IdentityPanel,KpiPanel,SegmentPanel} from "./ui/Review.jsx";
import {ReportV2} from "./ui/ReportV2.jsx";
import {suggestSector,getProfile,getBusinessModel,engineOf} from "./sectors/registry.js";

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

const fmt=x=>Number.isFinite(x)?+x.toFixed(3):"";

const STMT_NAME={is:"Income statement",bs:"Balance sheet",cf:"Cash flow"};
const CONF_PILL={high:"healthy",medium:"watch",low:"concern",user:"healthy"};
function StateCell({k,o,page,onState}){
  const st=o?.state||"not_extracted",has=o&&(o.cur!==""||o.prev!=="");
  if(has&&st!=="verified_zero")return <td className="mut">{st==="extracted"?`p.${page}`:st==="derived"?"derived":"entered by you"}</td>;
  return <td><select value={st} onChange={e=>onState(k,e.target.value)} aria-label={`${LABEL_OF[k]} status`}>
    {st==="missing"&&<option value="missing">Missing</option>}
    <option value="not_extracted">Not extracted</option><option value="not_disclosed">Not disclosed</option><option value="verified_zero">Verified zero</option></select></td>;
}

function Report({r,paid,onUnlock,email,setEmail,busy}){
  const ch=r.charts||{},S=ch.status||{};
  const dcfA=useRef(null),[pdf,setPdf]=useState("");
  const getPdf=async()=>{setPdf("Building the PDF…");
    try{const {downloadReportPdf}=await import("./pdfReport.js");const name=await downloadReportPdf(r,{assumptions:dcfA.current,labels:LABEL_OF});setPdf(`Downloaded ${name}`)}
    catch(e){console.error(e);setPdf("Could not build the PDF. Please try again.")}};
  const glance=<div className="cg">
    <Donut title="Eight checks at a glance" sub={`${S.healthy??0} of 8 look healthy`} center={{big:`${S.healthy??0}/8`,small:"healthy"}} parts={[
      {label:"Healthy",value:S.healthy,color:"var(--g)"},{label:"Watch",value:S.watch,color:"var(--a)"},{label:"Concern",value:S.concern,color:"var(--r)"},{label:"Manual review",value:S.manual,color:"var(--chart-prev)"},{label:"Not detected",value:S.notDetected??0,color:"var(--line)"}]}/>
    <GroupedBars title="Margins: how much of each rupee stays as profit" data={ch.margins} fmt={pctF}/></div>;
  const mix=ch.caMix||{};
  const full=paid&&<>
    <div className="cg">
      <GroupedBars title="Profit versus cash" sub="Profit that does not turn into cash is a warning sign" data={ch.cash} fmt={v=>nf(v,0)}/>
      <GroupedBars title="Working capital in days" sub="Longer receivable and inventory days tie up cash" data={ch.days} fmt={v=>nf(v,0)}/>
      <GroupedBars title="Returns" data={ch.returns} fmt={pctF}/>
      <Donut title="What current assets are made of" sub="This year" parts={[
        {label:"Receivables",value:mix.rec,color:"var(--acc)",text:nf(mix.rec,0)},{label:"Inventories",value:mix.inv,color:"var(--a)",text:nf(mix.inv,0)},
        {label:"Cash",value:mix.cash,color:"var(--g)",text:nf(mix.cash,0)},{label:"Other",value:mix.other,color:"var(--chart-prev)",text:nf(mix.other,0)}]}/>
    </div>
    <Waterfall title="PAT bridge: what changed and why" sub="Change in profit after tax, by driver" start={ch.patStart} end={ch.patEnd} steps={r.bridge}/>
    <div className="cg" style={{marginTop:14}}><Piotroski score={r.qoe.piotroski.score} tests={r.qoe.piotroski.tests}/><ZBand a={ch.altman}/></div>
    <div className="tiles">{r.qoe.rows.slice(0,7).map((x,i)=><div className="tile" key={i}><small>{x[0]}</small><strong>{x[1]}</strong><span className="mut">was {x[2]}</span></div>)}</div>
    {(r.checks||[]).slice(2).map((c,i)=><Check key={i} c={c} i={i+2}/>)}
    {r.dcf&&<Dcf d={r.dcf} onChange={x=>{dcfA.current=x}}/>}
    <div className="panel"><List t="Positive observations" a={r.positives}/><List t="Areas of concern" a={r.concerns}/></div>
    <div className="panel"><h3>Questions to ask the company</h3><ol>{(r.questions||[]).map((x,i)=><li key={i}>{x}</li>)}</ol></div>
    <div className="panel"><p className="mut">Every figure is extracted by rules from the PDF and every ratio is calculated by formula; nothing is generated by AI. Related-party and disclosure checks only flag where to read. Check numbers against the report. Not investment advice.</p></div>
    <div className="price"><div><b>Download the full report as a PDF</b><div className="mut">A4 document with every check, chart, table and the valuation at the assumptions set above.</div></div>
      <button className="p" onClick={getPdf} disabled={pdf==="Building the PDF…"}>Download PDF</button></div>
    {pdf&&<p className="mut" role="status">{pdf}</p>}</>;
  return(<div id="res">
    <div className="panel"><h3>{r.company||"Report"} {r.period&&"· "+r.period}</h3><p>{r.verdict}</p>
      <div className="tiles">{(r.metrics||[]).map((m,i)=><Tile key={i} m={m}/>)}</div>
      {r.gaps?.length>0&&<p className="mut"><b>Data gaps:</b> {r.gaps.map(g=>`${LABEL_OF[g.key]||g.key} (${STATE_TEXT[g.state]||g.state})`).join(", ")}. Ratios that need these show n/a; nothing is assumed to be zero.</p>}</div>
    {glance}
    {(r.checks||[]).slice(0,2).map((c,i)=><Check key={i} c={c} i={i}/>)}
    {paid?full:<div className="lock"><div className="blur"><div className="cg"><div className="chart" style={{height:230}}/><div className="chart" style={{height:230}}/></div></div>
      <div className="gate"><b style={{fontSize:18}}>Unlock the full report</b>
        <span className="mut">6 more checks, cash and working-capital charts, PAT bridge, Piotroski and Altman, DCF scenarios and investor questions.</span>
        <input type="text" placeholder="Email for the payment receipt" value={email} onChange={e=>setEmail(e.target.value)} style={{maxWidth:320}}/>
        <button className="p" disabled={busy} onClick={onUnlock}>Pay LKR 99 and unlock</button></div></div>}
  </div>);
}

export default function App(){
  const [file,setFile]=useState(null),[tk,setTk]=useState(""),[cn,setCn]=useState(""),[email,setEmail]=useState("");
  const [px,setPx]=useState({cur:"",prev:""}),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const [ext,setExt]=useState(null),[vals,setVals]=useState({}),[res,setRes]=useState(null),[job,setJob]=useState(null);
  const [sug,setSug]=useState(null),[sector,setSector]=useState(""),[bm,setBm]=useState(""),[kpis,setKpis]=useState({}),[segs,setSegs]=useState([]);
  const [idn,setIdn]=useState({period:"",reportType:"Annual report",scope:"group"}),[flags,setFlags]=useState({}),[dps,setDps]=useState("");
  const fi=useRef(),pagesRef=useRef(null);
  const engine=sector?engineOf(sector,bm):"industrial",LABELS=LABELS_BY_ENGINE[engine];

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
      pagesRef.current=pages;
      const s=suggestSector(pages,cn);setSug(s);
      const sec=s.sector||"",b=sec?getProfile(sec).business_models[0].id:"";
      setSector(sec);setBm(b);setKpis({});setSegs([]);setFlags({});
      extractWith(sec?engineOf(sec,b):"industrial");setMsg("");
    }catch(err){setMsg("Could not read the PDF. It needs selectable text; scanned PDFs are not supported.")}
    setBusy(false);
  }
  // (re)read the statements with the dictionary of the chosen engine
  function extractWith(eng){
    const pages=pagesRef.current;if(!pages)return;
    const e=extractFigures(pages,eng);e.signals=scanSignals(pages);
    const v={};for(const l of LABELS_BY_ENGINE[eng])if(l.length>1)v[l[0]]={cur:"",prev:"",state:"not_extracted"};
    for(const[k,o]of Object.entries(e.fields))v[k]={cur:fmt(o.cur),prev:fmt(o.prev),state:o.state||"extracted"};
    setExt(e);setVals(v);
    setFlags(f=>({...f,errata:f.errata||!!e.signals.errata?.length,discontinued:f.discontinued||!!e.signals.discontinued?.length,restated:f.restated||!!e.signals.restated?.length}));
  }
  const chooseSector=id=>{const b=id?getProfile(id).business_models[0].id:"";const was=engine,now=id?engineOf(id,b):"industrial";
    setSector(id);setBm(b);setKpis({});if(now!==was)extractWith(now)};
  const chooseBm=id=>{const now=engineOf(sector,id);setBm(id);if(now!==engine)extractWith(now)};
  async function run(){
    setBusy(true);setMsg("Running the analysis…");
    const id=crypto.randomUUID();
    // each figure carries its page and original statement label as evidence
    const fields=Object.fromEntries(Object.entries(vals).map(([k,v])=>[k,{...v,page:ext.fields[k]?.page,src:ext.fields[k]?.src}]));
    const segments=segs.map(s=>({name:s.name,page:s.page,rev:s.rev,profit:s.profit}));
    try{
      const r=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,fields,price:px,dps,signals:ext.signals,company:cn,
        sector,businessModel:bm,kpis,segments,flags,period:idn.period,reportType:idn.reportType,scope:idn.scope})});
      if(!r.ok){setBusy(false);setMsg(await r.text());return}
      setJob(id);history.replaceState(null,"",`?job=${id}`);await status(id);
    }catch{setMsg("Could not reach the server. Check your connection and try again.")}
    setBusy(false);
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
  // Typing a value makes it "manual"; clearing it makes it "missing". Blanks are never zero unless marked "verified zero".
  const setV=(k,w)=>e=>setVals(v=>{const was=v[k]||{},o={...was,[w]:e.target.value};
    const empty=o.cur===""&&o.prev==="",zero=Number(o.cur)===0&&(o.prev===""||Number(o.prev)===0);
    o.state=empty?(["not_extracted","not_disclosed"].includes(was.state)?was.state:"missing"):was.state==="verified_zero"&&zero?"verified_zero":"manual";
    return{...v,[k]:o}});
  const setState=(k,s)=>setVals(v=>({...v,[k]:s==="verified_zero"?{cur:"0",prev:"0",state:s}:{cur:"",prev:"",state:s}}));
  // Changing a statement's unit rescales every figure read from that statement (EPS is per share, never scaled).
  const setUnit=(st,u)=>{const f=UNITS[u].scale/ext.units[st].scale;
    setVals(v=>{const out={...v};for(const k in out){if(FIELD_STMT[k]!==st||k==="eps")continue;
      const sc=x=>x===""||!Number.isFinite(Number(x))?x:String(fmt(Number(x)*f));out[k]={...out[k],cur:sc(out[k].cur),prev:sc(out[k].prev)}}return out});
    setExt(e=>({...e,units:{...e.units,[st]:{...e.units[st],unit:u,scale:UNITS[u].scale,label:UNITS[u].label,confidence:"user",source:"set by you",warnings:[]}}}))};
  const bad=ext?.validation.filter(x=>!x.ok)||[];

  return(<div className="w">
    <h1>Upload an annual report.<br/><em>See what the numbers are hiding.</em></h1>
    <p className="sub">Drop in a CSE-listed company’s annual report. The statements are read by rules, the sector profile picks the measures that fit the business, and every ratio is calculated by a formula you can see.</p>
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
    {ext&&<SectorPanel suggestion={sug} sector={sector} bm={bm} onSector={chooseSector} onBm={chooseBm} engine={engine}/>}
    {ext&&<IdentityPanel id={idn} setId={setIdn} flags={flags} setFlags={setFlags} signals={ext.signals}/>}
    {ext&&<div className="panel"><h3>3. Check the extracted figures</h3>
      <p className="mut">Amounts below are in millions of the report currency, Group column. Check the unit each statement is printed in, fix any value, then run the analysis.</p>
      <div className="units">{["is","bs","cf"].map(st=>{const u=ext.units?.[st],pg=ext.statementPages?.[st];
        return <div key={st}><b>{STMT_NAME[st]}</b> {pg?.length?`p.${pg.join(", ")}`:"not found"}
          {u&&<> · printed in <select value={u.unit} onChange={e=>setUnit(st,e.target.value)} aria-label={`${STMT_NAME[st]} unit`}>
            {Object.entries(UNITS).map(([k,x])=><option key={k} value={k}>{x.label}</option>)}</select>
            <span className={"pill "+CONF_PILL[u.confidence]}>{u.confidence==="user"?"set by you":u.confidence+" confidence"}</span>
            {u.confidence!=="user"&&<span className="mut"> from {u.source}</span>}
            {u.warnings?.length>0&&<span className="mut"> · {u.warnings.join("; ")}</span>}</>}</div>})}</div>
      {ext.missing.length>0&&<p><span className="pill concern">Not found</span> {ext.missing.join(", ")}. Fill them in below.</p>}
      {ext.validation.map((x,i)=><div key={i}><span className={"pill "+(x.ok?"healthy":"concern")}>{x.ok?"OK":"Mismatch"}</span> {x.name}: {x.detail}</div>)}
      {bad.length>0&&<p className="mut">A mismatch means a figure was probably misread. Correct it before you continue.</p>}
      <div className="wrap" style={{marginTop:12}}><table><thead><tr><th>Item</th><th>This year</th><th>Last year</th><th>Source / status</th></tr></thead><tbody>
        {LABELS.map(l=>l.length===1?<tr key={l[0]}><th colSpan={4} style={{textAlign:"left",paddingTop:12}}>{l[0]}</th></tr>
          :<tr key={l[0]}><td>{l[1]}</td>{["cur","prev"].map(w=><td key={w}><input type="number" step="any" value={vals[l[0]]?.[w]??""} onChange={setV(l[0],w)} style={{width:110,textAlign:"right"}} aria-label={`${l[1]} ${w}`}/></td>)}<StateCell k={l[0]} o={vals[l[0]]} page={ext.fields[l[0]]?.page} onState={setState}/></tr>)}</tbody></table></div>
    </div>}
    {ext&&sector&&<KpiPanel sector={sector} kpis={kpis} setKpis={setKpis}/>}
    {ext&&sector&&<SegmentPanel segs={segs} setSegs={setSegs} diversified={!!getBusinessModel(getProfile(sector),bm)?.diversified}/>}
    {ext&&<div className="panel"><h3>6. Market data (optional)</h3>
      <p className="mut">Share price for {engine==="industrial"?"P/E, P/B, Altman and DCF per share":"price-to-book and the valuation comparison"}.</p>
      <input type="number" step="any" placeholder="Price at this year end" value={px.cur} onChange={e=>setPx({...px,cur:e.target.value})} style={{maxWidth:260}}/>
      <input type="number" step="any" placeholder="Price at last year end" value={px.prev} onChange={e=>setPx({...px,prev:e.target.value})} style={{maxWidth:260,marginLeft:8}}/>
      {engine!=="industrial"&&<input type="number" step="any" placeholder="Dividend per share (Rs.)" value={dps} onChange={e=>setDps(e.target.value)} style={{maxWidth:260,marginLeft:8}}/>}
      <div style={{marginTop:14}}><button className="p" disabled={busy||!sector} onClick={run}>Run analysis</button>{!sector&&<span className="mut"> Choose a sector first.</span>}</div></div>}
    {res&&(res.report?.version===2?<ReportV2 r={res.report} paid={res.paid} onUnlock={unlock} email={email} setEmail={setEmail} busy={busy}/>
      :<Report r={res.report} paid={res.paid} onUnlock={unlock} email={email} setEmail={setEmail} busy={busy}/>)}
    <h2>Checks that follow the sector</h2>
    <p className="sub">Each of 19 CSE sector profiles sets its own measures: banks and finance companies are judged on asset quality, funding and capital; insurers on insurance service result and solvency; operating companies on the eight checks below.</p>
    <div className="g8">{EIGHT.map((t,i)=><div className="c8" key={i}><i>0{i+1}</i><b>{t[0]}</b><p>{t[1]}</p></div>)}</div>
  </div>);
}
