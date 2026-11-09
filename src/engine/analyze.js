// Pure maths: ratios, scores, bridge, DCF, rule-based flags. No network, no ML.
const nan=NaN,ok=Number.isFinite;
const n=(x,d=1)=>ok(x)?x.toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d}):"n/a";
const pc=(x,d=1)=>ok(x)?(x*100).toFixed(d)+"%":"n/a";
const xx=x=>ok(x)?x.toFixed(2)+"x":"n/a";
const z0=x=>ok(x)?x:0;

// Field states. A field with no value is never silently treated as zero; only "verified_zero" is.
//   extracted / derived / manual : a value is present
//   not_extracted : the parser did not find it and nobody has confirmed it
//   missing       : no value was supplied (e.g. an extracted value was cleared)
//   not_disclosed : the user confirmed the report does not disclose it
//   verified_zero : the user confirmed the amount is zero
export const FIELD_STATES=["extracted","derived","manual","not_extracted","missing","not_disclosed","verified_zero"];
export const FIELD_KEYS=["rev","cogs","gp","oi","dist","admin","fin","finInc","op","pbt","tax","pat","eps","inv","rec","pay","cash","debt","lease","ta","ca","cl","tl","eq","re","cfo","capex","div","da"];
// Fields whose absence changes a conclusion; listed in the report as data gaps.
const KEY_FIELDS=["rev","pat","cfo","cash","debt","lease","fin","da","capex","inv","rec","pay","ca","cl","eq","eps"];

export function metrics(f,i,price,shares){
  const v=k=>{const o=f[k];if(o&&ok(o[i]))return o[i];return o?.state==="verified_zero"?0:nan};
  const m={};FIELD_KEYS.forEach(k=>m[k]=v(k));
  if(!ok(m.gp))m.gp=m.rev-m.cogs;
  if(!ok(m.pat))m.pat=m.pbt-m.tax;
  // Debt = borrowings (short + long term, overdrafts, debentures) + lease liabilities (IFRS 16).
  // Unknown borrowings => unknown debt. Unknown leases => debt excludes leases, and the report says so.
  m.borrow=m.debt;
  m.debtExclLease=ok(m.borrow)&&!ok(m.lease);
  m.debt=ok(m.borrow)?m.borrow+z0(m.lease):nan;
  m.opex=(ok(m.dist)||ok(m.admin))?z0(m.dist)+z0(m.admin):nan;
  m.ebit=ok(m.op)?m.op:m.pbt+m.fin-z0(m.finInc);
  m.ebitda=m.ebit+m.da;
  Object.assign(m,{gm:m.gp/m.rev,om:m.ebit/m.rev,em:m.ebitda/m.rev,nm:m.pat/m.rev,etr:m.tax/m.pbt,
    nd:m.debt-m.cash,cr:m.ca/m.cl,dso:m.rec/m.rev*365,dio:m.inv/m.cogs*365,dpo:m.pay/m.cogs*365,
    roe:m.pat/m.eq,roa:m.pat/m.ta,roce:m.ebit/(m.ta-m.cl),conv:m.cfo/m.pat,acc:(m.pat-m.cfo)/m.ta,fcf:m.cfo-m.capex,
    cov:m.fin>0?m.ebit/m.fin:nan,noFinCost:m.fin===0});
  m.ccc=m.dso+m.dio-m.dpo;
  m.shares=shares?.[i]??(ok(m.eps)&&m.eps!==0?m.pat/m.eps:nan);
  m.px=price?.[i]??nan;m.mc=m.shares*m.px;
  return m;
}

// ---- Status rules for net debt / net cash ----------------------------------------------------
// Net debt <= 0 is net cash: no leverage concern. Net debt with zero or negative EBITDA is a concern.
// Otherwise net debt / EBITDA: > 2x concern, > 1x watch.
export function leverageStatus(m){
  if(!ok(m.nd))return{status:"unknown",text:ok(m.borrow)?"Net debt n/a: cash not available":"Net debt n/a: borrowings not extracted"};
  if(m.nd<=0)return{status:"healthy",netCash:true,text:`Net cash ${n(-m.nd)}${m.debtExclLease?" (excluding leases)":""}`};
  const lbl=`Net debt ${n(m.nd)}${m.debtExclLease?" (excluding leases)":""}`;
  if(!ok(m.ebitda))return{status:"unknown",text:`${lbl}; EBITDA not available`};
  if(m.ebitda<=0)return{status:"concern",text:`${lbl} with negative EBITDA (${n(m.ebitda)})`};
  const lev=m.nd/m.ebitda;
  return{status:lev>2?"concern":lev>1?"watch":"healthy",lev,text:`${lbl}, ${xx(lev)} EBITDA`};
}
export function coverStatus(m){
  if(m.noFinCost)return{status:"healthy",text:"No finance cost"};
  if(!ok(m.fin))return{status:"unknown",text:"Interest cover n/a: finance cost not extracted"};
  if(!ok(m.ebit))return{status:"unknown",text:"Interest cover n/a: operating profit not available"};
  if(m.ebit<=0)return{status:"concern",text:`Operating profit does not cover finance cost (${xx(m.cov)})`};
  return{status:m.cov<3?"concern":m.cov<6?"watch":"healthy",text:`Interest cover ${xx(m.cov)}`};
}
const RANK={healthy:1,watch:2,concern:3};
const worst=(...s)=>{const k=s.filter(x=>RANK[x]);return k.length?k.reduce((a,b)=>RANK[b]>RANK[a]?b:a):"unknown"};

export function altman(m){
  const w=m.ca-m.cl;
  if(ok(m.mc))return{z:1.2*w/m.ta+1.4*m.re/m.ta+3.3*m.ebit/m.ta+0.6*m.mc/m.tl+m.rev/m.ta,kind:"original (market value of equity)",lo:1.81,hi:2.99};
  return{z:6.56*w/m.ta+3.26*m.re/m.ta+6.72*m.ebit/m.ta+1.05*m.eq/m.tl,kind:"Z'' (book equity, no share price given)",lo:1.1,hi:2.6};
}
export function piotroski(c,p){
  const t=[["ROA positive",c.roa>0],["Operating cash flow positive",c.cfo>0],["ROA improving",c.roa>p.roa],["Cash flow above net profit",c.cfo>c.pat],
    ["Debt / assets falling",c.debt/c.ta<p.debt/p.ta],["Current ratio improving",c.cr>p.cr],["No new shares issued",!(c.shares>p.shares*1.01)],
    ["Gross margin improving",c.gm>p.gm],["Asset turnover improving",c.rev/c.ta>p.rev/p.ta]];
  return{score:t.filter(a=>a[1]).length,tests:t.map(a=>({name:a[0],pass:!!a[1]}))};
}

// ---- DCF ----------------------------------------------------------------------------------------
// d: {rev, nd, shares, and legacy defaults tax/da/capex}. a: assumptions
//   g revenue growth, m operating margin, w WACC, tg terminal growth, tax rate,
//   da and capex as % of revenue, nwc = working capital needed per rupee of extra revenue, years.
// Every year (forecast and terminal) uses the same free-cash-flow formula:
//   FCF = revenue × margin × (1 − tax) + D&A − capex − nwc × (revenue − last year's revenue)
// The terminal value is next year's FCF at terminal growth, capitalised at (WACC − terminal growth).
export const MIN_SPREAD=0.005;
export function dcf(d,a){
  const tax=a.tax??d.tax,da=a.da??d.da,capex=a.capex??d.capex,nwc=a.nwc??d.nwc??0.45,N=Math.round(a.years??5);
  const bad=reason=>({ev:nan,equity:nan,perShare:nan,invalid:reason});
  if(!(a.w-a.tg>=MIN_SPREAD))return bad("WACC must be at least 0.5 pp above terminal growth");
  if(![d.rev,a.g,a.m,a.w,a.tg,tax,da,capex,nwc].every(ok)||N<1)return bad("Missing inputs");
  const fcf=(r,prev)=>r*a.m*(1-tax)+r*da-r*capex-nwc*(r-prev);
  let r=d.rev,pv=0;const years=[];
  for(let y=1;y<=N;y++){const prev=r;r*=1+a.g;const f=fcf(r,prev),disc=Math.pow(1+a.w,y);pv+=f/disc;years.push({y,rev:r,fcf:f})}
  const rT=r*(1+a.tg),tv=fcf(rT,r)/(a.w-a.tg),pvTv=tv/Math.pow(1+a.w,N);
  const ev=pv+pvTv,equity=ok(d.nd)?ev-d.nd:nan;
  return{ev,equity,perShare:ok(d.shares)&&ok(equity)?equity/d.shares:nan,tvShare:pvTv/ev,years};
}

export function analyze({fields:f,price,shares,signals={},company="",period="",unit="millions"}){
  const c=metrics(f,"cur",price,shares),p=metrics(f,"prev",price,shares);
  const rg=c.rev/p.rev-1,pg=c.pat/p.pat-1;
  const checks=[];const add=(title,status,points)=>checks.push({title,status,points});
  const need=(...xs)=>xs.every(ok);

  add("Revenue trajectory",need(rg)?(rg<0?"concern":rg<.05?"watch":"healthy"):"unknown",
    [`Growth ${pc(rg)}: ${n(p.rev)} to ${n(c.rev)}`,"Segment mix and one-offs: check the revenue note"]);
  const dg=c.gm-p.gm;
  add("Margin direction",need(dg)?(dg<-.025?"concern":dg<-.01?"watch":"healthy"):"unknown",
    [`Gross margin ${pc(p.gm)} to ${pc(c.gm)} (${n(dg*100)} pp)`,`Operating margin ${pc(p.om)} to ${pc(c.om)}`,`Net margin ${pc(p.nm)} to ${pc(c.nm)}`,
     ok(c.opex)?`Operating expenses ${pc(c.opex/p.opex-1)} vs revenue ${pc(rg)}`:"Operating expense lines not found"]);
  add("Cash flow quality",need(c.conv)?(c.conv<.5?"concern":c.conv<.8?"watch":"healthy"):"unknown",
    [`Operating cash flow / PAT ${xx(c.conv)} (last year ${xx(p.conv)})`,
     ok(c.fcf)?`Free cash flow ${n(c.fcf)} vs dividends paid ${n(c.div)}`:"Free cash flow n/a: capex not extracted (mark it verified zero if there was none)",
     `Accruals ratio ${pc(c.acc)} (higher means more profit not backed by cash)`]);
  // If either half is unknown the check cannot be called healthy: it is a concern if the known half is, otherwise manual.
  const levS=leverageStatus(c),covS=coverStatus(c);
  const debtStatus=levS.status==="unknown"||covS.status==="unknown"
    ?(levS.status==="concern"||covS.status==="concern"?"concern":"unknown"):worst(levS.status,covS.status);
  const dpts=[levS.text,covS.text,
    ok(c.debt)&&p.debt>0?`${c.debtExclLease?"Borrowings":"Debt (borrowings + leases)"} ${pc(c.debt/p.debt-1)} year on year`:"Debt change year on year n/a"];
  if(ok(c.borrow))dpts.push(`Borrowings ${n(c.borrow)}, lease liabilities ${ok(c.lease)?n(c.lease):"not available"}`);
  if(!ok(c.borrow))dpts.push("Borrowings were not extracted. If the company has none, mark them as verified zero in the review table");
  if(c.debtExclLease)dpts.push("Lease liabilities (IFRS 16) were not extracted, so debt excludes leases");
  dpts.push("Check the maturity table: how much falls due within a year");
  add("Debt structure",debtStatus,dpts);
  const rgap=(c.rec/p.rec-1)-rg;
  add("Working capital health",need(rgap,c.ccc,p.ccc)?(rgap>.15||c.ccc-p.ccc>20?"concern":c.dso-p.dso>10||c.ccc-p.ccc>8?"watch":"healthy"):"unknown",
    [`Receivable days ${n(p.dso,0)} to ${n(c.dso,0)}; inventory days ${n(p.dio,0)} to ${n(c.dio,0)}; payable days ${n(p.dpo,0)} to ${n(c.dpo,0)}`,
     `Cash conversion cycle ${n(c.ccc,0)} days (last year ${n(p.ccc,0)})`,`Receivables ${pc(c.rec/p.rec-1)} vs revenue ${pc(rg)}`,"Receivables here include advances and tax receivables if the report groups them; read the ageing note"]);
  const rp=signals.relatedParty||[];
  add("Related-party flows","unknown",[rp.length?`Related-party disclosures on pages ${rp.join(", ")}`:"No related-party section header detected",
    "Not computed: read sales/purchases with parent and sister companies, balances due, and loans to subsidiaries"]);
  const rd=c.roe-p.roe;
  add("Returns & valuation",need(rd)?(rd<-.08?"concern":rd<-.03?"watch":"healthy"):"unknown",
    [`ROE ${pc(p.roe)} to ${pc(c.roe)}`,`ROCE ${pc(p.roce)} to ${pc(c.roce)}`,
     ok(c.mc)?`P/E ${n(c.px/c.eps)}x, P/B ${n(c.mc/c.eq)}x, EV/EBITDA ${n((c.mc+c.nd)/c.ebitda)}x at price ${n(c.px,2)}`:"Enter a share price for P/E, P/B and EV/EBITDA"]);
  // Disclosure: finding no adverse wording is "not detected", never "healthy". Text matching cannot prove a clean opinion.
  const q=signals.qualified||[],gc=signals.gcMaterial||[],em=signals.emphasis||[],ar=signals.auditReport||[];
  const qpts=[];
  qpts.push(ar.length?`Independent auditor's report found on page ${ar.join(", ")}`:"Independent auditor's report heading not located: the audit opinion could not be checked");
  qpts.push(q.length?`Qualified/adverse/disclaimer wording on pages ${q.join(", ")}`:"Qualified, adverse or disclaimer opinion: not detected. Read the opinion paragraph to confirm");
  qpts.push(gc.length?`Material-uncertainty-on-going-concern heading on pages ${gc.join(", ")}`:"Going-concern material uncertainty: not detected");
  if(em.length)qpts.push(`Emphasis of matter on pages ${em.join(", ")}`);
  qpts.push((signals.contingent||[]).length?`Contingent liabilities note on pages ${signals.contingent.join(", ")}`:"Contingent liabilities heading: not detected");
  if((signals.noContingent||[]).length)qpts.push(`States no contingent liabilities (pages ${signals.noContingent.join(", ")})`);
  add("Disclosure quality",q.length||gc.length?"concern":em.length?"watch":"not_detected",qpts);

  const pio=piotroski(c,p),alt=altman(c),altp=altman(p);
  const qoe=[["Operating cash flow / PAT",xx(c.conv),xx(p.conv)],["Operating cash flow / EBITDA",pc(c.cfo/c.ebitda),pc(p.cfo/p.ebitda)],
    ["Accruals / assets",pc(c.acc),pc(p.acc)],["Free cash flow / PAT",pc(c.fcf/c.pat),pc(p.fcf/p.pat)],["Effective tax rate",pc(c.etr),pc(p.etr)],
    ["EPS",n(c.eps,2),n(p.eps,2)],["Operating cash flow per share",n(c.cfo/c.shares,2),n(p.cfo/p.shares,2)],
    ["Altman Z ("+alt.kind+")",n(alt.z),n(altp.z)]];
  const bridge=[["Gross profit",c.gp-p.gp],["Other income",z0(c.oi)-z0(p.oi)],["Operating expenses",-(z0(c.opex)-z0(p.opex))],["Finance cost",-(z0(c.fin)-z0(p.fin))],["Tax",-(z0(c.tax)-z0(p.tax))]];
  const resid=(c.pat-p.pat)-bridge.reduce((a,b)=>a+b[1],0);
  if(Math.abs(resid)>0.005*Math.abs(p.pat))bridge.push(["Other / unexplained (finance income, other expenses)",resid]);
  const bg=bridge.map(([driver,delta])=>({driver,delta:+delta.toFixed(1)}));

  const pos=[],con=[];
  (rg>.05?pos:con).push(`Revenue growth ${pc(rg)}`);
  (dg>=-.01?pos:con).push(`Gross margin ${pc(p.gm)} to ${pc(c.gm)}`);
  (c.conv>=.8?pos:con).push(`Cash conversion ${xx(c.conv)} of PAT`);
  if(debtStatus!=="unknown")(debtStatus==="healthy"?pos:con).push(`${levS.text}; ${covS.text.charAt(0).toLowerCase()+covS.text.slice(1)}`);
  (alt.z>alt.hi?pos:con).push(`Altman Z ${n(alt.z)}`);
  (pio.score>=7?pos:con).push(`Piotroski ${pio.score} of 9`);
  (rgap<=.1?pos:con).push(`Receivables growth ${pc(c.rec/p.rec-1)} vs revenue ${pc(rg)}`);
  if(ok(c.fcf)&&ok(c.div)&&c.fcf<c.div)con.push("Free cash flow below dividends paid");
  const Q=[];
  if(c.conv<.8)Q.push("What drove the gap between profit and operating cash flow, and how much reverses next year?");
  if(rgap>.1)Q.push("What is the receivables ageing, who are the large debtors, and what has been collected since year end?");
  if(dg<-.01)Q.push("How much of the margin decline is raw-material pass-through lag versus price concessions?");
  if(ok(c.opex)&&c.opex/p.opex-1>rg+.05)Q.push("Which parts of the operating-expense increase are recurring?");
  if(c.debt>0)Q.push("What is the maturity and refinancing plan for borrowings, and in what currency are they?");
  if(ok(c.fcf)&&c.fcf<c.div)Q.push("How is the dividend funded when free cash flow is below it?");
  Q.push("Are related-party prices benchmarked, and what loans or advances sit with subsidiaries?","What are the key audit matters, and has the auditor changed?");

  const cnt=s=>checks.filter(x=>x.status===s).length;
  const verdict=`${cnt("healthy")} healthy, ${cnt("watch")} watch, ${cnt("concern")} concern, ${cnt("unknown")} manual and ${cnt("not_detected")} not detected. Revenue ${pc(rg)}, PAT ${pc(pg)}, operating cash flow ${xx(c.conv)} of PAT.`;
  // Tiles: % change only when last year is positive; otherwise the absolute change.
  // trend says whether the move is good: higher is better, except net debt where lower is better.
  const M=(label,k,d=1,lowerIsBetter=false,show=x=>n(x,d))=>{
    const a=c[k],b=p[k],delta=a-b;
    const chg=ok(a)&&b>0?pc(a/b-1):ok(delta)?n(delta,d):"n/a";
    const trend=!ok(delta)||delta===0?null:(lowerIsBetter?delta<0:delta>0)?"better":"worse";
    return{label,cur:show(a),prev:show(b),chg,dir:!ok(delta)||delta===0?null:delta>0?"up":"down",trend};
  };
  const ndShow=x=>!ok(x)?"n/a":x<0?`Net cash ${n(-x)}`:n(x);
  const metricsOut=[M("Revenue","rev"),M("Gross profit","gp"),M("EBITDA","ebitda"),M("Profit before tax","pbt"),M("Profit after tax","pat"),M("EPS","eps",2),
    M("Operating cash flow","cfo"),M("Free cash flow","fcf"),M("Total equity","eq"),M("Net debt","nd",1,true,ndShow)];

  // DCF defaults, each tagged with where it came from so the UI can say "from report" or "default".
  const clamp=(x,lo,hi)=>Math.min(Math.max(x,lo),hi);
  const src={};
  const pick=(k,x,fallback,lo,hi)=>{if(ok(x)){src[k]="report";return +clamp(x,lo,hi).toFixed(3)}src[k]="default";return fallback};
  const nwcRatio=(c.rec+c.inv-c.pay)/c.rev;
  const base={
    g:pick("g",rg,.05,.02,.12),m:pick("m",c.om,.12,.01,.4),w:.14,tg:.03,
    tax:pick("tax",c.etr,.30,0,.35),da:pick("da",c.da/c.rev,.03,0,.2),
    capex:pick("capex",c.capex/c.rev,ok(c.da/c.rev)?+clamp(c.da/c.rev,0,.2).toFixed(3):.03,0,.25),
    nwc:pick("nwc",nwcRatio,.2,0,.6),years:5};
  src.w=src.tg=src.years="default";
  base.src=src;
  const dcfInputs={rev:c.rev,nd:c.nd,shares:c.shares,price:c.px,tax:base.tax,da:base.da,capex:base.capex,nwc:base.nwc,debtExclLease:c.debtExclLease};

  // data gaps: important fields without a value, and why
  const gaps=KEY_FIELDS.filter(k=>!ok(f[k]?.cur)).map(k=>({key:k,state:f[k]?.state&&!["extracted","derived","manual"].includes(f[k].state)?f[k].state:"missing"}))
    .filter(g=>g.state!=="verified_zero");

  const q1=x=>ok(x)?+x:null,pairs=a=>a.map(([label,cur,prev])=>({label,cur:q1(cur),prev:q1(prev)}));
  const charts={
    status:{healthy:cnt("healthy"),watch:cnt("watch"),concern:cnt("concern"),manual:cnt("unknown"),notDetected:cnt("not_detected")},
    margins:pairs([["Gross",c.gm,p.gm],["EBITDA",c.em,p.em],["Operating",c.om,p.om],["Net",c.nm,p.nm]]),
    cash:pairs([["Profit after tax",c.pat,p.pat],["Operating cash flow",c.cfo,p.cfo],["Free cash flow",c.fcf,p.fcf]]),
    days:pairs([["Receivable days",c.dso,p.dso],["Inventory days",c.dio,p.dio],["Payable days",c.dpo,p.dpo],["Cash cycle",c.ccc,p.ccc]]),
    returns:pairs([["ROE",c.roe,p.roe],["ROCE",c.roce,p.roce],["ROA",c.roa,p.roa]]),
    caMix:{inv:q1(c.inv),rec:q1(c.rec),cash:q1(c.cash),other:q1(Math.max(c.ca-z0(c.inv)-z0(c.rec)-z0(c.cash),0))},
    altman:{z:q1(alt.z),lo:alt.lo,hi:alt.hi,kind:alt.kind},
    patStart:q1(p.pat),patEnd:q1(c.pat)};
  return{company,period,unit,verdict,charts,metrics:metricsOut,checks,gaps,qoe:{rows:qoe,piotroski:pio,altman:{z:alt.z,kind:alt.kind}},bridge:bg,
    dcf:{inputs:dcfInputs,base},positives:pos,concerns:con,questions:Q};
}
