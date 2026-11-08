import crypto from "node:crypto";import {getStore} from "@netlify/blobs";
const md5=s=>crypto.createHash("md5").update(s).digest("hex").toUpperCase();
export default async (req)=>{
  const {id,email}=await req.json();
  const j=id?await getStore("jobs").get(id,{type:"json"}):null;
  if(!j||j.state!=="done"||!/^\S+@\S+\.\S+$/.test(email||"")) return new Response("Bad request",{status:400});
  const m=process.env.PAYHERE_MERCHANT_ID,amount="99.00",cur="LKR",site=process.env.URL;
  const hash=md5(m+id+amount+cur+md5(process.env.PAYHERE_SECRET));
  return Response.json({
    action:process.env.PAYHERE_SANDBOX==="true"?"https://sandbox.payhere.lk/pay/checkout":"https://www.payhere.lk/pay/checkout",
    fields:{merchant_id:m,return_url:`${site}/?job=${id}`,cancel_url:`${site}/?job=${id}`,notify_url:`${site}/api/payhere-notify`,
      order_id:id,items:"Full annual report analysis",currency:cur,amount,hash,first_name:"Customer",last_name:"-",email,phone:"0000000000",address:"-",city:"Colombo",country:"Sri Lanka"}});
};
