// Formula registry: profile metrics name a `derive` id; this maps it to a calculation per engine.
// Each formula returns {cur, prev}. NaN means "cannot be calculated from the available facts".
// Ids listed in DIRECT are statement line items: shown as "reported" with their source page.
const ok=Number.isFinite,nan=NaN;
const pair=(c,p,fn)=>({cur:fn(c),prev:fn(p)});
const growth=k=>(c,p)=>({cur:p[k]>0?c[k]/p[k]-1:nan,prev:nan});
const field=k=>(c,p)=>pair(c,p,m=>m[k]);

const INDUSTRIAL={
  revenue_growth:growth("rev"),gross_margin:field("gm"),operating_margin:field("om"),ebitda_margin:field("em"),
  cfo_to_pat:field("conv"),capex_to_revenue:(c,p)=>pair(c,p,m=>m.capex/m.rev),payout_ratio:(c,p)=>pair(c,p,m=>m.div/m.pat),
  lease_liabilities:field("lease"),
  // net cash has no meaningful multiple: shown as the text "Net cash" instead of a number
  net_debt_to_ebitda:(c,p)=>{const f=m=>!ok(m.nd)?nan:m.nd<=0?nan:m.ebitda>0?m.nd/m.ebitda:nan,t=m=>ok(m.nd)&&m.nd<=0?"Net cash":ok(m.nd)&&!(m.ebitda>0)?"EBITDA not positive":null;
    return{cur:f(c),prev:f(p),curText:t(c),prevText:t(p)}},
  interest_cover:field("cov"),current_ratio:field("cr"),
  inventory_days:field("dio"),receivable_days:field("dso"),payable_days:field("dpo"),cash_conversion_cycle:field("ccc"),
  roe:field("roe"),roce:field("roce"),nav_per_share:(c,p)=>pair(c,p,m=>m.eq/m.shares)};
const LENDING={
  gross_income:field("gi"),nii:field("nii"),interest_income:field("ii"),interest_expense:field("ie"),net_fee_income:field("fee"),toi:field("toi"),
  fee_share:field("feeShare"),impairment:field("imp"),credit_cost:field("credit"),opex:field("opx"),cost_to_income:field("cti"),
  nii_to_assets:field("niiTa"),roa:field("roa"),roe:field("roe"),loans:field("loans"),loan_growth:growth("loans"),
  deposits:field("deps"),deposit_growth:growth("deps"),loan_to_deposit:field("ltd"),bvps:field("bvps"),eps:field("eps")};
const INSURER={
  insurance_revenue:field("irev"),insurance_revenue_growth:growth("irev"),isr:field("isr"),isr_margin:field("isrM"),
  reinsurance_net:field("reins"),combined_ratio:field("combined"),investment_income:field("inv"),insurance_finance:field("ifin"),
  icl:field("icl"),roe:field("roe"),roa:field("roa"),bvps:field("bvps"),eps:field("eps")};
export const FORMULAS={industrial:INDUSTRIAL,lending:LENDING,insurer:INSURER};
// formulas over user-entered KPIs (values already converted: percent as a fraction)
export const ENTRY_FORMULAS={
  revpar:k=>({cur:k.occupancy_rate?.cur*k.adr?.cur,prev:k.occupancy_rate?.prev*k.adr?.prev}),
  capacity_factor:k=>{const f=w=>k.generation_gwh?.[w]*1000/(k.installed_capacity_mw?.[w]*8760);return{cur:f("cur"),prev:f("prev")}}};
export const DIRECT={gross_income:"gi",nii:"nii",interest_income:"ii",interest_expense:"ie",net_fee_income:"fee",toi:"toi",impairment:"imp",opex:"opx",
  loans:"loans",deposits:"deps",eps:"eps",insurance_revenue:"irev",isr:"isr",reinsurance_net:"reins",investment_income:"inv",insurance_finance:"ifin",icl:"icl",lease_liabilities:"lease"};
export const ALL_DERIVE_IDS=new Set([...Object.values(FORMULAS).flatMap(Object.keys),...Object.keys(ENTRY_FORMULAS)]);
