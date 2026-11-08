// Rebuild text lines from pdf.js text items (group by y, order by x).
export function linesFromItems(items){
  const rows=[];
  for(const it of items){
    if(!it.str||!it.str.trim())continue;
    const y=it.transform[5],x=it.transform[4];
    let r=rows.find(r=>Math.abs(r.y-y)<2.5);
    if(!r){r={y,items:[]};rows.push(r)}
    r.items.push({x,s:it.str});
  }
  rows.sort((a,b)=>b.y-a.y);
  return rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.s.trim()).join(" ").replace(/\s+/g," ").trim());
}
