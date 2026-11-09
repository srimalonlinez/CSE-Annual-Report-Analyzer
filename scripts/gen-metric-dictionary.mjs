// Generates docs/research/cse-sector-metric-dictionary.md from config/sector_profiles.
// Run: node scripts/gen-metric-dictionary.mjs   (npm test fails if the committed file is out of date)
import fs from "node:fs";
import {CROSS,PROFILES} from "../src/sectors/profiles.js";
import {getProfile,VALUATION_METHODS} from "../src/sectors/registry.js";
import {DIRECT} from "../src/engine/derive.js";

const UNIT={percent:"%",currency_mn:"Rs. Mn",currency:"Rs.",per_share:"Rs. per share",ratio:"x (times)",days:"days",count:"count",text:"text"};
const CALC=m=>m.input==="entry"?"Reported: typed from the report with a page reference":DIRECT[m.derive]?"Reported: statement line item":"Derived";
const esc=s=>String(s??"").replace(/\|/g,"\\|");
export function buildDictionary(){
  const out=[];const L=s=>out.push(s);
  L("# CSE sector metric dictionary");
  L("");L("_Generated from `config/sector_profiles/` by `scripts/gen-metric-dictionary.mjs`. Do not edit by hand._");
  L("");L("## Rules that apply to every metric");
  L("- **Missing stays missing.** A metric with no reported value or no complete inputs is shown as *not found*, never as zero and never estimated.");
  L("- **Reported** = a statement line item read from the PDF, or a value typed from the report with its page number. **Derived** = calculated with the formula listed.");
  L("- **Period:** current and prior financial year as presented in the same report. Growth metrics need both years.");
  L("- **Scope:** Group (consolidated) unless the user selects Company / Bank figures. Values from different scopes are not mixed.");
  L("- **Units:** currency in Rs. millions after unit detection; per-share values in rupees; percentages entered as typed (4.5 = 4.5%).");
  L("- **Status in the profile:** `report_observed` = the catalogue describes the reference report as disclosing it; `candidate` = relevant but not confirmed in the reference report; `derived` = cross-sector formula.");
  L("- Profiles are **unverified** until checked against their reference PDF.");
  L("");L("## Cross-sector derived metrics");L("");
  L("| Id | Metric | Unit | Formula |");L("|---|---|---|---|");
  for(const m of CROSS.metrics)L(`| \`${m.id}\` | ${esc(m.label)} | ${UNIT[m.unit]||m.unit} | ${esc(m.formula)} |`);
  for(const raw of [...PROFILES].sort((a,b)=>a.display_name.localeCompare(b.display_name))){
    const p=getProfile(raw.id);
    L("");L(`## ${p.display_name}`);
    L("");L(`Profile \`${p.id}\` v${p.version} · ${p.verification.status} · reference: ${p.reference_report.company} (${p.reference_report.file}, ${p.reference_report.period})`);
    L("");L(`Business models: ${p.business_models.map(b=>`${b.label} (${b.engine})`).join("; ")}.`);
    L("");L("| Id | Metric | Category | Profile status | Calculation | Unit | Formula / inputs | Applies when |");L("|---|---|---|---|---|---|---|---|");
    for(const m of p.metrics)L(`| \`${m.id}\` | ${esc(m.label)} | ${m.category} | ${m.status} | ${CALC(m)} | ${UNIT[m.unit]||m.unit} | ${esc(m.formula||(m.inputs?m.inputs.join(", "):m.derive&&DIRECT[m.derive]?`statement field \`${DIRECT[m.derive]}\``:""))} | ${esc(m.applies_when||"")} |`);
    if(p.checks?.length){L("");L("Checks:");for(const c of p.checks)L(`- **${c.title}**${c.type==="manual"?" (manual review)":`: \`${c.metric}\`, ${c.type}, ${c.direction.replace("_"," ")}, watch ${c.watch}, concern ${c.concern}${c.fallback?`; falls back to \`${c.fallback}\``:""}`}`)}
    const v=p.valuation_methods;L("");L(`Valuation: preferred ${v.preferred.map(k=>VALUATION_METHODS[k]).join(", ")||"-"}; conditional ${v.conditional.map(k=>VALUATION_METHODS[k]).join(", ")||"-"}; not as default ${v.avoid_as_default.map(k=>VALUATION_METHODS[k]).join(", ")||"-"}.`);
    if(p.prohibited_generic_metrics?.length){L("");L(`Not used as primary indicators: ${p.prohibited_generic_metrics.map(x=>`\`${x}\``).join(", ")}.`)}
  }
  return out.join("\n")+"\n";
}
if(import.meta.url===`file:///${process.argv[1].replace(/\\/g,"/")}`||process.argv[1]?.endsWith("gen-metric-dictionary.mjs")){
  fs.mkdirSync("docs/research",{recursive:true});
  fs.writeFileSync("docs/research/cse-sector-metric-dictionary.md",buildDictionary());
  console.log("wrote docs/research/cse-sector-metric-dictionary.md");
}
