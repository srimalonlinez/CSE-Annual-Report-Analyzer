// Report v2: one structure for every sector, driven by the sector profile.
//   identity -> summary -> core tiles -> sector KPIs -> segments -> sector checks -> risk & disclosure
//   -> valuation -> observations
// Missing facts stay missing: a KPI is reported (statement line), entered (typed from the report with a
// page), derived (documented formula), not disclosed (user confirmed), not found, or not applicable.
import {analyze,metrics as industrialMetrics} from "./analyze.js";
import {lendingMetrics,insurerMetrics} from "./financials.js";
import {FORMULAS,ENTRY_FORMULAS,DIRECT} from "./derive.js";
import {getProfile,getBusinessModel,VALUATION_METHODS,COMPUTED_METHODS} from "../sectors/registry.js";

export const REPORT_VERSION=2;
const ok=Number.isFinite,nan=NaN;
const n=(x,d=1)=>ok(x)?x.toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d}):"n/a";
const pc=(x,d=1)=>ok(x)?(x*100).toFixed(d)+"%":"n/a";
const xx=x=>ok(x)?x.toFixed(2)+"x":"n/a";
const UNIT_FMT={percent:x=>pc(x),ratio:xx,currency_mn:x=>n(x,1),per_share:x=>n(x,2),days:x=>n(x,0),count:x=>n(x,0),currency:x=>n(x,2)};
export const fmtUnit=(unit,x)=>(UNIT_FMT[unit]||(v=>ok(v)?`${n(v,v%1?2:0)} ${unit}`:"n/a"))(x);
const CATEGORY_TITLES={income_composition:"Income composition",asset_quality:"Asset quality",efficiency:"Efficiency",profitability:"Profitability",
  balance_sheet:"Balance sheet",funding:"Funding",capital_liquidity:"Capital and liquidity",shareholder:"Shareholder",non_financial:"Non-financial",
  income:"Income",portfolio:"Portfolio",capital:"Capital",premium:"Premium",insurance_result:"Insurance result",investments:"Investments",
  financial_performance:"Financial performance",financial_position:"Financial position and funding",working_capital:"Working capital",returns:"Returns",
  operations:"Operations",segments:"Segments and markets",accounting:"Accounting items",group_structure:"Group structure",property:"Property",
  current_activities:"Current activities",risk:"Risk"};
const titleOf=c=>CATEGORY_TITLES[c]||c.replace(/_/g," ").replace(/^./,s=>s.toUpperCase());
const RANK={healthy:1,watch:2,concern:3};

// tiles: % change only when last year is positive; ratios change in percentage points
function tile(label,a,b,{d=1,lowerIsBetter=false,unit="currency_mn",show}={}){
  const delta=a-b,isRatio=unit==="percent";
  const chg=isRatio?(ok(delta)?`${delta>=0?"":"-"}${Math.abs(delta*100).toFixed(1)} pp`:"n/a"):ok(a)&&b>0?pc(a/b-1):ok(delta)?n(delta,d):"n/a";
  const s=show||(x=>fmtUnit(unit,x));
  return{label,cur:s(a),prev:s(b),chg:chg.replace(/^-?/,m=>delta<0?"-":""),dir:!ok(delta)||delta===0?null:delta>0?"up":"down",
    trend:!ok(delta)||delta===0?null:(lowerIsBetter?delta<0:delta>0)?"better":"worse"};
}

export function buildReport(input){
  const {sector,businessModel,fields:f,kpis={},segments=[],flags={},price,signals={},company="",period="",reportType="",scope="group"}=input;
  const profile=getProfile(sector);if(!profile)throw new Error("Unknown sector");
  const bm=getBusinessModel(profile,businessModel),engine=bm.engine;
  const general=!!bm.general;

  // ---- engine metrics ------------------------------------------------------------------------
  let c,p,legacy=null;
  if(engine==="industrial"){legacy=analyze({fields:f,price,signals,company,period});c=industrialMetrics(f,"cur",price);p=industrialMetrics(f,"prev",price)}
  else if(engine==="lending"){c=lendingMetrics(f,"cur");p=lendingMetrics(f,"prev")}
  else{c=insurerMetrics(f,"cur",null,{general});p=insurerMetrics(f,"prev",null,{general})}
  if(price){c.px=price.cur??nan;p.px=price.prev??nan}

  // ---- entered KPIs (percent units arrive as typed, e.g. 4.5 -> 0.045) ---------------------------
  const entries={};
  for(const m of profile.metrics.filter(m=>m.input==="entry")){
    const k=kpis[m.id];if(!k)continue;
    const conv=v=>ok(v)?(m.unit==="percent"?v/100:v):nan;
    entries[m.id]={cur:conv(k.cur),prev:conv(k.prev),page:k.page,notDisclosed:!!k.notDisclosed};
  }

  // ---- sector KPIs ----------------------------------------------------------------------------
  const kpiById={};
  const items=profile.metrics.map(m=>{
    let cur=nan,prev=nan,status="not_found",source=null,note=m.interpretation||null,curText=null,prevText=null;
    if(m.input==="entry"){
      const e=entries[m.id];
      if(e?.notDisclosed)status="not_disclosed";
      else if(e&&(ok(e.cur)||ok(e.prev))){cur=e.cur;prev=e.prev;status="entered";source=e.page?{page:e.page,label:m.label}:null}
    }else if(m.derive&&ENTRY_FORMULAS[m.derive]){
      const r=ENTRY_FORMULAS[m.derive](entries);cur=r.cur;prev=r.prev;
      status=ok(cur)||ok(prev)?"derived":"not_found";
      if(status==="not_found")note=`Needs ${(m.inputs||[]).join(" and ")} for the same period`;
    }else if(m.derive){
      const fn=FORMULAS[engine]?.[m.derive];
      if(!fn){status="not_applicable";note="Not applicable to this business model"}
      else{
        const r=fn(c,p);cur=r.cur;prev=r.prev;curText=r.curText||null;prevText=r.prevText||null;
        const direct=DIRECT[m.derive];
        if(ok(cur)||ok(prev)||curText){
          status=direct&&f[direct]?.state==="extracted"?"reported":direct&&f[direct]?.state==="manual"?"entered":"derived";
          if(direct&&f[direct]?.page)source={page:f[direct].page,label:f[direct].src||m.label};
        }else if(m.derive==="combined_ratio"&&!general){status="not_applicable";note="Only for general insurance"}
        else note=note||"Inputs not available";
      }
    }
    const show=(x,t)=>t||fmtUnit(m.unit,x);
    const it={id:m.id,label:m.label,category:m.category,profileStatus:m.status,status,unit:m.unit,
      cur:show(cur,curText),prev:show(prev,prevText),raw:{cur:ok(cur)?cur:null,prev:ok(prev)?prev:null},
      formula:m.formula||null,source,scope,note,appliesWhen:m.applies_when||null};
    kpiById[m.id]={...it,v:cur,vp:prev};
    return it;
  });
  const cats=[];for(const it of items){let g=cats.find(x=>x.id===it.category);if(!g)cats.push(g={id:it.category,title:titleOf(it.category),items:[]});g.items.push(it)}

  // ---- checks ---------------------------------------------------------------------------------
  const checks=[];
  if(legacy)checks.push(...legacy.checks.filter(x=>x.title!=="Disclosure quality"));
  for(const ch of profile.checks||[])checks.push(evalCheck(ch,kpiById));

  // ---- risk & disclosure (moved out of the checks) ----------------------------------------------
  const q=signals.qualified||[],gc=signals.gcMaterial||[],em=signals.emphasis||[],ar=signals.auditReport||[];
  const rpts=[
    ar.length?`Independent auditor's report found on page ${ar.join(", ")}`:"Independent auditor's report heading not located: the audit opinion could not be checked",
    q.length?`Qualified/adverse/disclaimer wording on pages ${q.join(", ")}`:"Qualified, adverse or disclaimer opinion: not detected. Read the opinion paragraph to confirm",
    gc.length?`Material-uncertainty-on-going-concern heading on pages ${gc.join(", ")}`:"Going-concern material uncertainty: not detected"];
  if(em.length)rpts.push(`Emphasis of matter on pages ${em.join(", ")}`);
  if((signals.kam||[]).length)rpts.push(`Key audit matters on page ${signals.kam.join(", ")}`);
  rpts.push((signals.contingent||[]).length?`Contingent liabilities note on pages ${signals.contingent.join(", ")}`:"Contingent liabilities heading: not detected");
  if((signals.relatedParty||[]).length)rpts.push(`Related-party disclosures on pages ${signals.relatedParty.join(", ")}`);
  const risk={status:q.length||gc.length?"concern":em.length?"watch":"not_detected",points:rpts};

  // ---- identity & warnings ----------------------------------------------------------------------
  const warnings=[];
  for(const w of bm.warnings||[])warnings.push({kind:"business_model",text:w});
  if((signals.errata||[]).length||flags.errata)warnings.push({kind:"document",text:`A correction / errata notice is attached${signals.errata?.length?` (page ${signals.errata.join(", ")})`:""}. Treat it as a linked correction; it does not by itself change financial statement values.`});
  if((signals.discontinued||[]).length||flags.discontinued)warnings.push({kind:"document",text:`Discontinued operations are reported${signals.discontinued?.length?` (pages ${signals.discontinued.join(", ")})`:""}: compare continuing operations year on year.`});
  if((signals.restated||[]).length||flags.restated)warnings.push({kind:"comparability",text:`Comparatives are restated or reclassified${signals.restated?.length?` (pages ${signals.restated.slice(0,5).join(", ")})`:""}: last-year figures may differ from last year's report.`});
  if(flags.segmentChange)warnings.push({kind:"comparability",text:"Segment definitions changed this year: segment comparisons with last year are not like for like."});
  if(flags.gcDiffers)warnings.push({kind:"document",text:"Going-concern treatment differs between the group/parent and at least one subsidiary."});
  if(bm.diversified&&!segments.length)warnings.push({kind:"segments",text:"Diversified group with no segment data entered: figures are consolidated only and may hide very different businesses."});
  if(profile.verification?.status!=="verified")warnings.push({kind:"profile",text:`The ${profile.display_name} profile is version ${profile.version} and not yet verified against its reference report.`});
  const identity={company,period,reportType,scope,unit:"Rs. millions",
    sector:{id:profile.id,name:profile.display_name,version:profile.version,verified:profile.verification?.status==="verified"},
    businessModel:{id:bm.id,label:bm.label},engine,warnings,cautions:profile.cautions||[]};

  // ---- core tiles -------------------------------------------------------------------------------
  let core;
  if(engine==="industrial")core=legacy.metrics;
  else if(engine==="lending")core=[tile("Total operating income",c.toi,p.toi),tile("Net interest income",c.nii,p.nii),tile("Net fee and commission income",c.fee,p.fee),
    tile("Impairment charges",c.imp,p.imp,{lowerIsBetter:true}),tile("Profit after tax",c.pat,p.pat),tile("EPS",c.eps,p.eps,{unit:"per_share"}),
    tile("Gross loans",c.loans,p.loans),tile("Customer deposits",c.deps,p.deps),tile("Total equity",c.eq,p.eq),tile("Return on equity",c.roe,p.roe,{unit:"percent"})];
  else core=[tile("Insurance revenue",c.irev,p.irev),tile("Insurance service result",c.isr,p.isr),tile("Investment income",c.inv,p.inv),
    tile("Profit before tax",c.pbt,p.pbt),tile("Profit after tax",c.pat,p.pat),tile("EPS",c.eps,p.eps,{unit:"per_share"}),
    tile("Total equity",c.eq,p.eq),tile("Insurance contract liabilities",c.icl,p.icl,{lowerIsBetter:false}),tile("Return on equity",c.roe,p.roe,{unit:"percent"}),tile("Book value per share",c.bvps,p.bvps,{unit:"per_share"})];

  // ---- charts -----------------------------------------------------------------------------------
  const q1=x=>ok(x)?+x:null,pairs=a=>a.map(([label,cur,prev])=>({label,cur:q1(cur),prev:q1(prev)}));
  let groups;
  if(engine==="industrial"){const ch=legacy.charts;groups=[
    {title:"Margins",fmt:"pct",data:ch.margins},{title:"Profit versus cash (Rs. Mn)",fmt:"num",data:ch.cash},
    {title:"Working capital in days",fmt:"num",data:ch.days},{title:"Returns",fmt:"pct",data:ch.returns}]}
  else if(engine==="lending")groups=[
    {title:"Income composition (Rs. Mn)",fmt:"num",data:pairs([["Net interest income",c.nii,p.nii],["Net fees",c.fee,p.fee],["Other income",c.otherInc,p.otherInc]])},
    {title:"Returns and efficiency",fmt:"pct",data:pairs([["ROE",c.roe,p.roe],["ROA",c.roa,p.roa],["Cost / income",c.cti,p.cti]])},
    {title:"Lending and funding (Rs. Mn)",fmt:"num",data:pairs([["Gross loans",c.loans,p.loans],["Customer deposits",c.deps,p.deps],["Equity",c.eq,p.eq]])}];
  else groups=[
    {title:"Insurance result (Rs. Mn)",fmt:"num",data:pairs([["Insurance revenue",c.irev,p.irev],["Service result",c.isr,p.isr],["Investment income",c.inv,p.inv]])},
    {title:"Returns",fmt:"pct",data:pairs([["ROE",c.roe,p.roe],["ROA",c.roa,p.roa],["Service margin",c.isrM,p.isrM]])}];

  // ---- segments ---------------------------------------------------------------------------------
  const segTotal=segments.reduce((a,s)=>a+(ok(s.rev?.cur)?s.rev.cur:0),0);
  const segs=segments.map(s=>({name:s.name,page:s.page||null,
    rev:{cur:n(s.rev?.cur),prev:n(s.rev?.prev),growth:s.rev?.prev>0&&ok(s.rev?.cur)?pc(s.rev.cur/s.rev.prev-1):"n/a",share:segTotal>0&&ok(s.rev?.cur)?pc(s.rev.cur/segTotal):"n/a"},
    profit:{cur:n(s.profit?.cur),prev:n(s.profit?.prev),margin:s.rev?.cur>0&&ok(s.profit?.cur)?pc(s.profit.cur/s.rev.cur):"n/a"},
    raw:{rev:s.rev,profit:s.profit}}));

  // ---- valuation --------------------------------------------------------------------------------
  const vm=profile.valuation_methods||{};
  const listed=new Set([...(vm.preferred||[]),...(vm.conditional||[])]);
  const valuation={preferred:vm.preferred||[],conditional:vm.conditional||[],avoid:vm.avoid_as_default||[],
    labels:Object.fromEntries([...listed,...(vm.avoid_as_default||[])].map(k=>[k,VALUATION_METHODS[k]||k])),
    computed:[],dcf:null,fin:null,nav:null,sotp:null,notes:[]};
  if(engine==="industrial"&&listed.has("dcf_fcff")&&!(vm.avoid_as_default||[]).includes("dcf_fcff")){valuation.dcf=legacy.dcf;valuation.computed.push("dcf_fcff")}
  if(engine!=="industrial"){
    const payoutRep=ok(input.dps)&&ok(c.shares)&&c.pat>0?input.dps*c.shares/c.pat:nan;
    const clamp=(x,lo,hi)=>Math.min(Math.max(x,lo),hi);
    const src={};const pick=(k,x,fb,lo,hi)=>{if(ok(x)){src[k]="report";return +clamp(x,lo,hi).toFixed(3)}src[k]="default";return fb};
    const base={coe:.16,g:.05,years:5,roe0:pick("roe0",c.roe,.12,-.1,.4),roeLong:pick("roeLong",c.roe,.12,0,.3),payout:pick("payout",payoutRep,.4,0,1)};
    src.coe=src.g=src.years="default";base.src=src;
    valuation.fin={inputs:{bv0:c.eq,shares:c.shares,price:c.px,bvps:c.bvps,eps:c.eps,dps:ok(input.dps)?input.dps:null},base};
    for(const k of["price_to_book","residual_income","dividend_discount"])if(listed.has(k))valuation.computed.push(k);
    if(!ok(c.px))valuation.notes.push("Enter a share price to see price-to-book and the comparison with the scenario values.");
  }
  if(listed.has("nav")||bm.nav){
    const navps=engine==="industrial"?c.eq/c.shares:c.bvps;
    valuation.nav={navps:ok(navps)?navps:null,price:ok(c.px)?c.px:null,pnav:ok(c.px)&&navps>0?c.px/navps:null,
      note:"Book NAV from the balance sheet. Adjusted NAV needs property or asset market values, which are not computed."};
    valuation.computed.push("nav");
  }
  if(listed.has("sum_of_parts")){
    valuation.sotp={segments:segs.map(s=>({name:s.name,rev:s.rev.cur,profit:s.profit.cur})),
      note:segs.length?"Value each segment with a method suited to its economics, then subtract holding-company net debt. Not computed automatically.":"Enter segments in the review step to build a sum-of-the-parts view."};
  }
  for(const k of listed)if(!COMPUTED_METHODS.has(k)&&k!=="sum_of_parts")valuation.notes.push(`${VALUATION_METHODS[k]||k}: suitable for this sector but not calculated here.`);

  // ---- observations -----------------------------------------------------------------------------
  const pos=[],con=[];
  if(legacy){pos.push(...legacy.positives);con.push(...legacy.concerns)}
  for(const ch of checks.slice(legacy?legacy.checks.length-1:0)){
    if(ch.status==="healthy")pos.push(`${ch.title}: ${ch.points[0]}`);
    else if(ch.status==="watch"||ch.status==="concern")con.push(`${ch.title}: ${ch.points[0]}`);
  }
  const questions=[...(profile.questions||[]),...(legacy?legacy.questions:["Are related-party prices benchmarked, and what exposures sit with related parties?","What are the key audit matters, and has the auditor changed?"])];

  // ---- gaps & verdict -----------------------------------------------------------------------------
  const KEY={industrial:null,lending:["nii","toi","imp","opx","pat","eps","loans","deps","eq","ta"],insurer:["irev","isr","ise","inv","pat","eps","eq","ta","icl"]}[engine];
  const gaps=engine==="industrial"?legacy.gaps:KEY.filter(k=>!ok(f[k]?.cur)).map(k=>({key:k,state:f[k]?.state&&!["extracted","derived","manual"].includes(f[k].state)?f[k].state:"missing"})).filter(g=>g.state!=="verified_zero");
  const cnt=s=>checks.filter(x=>x.status===s).length;
  const status={healthy:cnt("healthy"),watch:cnt("watch"),concern:cnt("concern"),manual:cnt("unknown"),notDetected:risk.status==="not_detected"?1:0,riskStatus:risk.status,total:checks.length};
  const head=engine==="industrial"?legacy.verdict.split(". ").slice(1).join(". "):engine==="lending"
    ?`Operating income ${pc(c.toi/p.toi-1)}, PAT ${pc(c.pat/p.pat-1)}, ROE ${pc(c.roe)}, cost/income ${pc(c.cti)}.`
    :`Insurance revenue ${pc(c.irev/p.irev-1)}, PAT ${pc(c.pat/p.pat-1)}, ROE ${pc(c.roe)}.`;
  const verdict=`${profile.display_name} · ${bm.label}. ${status.healthy} healthy, ${status.watch} watch, ${status.concern} concern and ${status.manual} manual of ${checks.length} sector checks. ${head}`;

  return{version:REPORT_VERSION,identity,company,period,unit:"millions",verdict,
    charts:{status,groups,...(legacy?{patStart:legacy.charts.patStart,patEnd:legacy.charts.patEnd,altman:legacy.charts.altman}:{})},
    core,gaps,sectorKpis:cats,segments:segs,checks,risk,
    qoe:legacy?legacy.qoe:null,bridge:legacy?legacy.bridge:null,
    valuation,positives:pos,concerns:con,questions};
}

// Generic, profile-configured check. Thresholds come from the profile JSON and are shown in the output.
export function evalCheck(ch,K){
  if(ch.type==="manual")return{title:ch.title,status:"unknown",points:ch.points||[]};
  let m=K[ch.metric],watch=ch.watch,concern=ch.concern,used=ch.metric;
  if((!m||!ok(m.v))&&ch.fallback&&ok(K[ch.fallback]?.v)){m=K[ch.fallback];watch=ch.fallback_watch;concern=ch.fallback_concern;used=ch.fallback}
  const lower=ch.direction==="lower_better";
  const fmtT=x=>m?(m.unit==="percent"?pc(x):fmtUnit(m.unit,x)):String(x);
  let v=m?.v;
  if(ch.type==="growth")v=m&&ok(m.v)&&m.vp>0?m.v/m.vp-1:nan;
  const point=x=>{const k=K[x];if(!k)return null;return`${k.label}: ${k.cur}${k.prev!=="n/a"?` (last year ${k.prev})`:""}${k.status==="entered"&&k.source?.page?` · p.${k.source.page}`:""}`};
  const pts=[];
  if(!m||!ok(v)){
    const why=!m?"not defined":m.status==="not_disclosed"?"marked not disclosed":m.status==="not_applicable"?"not applicable":ch.type==="growth"?"needs both years":"not found; enter it if the report discloses it";
    pts.push(`${m?.label||ch.metric}: ${why}`);
    for(const x of ch.points||[]){const t=point(x);if(t&&K[x].status!=="not_found")pts.push(t)}
    if(ch.note)pts.push(ch.note);
    return{title:ch.title,status:"unknown",points:pts};
  }
  const bad=lower?v>concern:v<concern,warn=lower?v>watch:v<watch;
  const status=bad?"concern":warn?"watch":"healthy";
  pts.push(ch.type==="growth"?`${m.label} growth ${pc(v)} (${m.cur} vs ${m.prev})`:point(used));
  for(const x of ch.points||[]){const t=point(x);if(t&&K[x].status!=="not_found"&&K[x].status!=="not_applicable")pts.push(t)}
  const tf=ch.type==="growth"?pc:fmtT;
  pts.push(`Rule: watch ${lower?"above":"below"} ${tf(watch)}, concern ${lower?"above":"below"} ${tf(concern)} (judgement; set in the sector profile)`);
  if(ch.note)pts.push(ch.note);
  return{title:ch.title,status,points:pts};
}
