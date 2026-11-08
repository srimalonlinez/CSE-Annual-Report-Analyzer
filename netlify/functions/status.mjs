// The paywall lives HERE: unpaid jobs only ever receive the preview.
import {getStore} from "@netlify/blobs";
export default async (req)=>{
  const id=new URL(req.url).searchParams.get("id");
  const j=id?await getStore("jobs").get(id,{type:"json"}):null;
  if(!j) return Response.json({state:"unknown"},{status:404});
  if(j.state!=="done") return Response.json({state:j.state,message:j.message});
  const r=j.report;
  if(j.paid) return Response.json({state:"done",paid:true,report:r});
  const {company,period,unit,verdict,metrics,checks=[]}=r;
  return Response.json({state:"done",paid:false,report:{company,period,unit,verdict,metrics,checks:checks.slice(0,2)}});
};
