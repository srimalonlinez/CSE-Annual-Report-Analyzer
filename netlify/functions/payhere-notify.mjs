// PayHere server-to-server callback: the only place a job becomes paid.
import crypto from "node:crypto";import {getStore} from "@netlify/blobs";
const md5=s=>crypto.createHash("md5").update(s).digest("hex").toUpperCase();
export default async (req)=>{
  const f=Object.fromEntries(await req.formData());
  const sig=md5(f.merchant_id+f.order_id+f.payhere_amount+f.payhere_currency+f.status_code+md5(process.env.PAYHERE_SECRET));
  if(sig!==f.md5sig||f.status_code!=="2"||f.merchant_id!==process.env.PAYHERE_MERCHANT_ID||f.payhere_currency!=="LKR"||Number(f.payhere_amount)<99)
    return new Response("ignored");
  const s=getStore("jobs"),j=await s.get(f.order_id,{type:"json"});
  if(j){j.paid=true;await s.setJSON(f.order_id,j);}
  return new Response("ok");
};
