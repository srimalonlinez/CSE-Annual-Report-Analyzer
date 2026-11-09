// Engine regression tests on synthetic data. Run: npm test
import assert from "node:assert/strict";
import {linesFromItems} from "../src/engine/lines.js";
import {extractFigures,findStatement,detectUnit,unitOfLine,scanSignals} from "../src/engine/extract.js";
import {analyze,dcf,metrics,leverageStatus} from "../src/engine/analyze.js";
import fs from "node:fs";
import {buildReport,evalCheck} from "../src/engine/report.js";
import {finValuation} from "../src/engine/financials.js";
import {ALL_DERIVE_IDS} from "../src/engine/derive.js";
import {validateProfiles,suggestSector,getProfile,SECTORS,engineOf} from "../src/sectors/registry.js";
import {buildDictionary} from "./gen-metric-dictionary.mjs";

let passed=0;const test=(name,fn)=>{try{fn();passed++;console.log("ok  ",name)}catch(e){console.log("FAIL",name);console.log(e.message);process.exitCode=1}};
const item=(s,x,y,w=s.length*5)=>({str:s,transform:[10,0,0,10,x,y],width:w,height:10});

// ---- synthetic report ---------------------------------------------------------------------------
const IS=["Statement of Profit or Loss","Group","Rs. '000","2026 2025",
  "Revenue 10,000,000 9,000,000","Cost of sales (6,000,000) (5,500,000)","Gross profit 4,000,000 3,500,000",
  "Other income 100,000 80,000","Distribution expenses (500,000) (450,000)","Administrative expenses (800,000) (700,000)",
  "Results from operating activities 2,800,000 2,430,000","Finance costs (300,000) (250,000)","Profit before tax 2,500,000 2,180,000",
  "Income tax expense (750,000) (654,000)","Profit for the year 1,750,000 1,526,000","Basic earnings per share 3.50 3.05"];
const BS1=["Statement of Financial Position","Group","Rs. '000","2026 2025",
  "Property, plant and equipment 5,000,000 4,800,000","Right-of-use assets 400,000 420,000","Intangible assets 100,000 90,000","Other financial assets 50,000 40,000","Inventories 2,000,000 1,800,000",
  "Trade and other receivables 2,500,000 2,200,000","Cash and cash equivalents 600,000 500,000","Total current assets 5,100,000 4,500,000",
  "Total assets 10,500,000 9,720,000"];
const BS2=["Statement of Financial Position (Contd.)","Group","Rs. '000",
  "Stated capital 2,000,000 2,000,000","Retained earnings 3,500,000 2,900,000","Total equity 5,500,000 4,900,000",
  "Interest bearing borrowings 1,200,000 1,300,000","Lease liabilities 350,000 380,000","Interest bearing borrowings 800,000 700,000",
  "Lease liabilities 60,000 55,000","Bank overdraft 100,000 90,000","Trade and other payables 1,500,000 1,400,000",
  "Total current liabilities 2,460,000 2,245,000","Total liabilities 5,000,000 4,820,000","Total equity and liabilities 10,500,000 9,720,000"];
const CF=["Statement of Cash Flows","Group","Rs. '000",
  "Cash flows from operating activities","Profit before tax 2,500,000 2,180,000","Depreciation of property, plant and equipment 400,000 380,000",
  "Amortisation of intangible assets 20,000 18,000","Increase in inventories (200,000) (100,000)","Increase in receivables (300,000) (150,000)",
  "Net cash generated from operating activities 2,000,000 1,900,000","Purchase of property, plant and equipment (600,000) (550,000)",
  "Dividends paid (500,000) (400,000)","Repayment of borrowings (100,000) (90,000)"];
const NOTES=["Notes to the Financial Statements","1. Corporate information","Some text 1,000 2,000","More 3 4","x 1 2","y 3 4","z 5 6","w 7 8"];
const pages=[{no:10,lines:IS},{no:11,lines:BS1},{no:12,lines:BS2},{no:13,lines:CF},{no:14,lines:NOTES}];

test("continuation pages are joined (balance sheet spans p.11-12)",()=>{
  const st=findStatement(pages,"bs");assert.deepEqual(st.pages,[11,12]);
});
test("a fresh same-type statement without (contd.) is not joined",()=>{
  const company=[{no:12,lines:["Statement of Financial Position","Company","Rs. '000",...BS2.slice(3)]}];
  const st=findStatement([pages[0],pages[1],...company],"bs");assert.deepEqual(st.pages,[11]);
});
const e=extractFigures(pages);
test("borrowings sum current + non-current + overdraft; leases separate",()=>{
  assert.equal(e.fields.debt.cur,2100);assert.equal(e.fields.debt.prev,2090);
  assert.equal(e.fields.lease.cur,410);assert.equal(e.fields.lease.prev,435);
  assert.equal(e.fields.debt.page,12);
});
test("units: Rs.'000 detected from statement header with high confidence",()=>{
  for(const k of["is","bs","cf"]){assert.equal(e.units[k].unit,"thousands");assert.equal(e.units[k].confidence,"high")}
  assert.equal(e.fields.rev.cur,10000);assert.equal(e.fields.eps.cur,3.5);
});
test("unit line patterns",()=>{
  assert.equal(unitOfLine("Rs.'000"),"thousands");assert.equal(unitOfLine("LKR ’000s"),"thousands");
  assert.equal(unitOfLine("Rs. Mn Rs. Mn"),"millions");assert.equal(unitOfLine("Rs. Rs. Rs. Rs."),"rupees");
  assert.equal(unitOfLine("Revenue 1,000 2,000"),null);
});
test("units: no label anywhere -> low confidence, implausible units excluded",()=>{
  const st={lines:["Statement of Financial Position","Total assets 12,500,000,000 11,000,000,000"],linePages:[1,1]};
  const rows=[{label:"Total assets",vals:[12.5e9,11e9]}];
  const u=detectUnit(st,rows,[{no:1,lines:st.lines}],/^total assets/i);
  assert.equal(u.confidence,"low");assert.equal(u.unit,"rupees");   // 12.5bn in thousands/millions would be implausible
});
test("units: document-wide label used when the statement has none (medium)",()=>{
  const st={lines:["Statement of Financial Position","Total assets 250,000 200,000"],linePages:[1,1]};
  const u=detectUnit(st,[{label:"Total assets",vals:[250000,200000]}],[{no:1,lines:st.lines},{no:2,lines:["All figures in Rs. Mn"]}],/^total assets/i);
  assert.equal(u.unit,"millions");assert.equal(u.confidence,"medium");
});

// ---- column-aware lines ---------------------------------------------------------------------
test("two-column prose is read column by column",()=>{
  const items=[item("Chairman's Message and Review of the Year",50,800,500)];
  for(let i=0;i<8;i++){items.push(item(`Left column sentence number ${i} here`,50,780-i*14,200));items.push(item(`Right column sentence number ${i} here`,330,780-i*14,200))}
  const L=linesFromItems(items);
  assert.equal(L[0],"Chairman's Message and Review of the Year");
  assert.ok(L[1].startsWith("Left column sentence number 0"));assert.ok(L[9].startsWith("Right column sentence number 0"));
  assert.ok(!L.some(l=>l.includes("Left")&&l.includes("Right")));
});
test("a statement table (labels left, numbers right) is NOT split",()=>{
  const items=[];
  for(let i=0;i<12;i++){items.push(item(`Line item ${i}`,50,780-i*14,80));items.push(item("1,234",400,780-i*14,30));items.push(item("1,111",470,780-i*14,30))}
  const L=linesFromItems(items);assert.equal(L.length,12);assert.equal(L[0],"Line item 0 1,234 1,111");
});

// ---- field states / net debt ---------------------------------------------------------------
const base={rev:{cur:1000,prev:900},pat:{cur:100,prev:90},ta:{cur:2000,prev:1900},cash:{cur:50,prev:40},op:{cur:150,prev:130},da:{cur:30,prev:28},fin:{cur:20,prev:18}};
test("missing borrowings are unknown, not zero",()=>{
  const m=metrics({...base,debt:{cur:NaN,prev:NaN,state:"not_extracted"}},"cur");
  assert.ok(Number.isNaN(m.nd));assert.equal(leverageStatus(m).status,"unknown");
  const r=analyze({fields:{...base}});assert.equal(r.checks[3].status,"unknown");   // healthy cover alone is not enough
});
test("verified zero borrowings => net cash",()=>{
  const m=metrics({...base,debt:{cur:NaN,prev:NaN,state:"verified_zero"},lease:{cur:0,prev:0,state:"verified_zero"}},"cur");
  assert.equal(m.nd,-50);const s=leverageStatus(m);assert.equal(s.status,"healthy");assert.ok(s.netCash);
});
test("leases are added to debt; unknown leases are flagged",()=>{
  const a=metrics({...base,debt:{cur:200,prev:150},lease:{cur:40,prev:30}},"cur");assert.equal(a.debt,240);assert.equal(a.nd,190);
  const b=metrics({...base,debt:{cur:200,prev:150}},"cur");assert.equal(b.debt,200);assert.ok(b.debtExclLease);
});
test("net debt with negative EBITDA is a concern (not healthy via negative leverage)",()=>{
  const m=metrics({...base,op:{cur:-80,prev:10},debt:{cur:300,prev:300},lease:{cur:0,prev:0,state:"verified_zero"}},"cur");
  assert.equal(leverageStatus(m).status,"concern");
});
test("net debt tile: lower is better, net cash shown as such",()=>{
  const r=analyze({fields:{...base,debt:{cur:20,prev:100},lease:{cur:0,prev:0,state:"verified_zero"}}});
  const t=r.metrics.find(x=>x.label==="Net debt");
  assert.equal(t.cur,"Net cash 30.0");assert.equal(t.trend,"better");assert.equal(t.dir,"down");
  assert.equal(t.chg,"-150.0%");   // last year positive (60) -> % change
});
test("data gaps list the missing key fields",()=>{
  const r=analyze({fields:{...base}});assert.ok(r.gaps.some(g=>g.key==="debt"));
});

// ---- disclosure ---------------------------------------------------------------------------
test("no qualification found => 'not_detected', never healthy",()=>{
  const r=analyze({fields:base,signals:{auditReport:[120]}});const d=r.checks.find(c=>c.title==="Disclosure quality");
  assert.equal(d.status,"not_detected");assert.ok(d.points[0].includes("120"));
  assert.equal(r.charts.status.notDetected,1);
});
test("qualified opinion => concern",()=>{
  assert.equal(analyze({fields:base,signals:{qualified:[121]}}).checks[7].status,"concern");
});
test("auditor's report heading is scanned",()=>{
  assert.deepEqual(scanSignals([{no:5,lines:["Independent Auditor's Report"]}]).auditReport,[5]);
});

// ---- DCF ----------------------------------------------------------------------------------
const d={rev:1000,nd:100,shares:10};
const A={g:.05,m:.15,w:.14,tg:.03,tax:.3,da:.03,capex:.04,nwc:.2,years:5};
test("WACC <= terminal growth is rejected, not Infinity or negative",()=>{
  for(const [w,tg] of[[.07,.07],[.05,.07],[.072,.07]]){const r=dcf(d,{...A,w,tg});assert.ok(Number.isNaN(r.equity));assert.ok(r.invalid)}
});
test("terminal year uses the same FCF formula as forecast years",()=>{
  const r=dcf(d,A),last=r.years.at(-1);
  const rT=last.rev*1.03,fT=rT*.15*.7+rT*.03-rT*.04-.2*(rT-last.rev);
  let pv=r.years.reduce((a,y)=>a+y.fcf/Math.pow(1.14,y.y),0)+fT/(.14-.03)/Math.pow(1.14,5);
  assert.ok(Math.abs(r.ev-pv)<1e-6);
});
test("more working capital or capex lowers value; years configurable",()=>{
  assert.ok(dcf(d,{...A,nwc:.4}).ev<dcf(d,A).ev);assert.ok(dcf(d,{...A,capex:.08}).ev<dcf(d,A).ev);
  assert.equal(dcf(d,{...A,years:8}).years.length,8);
});
test("unknown net debt => equity unknown, EV still given",()=>{
  const r=dcf({...d,nd:NaN},A);assert.ok(Number.isNaN(r.equity));assert.ok(r.ev>0);
});
test("analyze provides DCF defaults with their source",()=>{
  const r=analyze({fields:{...base,rec:{cur:200,prev:180},inv:{cur:150,prev:140},pay:{cur:100,prev:90},capex:{cur:50,prev:45}}});
  assert.equal(r.dcf.base.src.nwc,"report");assert.equal(r.dcf.base.nwc,.25);assert.equal(r.dcf.base.src.w,"default");
});
// ---- sector profiles ----------------------------------------------------------------------------
test("all 19 sector profiles pass schema validation and every formula exists",()=>{
  assert.equal(SECTORS.length,19);assert.deepEqual(validateProfiles(ALL_DERIVE_IDS),[]);
});
test("no company-specific values in profiles (only thresholds and metadata)",()=>{
  for(const s of SECTORS){const j=JSON.stringify(getProfile(s.id));assert.ok(!/"(value|benchmark)"\s*:/.test(j),s.id)}
});
test("metric dictionary is up to date with the profiles",()=>{
  assert.equal(fs.readFileSync("docs/research/cse-sector-metric-dictionary.md","utf8").replace(/\r/g,""),buildDictionary(),"run node scripts/gen-metric-dictionary.mjs");
});
test("business model decides the engine, not the GICS label",()=>{
  assert.equal(engineOf("banks","licensed_commercial_bank"),"lending");
  assert.equal(engineOf("diversified_financials","investment_holding"),"industrial");
  assert.equal(engineOf("insurance","life_insurer"),"insurer");
});
test("sector suggestion from statement wording",()=>{
  const pg=l=>[{no:1,lines:l}];
  assert.equal(suggestSector(pg(["Net interest income 1 2","Due to depositors 3 4"]),"Some Bank PLC").sector,"banks");
  assert.equal(suggestSector(pg(["Net interest income 1 2","Deposits due to customers 3 4"]),"Asia Finance PLC").sector,"diversified_financials");
  assert.equal(suggestSector(pg(["Insurance revenue 1 2","Insurance service result 3 4"]),"X").sector,"insurance");
  assert.equal(suggestSector(pg(["Revenue 1 2"]),"Sigiriya Village Hotels PLC").sector,"consumer_services");
  assert.equal(suggestSector(pg(["Revenue 1 2"]),"").sector,null);
});

// ---- financial-sector extraction (pdf.js path is covered by scripts/test-extract.mjs on the fixtures) ----
const bankIS=["Income Statement","Group","Rs. Mn","Interest income 290,000 272,000","Less: Interest expenses (170,000) (167,000)","Net interest income 120,000 105,000",
  "Net fee and commission income 25,000 22,000","Total operating income 160,000 140,000","Less: Impairment charges (15,000) (18,000)","Total operating expenses (60,000) (55,000)",
  "Operating profit before taxes on financial services 85,000 67,000","Profit before income tax 70,000 55,000","Income tax expense (25,000) (20,000)","Profit for the year 45,000 35,000"];
const bankBS=["Statement of Financial Position","Group","Rs. Mn","Cash and cash equivalents 50,000 40,000","Placements with banks 30,000 28,000",
  "Financial assets at amortised cost - loans and advances to customers 1,600,000 1,450,000","Property, plant and equipment 40,000 38,000","Total assets 2,500,000 2,300,000",
  "Due to banks 40,000 45,000","Financial liabilities at amortised cost - due to depositors 1,900,000 1,750,000","Debt securities issued 60,000 55,000",
  "Total liabilities 2,250,000 2,080,000","Total equity 250,000 220,000"];
const be=extractFigures([{no:2,lines:bankIS},{no:3,lines:bankBS}],"lending");
test("bank: deposits are funding, never borrowings; PBT is not 'operating profit before taxes'",()=>{
  assert.equal(be.fields.deps.cur,1900000);assert.equal(be.fields.fund.cur,100000);assert.equal(be.fields.loans.cur,1600000);
  assert.equal(be.fields.pbt.cur,70000);assert.equal(be.fields.op.cur,85000);assert.equal(be.fields.imp.cur,15000);
  assert.ok(!("debt" in be.fields));assert.ok(be.validation.every(v=>v.ok));
});

// ---- report v2 ----------------------------------------------------------------------------------
const F=o=>Object.fromEntries(Object.entries(o).map(([k,[c,p]])=>[k,{cur:c,prev:p,state:"extracted",page:3,src:k}]));
const bankF=F({nii:[120000,105000],fee:[25000,22000],toi:[160000,140000],imp:[15000,18000],opx:[60000,55000],pbt:[70000,55000],tax:[25000,20000],pat:[45000,35000],eps:[100,80],loans:[1600000,1450000],deps:[1900000,1750000],ta:[2500000,2300000],eq:[250000,220000]});
const bank=buildReport({sector:"banks",businessModel:"licensed_commercial_bank",fields:bankF,kpis:{stage_3_ratio:{cur:5.1,page:12}},price:{cur:300}});
const kp=(r,id)=>r.sectorKpis.flatMap(g=>g.items).find(i=>i.id===id);
test("bank report: no industrial ratios, no FCFF DCF, P/B + residual income + dividend discount",()=>{
  assert.equal(bank.version,2);assert.equal(bank.identity.engine,"lending");
  assert.ok(!bank.checks.some(c=>/working capital|cash flow quality/i.test(c.title)));
  assert.equal(bank.valuation.dcf,null);assert.ok(bank.valuation.fin);assert.deepEqual(bank.valuation.computed,["price_to_book","residual_income","dividend_discount"]);
  assert.ok(bank.valuation.avoid.includes("dcf_fcff"));
});
test("bank KPI statuses: reported, entered with page, derived with formula, not found",()=>{
  assert.equal(kp(bank,"net_interest_income").status,"reported");assert.equal(kp(bank,"net_interest_income").source.page,3);
  assert.equal(kp(bank,"stage_3_ratio").status,"entered");assert.equal(kp(bank,"stage_3_ratio").cur,"5.1%");assert.equal(kp(bank,"stage_3_ratio").source.page,12);
  assert.equal(kp(bank,"cost_to_income").status,"derived");assert.equal(kp(bank,"cost_to_income").cur,"37.5%");
  assert.equal(kp(bank,"casa_ratio").status,"not_found");assert.equal(kp(bank,"casa_ratio").cur,"n/a");
});
test("a KPI marked not disclosed stays not disclosed and its check is manual",()=>{
  const r=buildReport({sector:"banks",businessModel:"licensed_commercial_bank",fields:bankF,kpis:{total_capital_ratio:{notDisclosed:true}}});
  assert.equal(kp(r,"total_capital_ratio").status,"not_disclosed");
  const c=r.checks.find(c=>c.title==="Capital adequacy");assert.equal(c.status,"unknown");assert.match(c.points[0],/not disclosed/);
});
test("asset quality falls back to credit cost when Stage 3 is not entered",()=>{
  const r=buildReport({sector:"banks",businessModel:"licensed_commercial_bank",fields:bankF});
  const c=r.checks.find(c=>c.title==="Asset quality");assert.equal(c.status,"healthy");assert.match(c.points[0],/Impairment charge \/ gross loans/);
});
test("check thresholds are printed with the result",()=>{
  const c=evalCheck({id:"x",title:"T",metric:"m",type:"level",direction:"lower_better",watch:.45,concern:.55},{m:{label:"M",unit:"percent",v:.5,vp:.4,cur:"50.0%",prev:"40.0%",status:"derived"}});
  assert.equal(c.status,"watch");assert.ok(c.points.some(p=>/watch above 45.0%, concern above 55.0%/.test(p)));
});
test("insurer: combined ratio only for general insurance; GWP is never insurance revenue",()=>{
  const f=F({irev:[20000,18000],ise:[15000,14000],reins:[-1500,-1200],isr:[3500,2800],inv:[4000,3800],pbt:[5000,4200],tax:[1500,1200],pat:[3500,3000],eps:[7,6],ta:[60000,55000],eq:[15000,13500],icl:[38000,35000]});
  const gen=buildReport({sector:"insurance",businessModel:"general_insurer",fields:f}),life=buildReport({sector:"insurance",businessModel:"life_insurer",fields:f});
  assert.equal(kp(gen,"combined_ratio").cur,"82.5%");assert.equal(kp(life,"combined_ratio").status,"not_applicable");
  assert.equal(kp(gen,"gross_written_premium").status,"not_found");assert.equal(kp(gen,"insurance_revenue").status,"reported");
});
test("general insurer solvency check uses the general ratio",()=>{
  const f=F({irev:[20000,18000],isr:[3500,2800],pat:[3500,3000],ta:[60000,55000],eq:[15000,13500],icl:[38000,35000]});
  const r=buildReport({sector:"insurance",businessModel:"general_insurer",fields:f,kpis:{solvency_general:{cur:250,page:30}}});
  assert.equal(r.checks.find(c=>c.title==="Solvency").status,"healthy");
});
test("hotel: RevPAR derived only from reported occupancy and ADR; never from revenue",()=>{
  const f=F({rev:[1000,800],pat:[100,60],ta:[3000,2900]});
  const a=buildReport({sector:"consumer_services",businessModel:"hotel_owner_operator",fields:f});
  assert.equal(kp(a,"occupancy_rate").status,"not_found");assert.equal(kp(a,"revpar").status,"not_found");
  const b=buildReport({sector:"consumer_services",businessModel:"hotel_owner_operator",fields:f,kpis:{occupancy_rate:{cur:62,page:8},adr:{cur:85,page:8}}});
  assert.equal(kp(b,"revpar").cur,"52.70");assert.equal(kp(b,"revpar").status,"derived");
});
test("utilities: capacity factor needs generation and capacity",()=>{
  const f=F({rev:[1000,900],pat:[100,90],ta:[5000,4800]});
  const r=buildReport({sector:"utilities",businessModel:"ipp_renewable",fields:f,kpis:{installed_capacity_mw:{cur:100,page:5},generation_gwh:{cur:350,page:5}}});
  assert.equal(kp(r,"capacity_factor").cur,"40.0%");
});
test("diversified group without segments gets a warning; segments are kept separate",()=>{
  const f=F({rev:[1000,900],pat:[100,90],ta:[5000,4800]});
  const a=buildReport({sector:"capital_goods",businessModel:"diversified_group",fields:f});
  assert.ok(a.identity.warnings.some(w=>w.kind==="segments"));assert.ok(a.valuation.sotp);
  const b=buildReport({sector:"capital_goods",businessModel:"diversified_group",fields:f,segments:[{name:"Finance",rev:{cur:600,prev:500},profit:{cur:80,prev:60}},{name:"Leisure",rev:{cur:400,prev:400},profit:{cur:20,prev:30}}]});
  assert.ok(!b.identity.warnings.some(w=>w.kind==="segments"));assert.equal(b.segments[0].rev.share,"60.0%");assert.equal(b.segments[0].rev.growth,"20.0%");
});
test("legacy transport business model warns and does not apply shipping KPIs as checks",()=>{
  const r=buildReport({sector:"transportation",businessModel:"legacy_inactive",fields:F({rev:[100,90],pat:[10,9],ta:[500,480]})});
  assert.ok(r.identity.warnings.some(w=>/no longer operates/.test(w.text)));
  assert.ok(!r.checks.some(c=>/fleet|cargo/i.test(c.title)));
});
test("document flags and detected signals become identity warnings",()=>{
  const r=buildReport({sector:"materials",businessModel:"agri_inputs",fields:F({rev:[100,90],pat:[10,9],ta:[500,480]}),signals:{errata:[1],discontinued:[45]}});
  const k=r.identity.warnings.map(w=>w.text).join(" ");assert.match(k,/errata/i);assert.match(k,/Discontinued/);
});
test("industrial report keeps the eight checks (disclosure moved to risk) plus profile checks",()=>{
  const r=buildReport({sector:"telecommunication_services",businessModel:"integrated_operator",fields:F({rev:[1000,900],pat:[100,90],ta:[5000,4800],capex:[300,250]}),signals:{auditReport:[2]}});
  assert.equal(r.checks.length,8);assert.equal(r.checks.at(-1).title,"Capex intensity");assert.equal(r.risk.status,"not_detected");
});

// ---- financial valuation ----------------------------------------------------------------------------
test("residual income equals dividend discount under clean surplus",()=>{
  const q=finValuation({bv0:1000,shares:10},{coe:.15,g:.04,years:5,roe0:.18,roeLong:.16,payout:.4});
  assert.ok(Math.abs(q.ri-q.ddm)/q.ri<1e-9,`${q.ri} vs ${q.ddm}`);
  assert.ok(Math.abs(q.justifiedPB-(.16-.04)/(.15-.04))<1e-12);
});
test("residual income: ROE = COE means value = book value",()=>{
  const q=finValuation({bv0:1000,shares:10},{coe:.15,g:.04,years:5,roe0:.15,roeLong:.15,payout:.4});
  assert.ok(Math.abs(q.ri-1000)<1e-6);
});
test("COE not above growth is rejected",()=>{
  assert.ok(finValuation({bv0:1000,shares:10},{coe:.05,g:.05,years:5,roe0:.15,roeLong:.15,payout:.4}).invalid);
});


console.log(`\n${passed} passed${process.exitCode?", some FAILED":""}`);
