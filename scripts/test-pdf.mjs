// Builds the PDF report for a stored job (or the sample fixture's figures) and writes it to disk.
// Usage: node scripts/test-pdf.mjs out.pdf [jobId]   (jobId needs `netlify dev` running on :8888)
import fs from "node:fs";
import {downloadReportPdf} from "../src/pdfReport.js";
const [out="report.pdf",job]=process.argv.slice(2);
const r=(await (await fetch(`http://localhost:8888/api/status?id=${job}`)).json()).report;
r.company||="Sample PLC";r.period||="FY 2025/26";
fs.writeFileSync(out,Buffer.from(await downloadReportPdf(r,{raw:true})));
console.log("wrote",out);
