// Rebuild text lines from pdf.js text items.
// Rows are grouped by baseline (tolerance scales with the font size) and ordered by x.
// Column-aware: if a page has a clear vertical gutter with worded rows on BOTH sides (two-column
// prose, or two tables side by side), each column is read top to bottom on its own so the two
// sides are never glued into one line. A normal statement table (labels left, numbers right) has
// a number-only right side, so it is never split.
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};
const WORDY=/[A-Za-z].*[A-Za-z].*[A-Za-z]/;
const text=items=>[...items].sort((a,b)=>a.x-b.x).map(i=>i.s.trim()).join(" ").replace(/\s+/g," ").trim();

function boxesOf(items){
  const out=[];
  for(const it of items){
    if(!it.str||!it.str.trim())continue;
    const h=Math.abs(it.height||it.transform?.[3]||10);
    const w=it.width>0?it.width:it.str.length*h*0.5;
    out.push({x:it.transform[4],y:it.transform[5],w,h,s:it.str});
  }
  return out;
}

function groupRows(boxes){
  const tol=Math.max(2.5,median(boxes.map(b=>b.h))*0.3);
  const rows=[];
  for(const b of [...boxes].sort((a,c)=>c.y-a.y)){
    const r=rows[rows.length-1];
    if(r&&Math.abs(r.y-b.y)<tol)r.items.push(b);else rows.push({y:b.y,items:[b]});
  }
  return rows;
}

// x position of the widest band in the middle half of the page that (almost) no row crosses.
export function findGutter(rows){
  if(rows.length<6)return null;
  const boxes=rows.flatMap(r=>r.items);
  const minX=Math.min(...boxes.map(b=>b.x)),maxX=Math.max(...boxes.map(b=>b.x+b.w)),W=maxX-minX;
  if(!(W>0))return null;
  const N=200,crossed=new Array(N).fill(0);
  for(const r of rows){
    const hit=new Uint8Array(N);
    for(const b of r.items){
      const a=Math.max(0,Math.floor((b.x-minX)/W*N)),z=Math.min(N-1,Math.floor((b.x+b.w-minX)/W*N));
      for(let i=a;i<=z;i++)hit[i]=1;
    }
    for(let i=0;i<N;i++)crossed[i]+=hit[i];
  }
  const limit=Math.max(1,rows.length*0.08),lo=Math.floor(N*0.25),hi=Math.ceil(N*0.75);
  let best=null;
  for(let i=lo;i<hi;){
    if(crossed[i]>limit){i++;continue}
    let j=i;while(j<hi&&crossed[j]<=limit)j++;
    if(!best||j-i>best.len)best={start:i,len:j-i};
    i=j;
  }
  if(!best||best.len<N*0.015)return null;
  return minX+(best.start+best.len/2)/N*W;
}

function splitColumns(rows,gx){
  const out=rows.map(r=>r.items.some(b=>b.x<gx&&b.x+b.w>gx)
    ?{span:true,items:r.items}
    :{span:false,L:r.items.filter(b=>b.x+b.w<=gx),R:r.items.filter(b=>b.x>=gx)});
  const side=k=>out.filter(o=>!o.span&&o[k].length);
  const wordy=k=>{const s=side(k);return s.length?s.filter(o=>WORDY.test(text(o[k]))).length/s.length:0};
  if(side("L").length<5||side("R").length<5||wordy("L")<0.5||wordy("R")<0.5)return null;
  return out;
}

export function linesFromItems(items){
  const rows=groupRows(boxesOf(items));
  const gx=findGutter(rows),cols=gx!=null&&splitColumns(rows,gx);
  if(!cols)return rows.map(r=>text(r.items)).filter(Boolean);
  // Full-width rows (titles, headings) stay in place; between them, left column first, then right.
  const lines=[];let L=[],R=[];
  const flush=()=>{lines.push(...L,...R);L=[];R=[]};
  for(const o of cols){
    if(o.span){flush();lines.push(text(o.items))}
    else{if(o.L.length)L.push(text(o.L));if(o.R.length)R.push(text(o.R))}
  }
  flush();
  return lines.filter(Boolean);
}
