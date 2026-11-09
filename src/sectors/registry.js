// Sector profile registry: loads config/sector_profiles, resolves cross-sector references,
// validates the schema and suggests a sector from the report's own wording.
import {CROSS,PROFILES} from "./profiles.js";

export const ENGINES=["industrial","lending","insurer"];
export const VALUATION_METHODS={
  dcf_fcff:"Discounted cash flow (FCFF)",price_to_book:"Price / book",residual_income:"Residual income",dividend_discount:"Dividend discount",
  earnings_multiple:"Earnings multiple (P/E)",ev_ebitda:"EV / EBITDA",nav:"Net asset value",adjusted_nav:"Adjusted NAV (property at market value)",
  sum_of_parts:"Sum of the parts",single_consolidated_multiple:"Single consolidated multiple",dcf_fcff_without_property_data:"DCF without property-level data"};
// methods the engine can actually compute; the rest are shown as guidance only
export const COMPUTED_METHODS=new Set(["dcf_fcff","price_to_book","residual_income","dividend_discount","nav"]);
const CROSS_BY_ID=Object.fromEntries(CROSS.metrics.map(m=>[m.id,m]));

function resolve(p){
  const metrics=p.metrics.map(m=>m.ref?{...CROSS_BY_ID[m.ref],...m,id:m.ref,status:"derived",crossSector:true}:m);
  return{...p,metrics};
}
const BY_ID=Object.fromEntries(PROFILES.map(p=>[p.id,resolve(p)]));
export const SECTORS=PROFILES.map(p=>({id:p.id,name:p.display_name})).sort((a,b)=>a.name.localeCompare(b.name));
export const getProfile=id=>BY_ID[id]||null;
export function getBusinessModel(profile,bmId){return profile?.business_models.find(b=>b.id===bmId)||profile?.business_models[0]||null}
export const engineOf=(sectorId,bmId)=>getBusinessModel(getProfile(sectorId),bmId)?.engine||"industrial";
// metrics the user can enter from the report (operating / regulatory KPIs that are not on the statements)
export const entryMetrics=profile=>(profile?.metrics||[]).filter(m=>m.input==="entry");

// ---- schema validation (run by npm test) -------------------------------------------------------
const STATUS=new Set(["report_observed","candidate","derived"]);
export function validateProfiles(deriveIds){
  const errs=[];const seen=new Set();
  for(const raw of PROFILES){
    const p=BY_ID[raw.id],at=k=>`${raw.id}: ${k}`;
    if(seen.has(raw.id))errs.push(at("duplicate id"));seen.add(raw.id);
    for(const k of["id","display_name","version","verification","reference_report","business_models","sections_to_inspect","metrics","valuation_methods","cautions"])
      if(raw[k]==null)errs.push(at(`missing ${k}`));
    if(!/^\d+\.\d+\.\d+$/.test(raw.version||""))errs.push(at("version must be semver"));
    if(!raw.business_models?.length)errs.push(at("needs at least one business model"));
    for(const b of raw.business_models||[])if(!ENGINES.includes(b.engine))errs.push(at(`business model ${b.id}: unknown engine ${b.engine}`));
    const ids=new Set();
    for(const m of p.metrics){
      if(!m.id)errs.push(at("metric without id"));
      if(ids.has(m.id))errs.push(at(`duplicate metric ${m.id}`));ids.add(m.id);
      if(m.ref&&!CROSS_BY_ID[m.ref])errs.push(at(`unknown cross-sector ref ${m.ref}`));
      if(!m.label||!m.unit||!m.category)errs.push(at(`metric ${m.id}: label, unit and category are required`));
      if(!STATUS.has(m.status))errs.push(at(`metric ${m.id}: bad status ${m.status}`));
      if(m.calculation==="derived"&&!m.derive)errs.push(at(`metric ${m.id}: derived metric needs a derive id`));
      if(m.derive&&deriveIds&&!deriveIds.has(m.derive))errs.push(at(`metric ${m.id}: engine has no formula '${m.derive}'`));
      if(m.input!=="entry"&&m.calculation==="reported")errs.push(at(`metric ${m.id}: reported metrics must be entries`));
    }
    for(const c of raw.checks||[]){
      if(c.type!=="manual"&&!ids.has(c.metric))errs.push(at(`check ${c.id}: unknown metric ${c.metric}`));
      for(const pt of c.points||[])if(c.type!=="manual"&&!ids.has(pt))errs.push(at(`check ${c.id}: unknown point metric ${pt}`));
      if(c.fallback&&!ids.has(c.fallback))errs.push(at(`check ${c.id}: unknown fallback ${c.fallback}`));
    }
    for(const k of["preferred","conditional","avoid_as_default"])for(const v of raw.valuation_methods?.[k]||[])
      if(!VALUATION_METHODS[v])errs.push(at(`unknown valuation method ${v}`));
  }
  return errs;
}

// ---- sector suggestion ---------------------------------------------------------------------------
// Uses the report's own wording. Statement line items decide financial sectors; otherwise the
// company name and early pages give a hint. Always shown to the user to confirm.
const NAME_HINTS=[
  [/\bbank\b/i,"banks"],[/insurance|assurance|takaful/i,"insurance"],[/finance|leasing|credit|capital\b|investments?\b/i,"diversified_financials"],
  [/hotel|resort|leisure|travel/i,"consumer_services"],[/plantation|tea|rubber|coconut|estates?\b/i,"food_beverage_tobacco"],
  [/power|hydro|solar|energy|vidul|wind/i,"utilities"],[/\bgas\b|petroleum|oil\b|lubricant/i,"energy"],[/telecom|dialog|mobitel|axiata/i,"telecommunication_services"],
  [/hospital|healthcare|medical|surgical/i,"health_care"],[/property|properties|land|development company|realty|real estate/i,"real_estate"],
  [/shipping|logistics|transport|airline|aviation/i,"transportation"],[/tyre|motors?\b|automobile/i,"automobile_components"],
  [/supermarket|cargills|food city/i,"food_staples_retailing"],[/textile|apparel|garment/i,"consumer_durables_apparel"],
  [/print|packaging/i,"commercial_professional_services"],[/fertili[sz]er|chemical|cement|agri/i,"materials"]];

export function suggestSector(pages,companyName=""){
  const text=pages.map(p=>p.lines.join("\n")).join("\n");
  const has=re=>re.test(text);
  if(has(/^insurance revenue\b/im)&&has(/^insurance service (result|expenses?)/im))
    return{sector:"insurance",confidence:"high",evidence:"Statements show insurance revenue and insurance service result"};
  if(has(/^net interest income\b/im)&&has(/due to depositors|deposits? (from|due to) customers|customer deposits|due to customers/i)){
    const bank=/\bbank\b/i.test(companyName)||has(/licensed commercial bank|licensed specialised bank/i);
    return bank?{sector:"banks",confidence:"high",evidence:"Net interest income and customer deposits; described as a licensed bank"}
      :{sector:"diversified_financials",confidence:"medium",evidence:"Net interest income and customer deposits, but not described as a licensed bank"};
  }
  if(has(/^net interest income\b/im))return{sector:"diversified_financials",confidence:"medium",evidence:"Income statement starts from net interest income"};
  const early=pages.slice(0,15).map(p=>p.lines.join(" ")).join(" ");
  for(const[re,id]of NAME_HINTS)if(re.test(companyName))return{sector:id,confidence:"low",evidence:`Company name ("${companyName}")`};
  for(const[re,id]of NAME_HINTS.slice(3))if(re.test(early))return{sector:id,confidence:"low",evidence:"Wording on the opening pages"};
  return{sector:null,confidence:"none",evidence:"No clear sector signal; choose one"};
}
