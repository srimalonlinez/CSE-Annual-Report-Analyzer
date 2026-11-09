// Banks, finance companies and insurers: metrics and valuation. No industrial ratios here:
// deposits are funding, insurance contract liabilities are policyholder obligations, and there is no FCFF DCF.
const nan=NaN,ok=Number.isFinite;
const val=(f,k,i)=>{const o=f[k];if(o&&ok(o[i]))return o[i];return o?.state==="verified_zero"?0:nan};

export const LENDING_KEYS=["gi","ii","ie","nii","fee","toi","imp","opx","op","pbt","tax","pat","eps","cash","ta","tl","eq","re","loans","deps","fund","lease"];
export const INSURER_KEYS=["irev","ise","reins","isr","inv","ifin","pbt","tax","pat","eps","cash","ta","tl","eq","re","icl","rca"];

export function lendingMetrics(f,i,shares){
  const m={};LENDING_KEYS.forEach(k=>m[k]=val(f,k,i));
  if(!ok(m.nii))m.nii=m.ii-m.ie;
  if(!ok(m.pat))m.pat=m.pbt-m.tax;
  Object.assign(m,{cti:m.opx/m.toi,roe:m.pat/m.eq,roa:m.pat/m.ta,ltd:m.loans/m.deps,credit:m.imp/m.loans,
    feeShare:m.fee/m.toi,niiTa:m.nii/m.ta,eqTa:m.eq/m.ta,otherInc:m.toi-m.nii-(ok(m.fee)?m.fee:0)});
  m.shares=shares?.[i]??(ok(m.eps)&&m.eps!==0?m.pat/m.eps:nan);
  m.bvps=m.eq/m.shares;
  return m;
}
export function insurerMetrics(f,i,shares,{general=false}={}){
  const m={};INSURER_KEYS.forEach(k=>m[k]=val(f,k,i));
  if(!ok(m.isr)&&[m.irev,m.ise,m.reins].every(ok))m.isr=m.irev-m.ise+m.reins;
  if(!ok(m.pat))m.pat=m.pbt-m.tax;
  Object.assign(m,{isrM:m.isr/m.irev,roe:m.pat/m.eq,roa:m.pat/m.ta,
    // SLFRS 17 combined ratio: only meaningful for general insurance
    combined:general&&ok(m.ise)&&ok(m.reins)?(m.ise-m.reins)/m.irev:nan});
  m.shares=shares?.[i]??(ok(m.eps)&&m.eps!==0?m.pat/m.eps:nan);
  m.bvps=m.eq/m.shares;
  return m;
}

// ---- Valuation for financial institutions --------------------------------------------------------
// Clean-surplus forecast: ROE moves linearly from today's ROE to the long-run ROE over the forecast,
// book value grows by retained earnings. Residual income and dividend discount use the same forecast.
//   d: {bv0, shares}   a: {coe, g, years, roe0, roeLong, payout}
export const FIN_MIN_SPREAD=0.005;
export function finValuation(d,a){
  const bad=reason=>({ri:nan,ddm:nan,riPerShare:nan,ddmPerShare:nan,justifiedPB:nan,invalid:reason});
  if(!(a.coe-a.g>=FIN_MIN_SPREAD))return bad("Cost of equity must be at least 0.5 pp above long-run growth");
  if(![d.bv0,a.coe,a.g,a.roe0,a.roeLong,a.payout].every(ok)||!(d.bv0>0))return bad("Book value, ROE and payout are needed");
  const N=Math.max(1,Math.round(a.years??5));let bv=d.bv0,pvRI=0,pvD=0;const years=[];
  for(let t=1;t<=N;t++){
    const roe=a.roe0+(a.roeLong-a.roe0)*t/N,earn=roe*bv,div=earn*a.payout,ri=(roe-a.coe)*bv,disc=Math.pow(1+a.coe,t);
    pvRI+=ri/disc;pvD+=div/disc;years.push({t,roe,bv,earn,div,ri});bv+=earn-div;
  }
  // terminal: from year N+1 earnings grow at g, so payout consistent with g is 1 - g/ROE_long
  const termPayout=a.roeLong>0?Math.max(0,1-a.g/a.roeLong):a.payout;
  const riN1=(a.roeLong-a.coe)*bv,dN1=a.roeLong*bv*termPayout,discN=Math.pow(1+a.coe,N);
  const ri=d.bv0+pvRI+riN1/(a.coe-a.g)/discN,ddm=pvD+dN1/(a.coe-a.g)/discN;
  const justifiedPB=(a.roeLong-a.g)/(a.coe-a.g);
  const ps=x=>ok(d.shares)&&d.shares>0?x/d.shares:nan;
  return{ri,ddm,riPerShare:ps(ri),ddmPerShare:ps(ddm),justifiedPB,termPayout,years};
}
