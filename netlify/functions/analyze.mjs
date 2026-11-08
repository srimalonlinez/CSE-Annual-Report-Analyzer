// Runs the maths engine on the figures the browser extracted. No AI, no API key: it is fast and costs nothing per report.
import {getStore} from "@netlify/blobs";
import {analyze} from "../../src/engine/analyze.js";
export default async (req)=>{
  const b=await req.json();
  if(!/^[0-9a-f-]{36}$/.test(b.id||"")||typeof b.fields!=="object") return new Response("Bad request",{status:400});
  const fields={};
  for(const [k,v] of Object.entries(b.fields).slice(0,60)){
    if(!/^[a-zA-Z]{1,12}$/.test(k)||!v) continue;
    const cur=Number(v.cur),prev=Number(v.prev);
    if(Number.isFinite(cur)) fields[k]={cur,prev:Number.isFinite(prev)?prev:NaN};
  }
  if(!fields.rev||!fields.pat||!fields.ta) return new Response("Revenue, profit and total assets are required",{status:422});
  const px=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):undefined;
  const price=px(b.price?.cur)?{cur:px(b.price.cur),prev:px(b.price.prev)}:undefined;
  const sig={};for(const k of["relatedParty","contingent","noContingent","emphasis","gcMaterial","qualified","kam"]) sig[k]=(b.signals?.[k]||[]).filter(Number.isInteger).slice(0,20);
  const report=analyze({fields,price,signals:sig,company:String(b.company||"").slice(0,80),period:String(b.period||"").slice(0,40)});
  await getStore("jobs").setJSON(b.id,{state:"done",paid:false,report});
  return Response.json({ok:true});
};
