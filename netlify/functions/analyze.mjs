// Runs the maths engine on the figures the browser extracted. No AI, no API key: it is fast and costs nothing per report.
import {getStore} from "@netlify/blobs";
import {FIELD_STATES} from "../../src/engine/analyze.js";
import {buildReport} from "../../src/engine/report.js";
import {getProfile,getBusinessModel,entryMetrics} from "../../src/sectors/registry.js";
const VALUE_STATES=new Set(["extracted","derived","manual","verified_zero"]);
const EMPTY_STATES=new Set(["not_extracted","missing","not_disclosed","verified_zero"]);
const num=x=>x===""||x==null?NaN:Number(x);
const fin=x=>Number.isFinite(x)?x:NaN;
const txt=(x,n)=>String(x??"").replace(/[\u0000-\u001f]/g," ").slice(0,n);
const pageNo=x=>Number.isInteger(Number(x))&&Number(x)>0&&Number(x)<5000?Number(x):null;
const REQUIRED={industrial:["rev","pat","ta"],lending:["pat","ta","eq"],insurer:["pat","ta","eq"]};

export default async (req)=>{
  const b=await req.json();
  if(!/^[0-9a-f-]{36}$/.test(b.id||"")||typeof b.fields!=="object") return new Response("Bad request",{status:400});
  const profile=getProfile(String(b.sector||""));
  if(!profile) return new Response("Choose a sector",{status:422});
  const bm=getBusinessModel(profile,String(b.businessModel||""));
  // statement fields
  const fields={};
  for(const [k,v] of Object.entries(b.fields).slice(0,80)){
    if(!/^[a-zA-Z]{1,12}$/.test(k)||!v) continue;
    let cur=num(v.cur),prev=num(v.prev);
    const given=FIELD_STATES.includes(v.state)?v.state:null;
    let state;
    if(Number.isFinite(cur)) state=given&&VALUE_STATES.has(given)?given:"manual";
    else state=given&&EMPTY_STATES.has(given)?given:"missing";
    // "verified zero" is the only way a blank becomes 0
    if(state==="verified_zero"){cur=Number.isFinite(cur)?cur:0;prev=Number.isFinite(prev)?prev:0}
    fields[k]={cur,prev:fin(prev),state,page:pageNo(v.page),src:v.src?txt(v.src,80):null};
  }
  const need=REQUIRED[bm.engine];
  if(!need.every(k=>Number.isFinite(fields[k]?.cur))) return new Response(`These figures are required: ${need.join(", ")}`,{status:422});
  // entered KPIs: only ids that exist in the chosen profile
  const allowed=new Set(entryMetrics(profile).map(m=>m.id)),kpis={};
  for(const [id,v] of Object.entries(b.kpis||{}).slice(0,80)){
    if(!allowed.has(id)||!v)continue;
    kpis[id]={cur:fin(num(v.cur)),prev:fin(num(v.prev)),page:pageNo(v.page),notDisclosed:v.notDisclosed===true};
  }
  const segments=(Array.isArray(b.segments)?b.segments:[]).slice(0,15).map(s=>({name:txt(s?.name,60).trim(),page:pageNo(s?.page),
    rev:{cur:fin(num(s?.rev?.cur)),prev:fin(num(s?.rev?.prev))},profit:{cur:fin(num(s?.profit?.cur)),prev:fin(num(s?.profit?.prev))}}))
    .filter(s=>s.name&&(Number.isFinite(s.rev.cur)||Number.isFinite(s.profit.cur)));
  const flags={};for(const k of["errata","discontinued","restated","segmentChange","gcDiffers"])flags[k]=b.flags?.[k]===true;
  const px=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):undefined;
  const price=px(b.price?.cur)?{cur:px(b.price.cur),prev:px(b.price.prev)}:undefined;
  const sig={};for(const k of["relatedParty","contingent","noContingent","emphasis","gcMaterial","qualified","auditReport","kam","discontinued","errata","restated"]) sig[k]=(b.signals?.[k]||[]).filter(Number.isInteger).slice(0,20);
  const report=buildReport({sector:profile.id,businessModel:bm.id,fields,kpis,segments,flags,price,dps:px(b.dps),signals:sig,
    company:txt(b.company,80),period:txt(b.period,40),reportType:txt(b.reportType,40),scope:b.scope==="company"?"company":"group"});
  // never overwrite an existing job: a link someone shared must not be reset
  const store=getStore("jobs");
  if(await store.get(b.id,{type:"json"})) return new Response("This job already exists",{status:409});
  await store.setJSON(b.id,{state:"done",paid:false,report});
  return Response.json({ok:true});
};
