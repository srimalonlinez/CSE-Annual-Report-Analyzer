// The paywall lives HERE: unpaid jobs only ever receive the preview.
import {getStore} from "@netlify/blobs";
export default async (req)=>{
  const id=new URL(req.url).searchParams.get("id");
  const j=id?await getStore("jobs").get(id,{type:"json"}):null;
  if(!j) return Response.json({state:"unknown"},{status:404});
  if(j.state!=="done") return Response.json({state:j.state,message:j.message});
  const r=j.report;
  if(j.paid) return Response.json({state:"done",paid:true,report:r});
  // v2 preview: document identity, summary and the core tiles. Sector KPIs, segments, checks, risk,
  // valuation and observations are locked.
  if(r.version===2){
    const {version,identity,company,period,unit,verdict,core,gaps}=r;
    return Response.json({state:"done",paid:false,report:{version,identity,company,period,unit,verdict,core,gaps,charts:{status:r.charts?.status},
      locked:{sectorKpis:r.sectorKpis?.reduce((a,g)=>a+g.items.length,0)||0,checks:r.checks?.length||0,segments:r.segments?.length||0}}});
  }
  // reports saved before the sector restructure
  const {company,period,unit,verdict,metrics,gaps,checks=[]}=r;
  return Response.json({state:"done",paid:false,report:{company,period,unit,verdict,metrics,gaps,checks:checks.slice(0,2),charts:{status:r.charts?.status,margins:r.charts?.margins}}});
};
