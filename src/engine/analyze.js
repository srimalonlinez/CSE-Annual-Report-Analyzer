// Pure maths: ratios, scores, bridge, DCF, rule-based flags. No network, no ML.
const nan=NaN,ok=Number.isFinite;
const n=(x,d=1)=>ok(x)?x.toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d}):"n/a";
const pc=(x,d=1)=>ok(x)?(x*100).toFixed(d)+"%":"n/a";
const xx=x=>ok(x)?x.toFixed(2)+"x":"n/a";
const z0=x=>ok(x)?x:0;

export function metrics(f,i,price,shares){
  const v=k=>{const o=f[k];return o&&ok(o[i])?o[i]:nan};
  const m={};["rev","cogs","gp","oi","dist","admin","fin","finInc","op","pbt","tax","pat","eps","inv","rec","pay","cash","debt","ta","ca","cl","tl","eq","re","cfo","capex","div","da"].forEach(k=>m[k]=v(k));
  if(!ok(m.gp))m.gp=m.rev-m.cogs;
  if(!ok(m.pat))m.pat=m.pbt-m.tax;
  m.opex=(ok(m.dist)||ok(m.admin))?z0(m.dist)+z0(m.admin):nan;
  m.ebit=ok(m.op)?m.op:m.pbt+z0(m.fin)-z0(m.finInc);
  m.ebitda=m.ebit+m.da;
  Object.assign(m,{gm:m.gp/m.rev,om:m.ebit/m.rev,em:m.ebitda/m.rev,nm:m.pat/m.rev,etr:m.tax/m.pbt,
    nd:z0(m.debt)-z0(m.cash),cr:m.ca/m.cl,dso:m.rec/m.rev*365,dio:m.inv/m.cogs*365,dpo:m.pay/m.cogs*365,
    roe:m.pat/m.eq,roa:m.pat/m.ta,roce:m.ebit/(m.ta-m.cl),conv:m.cfo/m.pat,acc:(m.pat-m.cfo)/m.ta,fcf:m.cfo-z0(m.capex),cov:m.ebit/m.fin});
  m.ccc=m.dso+m.dio-m.dpo;
  m.shares=shares?.[i]??(ok(m.eps)&&m.eps!==0?m.pat/m.eps:nan);
  m.px=price?.[i]??nan;m.mc=m.shares*m.px;
  return m;
}
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
// 5-year DCF. a={g,m,w,tg}; inputs from latest year. Returns equity value (and per share if shares known).
export function dcf(d,a){
  let r=d.rev,pv=0;
  for(let y=1;y<=5;y++){const prev=r;r*=1+a.g;pv+=(r*a.m*(1-d.tax)+r*d.da-r*d.capex-(r-prev)*0.45)/Math.pow(1+a.w,y)}
  const tv=(r*a.m*(1-d.tax)*(1+a.tg)-r*a.tg*0.45-r*(d.capex-d.da))/(a.w-a.tg);
  pv+=tv/Math.pow(1+a.w,5);
  const eq=pv-d.nd;return{ev:pv,equity:eq,perShare:ok(d.shares)?eq/d.shares:nan};
}

export function analyze({fields:f,price,shares,signals={},company="",period="",unit="millions"}){
  const c=metrics(f,"cur",price,shares),p=metrics(f,"prev",price,shares);
  // metrics() reads f[k][i]; for "cur"/"prev" keys
  const rg=c.rev/p.rev-1,pg=c.pat/p.pat-1,lev=c.nd/c.ebitda;
  const checks=[];const add=(title,status,points)=>checks.push({title,status:ok(status)?status:status,points});
  const st=(bad,warn,fallbackOk=true)=>bad?"concern":warn?"watch":"healthy";
  const need=(...xs)=>xs.every(ok);

  add("Revenue trajectory",need(rg)?(rg<0?"concern":rg<.05?"watch":"healthy"):"unknown",
    [`Growth ${pc(rg)}: ${n(p.rev)} to ${n(c.rev)}`,"Segment mix and one-offs: check the revenue note"]);
  const dg=c.gm-p.gm;
  add("Margin direction",need(dg)?(dg<-.025?"concern":dg<-.01?"watch":"healthy"):"unknown",
    [`Gross margin ${pc(p.gm)} to ${pc(c.gm)} (${n(dg*100)} pp)`,`Operating margin ${pc(p.om)} to ${pc(c.om)}`,`Net margin ${pc(p.nm)} to ${pc(c.nm)}`,
     ok(c.opex)?`Operating expenses ${pc(c.opex/p.opex-1)} vs revenue ${pc(rg)}`:"Operating expense lines not found"]);
  add("Cash flow quality",need(c.conv)?(c.conv<.5?"concern":c.conv<.8?"watch":"healthy"):"unknown",
    [`Operating cash flow / PAT ${xx(c.conv)} (last year ${xx(p.conv)})`,`Free cash flow ${n(c.fcf)} vs dividends paid ${n(c.div)}`,`Accruals ratio ${pc(c.acc)} (higher means more profit not backed by cash)`]);
  add("Debt structure",need(lev,c.cov)?(lev>2||c.cov<3?"concern":lev>1||c.cov<6?"watch":"healthy"):"unknown",
    [`Net debt ${n(c.nd)}, ${xx(lev)} EBITDA`,`Interest cover ${xx(c.cov)}`,`Borrowings ${pc(c.debt/p.debt-1)} year on year`,"Check the maturity table: how much falls due within a year"]);
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
  const q=(signals.qualified||[]),gc=(signals.gcMaterial||[]),em=(signals.emphasis||[]);
  const dpts=[];
  dpts.push(q.length?`Qualified/adverse/disclaimer wording on pages ${q.join(", ")}`:"No qualified, adverse or disclaimer opinion wording detected");
  dpts.push(gc.length?`Material-uncertainty-on-going-concern heading on pages ${gc.join(", ")}`:"No going-concern material uncertainty heading detected");
  if(em.length)dpts.push(`Emphasis of matter on pages ${em.join(", ")}`);
  dpts.push((signals.contingent||[]).length?`Contingent liabilities note on pages ${signals.contingent.join(", ")}`:"No contingent liabilities heading found");
  if((signals.noContingent||[]).length)dpts.push(`States no contingent liabilities (pages ${signals.noContingent.join(", ")})`);
  add("Disclosure quality",q.length||gc.length?"concern":em.length?"watch":"healthy",dpts);

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
  (lev<1&&c.cov>6?pos:con).push(`Net debt ${xx(lev)} EBITDA, interest cover ${xx(c.cov)}`);
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
  const verdict=`${cnt("healthy")} healthy, ${cnt("watch")} watch, ${cnt("concern")} concern and ${cnt("unknown")} manual checks. Revenue ${pc(rg)}, PAT ${pc(pg)}, operating cash flow ${xx(c.conv)} of PAT.`;
  const M=(label,k,d=1)=>({label,cur:n(c[k],d),prev:n(p[k],d),chg:k==="eps"?pc(c[k]/p[k]-1):pc(c[k]/p[k]-1)});
  const metricsOut=[M("Revenue","rev"),M("Gross profit","gp"),M("EBITDA","ebitda"),M("Profit before tax","pbt"),M("Profit after tax","pat"),M("EPS","eps",2),
    M("Operating cash flow","cfo"),M("Free cash flow","fcf"),M("Total equity","eq"),M("Net debt","nd")];
  const taxRate=Math.min(Math.max(ok(c.etr)?c.etr:.17,0),.35);
  const dcfInputs={rev:c.rev,tax:taxRate,da:c.da/c.rev,capex:z0(c.capex)/c.rev,nd:c.nd,shares:c.shares,price:c.px};
  const base={g:Math.min(Math.max(ok(rg)?rg:.05,.02),.12),m:ok(c.om)?+c.om.toFixed(3):.12,w:.14,tg:.03};
  const q1=x=>ok(x)?+x:null,pairs=a=>a.map(([label,cur,prev])=>({label,cur:q1(cur),prev:q1(prev)}));
  const charts={
    status:{healthy:cnt("healthy"),watch:cnt("watch"),concern:cnt("concern"),manual:cnt("unknown")},
    margins:pairs([["Gross",c.gm,p.gm],["EBITDA",c.em,p.em],["Operating",c.om,p.om],["Net",c.nm,p.nm]]),
    cash:pairs([["Profit after tax",c.pat,p.pat],["Operating cash flow",c.cfo,p.cfo],["Free cash flow",c.fcf,p.fcf]]),
    days:pairs([["Receivable days",c.dso,p.dso],["Inventory days",c.dio,p.dio],["Payable days",c.dpo,p.dpo],["Cash cycle",c.ccc,p.ccc]]),
    returns:pairs([["ROE",c.roe,p.roe],["ROCE",c.roce,p.roce],["ROA",c.roa,p.roa]]),
    caMix:{inv:q1(c.inv),rec:q1(c.rec),cash:q1(c.cash),other:q1(Math.max(c.ca-z0(c.inv)-z0(c.rec)-z0(c.cash),0))},
    altman:{z:q1(alt.z),lo:alt.lo,hi:alt.hi,kind:alt.kind},
    patStart:q1(p.pat),patEnd:q1(c.pat)};
  return{company,period,unit,verdict,charts,metrics:metricsOut,checks,qoe:{rows:qoe,piotroski:pio,altman:{z:alt.z,kind:alt.kind}},bridge:bg,
    dcf:{inputs:dcfInputs,base},positives:pos,concerns:con,questions:Q};
}
