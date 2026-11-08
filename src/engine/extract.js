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
const rowsOf=lines=>lines.map(parseLine).filter(r=>r&&r.vals.length>=2);

const HEAD={
  is:/statement of (profit or loss|comprehensive income|income)|income statement/i,
  bs:/statement of financial position|balance sheet/i,
  cf:/statement of cash flows?|cash flow statement/i};
const MUST={is:/^(revenue|turnover|net sales|gross income|profit (for the|before))/i,bs:/^total assets/i,cf:/operating activities/i};
const NOT_STMT=/notes? to the|accounting policies|table of contents|index/i;

export function findStatement(pages,type){
  let best=null;
  pages.forEach((p,idx)=>{
    const head=p.lines.slice(0,10).join(" "),top=p.lines.slice(0,4).join(" ");
    if(!HEAD[type].test(top)||NOT_STMT.test(top)||/^\d+\.\s/.test(p.lines[0]||""))return;
    if(!p.lines.some(l=>MUST[type].test(l)))return;
    const n=rowsOf(p.lines).length;if(n<8)return;
    const score=n+(/group/i.test(head)?3:0);
    if(!best||score>best.score)best={idx,score};
  });
  if(!best)return null;
  let lines=[...pages[best.idx].lines];
  const nx=pages[best.idx+1];
  if(nx){const h=nx.lines.slice(0,8).join(" ");
    if(!/statement of|notes? to|accounting policies/i.test(h)&&rowsOf(nx.lines).length>=6)lines=lines.concat(nx.lines);}
  return{page:pages[best.idx].no,lines};
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
const SUM={
  debt:["bs",/(borrowings|overdraft|debentures|bank loans|term loans?)/i,/^total|lease|related part|non-controlling|deferred|derivative/i],
  capex:["cf",/^(purchase|acquisition) of (property|plant|equipment|intangible|investment property)|^additions to (property|plant)/i,null],
  div:["cf",/^dividends? paid/i,null],
  da:["cf",/^(depreciation|amortisation|amortization)/i,null]};
const ABS=new Set(["cogs","dist","admin","fin","tax","debt","capex","div","da"]);

function scaleOf(lines){
  const t=lines.slice(0,25).join(" ");
  if(/rs\.?\s*['’]?000|lkr\s*['’]?000|rupees in thousands|in thousands/i.test(t))return 1e3/1e6;
  if(/million|\bmn\b/i.test(t))return 1;
  return 1/1e6;
}

export function extractFigures(pages){
  const st={};for(const k of["is","bs","cf"])st[k]=findStatement(pages,k);
  const rows={},sc={};
  for(const k of["is","bs","cf"]){if(st[k]){rows[k]=rowsOf(st[k].lines);sc[k]=scaleOf(st[k].lines)}}
  const f={};
  const put=(key,vals,kind,k)=>{
    const s=key==="eps"?1:sc[k];const a=ABS.has(key)?Math.abs:x=>x;
    f[key]={cur:a(vals[0])*s,prev:vals.length>1?a(vals[1])*s:NaN,page:st[k].page};
  };
  for(const[key,[k,res]]of Object.entries(D)){
    if(!rows[k])continue;
    for(const re of res){const r=rows[k].find(r=>re.test(r.label));if(r){put(key,r.vals,0,k);break}}
  }
  for(const[key,[k,inc,exc]]of Object.entries(SUM)){
    if(!rows[k])continue;
    const rs=rows[k].filter(r=>inc.test(r.label)&&!(exc&&exc.test(r.label)));
    if(rs.length)put(key,[0,1].map(i=>rs.reduce((a,r)=>a+Math.abs(r.vals[i]??0),0)),0,k);
  }
  // EPS label often wraps onto the next line: numbers sit on the line after it
  if(!f.eps&&st.is){const L=st.is.lines;const i=L.findIndex(l=>/earnings per share/i.test(l));
    for(let j=i;i>=0&&j<=i+2&&j<L.length;j++){const tk=L[j].split(" "),r=tk.every(isNum)?{vals:tk.map(toNum)}:parseLine(L[j]);if(r&&r.vals.length>=2&&r.vals.every(v=>Math.abs(v)<1000)){f.eps={cur:r.vals[0],prev:r.vals[1],page:st.is.page};break}}}
  // derived fallbacks
  if(!f.tl&&f.ta&&f.eq)f.tl={cur:f.ta.cur-f.eq.cur,prev:f.ta.prev-f.eq.prev,page:f.ta.page,derived:true};
  if(!f.gp&&f.rev&&f.cogs)f.gp={cur:f.rev.cur-f.cogs.cur,prev:f.rev.prev-f.cogs.prev,page:f.rev.page,derived:true};
  if(!f.pat&&f.pbt&&f.tax)f.pat={cur:f.pbt.cur-f.tax.cur,prev:f.pbt.prev-f.tax.prev,page:f.pbt.page,derived:true};

  // accounting-identity checks
  const near=(a,b)=>Math.abs(a-b)<=Math.max(Math.abs(b)*0.005,0.01);
  const val=[];
  const chk=(name,ok,detail)=>val.push({name,ok,detail});
  for(const w of["cur","prev"]){
    const L=w==="cur"?"this year":"last year",g=k=>f[k]?.[w];
    if([g("ta"),g("tl"),g("eq")].every(Number.isFinite)&&!f.tl?.derived)chk(`Assets = liabilities + equity (${L})`,near(g("ta"),g("tl")+g("eq")),`${g("ta")?.toFixed(1)} vs ${(g("tl")+g("eq")).toFixed(1)}`);
    if([g("rev"),g("cogs"),g("gp")].every(Number.isFinite)&&!f.gp?.derived)chk(`Revenue − cost of sales = gross profit (${L})`,near(g("rev")-g("cogs"),g("gp")),`${(g("rev")-g("cogs")).toFixed(1)} vs ${g("gp")?.toFixed(1)}`);
    if([g("pbt"),g("tax"),g("pat")].every(Number.isFinite)&&!f.pat?.derived)chk(`PBT − tax = PAT (${L})`,near(g("pbt")-g("tax"),g("pat")),`${(g("pbt")-g("tax")).toFixed(1)} vs ${g("pat")?.toFixed(1)}`);
  }
  const need=["rev","cogs","pbt","pat","inv","rec","pay","cash","ta","ca","cl","eq","cfo"];
  return{fields:f,pages:{is:st.is?.page,bs:st.bs?.page,cf:st.cf?.page},validation:val,missing:need.filter(k=>!f[k])};
}

// Text signals for the disclosure / related-party checks.
export function scanSignals(pages){
  const hit=(re,lineStart=true)=>{const out=[];for(const p of pages)if(p.lines.some(l=>re.test(l)))out.push(p.no);return out};
  return{
    relatedParty:hit(/^(\d+\.?\s*)?related part(y|ies)( transactions| disclosures)?$/i),
    contingent:hit(/^(\d+\.?\s*)?contingent (liabilit|assets)/i),
    noContingent:hit(/no (material )?contingent liabilit/i),
    emphasis:hit(/^emphasis of matter/i),
    gcMaterial:hit(/^material uncertainty related to going concern/i),
    qualified:hit(/^(basis for )?(qualified|adverse) opinion|^disclaimer of opinion/i),
    kam:hit(/^key audit matters?$/i)};
}
