import fs from "node:fs";import os from "node:os";import path from "node:path";
const PAGES=path.join(os.tmpdir(),"cse-pages.json");
import {extractFigures,scanSignals} from "../src/engine/extract.js";
import {analyze,dcf} from "../src/engine/analyze.js";
const pages=JSON.parse(fs.readFileSync(PAGES));
const e=extractFigures(pages);
for(const withPrice of [true,false]){
  const body=JSON.parse(JSON.stringify({fields:Object.fromEntries(Object.entries(e.fields).map(([k,o])=>[k,{cur:String(+o.cur.toFixed(3)),prev:String(+o.prev.toFixed(3))}])),price:withPrice?{cur:"12.6",prev:"11.1"}:{cur:"",prev:""},signals:scanSignals(pages)}));
  const fields={};for(const[k,v]of Object.entries(body.fields)){const cur=Number(v.cur),prev=Number(v.prev);if(Number.isFinite(cur))fields[k]={cur,prev:Number.isFinite(prev)?prev:NaN}}
  const px=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):undefined;
  const price=px(body.price?.cur)?{cur:px(body.price.cur),prev:px(body.price.prev)}:undefined;
  const rep=JSON.parse(JSON.stringify(analyze({fields,price,signals:body.signals})));
  const d=rep.dcf;const inp={...d.inputs,shares:d.inputs.shares??NaN,nd:d.inputs.nd??0};
  console.log(withPrice?"with price":"no price","| Z",rep.qoe.altman.z.toFixed(2),rep.qoe.altman.kind,"| dcf",JSON.stringify(dcf(inp,d.base)),"|",rep.checks[6].points[2]);
}
