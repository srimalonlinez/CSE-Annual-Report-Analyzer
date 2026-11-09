// Review step additions: sector + business model, document identity and flags, sector KPIs typed
// from the report (with page), and segments. Nothing here is estimated; blanks stay blank.
import {SECTORS,getProfile,entryMetrics} from "../sectors/registry.js";
import {UNIT_HINT} from "./labels.js";

export function SectorPanel({suggestion,sector,bm,onSector,onBm,engine}){
  const profile=getProfile(sector);
  const b=profile?.business_models.find(x=>x.id===bm);
  return <div className="panel"><h3>1. Sector and business model</h3>
    {suggestion&&<p className="mut">{suggestion.sector?<>Suggested: <b>{getProfile(suggestion.sector)?.display_name}</b> <span className={"pill "+({high:"healthy",medium:"watch",low:"concern"}[suggestion.confidence]||"unknown")}>{suggestion.confidence} confidence</span> from {suggestion.evidence}. Confirm or change it.</>:suggestion.evidence}</p>}
    <div className="units">
      <label>GICS sector <select value={sector} onChange={e=>onSector(e.target.value)} aria-label="Sector">
        <option value="">Choose a sector…</option>{SECTORS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {profile&&<label>Business model <select value={bm} onChange={e=>onBm(e.target.value)} aria-label="Business model">
        {profile.business_models.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>}
    </div>
    {profile&&<>
      <p className="mut">Analysis engine: <b>{{industrial:"operating company",lending:"bank / finance company",insurer:"insurer (SLFRS 17)"}[engine]}</b>. The business model decides which ratios apply, not the GICS label alone.
        {profile.verification?.status!=="verified"&&<> Profile v{profile.version} is not yet verified against its reference report ({profile.reference_report?.company}).</>}</p>
      {(b?.warnings||[]).map((w,i)=><p key={i}><span className="pill watch">Note</span> {w}</p>)}
      {profile.cautions?.length>0&&<details><summary className="mut">Sector cautions ({profile.cautions.length})</summary><ul>{profile.cautions.map((c,i)=><li key={i} className="mut">{c}</li>)}</ul></details>}
    </>}
  </div>;
}

export function IdentityPanel({id,setId,flags,setFlags,signals}){
  const F=[["errata","An errata / correction notice is attached",signals?.errata],["discontinued","Discontinued operations are reported",signals?.discontinued],
    ["restated","Comparatives are restated or reclassified",signals?.restated],["segmentChange","Segment definitions changed this year"],["gcDiffers","Going-concern treatment differs between entities"]];
  return <div className="panel"><h3>2. Document identity</h3>
    <p className="mut">Confirm these from the report itself (cover, contents page and auditor's report).</p>
    <div className="units">
      <label>Reporting period <input type="text" value={id.period} onChange={e=>setId({...id,period:e.target.value})} placeholder="e.g. FY 2025/26" style={{maxWidth:180,marginTop:0}}/></label>
      <label>Report type <select value={id.reportType} onChange={e=>setId({...id,reportType:e.target.value})}>
        {["Annual report","Integrated annual report","Interim financial statements"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Figures used <select value={id.scope} onChange={e=>setId({...id,scope:e.target.value})}><option value="group">Group (consolidated)</option><option value="company">Company / Bank only</option></select></label>
    </div>
    <div style={{marginTop:8}}>{F.map(([k,l,pages])=><label key={k} style={{display:"block",fontSize:13.5}}>
      <input type="checkbox" checked={!!flags[k]} onChange={e=>setFlags({...flags,[k]:e.target.checked})}/> {l}
      {pages?.length>0&&<span className="mut"> (detected on p.{pages.slice(0,5).join(", ")})</span>}</label>)}</div>
  </div>;
}

// KPIs the profile expects to be typed from the report (highlights, notes, operational review).
export function KpiPanel({sector,kpis,setKpis}){
  const profile=getProfile(sector);const list=entryMetrics(profile);
  if(!list.length)return null;
  const set=(id,k)=>e=>{const v=e.target.type==="checkbox"?e.target.checked:e.target.value;setKpis(s=>({...s,[id]:{...s[id],[k]:v}}))};
  return <div className="panel"><h3>4. Sector KPIs from the report (optional)</h3>
    <p className="mut">These are usually in the highlights, operational review or notes, not the statements. Enter only what the report states, with its page. Leave the rest blank; it will show as "not found", never estimated. Percentages as typed (4.5 = 4.5%).</p>
    <div className="wrap"><table><thead><tr><th>KPI</th><th>This year</th><th>Last year</th><th>Page</th><th>Not disclosed</th></tr></thead><tbody>
      {list.map(m=>{const k=kpis[m.id]||{};return <tr key={m.id}>
        <td>{m.label}{m.status==="candidate"&&<span className="pill unknown">candidate</span>}<div className="mut" style={{fontSize:12}}>{UNIT_HINT[m.unit]||m.unit}{m.applies_when?` · ${m.applies_when}`:""}</div></td>
        {["cur","prev"].map(w=><td key={w}><input type="number" step="any" disabled={k.notDisclosed} value={k[w]??""} onChange={set(m.id,w)} style={{width:100,textAlign:"right"}} aria-label={`${m.label} ${w}`}/></td>)}
        <td><input type="number" min="1" value={k.page??""} onChange={set(m.id,"page")} style={{width:60}} aria-label={`${m.label} page`}/></td>
        <td style={{textAlign:"center"}}><input type="checkbox" checked={!!k.notDisclosed} onChange={set(m.id,"notDisclosed")} aria-label={`${m.label} not disclosed`}/></td></tr>})}
    </tbody></table></div></div>;
}

export function SegmentPanel({segs,setSegs,diversified}){
  const upd=(i,path,v)=>setSegs(s=>s.map((x,j)=>{if(j!==i)return x;const y=structuredClone(x);const [a,b]=path.split(".");if(b)y[a][b]=v;else y[a]=v;return y}));
  const blank={name:"",page:"",rev:{cur:"",prev:""},profit:{cur:"",prev:""}};
  return <div className="panel"><h3>5. Segments (optional{diversified?", recommended for a diversified group":""})</h3>
    <p className="mut">Use the segment names and figures from the segment note or sector reviews, in Rs. millions. Segment facts are kept separate from the consolidated figures.</p>
    {segs.length>0&&<div className="wrap"><table><thead><tr><th>Segment (as named in the report)</th><th>Revenue this year</th><th>Revenue last year</th><th>Profit this year</th><th>Profit last year</th><th>Page</th><th/></tr></thead><tbody>
      {segs.map((s,i)=><tr key={i}><td><input type="text" value={s.name} onChange={e=>upd(i,"name",e.target.value)} style={{marginTop:0,padding:"6px 8px"}} aria-label="Segment name"/></td>
        {["rev.cur","rev.prev","profit.cur","profit.prev"].map(p=><td key={p}><input type="number" step="any" value={p.split(".").reduce((o,k)=>o[k],s)} onChange={e=>upd(i,p,e.target.value)} style={{width:95,textAlign:"right"}} aria-label={`${s.name||"segment"} ${p}`}/></td>)}
        <td><input type="number" value={s.page} onChange={e=>upd(i,"page",e.target.value)} style={{width:55}} aria-label="Segment page"/></td>
        <td><button onClick={()=>setSegs(x=>x.filter((_,j)=>j!==i))} aria-label="Remove segment">×</button></td></tr>)}
    </tbody></table></div>}
    {segs.length<15&&<button onClick={()=>setSegs(x=>[...x,structuredClone(blank)])} style={{marginTop:8}}>+ Add segment</button>}
  </div>;
}
