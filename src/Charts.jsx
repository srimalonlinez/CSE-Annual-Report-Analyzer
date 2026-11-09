// Dependency-free SVG charts. Colours come from theme variables so they follow light/dark.
export const nf=(v,d=0)=>v==null||!Number.isFinite(v)?"n/a":v.toLocaleString("en",{maximumFractionDigits:d,minimumFractionDigits:d});
export const pctF=v=>v==null||!Number.isFinite(v)?"n/a":(v*100).toFixed(1)+"%";
const cut=(s,n)=>s.length>n?s.slice(0,n-1)+"…":s;
const Dot=({c,t})=><span className="lg"><i style={{background:c}}/>{t}</span>;
function Fig({title,sub,legend,children}){
  return <figure className="chart"><figcaption><b>{title}</b>{sub&&<span>{sub}</span>}</figcaption>{legend}{children}</figure>;
}

// Bars: last year in grey, this year in the accent colour, value on every bar.
export function GroupedBars({title,sub,data,fmt=nf}){
  const rows=(data||[]).filter(d=>d.cur!=null||d.prev!=null);if(!rows.length)return null;
  const W=520,H=250,L=14,R=14,T=26,B=40;
  const vals=rows.flatMap(d=>[d.prev,d.cur]).filter(v=>v!=null);
  const mx=Math.max(0,...vals),mn=Math.min(0,...vals),span=(mx-mn)||1;
  const y=v=>T+(mx-v)/span*(H-T-B),y0=y(0),gw=(W-L-R)/rows.length,bw=Math.min(40,gw*.34);
  return <Fig title={title} sub={sub} legend={<><Dot c="var(--chart-prev)" t="Last year"/><Dot c="var(--acc)" t="This year"/></>}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
      <line x1={L} x2={W-R} y1={y0} y2={y0} stroke="var(--line)"/>
      {rows.map((d,i)=>{const cx=L+gw*i+gw/2;return <g key={d.label}>
        {[["prev",-1,"var(--chart-prev)","Last year"],["cur",1,"var(--acc)","This year"]].map(([k,s,col,nm])=>d[k]==null?null:
          <g key={k}><rect x={cx+(s<0?-bw-2:2)} y={Math.min(y(d[k]),y0)} width={bw} height={Math.max(Math.abs(y(d[k])-y0),1)} rx="3" fill={col}><title>{`${d.label}, ${nm}: ${fmt(d[k])}`}</title></rect>
          <text x={cx+(s<0?-bw/2-2:bw/2+2)} y={d[k]>=0?y(d[k])-6:y(d[k])+15} textAnchor="middle" fontSize="11.5" fill="var(--ink)">{fmt(d[k])}</text></g>)}
        <text x={cx} y={H-14} textAnchor="middle" fontSize="12" fill="var(--mut)">{d.label}</text></g>})}
    </svg></Fig>;
}

// Donut / pie with a legend that carries the numbers.
export function Donut({title,sub,parts,center}){
  const P=parts.filter(p=>p.value>0),tot=P.reduce((a,p)=>a+p.value,0);if(!tot)return null;
  const r=62,C=2*Math.PI*r;let off=0;
  return <Fig title={title} sub={sub}><div className="dn">
    <svg viewBox="0 0 180 180" role="img" aria-label={title}>
      <g transform="rotate(-90 90 90)">{P.map(p=>{const len=p.value/tot*C,el=<circle key={p.label} cx="90" cy="90" r={r} fill="none" stroke={p.color} strokeWidth="26" strokeDasharray={`${Math.max(len-1.5,.1)} ${C}`} strokeDashoffset={-off}><title>{`${p.label}: ${p.text??p.value}`}</title></circle>;off+=len;return el})}</g>
      {center&&<><text x="90" y="90" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--ink)">{center.big}</text><text x="90" y="108" textAnchor="middle" fontSize="11" fill="var(--mut)">{center.small}</text></>}
    </svg>
    <ul className="lgv">{parts.map(p=><li key={p.label}><i style={{background:p.color}}/>{p.label}<b>{p.text??p.value}</b></li>)}</ul></div></Fig>;
}

// Horizontal waterfall: start total, signed steps, end total. Green up, red down, totals grey.
export function Waterfall({title,sub,start,end,steps,fmt=nf}){
  if(start==null||end==null)return null;
  const rows=[{label:"Profit last year",from:0,to:start,k:"t"}];let run=start;
  (steps||[]).forEach(s=>{rows.push({label:s.driver,from:run,to:run+s.delta,k:s.delta>=0?"up":"dn",d:s.delta});run+=s.delta});
  rows.push({label:"Profit this year",from:0,to:end,k:"t"});
  const all=rows.flatMap(r=>[r.from,r.to]),mn=Math.min(0,...all),mx=Math.max(0,...all),LW=190,W=620,RH=32,H=rows.length*RH+8;
  const x=v=>LW+(v-mn)/((mx-mn)||1)*(W-LW-74);
  return <Fig title={title} sub={sub} legend={<><Dot c="var(--g)" t="Raises profit"/><Dot c="var(--r)" t="Lowers profit"/><Dot c="var(--chart-prev)" t="Total"/></>}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
      <line x1={x(0)} x2={x(0)} y1="0" y2={H} stroke="var(--line)"/>
      {rows.map((r,i)=>{const a=Math.min(x(r.from),x(r.to)),w=Math.max(Math.abs(x(r.to)-x(r.from)),2),y=i*RH+4,val=r.k==="t"?r.to:r.d;
        return <g key={i}><text x={LW-10} y={y+17} textAnchor="end" fontSize="12.5" fill="var(--ink)">{cut(r.label,28)}<title>{r.label}</title></text>
          <rect x={a} y={y+4} width={w} height={20} rx="3" fill={r.k==="t"?"var(--chart-prev)":r.k==="up"?"var(--g)":"var(--r)"} fillOpacity={r.k==="t"?1:.85}><title>{`${r.label}: ${fmt(val)}`}</title></rect>
          <text x={a+w+6} y={y+18} fontSize="12" fill="var(--ink)">{(r.k!=="t"&&val>0?"+":"")+fmt(val)}</text></g>})}
    </svg></Fig>;
}

// Piotroski: nine tests as green/red tiles.
export function Piotroski({score,tests}){
  return <Fig title={`Piotroski F-score: ${score} of 9`} sub="Nine yes/no tests of profitability, leverage and efficiency. 7 or more is strong, 3 or fewer weak.">
    <div className="seg" role="img" aria-label={`${score} of 9 tests passed`}>{tests.map((t,i)=><span key={i} className={t.pass?"ok":"no"} title={t.name}>{t.pass?"✓":"✕"}</span>)}</div>
    <ul className="tl">{tests.map((t,i)=><li key={i} className={t.pass?"ok":"no"}>{t.name}</li>)}</ul></Fig>;
}

// Altman Z on a distress / grey / safe band with a marker.
export function ZBand({a}){
  if(a?.z==null)return null;
  const W=520,H=104,max=Math.max(8,a.z*1.15),x=v=>20+Math.min(v,max)/max*480,m=x(a.z);
  return <Fig title={`Altman Z-score: ${nf(a.z,1)}`} sub={`Model: ${a.kind}`}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Altman Z ${nf(a.z,1)}`}>
      <rect x={x(0)} y="44" width={x(a.lo)-x(0)} height="20" fill="var(--r)" fillOpacity=".55"/>
      <rect x={x(a.lo)} y="44" width={x(a.hi)-x(a.lo)} height="20" fill="var(--chart-prev)"/>
      <rect x={x(a.hi)} y="44" width={x(max)-x(a.hi)} height="20" fill="var(--g)" fillOpacity=".55"/>
      <path d={`M${m} 40 l-7 -12 h14 z`} fill="var(--ink)"/><text x={m} y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)">{nf(a.z,1)}</text>
      <text x={(x(0)+x(a.lo))/2} y="84" textAnchor="middle" fontSize="11.5" fill="var(--mut)">Distress</text>
      <text x={(x(a.lo)+x(a.hi))/2} y="84" textAnchor="middle" fontSize="11.5" fill="var(--mut)">Grey</text>
      <text x={(x(a.hi)+x(max))/2} y="84" textAnchor="middle" fontSize="11.5" fill="var(--mut)">Safe</text>
    </svg></Fig>;
}

// Scenario bars with the share price as a reference line.
export function RefBars({title,sub,data,refLine,fmt=v=>nf(v,2)}){
  const rows=data.filter(d=>Number.isFinite(d.value));if(!rows.length)return null;
  const W=520,H=240,T=24,B=40,vals=rows.map(d=>d.value).concat(refLine?[refLine.value]:[]),mx=Math.max(...vals,0),mn=Math.min(...vals,0),span=(mx-mn)||1;
  const y=v=>T+(mx-v)/span*(H-T-B),gw=(W-40)/rows.length,bw=Math.min(70,gw*.5);
  return <Fig title={title} sub={sub}><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
    <line x1="20" x2={W-20} y1={y(0)} y2={y(0)} stroke="var(--line)"/>
    {rows.map((d,i)=>{const cx=20+gw*i+gw/2;return <g key={d.label}><rect x={cx-bw/2} y={Math.min(y(d.value),y(0))} width={bw} height={Math.max(Math.abs(y(d.value)-y(0)),1)} rx="3" fill={d.accent?"var(--acc)":"var(--chart-prev)"}><title>{`${d.label}: ${fmt(d.value)}`}</title></rect>
      <text x={cx} y={y(d.value)-6} textAnchor="middle" fontSize="12" fill="var(--ink)">{fmt(d.value)}</text>
      <text x={cx} y={H-14} textAnchor="middle" fontSize="12" fill="var(--mut)">{d.label}</text></g>})}
    {refLine&&<g><line x1="20" x2={W-20} y1={y(refLine.value)} y2={y(refLine.value)} stroke="var(--ink)" strokeDasharray="5 4"/><text x={W-22} y={y(refLine.value)-5} textAnchor="end" fontSize="11.5" fill="var(--ink)">{refLine.label}</text></g>}
  </svg></Fig>;
}
