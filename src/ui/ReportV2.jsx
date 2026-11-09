// Report v2 view: identity -> summary -> core -> sector KPIs -> segments -> checks -> risk -> valuation -> observations.
import {useEffect,useRef,useState} from "react";
import {GroupedBars,Donut,Waterfall,Piotroski,ZBand,RefBars,nf,pctF} from "../Charts.jsx";
import {finValuation,FIN_MIN_SPREAD} from "../engine/financials.js";
import {Check,List,Dcf,Tile,PILL} from "./parts.jsx";
import {LABEL_OF,STATE_TEXT,KPI_STATUS} from "./labels.js";
const ok=Number.isFinite;
const FMT={pct:pctF,num:v=>nf(v,0)};

export function Identity({r}){
  const id=r.identity;
  return <div className="panel">
    <h3>{id.company||r.company||"Report"}{id.period&&` · ${id.period}`}</h3>
    <div className="chips">
      <span className="pill accent">{id.sector.name}</span><span className="pill unknown">{id.businessModel.label}</span>
      {id.reportType&&<span className="pill unknown">{id.reportType}</span>}
      <span className="pill unknown">{id.scope==="company"?"Company / Bank figures":"Group figures"}</span><span className="pill unknown">{id.unit}</span>
      {!id.sector.verified&&<span className="pill watch">profile v{id.sector.version} unverified</span>}</div>
    {id.warnings?.filter(w=>w.kind!=="profile").map((w,i)=><p key={i} style={{margin:"6px 0"}}><span className="pill watch">{w.kind.replace("_"," ")}</span> {w.text}</p>)}
    {id.cautions?.length>0&&<details><summary className="mut">How this sector is analysed ({id.cautions.length} cautions)</summary><ul>{id.cautions.map((c,i)=><li key={i} className="mut">{c}</li>)}</ul></details>}
  </div>;
}

function Summary({r}){
  const S=r.charts?.status||{},total=S.total??0;
  return <div className="cg">
    <Donut title="Sector checks at a glance" sub={`${S.healthy??0} of ${total} look healthy`} center={{big:`${S.healthy??0}/${total}`,small:"healthy"}} parts={[
      {label:"Healthy",value:S.healthy,color:"var(--g)"},{label:"Watch",value:S.watch,color:"var(--a)"},{label:"Concern",value:S.concern,color:"var(--r)"},{label:"Manual review",value:S.manual,color:"var(--chart-prev)"}]}/>
    <div className="panel" style={{marginBottom:0}}><h3>Summary</h3><p>{r.verdict}</p>
      <p className="mut">Audit and disclosure: <b>{{concern:"concern",watch:"watch",not_detected:"no adverse wording detected"}[S.riskStatus]||"see risk section"}</b>.</p></div>
  </div>;
}

function KpiTable({g}){
  return <div className="panel"><h3>{g.title}</h3><div className="wrap"><table>
    <thead><tr><th>KPI</th><th>This year</th><th>Last year</th><th>Status</th><th style={{textAlign:"left"}}>Source / basis</th></tr></thead>
    <tbody>{g.items.map(k=>{const [cls,txt]=KPI_STATUS[k.status]||["unknown",k.status];return <tr key={k.id}>
      <td>{k.label}{k.profileStatus==="candidate"&&<span className="pill unknown">candidate</span>}</td><td>{k.cur}</td><td>{k.prev}</td>
      <td><span className={"pill "+cls}>{txt}</span></td>
      <td style={{textAlign:"left"}} className="mut">{k.source?.page?`p.${k.source.page}${k.source.label&&k.source.label!==k.label?` · "${k.source.label}"`:""}`:""}
        {k.status==="derived"&&k.formula?` ${k.formula}`:""}{k.note&&k.status!=="reported"?` ${k.note}`:""}</td></tr>})}</tbody></table></div></div>;
}

function Segments({segs}){
  if(!segs?.length)return null;
  return <div className="panel"><h3>Segments</h3><p className="mut">As entered from the report's segment note (Rs. Mn). Kept separate from consolidated figures.</p><div className="wrap"><table>
    <thead><tr><th>Segment</th><th>Revenue</th><th>Last year</th><th>Growth</th><th>Share</th><th>Profit</th><th>Margin</th><th>Page</th></tr></thead>
    <tbody>{segs.map((s,i)=><tr key={i}><td>{s.name}</td><td>{s.rev.cur}</td><td>{s.rev.prev}</td><td>{s.rev.growth}</td><td>{s.rev.share}</td><td>{s.profit.cur}</td><td>{s.profit.margin}</td><td>{s.page?`p.${s.page}`:""}</td></tr>)}</tbody></table></div></div>;
}

// Financial institutions: P/B, residual income and dividend discount from one clean-surplus forecast.
const FSL=[["coe","Cost of equity",.08,.25,.005],["g","Long-run growth",0,.08,.005],["roe0","ROE this year",-.1,.4,.005],["roeLong","Long-run ROE",0,.35,.005],["payout","Payout ratio",0,1,.01],["years","Forecast years",3,10,1]];
export function FinVal({v,onChange}){
  const d=v.fin;const [a,setA]=useState(d.base);useEffect(()=>{onChange?.(a)},[a]);
  const src=d.base.src||{},inp={bv0:d.inputs.bv0,shares:d.inputs.shares??NaN},pr=d.inputs.price,bvps=d.inputs.bvps;
  const per=ok(inp.shares)&&inp.shares>0,val=x=>{const q=finValuation(inp,x);return per?q.riPerShare:q.ri};
  const base=finValuation(inp,a);
  const S=[["Bear",{roeLong:a.roeLong-.03,coe:a.coe+.01}],["Base",{}],["Bull",{roeLong:a.roeLong+.03,coe:a.coe-.01}]];
  const C=[a.coe-.02,a.coe,a.coe+.02],G=[a.g-.01,a.g,a.g+.01];
  const show=(k,x)=>k==="years"?String(x):(x*100).toFixed(1)+"%";
  const cls=x=>!ok(x)?"n":ok(pr)&&per?(x>=pr?"g":"r"):"n";
  return <div className="panel"><h3>Valuation: book value and returns</h3>
    <div className="tiles">
      <div className="tile"><small>Price / book</small><strong>{ok(pr)&&bvps>0?(pr/bvps).toFixed(2)+"x":"n/a"}</strong><span className="mut">{ok(bvps)?`book value ${nf(bvps,2)} per share`:"needs EPS for shares"}</span></div>
      <div className="tile"><small>Justified P/B</small><strong>{ok(base.justifiedPB)?base.justifiedPB.toFixed(2)+"x":"n/a"}</strong><span className="mut">(long-run ROE − g) ÷ (COE − g)</span></div>
      <div className="tile"><small>Residual income value</small><strong>{nf(per?base.riPerShare:base.ri,2)}</strong><span className="mut">{per?"per share":"Rs. Mn"}</span></div>
      <div className="tile"><small>Dividend discount value</small><strong>{nf(per?base.ddmPerShare:base.ddm,2)}</strong><span className="mut">{per?"per share":"Rs. Mn"}</span></div></div>
    <div className="sl">{FSL.map(([k,l,mn,mx,st])=><label key={k} className="sld"><span><b>{l}</b><output>{show(k,a[k])}</output></span>
      <input type="range" min={mn} max={mx} step={st} value={a[k]} onChange={e=>{const x=parseFloat(e.target.value);setA(s=>({...s,[k]:x}))}} aria-label={l}/>
      <small><span>{show(k,mn)} to {show(k,mx)}</span><span>{src[k]==="report"?"from report":"default"}</span></small></label>)}
      <button className="rs" onClick={()=>setA(d.base)}>Reset to report values</button></div>
    {base.invalid&&<p><span className="pill concern">Check inputs</span> {base.invalid}.</p>}
    <div className="cg">
      <RefBars title={`Residual income value ${per?"per share":"(Rs. Mn)"}`} sub={per&&ok(pr)?"Dashed line = share price you entered":"Enter a share price for the comparison"}
        data={S.map(([n,x])=>({label:n,value:val({...a,...x}),accent:n==="Base"}))} refLine={per&&ok(pr)?{value:pr,label:`Price ${nf(pr,2)}`}:null}/>
      <figure className="chart"><figcaption><b>Sensitivity: cost of equity against growth</b><span>Residual income value. n/a = cost of equity not above growth</span></figcaption>
        <div className="heat" style={{gridTemplateColumns:"1.2fr repeat(3,1fr)"}}><div className="h">COE \ g</div>{G.map(g=><div className="h" key={g}>{(g*100).toFixed(1)}%</div>)}
          {C.flatMap(c=>[<div className="h" key={"c"+c}>{(c*100).toFixed(1)}%</div>,...G.map(g=>{const x=val({...a,coe:c,g});return <div key={c+"-"+g} className={cls(x)}>{ok(x)?nf(x,2):"n/a"}</div>})])}</div></figure></div>
    <p className="mut">ROE moves in a straight line from this year's to the long-run ROE over {a.years} years; book value grows by retained profit. Residual income = book value + PV of (ROE − cost of equity) × opening book value. Terminal growth must stay at least {(FIN_MIN_SPREAD*100).toFixed(1)} pp below the cost of equity. No conventional cash-flow DCF: deposits and policyholder liabilities are not ordinary debt. Illustrative only.</p>
  </div>;
}

function Valuation({v,dcfRef,finRef}){
  const L=v.labels||{};const chip=(k,cls)=><span key={k} className={"pill "+cls}>{L[k]||k}</span>;
  return <>
    <div className="panel"><h3>Valuation approach for this sector</h3>
      <div className="chips"><b style={{fontSize:13}}>Preferred:</b> {v.preferred.map(k=>chip(k,"healthy"))}</div>
      {v.conditional.length>0&&<div className="chips"><b style={{fontSize:13}}>Conditional:</b> {v.conditional.map(k=>chip(k,"unknown"))}</div>}
      {v.avoid.length>0&&<div className="chips"><b style={{fontSize:13}}>Not used as default:</b> {v.avoid.map(k=>chip(k,"concern"))}</div>}
      {v.notes?.map((n,i)=><p key={i} className="mut" style={{margin:"4px 0"}}>{n}</p>)}</div>
    {v.fin&&<FinVal v={v} onChange={x=>{finRef.current=x}}/>}
    {v.dcf&&<Dcf d={v.dcf} onChange={x=>{dcfRef.current=x}}/>}
    {v.nav&&<div className="panel"><h3>Net asset value</h3><div className="tiles">
      <div className="tile"><small>Book NAV per share</small><strong>{nf(v.nav.navps,2)}</strong></div>
      <div className="tile"><small>Price / NAV</small><strong>{v.nav.pnav!=null?v.nav.pnav.toFixed(2)+"x":"n/a"}</strong><span className="mut">{v.nav.price!=null?`at ${nf(v.nav.price,2)}`:"enter a share price"}</span></div></div>
      <p className="mut">{v.nav.note}</p></div>}
    {v.sotp&&<div className="panel"><h3>Sum of the parts</h3><p className="mut">{v.sotp.note}</p>
      {v.sotp.segments.length>0&&<ul>{v.sotp.segments.map((s,i)=><li key={i}>{s.name}: revenue {s.rev}, profit {s.profit}</li>)}</ul>}</div>}
  </>;
}

export function ReportV2({r,paid,onUnlock,email,setEmail,busy}){
  const dcfRef=useRef(null),finRef=useRef(null),[pdf,setPdf]=useState("");
  const getPdf=async()=>{setPdf("Building the PDF…");
    try{const {downloadReportPdf}=await import("../pdfReport.js");const name=await downloadReportPdf(r,{assumptions:dcfRef.current,finAssumptions:finRef.current,labels:LABEL_OF});setPdf(`Downloaded ${name}`)}
    catch(e){console.error(e);setPdf("Could not build the PDF. Please try again.")}};
  const ch=r.charts||{};
  return <div id="res">
    <Identity r={r}/>
    <Summary r={r}/>
    <div className="panel"><h3>Core financials (Rs. Mn)</h3><div className="tiles">{(r.core||[]).map((m,i)=><Tile key={i} m={m}/>)}</div>
      {r.gaps?.length>0&&<p className="mut"><b>Data gaps:</b> {r.gaps.map(g=>`${LABEL_OF[g.key]||g.key} (${STATE_TEXT[g.state]||g.state})`).join(", ")}. Ratios that need these show n/a; nothing is assumed to be zero.</p>}</div>
    {!paid?<div className="lock"><div className="blur"><div className="cg"><div className="chart" style={{height:230}}/><div className="chart" style={{height:230}}/></div></div>
      <div className="gate"><b style={{fontSize:18}}>Unlock the full {r.identity?.sector?.name} analysis</b>
        <span className="mut">{r.locked?.sectorKpis??""} sector KPIs with sources, {r.locked?.checks??""} sector checks, segments, risk and disclosure review, sector-appropriate valuation and investor questions.</span>
        <input type="text" placeholder="Email for the payment receipt" value={email} onChange={e=>setEmail(e.target.value)} style={{maxWidth:320}}/>
        <button className="p" disabled={busy} onClick={onUnlock}>Pay LKR 99 and unlock</button></div></div>
    :<>
      <h2 className="sec">Sector KPIs</h2>
      <p className="mut">Reported = read from the statements. From report = typed from the report with its page. Derived = calculated by the formula shown. Not found / not disclosed values are never estimated.</p>
      {(r.sectorKpis||[]).map(g=><KpiTable key={g.id} g={g}/>)}
      <div className="cg">{(ch.groups||[]).map((g,i)=><GroupedBars key={i} title={g.title} data={g.data} fmt={FMT[g.fmt]||FMT.num}/>)}</div>
      {r.bridge&&<Waterfall title="PAT bridge: what changed and why" sub="Change in profit after tax, by driver" start={ch.patStart} end={ch.patEnd} steps={r.bridge}/>}
      <Segments segs={r.segments}/>
      <h2 className="sec">Sector checks</h2>
      {(r.checks||[]).map((c,i)=><Check key={i} c={c} i={i}/>)}
      {r.qoe&&<><div className="cg" style={{marginTop:14}}><Piotroski score={r.qoe.piotroski.score} tests={r.qoe.piotroski.tests}/><ZBand a={ch.altman}/></div>
        <div className="tiles">{r.qoe.rows.slice(0,7).map((x,i)=><div className="tile" key={i}><small>{x[0]}</small><strong>{x[1]}</strong><span className="mut">was {x[2]}</span></div>)}</div></>}
      <h2 className="sec">Risk, disclosure and governance</h2>
      <div className="panel"><h3>Audit opinion and disclosures<span className={"pill "+(PILL[r.risk.status]?.[0]||r.risk.status)}>{PILL[r.risk.status]?.[1]||r.risk.status}</span></h3><ul>{r.risk.points.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
      <h2 className="sec">Valuation</h2>
      <Valuation v={r.valuation} dcfRef={dcfRef} finRef={finRef}/>
      <h2 className="sec">Observations</h2>
      <div className="panel"><List t="Positive observations" a={r.positives?.length?r.positives:["None flagged"]}/><List t="Areas of concern" a={r.concerns?.length?r.concerns:["None flagged"]}/></div>
      <div className="panel"><h3>Questions to ask the company</h3><ol>{(r.questions||[]).map((x,i)=><li key={i}>{x}</li>)}</ol></div>
      <div className="panel"><p className="mut">Figures are read from the PDF by rules or typed from the report with a page reference; ratios use the formulas shown. The sector profile sets which measures apply. Not investment advice.</p></div>
      <div className="price"><div><b>Download the full report as a PDF</b><div className="mut">A4 document in the same order, with valuation at the assumptions set above.</div></div>
        <button className="p" onClick={getPdf} disabled={pdf==="Building the PDF…"}>Download PDF</button></div>
      {pdf&&<p className="mut" role="status">{pdf}</p>}
    </>}
  </div>;
}
