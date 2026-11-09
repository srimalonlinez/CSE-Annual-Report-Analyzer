// Rule-based extraction of statement figures from page lines. No ML, no network.
// pages: [{no, lines:[...]}]   Output values are in millions of the report currency.
const isNum=t=>/^\(?-?\d[\d,]*(\.\d+)?\)?$|^[-–]$/.test(t);
const toNum=s=>{if(s==="-"||s==="–")return 0;const neg=/^\(.*\)$/.test(s)||s.startsWith("-");const n=parseFloat(s.replace(/[(),-]/g,""));return neg?-n:n};

export function parseLine(line){
  const t=line.split(" ");let i=t.length;
  while(i>0&&isNum(t[i-1]))i--;
  const label=t.slice(0,i).join(" ").replace(/[:.]+$/,"").trim();
  let nums=t.slice(i);
  if(!label||!nums.length)return null;
  if(nums.length>=3&&/^\d{1,2}(\.\d+)?$/.test(nums[0]))nums=nums.slice(1);   // notes column
  return{label,vals:nums.map(toNum)};
}
const rowsOf=(lines,linePages)=>lines.map((l,i)=>{const r=parseLine(l);if(r&&linePages)r.page=linePages[i];return r}).filter(r=>r&&r.vals.length>=2);

const HEAD={
  is:/statement of (profit or loss|comprehensive income|income)|income statement/i,
  bs:/statement of financial position|balance sheet/i,
  cf:/statement of cash flows?|cash flow statement/i};
const MUST={is:/^(revenue|turnover|net sales|gross income|profit (for the|before))/i,bs:/^total assets/i,cf:/operating activities/i};
const NOT_STMT=/notes? to the|accounting policies|table of contents|index/i;
const CONTD=/\b(contd|cont'd|continued)\b/i;
const MAX_CONT=4;   // continuation pages joined after the first statement page

export function findStatement(pages,type){
  let best=null;
  pages.forEach((p,idx)=>{
    const head=p.lines.slice(0,10).join(" "),top=p.lines.slice(0,4).join(" ");
    if(!HEAD[type].test(top)||CONTD.test(top)||NOT_STMT.test(top)||/^\d+\.\s/.test(p.lines[0]||""))return;
    if(!p.lines.some(l=>MUST[type].test(l)))return;
    const n=rowsOf(p.lines).length;if(n<8)return;
    const score=n+(/group/i.test(head)?3:0);
    if(!best||score>best.score)best={idx,score};
  });
  if(!best)return null;
  const first=pages[best.idx];
  const lines=[...first.lines],linePages=first.lines.map(()=>first.no),used=[first.no];
  // Join every following page that continues this statement. Stop at notes, at a different statement,
  // or at a fresh statement of the same type without "(contd.)" (e.g. a separate Company-only statement).
  for(let j=best.idx+1;j<pages.length&&used.length<=MAX_CONT;j++){
    const nx=pages[j],top=nx.lines.slice(0,8).join(" ");
    if(/notes? to|accounting policies/i.test(top))break;
    const same=HEAD[type].test(top);
    if(same&&!CONTD.test(top))break;
    if(!same&&Object.values(HEAD).some(re=>re.test(top)))break;
    if(!same&&/statement of/i.test(top))break;
    if(rowsOf(nx.lines).length<6)break;
    lines.push(...nx.lines);linePages.push(...nx.lines.map(()=>nx.no));used.push(nx.no);
  }
  return{page:first.no,pages:used,lines,linePages};
}

const D={
  rev:["is",[/^(revenue|turnover|net sales|gross income)\b/i]],
  cogs:["is",[/^cost of (sales|goods sold|revenue)/i]],
  gp:["is",[/^gross (profit|loss)/i]],
  oi:["is",[/^other (operating )?income/i]],
  dist:["is",[/^(selling and )?distribution (costs?|expenses?)|^selling (and distribution )?(costs?|expenses?)/i]],
  admin:["is",[/^administrati(ve|on) (costs?|expenses?)/i]],
  fin:["is",[/^finance (costs?|expenses?)|^interest expenses?/i]],
  finInc:["is",[/^finance income|^interest income/i]],
  op:["is",[/^(results from operating activities|operating (profit|loss)|profit from operations)/i]],
  pbt:["is",[/^(profit|loss|profit\/\(loss\)|\(loss\)\/profit)( for the (year|period))? before (income )?tax/i]],
  tax:["is",[/^(income )?tax (expenses?|charge|\(expense\))|^taxation|^income tax/i]],
  pat:["is",[/^(profit|loss|profit\/\(loss\)) for the (year|period)|^profit after (income )?tax|^net profit/i]],
  eps:["is",[/earnings per share|^basic (earnings|eps)/i]],
  inv:["bs",[/^inventories/i]],
  rec:["bs",[/^trade and other receivables/i,/^trade receivables/i,/^receivables/i]],
  pay:["bs",[/^trade and other payables/i,/^trade payables/i]],
  cash:["bs",[/^cash (and|in hand)/i]],
  ta:["bs",[/^total assets/i]],
  ca:["bs",[/^total current assets/i]],
  cl:["bs",[/^total current liabilities/i]],
  tl:["bs",[/^total liabilities/i]],
  eq:["bs",[/^total equity(?! and)/i,/^equity attributable to/i]],
  re:["bs",[/^(retained earnings|retained profits|accumulated (profits?|losses))/i]],
  cfo:["cf",[/net cash.*operating activities/i]],
};
// Summed across every matching line: [statement, include, exclude].
// Borrowings = short- and long-term loans, overdrafts, debentures, commercial paper (current + non-current lines).
// Lease liabilities (IFRS 16) are kept as their own field so the user can see and correct them.
const SUM={
  debt:["bs",/borrowings|overdrafts?|debentures|bank loans?|term loans?|interest[- ]bearing (loans|liabilities)|commercial papers?|short[- ]term loans?|long[- ]term loans?|securiti[sz]ed (loans|borrowings)/i,
    /^total|lease|related part|non-controlling|deferred|derivative|receivable|loans? (to|given)|investment/i],
  lease:["bs",/lease liabilit|lease creditors|finance lease (obligations|payables|liabilit)|obligations under (finance )?leases?/i,/^total|right[- ]of[- ]use|receivable/i],
  capex:["cf",/^(purchase|acquisition) of (property|plant|equipment|intangible|investment property)|^additions to (property|plant)/i,null],
  div:["cf",/^dividends? paid/i,null],
  da:["cf",/^(depreciation|amortisation|amortization)/i,null]};
const ABS=new Set(["cogs","dist","admin","fin","tax","debt","lease","capex","div","da"]);

// ---- Banks and finance companies ("lending" engine) --------------------------------------------
// Customer deposits are funding, never borrowings. Loans are summed across loan/lease/hire-purchase lines.
const D_LEND={
  gi:["is",[/^gross income/i]],
  ii:["is",[/^interest income/i]],
  ie:["is",[/^(less:?\s*)?interest expenses?/i]],
  nii:["is",[/^net interest income/i]],
  fee:["is",[/^net fee and commission income/i,/^fee and commission income/i]],
  toi:["is",[/^total operating income/i,/^net operating income/i]],
  imp:["is",[/^(less:?\s*)?(impairment (charges?|\(charges?\)|losses?|charge\/\(reversal\)|\(reversal\)\/charge)|credit loss expenses?|impairment charge)/i]],
  opx:["is",[/^total operating expenses/i]],
  op:["is",[/^operating profit before (taxes|tax) on financial services/i]],
  pbt:["is",[/^profit before (income )?tax/i,D.pbt[1][0]]],
  tax:["is",D.tax[1]],
  pat:["is",D.pat[1]],
  eps:["is",D.eps[1]],
  cash:["bs",[/^cash and cash equivalents/i,/^cash (and|in hand)/i]],
  ta:D.ta,tl:D.tl,eq:D.eq,re:D.re,
};
const SUM_LEND={
  loans:["bs",/loans and advances( to customers)?|lease rentals? receivable|hire purchase|finance leases? receivables?|loans and receivables|^gold loans|advances to customers/i,
    /^total|due from banks|to banks|related part|staff loans|other financial institutions|placements/i],
  deps:["bs",/due to depositors|deposits? (from|due to) customers|customer deposits|due to customers|^deposits$/i,/^total/i],
  fund:["bs",/borrowings|debt securities issued|subordinated (debt|term debts?)|due to (banks|other financial institutions)|debentures|securities sold under repurchase/i,/^total|lease/i],
  lease:SUM.lease};
const ABS_LEND=new Set(["ie","imp","opx","tax","lease"]);

// ---- Insurers (SLFRS 17) ----------------------------------------------------------------------
// Insurance revenue is never gross written premium; GWP is entered from the highlights if disclosed.
const D_INS={
  irev:["is",[/^insurance revenue/i]],
  ise:["is",[/^insurance service expenses?/i]],
  reins:["is",[/^net (income|expenses?|\(expenses?\)|income\s*\/\s*\(expenses?\)|\(expenses?\)\s*\/\s*income|expenses?\s*\/\s*income) from reinsurance contracts held/i,/^net (expense|income) from reinsurance/i,/^reinsurance (result|expenses?)/i]],
  isr:["is",[/^insurance service result/i]],
  inv:["is",[/^(net )?investment income/i,/^interest and dividend income/i,/^investment and other income/i]],
  ifin:["is",[/^(net )?insurance finance (income|expenses?)/i,/^(net )?finance (income|expenses?) from insurance contracts/i]],
  pbt:D.pbt,tax:D.tax,pat:D.pat,eps:D.eps,
  cash:["bs",[/^cash and cash equivalents/i,/^cash (and|in hand)/i]],
  ta:D.ta,tl:D.tl,eq:D.eq,re:D.re,
  icl:["bs",[/^insurance contract liabilities/i]],
  rca:["bs",[/^reinsurance contract assets/i]],
};
const ABS_INS=new Set(["ise","tax"]);

export const ENGINE_DICTS={
  industrial:{D,SUM,ABS,anchor:/^(revenue|turnover|net sales|gross income)\b/i,
    need:["rev","cogs","pbt","pat","inv","rec","pay","cash","debt","ta","ca","cl","eq","cfo"]},
  lending:{D:D_LEND,SUM:SUM_LEND,ABS:ABS_LEND,anchor:/^(gross income|interest income)/i,
    need:["nii","toi","pbt","pat","loans","deps","ta","eq"]},
  insurer:{D:D_INS,SUM:{},ABS:ABS_INS,anchor:/^insurance revenue/i,
    need:["irev","isr","pbt","pat","ta","eq","icl"]}};
// statement each field comes from, across all engines (used to rescale on a unit change)
export const FIELD_STMT=Object.fromEntries(Object.values(ENGINE_DICTS).flatMap(({D,SUM})=>[...Object.entries(D),...Object.entries(SUM)]).map(([k,[s]])=>[k,s]));

// ---- Units -------------------------------------------------------------------------------------
// Values are converted to millions. scale = multiplier from the printed figure to millions.
export const UNITS={rupees:{scale:1e-6,label:"Rs. (full rupees)"},thousands:{scale:1e-3,label:"Rs. '000"},millions:{scale:1,label:"Rs. Mn"}};
const UNIT_RE=[
  ["thousands",/(?:rs|lkr|rupees|usd|us\$)\.?\s*['’‘`´]?\s*0{3}(?!\d)|['’‘`´]\s*0{3}(?!\d)|\bin thousands\b|\bthousands of\b|\(\s*0{3}\s*\)/i],
  ["millions",/(?:rs|lkr|usd|us\$)\.?\s*(?:mn|mln|million)s?\b|\bin millions?\b|\bmillions\b|\b(?:rs|lkr)\.?\s*m\b/i],
  ["rupees",/\bin (?:sri lankan )?rupees\b|\(\s*(?:rs|lkr)\.?\s*\)/i]];
const onlyRs=l=>{const t=l.trim().split(/\s+/);return t.length>=1&&t.length<=8&&t.every(x=>/^(rs|lkr)\.?$/i.test(x))};
export function unitOfLine(l){
  for(const[u,re]of UNIT_RE)if(re.test(l))return u;
  return onlyRs(l)?"rupees":null;
}
// Plausible size of an anchor figure (total assets, revenue) for a CSE company, in full rupees.
const PLAUSIBLE=[1e6,1e14];

export function detectUnit(stmt,rows,pages,anchorRe,eps){
  const votes={rupees:0,thousands:0,millions:0},local={rupees:0,thousands:0,millions:0},why=[];
  // unit labels on the statement itself: header region (first 30 lines) counts most
  stmt.lines.forEach((l,i)=>{const u=unitOfLine(l);if(!u)return;const w=i<30?3:1;votes[u]+=w;local[u]+=w});
  // document-wide: short unit lines anywhere in the report (column headers, "All figures in Rs. Mn")
  const doc={rupees:0,thousands:0,millions:0};
  for(const p of pages)for(const l of p.lines){if(l.length>60)continue;const u=unitOfLine(l);if(u)doc[u]++}
  const docTotal=doc.rupees+doc.thousands+doc.millions;
  for(const u in doc)if(docTotal)votes[u]+=Math.min(1.5,1.5*doc[u]/docTotal);
  // size plausibility of the anchor figure
  const anchor=rows.find(r=>anchorRe.test(r.label))?.vals[0]??Math.max(0,...rows.map(r=>Math.abs(r.vals[0])||0));
  const plausible=u=>{const rs=Math.abs(anchor)*UNITS[u].scale*1e6;return !(anchor>0)||(rs>=PLAUSIBLE[0]&&rs<=PLAUSIBLE[1])};
  // EPS cross-check (income statement): implied share count should be 100k..100bn
  if(eps&&eps.pat&&eps.eps){for(const u in votes){const sh=Math.abs(eps.pat*UNITS[u].scale*1e6/eps.eps);if(sh>=1e5&&sh<=1e11)votes[u]+=0.5}}
  const cands=Object.keys(votes).filter(plausible);
  const pool=cands.length?cands:Object.keys(votes);
  let unit=pool.reduce((a,b)=>votes[b]>votes[a]?b:a,pool[0]);
  let confidence,source;
  const localHits=Object.values(local).filter(v=>v>0).length;
  if(local[unit]>=3&&localHits===1&&plausible(unit)){confidence="high";source="statement header"}
  else if(local[unit]>0){confidence="medium";source=localHits>1?"statement page (conflicting unit labels)":"statement page"}
  else if(doc[unit]>0){confidence="medium";source=`elsewhere in the report (${doc[unit]} mention${doc[unit]>1?"s":""})`}
  else{
    // nothing printed: fall back on the size of the figures
    unit=Math.abs(anchor)>=1e9&&plausible("rupees")?"rupees":plausible("thousands")?"thousands":pool[0];
    confidence="low";source="size of the figures (no unit label found)";
  }
  if(!plausible(unit))why.push("figures look implausibly large or small for this unit");
  return{unit,scale:UNITS[unit].scale,label:UNITS[unit].label,confidence,source,warnings:why};
}

// ---- Extraction --------------------------------------------------------------------------------
export function extractFigures(pages,engine="industrial"){
  const {D,SUM,ABS,anchor,need}=ENGINE_DICTS[engine]||ENGINE_DICTS.industrial;
  const st={};for(const k of["is","bs","cf"])st[k]=findStatement(pages,k);
  const rows={};
  for(const k of["is","bs","cf"])if(st[k])rows[k]=rowsOf(st[k].lines,st[k].linePages);
  // raw (unscaled) PAT and EPS for the unit cross-check
  const rawFirst=(k,re)=>rows[k]?.find(r=>re.test(r.label))?.vals[0];
  const epsRaw=rawFirst("is",D.eps[1][0]),patRaw=rawFirst("is",D.pat[1][0]);
  const units={};
  if(st.is)units.is=detectUnit(st.is,rows.is,pages,anchor,{pat:patRaw,eps:Number.isFinite(epsRaw)&&Math.abs(epsRaw)<1000?epsRaw:null});
  if(st.bs)units.bs=detectUnit(st.bs,rows.bs,pages,/^total assets/i);
  if(st.cf)units.cf=detectUnit(st.cf,rows.cf,pages,/net cash.*operating activities/i);
  const f={};
  const put=(key,vals,k,page,src)=>{
    const s=key==="eps"?1:units[k].scale;const a=ABS.has(key)?Math.abs:x=>x;
    f[key]={cur:a(vals[0])*s,prev:vals.length>1?a(vals[1])*s:NaN,page:page??st[k].page,stmt:k,state:"extracted",src:src?String(src).slice(0,80):undefined};
  };
  for(const[key,[k,res]]of Object.entries(D)){
    if(!rows[k])continue;
    for(const re of res){const r=rows[k].find(r=>re.test(r.label));if(r){put(key,r.vals,k,r.page,r.label);break}}
  }
  for(const[key,[k,inc,exc]]of Object.entries(SUM)){
    if(!rows[k])continue;
    const rs=rows[k].filter(r=>inc.test(r.label)&&!(exc&&exc.test(r.label)));
    if(rs.length){put(key,[0,1].map(i=>rs.reduce((a,r)=>a+Math.abs(r.vals[i]??0),0)),k,rs[0].page,[...new Set(rs.map(r=>r.label))].join(" + "));f[key].lines=rs.map(r=>r.label)}
  }
  // EPS label often wraps onto the next line: numbers sit on the line after it
  if(!f.eps&&st.is){const L=st.is.lines;const i=L.findIndex(l=>/earnings per share/i.test(l));
    for(let j=i;i>=0&&j<=i+2&&j<L.length;j++){const tk=L[j].split(" "),r=tk.every(isNum)?{vals:tk.map(toNum)}:parseLine(L[j]);if(r&&r.vals.length>=2&&r.vals.every(v=>Math.abs(v)<1000)){f.eps={cur:r.vals[0],prev:r.vals[1],page:st.is.linePages[j],stmt:"is",state:"extracted"};break}}}
  // derived fallbacks
  const derive=(key,from,cur,prev)=>{f[key]={cur,prev,page:f[from].page,stmt:f[from].stmt,state:"derived",derived:true}};
  if(!f.tl&&f.ta&&f.eq)derive("tl","ta",f.ta.cur-f.eq.cur,f.ta.prev-f.eq.prev);
  if(!f.gp&&f.rev&&f.cogs)derive("gp","rev",f.rev.cur-f.cogs.cur,f.rev.prev-f.cogs.prev);
  if(engine==="lending"&&!f.nii&&f.ii&&f.ie)derive("nii","ii",f.ii.cur-f.ie.cur,f.ii.prev-f.ie.prev);
  if(!f.pat&&f.pbt&&f.tax)derive("pat","pbt",f.pbt.cur-f.tax.cur,f.pbt.prev-f.tax.prev);

  // accounting-identity checks
  const near=(a,b)=>Math.abs(a-b)<=Math.max(Math.abs(b)*0.005,0.01);
  const val=[];
  const chk=(name,ok,detail)=>val.push({name,ok,detail});
  for(const w of["cur","prev"]){
    const L=w==="cur"?"this year":"last year",g=k=>f[k]?.[w];
    if([g("ta"),g("tl"),g("eq")].every(Number.isFinite)&&!f.tl?.derived)chk(`Assets = liabilities + equity (${L})`,near(g("ta"),g("tl")+g("eq")),`${g("ta")?.toFixed(1)} vs ${(g("tl")+g("eq")).toFixed(1)}`);
    if([g("rev"),g("cogs"),g("gp")].every(Number.isFinite)&&!f.gp?.derived)chk(`Revenue − cost of sales = gross profit (${L})`,near(g("rev")-g("cogs"),g("gp")),`${(g("rev")-g("cogs")).toFixed(1)} vs ${g("gp")?.toFixed(1)}`);
    if([g("pbt"),g("tax"),g("pat")].every(Number.isFinite)&&!f.pat?.derived)chk(`PBT − tax = PAT (${L})`,near(g("pbt")-g("tax"),g("pat")),`${(g("pbt")-g("tax")).toFixed(1)} vs ${g("pat")?.toFixed(1)}`);
    if([g("ii"),g("ie"),g("nii")].every(Number.isFinite)&&!f.nii?.derived)chk(`Interest income − interest expense = net interest income (${L})`,near(g("ii")-g("ie"),g("nii")),`${(g("ii")-g("ie")).toFixed(1)} vs ${g("nii")?.toFixed(1)}`);
    if([g("irev"),g("ise"),g("reins"),g("isr")].every(Number.isFinite))chk(`Insurance revenue − service expenses + reinsurance = service result (${L})`,near(g("irev")-g("ise")+g("reins"),g("isr")),`${(g("irev")-g("ise")+g("reins")).toFixed(1)} vs ${g("isr")?.toFixed(1)}`);
  }
  return{fields:f,units,
    pages:{is:st.is?.page,bs:st.bs?.page,cf:st.cf?.page},
    statementPages:{is:st.is?.pages,bs:st.bs?.pages,cf:st.cf?.pages},
    validation:val,missing:need.filter(k=>!f[k]),engine};
}

// Text signals for the disclosure / related-party checks.
export function scanSignals(pages){
  const hit=re=>{const out=[];for(const p of pages)if(p.lines.some(l=>re.test(l)))out.push(p.no);return out};
  return{
    relatedParty:hit(/^(\d+\.?\s*)?related part(y|ies)( transactions| disclosures)?$/i),
    contingent:hit(/^(\d+\.?\s*)?contingent (liabilit|assets)/i),
    noContingent:hit(/no (material )?contingent liabilit/i),
    emphasis:hit(/^emphasis of matter/i),
    gcMaterial:hit(/^material uncertainty related to going concern/i),
    qualified:hit(/^(basis for )?(qualified|adverse) opinion|^disclaimer of opinion/i),
    auditReport:hit(/^independent auditors?['’]?s?\s+report/i),
    discontinued:hit(/^(profit|loss|\(loss\)|profit\/\(loss\)) (for the year )?from discontinued operations?|^discontinued operations?$/i),
    errata:hit(/^(errata|erratum|corrigendum)\b/i).filter(n=>n<=5),
    restated:hit(/\(restated\)|^restatement of comparatives|reclassification of comparative/i),
    kam:hit(/^key audit matters?$/i)};
}
