import fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {linesFromItems} from "../src/engine/lines.js";
import {extractFigures,scanSignals} from "../src/engine/extract.js";
const file=process.argv[2];
const pdf=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(file)),useSystemFonts:true}).promise;
const pages=[];
for(let i=1;i<=pdf.numPages;i++){const c=await(await pdf.getPage(i)).getTextContent();pages.push({no:i,lines:linesFromItems(c.items)})}
const r=extractFigures(pages);
console.log("pages",r.pages,"missing",r.missing);
for(const[k,v]of Object.entries(r.fields))console.log(k.padEnd(7),String(v.cur.toFixed?.(3)).padStart(12),String(v.prev.toFixed?.(3)).padStart(12),"p."+v.page,v.derived?"(derived)":"");
console.log(r.validation.map(v=>(v.ok?"OK  ":"FAIL")+" "+v.name+" "+v.detail).join("\n"));
console.log(JSON.stringify(scanSignals(pages)));
fs.writeFileSync("/tmp/pages.json",JSON.stringify(pages));
