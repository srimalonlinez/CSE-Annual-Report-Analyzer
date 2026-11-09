// Builds a real A4 PDF from the report data: selectable text, tables and vector charts.
// Always light theme, independent of the page. jsPDF is loaded only when the user asks for the PDF.
import {dcf} from "./engine/analyze.js";
import {finValuation} from "./engine/financials.js";

const C={ink:[20,27,38],mut:[93,104,119],line:[219,224,231],soft:[244,246,249],acc:[35,71,214],accb:[232,237,255],prev:[174,184,196],
  g:[22,119,74],gb:[225,243,233],a:[168,100,0],ab:[252,239,214],r:[179,38,30],rb:[251,227,225],white:[255,255,255]};
const STATUS={healthy:["Healthy",C.g,C.gb],watch:["Watch",C.a,C.ab],concern:["Concern",C.r,C.rb],unknown:["Manual review",C.mut,C.soft],not_detected:["Not detected",C.mut,C.soft]};
const ok=Number.isFinite;
const nf=(v,d=0)=>v==null||!ok(v)?"n/a":v.toLocaleString("en",{maximumFractionDigits:d,minimumFractionDigits:d});
const pct=v=>v==null||!ok(v)?"n/a":(v*100).toFixed(1)+"%";
// The standard PDF fonts only cover Latin-1: map the few typographic characters the report uses.
const clean=s=>String(s??"").replace(/[−–—]/g,"-").replace(/×/g,"x").replace(/÷/g,"/").replace(/▲/g,"+").replace(/▼/g,"-")
  .replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/≥/g,">=").replace(/≤/g,"<=").replace(/…/g,"...").replace(/[^\x00-\xFF]/g,"");
const cut=(s,n)=>s.length>n?s.slice(0,n-1)+".":s;

export async function downloadReportPdf(r,{assumptions,finAssumptions,labels={},raw=false}={}){
  const [J,A]=await Promise.all([import("jspdf"),import("jspdf-autotable")]);
  // the browser bundle and Node expose these modules slightly differently
  const jsPDF=J.jsPDF??J.default?.jsPDF??J.default,autoTable=[A.default,A.default?.default,A.autoTable].find(f=>typeof f==="function");
  const doc=new jsPDF({unit:"pt",format:"a4"});
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=40,CW=W-2*M,BOTTOM=H-48;
  let y=M;
  const font=(size,bold=false,color=C.ink)=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);doc.setTextColor(...color)};
  const ensure=h=>{if(y+h>BOTTOM){doc.addPage();y=M}};
  const para=(s,{size=9.5,bold=false,color=C.ink,x=M,width=CW,gap=5}={})=>{
    font(size,bold,color);const lines=doc.splitTextToSize(clean(s),width),lh=size*1.32;
    for(const l of lines){ensure(lh);doc.text(l,x,y+size);y+=lh}y+=gap;
  };
  // Headings are kept with the first block that follows them (keep = that block's height).
  const heading=(s,keep=40)=>{ensure(42+Math.min(keep,BOTTOM-M-42));y+=10;font(14,true);doc.text(clean(s),M,y+14);y+=20;doc.setDrawColor(...C.acc);doc.setLineWidth(1.5);doc.line(M,y,M+36,y);y+=12};
  const sub=(s,keep=24)=>{ensure(20+Math.min(keep,BOTTOM-M-20));y+=4;font(10.5,true);doc.text(clean(s),M,y+10);y+=16};
  const pill=(label,fg,bg,x,yy)=>{font(7.5,true,fg);const w=doc.getTextWidth(label)+12;doc.setFillColor(...bg);doc.roundedRect(x,yy,w,12,6,6,"F");doc.text(label,x+6,yy+8.6);return w};
  const bulletsH=items=>{font(9.5);return (items||[]).reduce((a,t)=>a+doc.splitTextToSize(clean(t),CW-16).length*12.5+3,0)+4};
  const bullets=(items,{color=C.ink,numbered=false}={})=>{(items||[]).forEach((t,i)=>{
    font(9.5,false,color);const lines=doc.splitTextToSize(clean(t),CW-16),lh=12.5;ensure(lines.length*lh+2);
    if(numbered){font(9.5,true,C.mut);doc.text(`${i+1}.`,M,y+9.5);font(9.5,false,color)}else{doc.setFillColor(...C.mut);doc.circle(M+4,y+6.3,1.6,"F")}
    lines.forEach((l,k)=>doc.text(l,M+16,y+9.5+k*lh));y+=lines.length*lh+3});y+=4};
  // Small tables are kept on one page; long ones split between rows and repeat the header.
  const tableH=rows=>(rows+1)*18.6+12;
  const table=(opts)=>{const h=tableH(opts.body.length);if(h<BOTTOM-M)ensure(h);
    autoTable(doc,{startY:y,margin:{left:M,right:M,bottom:H-BOTTOM+8,top:M},theme:"grid",rowPageBreak:"avoid",showHead:"everyPage",
    styles:{font:"helvetica",fontSize:8.8,cellPadding:4,textColor:C.ink,lineColor:C.line,lineWidth:.5},
    headStyles:{fillColor:C.soft,textColor:C.mut,fontStyle:"bold"},...opts,
    head:opts.head?.map(r=>r.map(clean)),body:opts.body.map(r=>r.map(c=>typeof c==="object"&&c!==null?{...c,content:clean(c.content)}:clean(c)))});
    y=doc.lastAutoTable.finalY+12};
  // Tile cards, same layout as the web report: label, large value, coloured change, "was" last year.
  const TG=8;
  const chgOf=t=>t.dir&&t.chg!=="n/a"?clean(t.chg).replace("-",""):"",wasOf=t=>t.sub!=null?clean(t.sub):`was ${clean(t.prev)}`;
  const chgW=(t,cs)=>{const c=chgOf(t);font(cs,true);const w=c?doc.getTextWidth(c)+cs*.75+6:0;font(cs);return w+doc.getTextWidth(wasOf(t))};
  const wraps=(t,tw)=>chgW(t,7.5)>tw-16;   // too wide on one line: "was ..." goes on a second line
  const tileRowH=(row,tw)=>{font(7.8);const nL=Math.max(...row.map(t=>Math.min(2,doc.splitTextToSize(clean(t.label),tw-16).length)));
    return 8+nL*9.5+19+13+8+(row.some(t=>wraps(t,tw))?10:0)};
  const tiles=(items,cols)=>{
    const tw=(CW-TG*(cols-1))/cols;
    // keep the whole grid on one page when it fits on a page
    let total=0;for(let i=0;i<items.length;i+=cols)total+=tileRowH(items.slice(i,i+cols),tw)+TG;
    if(total<BOTTOM-M)ensure(total);
    for(let i=0;i<items.length;i+=cols){
      const row=items.slice(i,i+cols),th=tileRowH(row,tw);ensure(th+TG);
      row.forEach((t,k)=>{
        const x=M+k*(tw+TG);doc.setFillColor(...C.soft);doc.roundedRect(x,y,tw,th,5,5,"F");
        font(7.8,false,C.mut);const ll=doc.splitTextToSize(clean(t.label),tw-16).slice(0,2);ll.forEach((l,j)=>doc.text(l,x+8,y+15+j*9.5));
        const nL=Math.max(...row.map(q=>{font(7.8);return Math.min(2,doc.splitTextToSize(clean(q.label),tw-16).length)}));
        const vy=y+8+nL*9.5+17;let vs=15;font(vs,true);const v=clean(t.cur);
        while(doc.getTextWidth(v)>tw-16&&vs>8){vs-=.5;font(vs,true)}doc.text(v,x+8,vy);
        // change line
        const cy=vy+14,col=t.trend==="better"?C.g:t.trend==="worse"?C.r:C.mut;let cs=7.5,cx=x+8;
        const chg=chgOf(t),was=wasOf(t),two=wraps(t,tw);
        if(two){font(cs);while(doc.getTextWidth(was)>tw-16&&cs>6)cs-=.25}
        if(chg){doc.setFillColor(...col);const a=cs*.75;
          if(t.dir==="up")doc.triangle(cx,cy-.5,cx+a,cy-.5,cx+a/2,cy-a,"F");else doc.triangle(cx,cy-a,cx+a,cy-a,cx+a/2,cy-.5,"F");
          cx+=a+3;font(cs,true,col);doc.text(chg,cx,cy);cx+=doc.getTextWidth(chg)+3}
        font(cs,false,C.mut);if(two)doc.text(was,x+8,cy+10);else doc.text(was,cx,cy);
      });
      y+=th+TG;
    }
    y+=6;
  };
  const tilesFirstRowH=(items,cols)=>tileRowH(items.slice(0,cols),(CW-TG*(cols-1))/cols);
  const box=(x,yy,w,h,title,subtitle)=>{doc.setDrawColor(...C.line);doc.setLineWidth(.6);doc.roundedRect(x,yy,w,h,6,6,"S");
    font(9.5,true);doc.text(clean(cut(title,58)),x+10,yy+16);if(subtitle){font(7.5,false,C.mut);doc.text(clean(cut(subtitle,80)),x+10,yy+27)}};
  const legend=(x,yy,items)=>{let cx=x;for(const[label,col]of items){doc.setFillColor(...col);doc.rect(cx,yy-6,7,7,"F");font(7.5,false,C.mut);doc.text(label,cx+10,yy);cx+=doc.getTextWidth(label)+22}};

  // Grouped bars: last year grey, this year accent.
  const bars=(x,yy,w,h,title,data,fmt)=>{
    box(x,yy,w,h,title);legend(x+10,yy+32,[["Last year",C.prev],["This year",C.acc]]);
    const rows=(data||[]).filter(d=>d.cur!=null||d.prev!=null);
    if(!rows.length){font(8.5,false,C.mut);doc.text("No data",x+10,yy+60);return}
    const vals=rows.flatMap(d=>[d.prev,d.cur]).filter(v=>v!=null),top=yy+50,bot=yy+h-(Math.min(...vals)<0?36:24);
    const mx=Math.max(0,...vals),mn=Math.min(0,...vals),span=(mx-mn)||1,Y=v=>top+(mx-v)/span*(bot-top),y0=Y(0);
    const gw=(w-20)/rows.length,bw=Math.min(20,gw*.32);
    doc.setDrawColor(...C.line);doc.setLineWidth(.6);doc.line(x+10,y0,x+w-10,y0);
    rows.forEach((d,i)=>{const cx=x+10+gw*i+gw/2;
      [["prev",-1,C.prev],["cur",1,C.acc]].forEach(([k,s,col])=>{if(d[k]==null)return;
        const bx=s<0?cx-bw-1:cx+1,by=Math.min(Y(d[k]),y0),bh=Math.max(Math.abs(Y(d[k])-y0),.8);
        doc.setFillColor(...col);doc.rect(bx,by,bw,bh,"F");
        const lab=clean(fmt(d[k]));let fs=6.5;font(fs);while(doc.getTextWidth(lab)>gw/2-3&&fs>4.5){fs-=.25;font(fs)}
        doc.text(lab,bx+bw/2,d[k]>=0?by-3:by+bh+8,{align:"center"})});
      font(7.5,false,C.mut);doc.text(clean(cut(d.label,18)),cx,yy+h-10,{align:"center"})});
  };

  const V2=r.version===2;
  const company=(V2?r.identity?.company||r.company:r.company)||"Annual report",period=(V2?r.identity?.period||r.period:r.period)?` · ${V2?r.identity?.period||r.period:r.period}`:"";
  const ch=r.charts||{},half=(CW-12)/2,CH=170,none=a=>a?.length?a:["None flagged"],P=x=>(x*100).toFixed(1)+"%";
  const withTrend=list=>(list||[]).map(m=>{
    // reports saved before trend/dir existed: derive them from the change text
    const dir=m.dir!==undefined?m.dir:m.chg==="n/a"?null:m.chg.startsWith("-")?"down":"up";
    const trend=m.trend!==undefined?m.trend:dir&&((m.label==="Net debt")===(dir==="up")?"worse":"better");
    return{...m,dir,trend}});
  const checkH=c=>18+bulletsH(c.points);

  // ---- sections ---------------------------------------------------------------------------------
  function cover(){
    doc.setFillColor(...C.acc);doc.rect(0,0,W,6,"F");
    font(8.5,true,C.acc);doc.text(V2?`${clean(r.identity.sector.name).toUpperCase()} · ANNUAL REPORT ANALYSIS`:"ANNUAL REPORT ANALYSIS",M,y+8);y+=18;
    font(22,true);for(const l of doc.splitTextToSize(clean(company+period),CW)){doc.text(l,M,y+20);y+=26}
    const scope=V2?(r.identity.scope==="company"?"Company / Bank figures":"Group figures"):"Group figures";
    font(9,false,C.mut);doc.text(clean(`Generated ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} · Amounts in Rs. millions, ${scope}`),M,y+8);y+=22;
    const S=ch.status||{},parts=[["healthy",S.healthy],["watch",S.watch],["concern",S.concern],["unknown",S.manual],...(V2?[]:[["not_detected",S.notDetected]])].filter(p=>p[1]>0);
    const total=parts.reduce((a,p)=>a+p[1],0)||1;let sx=M;
    parts.forEach(([k,v])=>{const w=CW*v/total;doc.setFillColor(...STATUS[k][1]);doc.rect(sx,y,w-1.5,10,"F");sx+=w});y+=20;
    let lx=M;parts.forEach(([k,v])=>{lx+=pill(`${v} ${STATUS[k][0]}`,STATUS[k][1],STATUS[k][2],lx,y)+6});y+=22;
    para(r.verdict,{size:10.5});
    doc.setFillColor(...C.accb);const noteLines=doc.splitTextToSize("Analytical tool, not investment advice. Figures are read from the PDF by rules or typed from the report with a page reference, and every ratio uses a documented formula; nothing is generated by AI. Check numbers against the report.",CW-20);
    ensure(noteLines.length*11+14);doc.rect(M,y,CW,noteLines.length*11+12,"F");doc.setFillColor(...C.acc);doc.rect(M,y,3,noteLines.length*11+12,"F");
    font(8.5,false,C.ink);noteLines.forEach((l,i)=>doc.text(l,M+12,y+14+i*11));y+=noteLines.length*11+22;
  }
  function identity(){
    const id=r.identity;
    const rows=[["Sector",`${id.sector.name} (profile v${id.sector.version}${id.sector.verified?"":", not yet verified against its reference report"})`],["Business model",id.businessModel.label],
      ["Report type",id.reportType||"not stated"],["Reporting period",id.period||"not stated"],["Figures used",id.scope==="company"?"Company / Bank":"Group (consolidated)"],["Units",id.unit]];
    heading("Document identity",tableH(rows.length));
    table({body:rows,columnStyles:{0:{cellWidth:130,fontStyle:"bold",textColor:C.mut}},theme:"plain",styles:{font:"helvetica",fontSize:8.8,cellPadding:3,textColor:C.ink}});
    const w=(id.warnings||[]).filter(x=>x.kind!=="profile").map(x=>`${x.kind.replace("_"," ")}: ${x.text}`);
    if(w.length){sub("Warnings",bulletsH(w));bullets(w)}
    if(id.cautions?.length){sub("How this sector is analysed",bulletsH(id.cautions));bullets(id.cautions,{color:C.mut})}
  }
  function coreTiles(list,title){
    const T=withTrend(list);heading(title,tilesFirstRowH(T,5));tiles(T,5);
    if(r.gaps?.length)para(`Data gaps: ${r.gaps.map(g=>`${labels[g.key]||g.key} (${g.state.replace(/_/g," ")})`).join(", ")}. Ratios that need these show n/a; nothing is assumed to be zero.`,{size:8.5,color:C.mut});
  }
  const KPI_LABEL={reported:["Reported",C.g,C.gb],entered:["From report",C.g,C.gb],derived:["Derived",C.a,C.ab],not_disclosed:["Not disclosed",C.mut,C.soft],not_found:["Not found",C.mut,C.soft],not_applicable:["Not applicable",C.mut,C.soft]};
  function sectorKpis(){
    const groups=r.sectorKpis||[];if(!groups.length)return;
    heading("Sector KPIs",24+tableH(groups[0].items.length));
    para("Reported = read from the statements. From report = typed from the report with its page. Derived = calculated by the formula shown. Not found and not disclosed values are never estimated.",{size:8.5,color:C.mut});
    for(const g of groups){
      sub(g.title,tableH(Math.min(g.items.length,12)));
      table({head:[["KPI","This year","Last year","Status","Source / basis"]],
        columnStyles:{0:{cellWidth:150},1:{halign:"right",cellWidth:62},2:{halign:"right",cellWidth:62},3:{cellWidth:72},4:{textColor:C.mut,fontSize:7.6}},
        body:g.items.map(k=>[k.label+(k.profileStatus==="candidate"?" (candidate)":""),k.cur,k.prev,(KPI_LABEL[k.status]||[k.status])[0],
          [k.source?.page?`p.${k.source.page}${k.source.label&&k.source.label!==k.label?` "${cut(k.source.label,50)}"`:""}`:"",k.status==="derived"&&k.formula?k.formula:"",k.note&&k.status!=="reported"?k.note:""].filter(Boolean).join(" · ")]),
        didParseCell:c=>{if(c.section==="body"&&c.column.index===3){const s=KPI_LABEL[g.items[c.row.index]?.status];if(s){c.cell.styles.textColor=s[1];c.cell.styles.fillColor=s[2];c.cell.styles.fontStyle="bold"}}}});
    }
  }
  function chartRows(defs){
    for(let i=0;i<defs.length;i+=2){
      const a=defs[i],b=defs[i+1];ensure(CH+12);
      bars(M,y,half,CH,a.title,a.data,a.fmt==="pct"?pct:v=>nf(v,0));if(b)bars(M+half+12,y,half,CH,b.title,b.data,b.fmt==="pct"?pct:v=>nf(v,0));y+=CH+12;
    }
  }
  function charts(){
    const defs=V2?ch.groups||[]:[{title:"Margins",data:ch.margins,fmt:"pct"},{title:"Profit versus cash (Rs. Mn)",data:ch.cash,fmt:"num"},{title:"Working capital in days",data:ch.days,fmt:"num"},{title:"Returns",data:ch.returns,fmt:"pct"}];
    if(!defs.length)return;heading("Charts",CH+12);chartRows(defs);
  }
  function bridge(){
    if(ch.patStart==null||ch.patEnd==null||!r.bridge)return;
    const rows=[{label:"Profit last year",from:0,to:ch.patStart,k:"t"}];let run=ch.patStart;
    (r.bridge||[]).forEach(s=>{if(!ok(s.delta)){rows.push({label:s.driver,from:NaN,to:NaN});return}rows.push({label:s.driver,from:run,to:run+s.delta,k:s.delta>=0?"up":"dn",d:s.delta});run+=s.delta});
    rows.push({label:"Profit this year",from:0,to:ch.patEnd,k:"t"});
    const RH=17,h=rows.length*RH+52;ensure(h+12);box(M,y,CW,h,"PAT bridge: what changed and why","Change in profit after tax by driver, Rs. Mn");
    const all=rows.flatMap(q=>[q.from,q.to]).filter(ok),mn=Math.min(0,...all),mx=Math.max(0,...all),LW=190,X=v=>M+LW+(v-mn)/((mx-mn)||1)*(CW-LW-70);
    doc.setDrawColor(...C.line);doc.line(X(0),y+38,X(0),y+h-8);
    rows.forEach((q,i)=>{if(!ok(q.from)||!ok(q.to)){const ry=y+40+i*RH;font(8,false,C.ink);doc.text(clean(cut(q.label,40)),M+LW-8,ry+9,{align:"right"});font(7.5,false,C.mut);doc.text("n/a",X(0)+4,ry+9);return}
      const ry=y+40+i*RH,a=Math.min(X(q.from),X(q.to)),bw=Math.max(Math.abs(X(q.to)-X(q.from)),1.5),val=q.k==="t"?q.to:q.d;
      font(8,false,C.ink);doc.text(clean(cut(q.label,40)),M+LW-8,ry+9,{align:"right"});
      doc.setFillColor(...(q.k==="t"?C.prev:q.k==="up"?C.g:C.r));doc.rect(a,ry+1,bw,11,"F");
      font(7.5,false,C.ink);doc.text(clean((q.k!=="t"&&val>0?"+":"")+nf(val,1)),a+bw+4,ry+9)});
    y+=h+12;
  }
  function segments(){
    if(!r.segments?.length)return;
    heading("Segments",tableH(r.segments.length)+20);
    para("As entered from the report's segment note (Rs. Mn). Kept separate from consolidated figures.",{size:8.5,color:C.mut});
    table({head:[["Segment","Revenue","Last year","Growth","Share","Profit","Margin","Page"]],columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"},4:{halign:"right"},5:{halign:"right"},6:{halign:"right"}},
      body:r.segments.map(s=>[s.name,s.rev.cur,s.rev.prev,s.rev.growth,s.rev.share,s.profit.cur,s.profit.margin,s.page?`p.${s.page}`:""])});
  }
  function checks(title){
    heading(title,checkH((r.checks||[])[0]||{points:[]}));
    (r.checks||[]).forEach((c,i)=>{
      ensure(checkH(c));const [lbl,fg,bg]=STATUS[c.status]||STATUS.unknown;
      font(10.5,true);const t=clean(`${i+1}. ${c.title}`);doc.text(t,M,y+10);pill(lbl,fg,bg,M+doc.getTextWidth(t)+8,y+1);y+=18;
      bullets(c.points);
    });
  }
  function qoe(){
    if(!r.qoe)return;
    const QT=r.qoe.rows.map(q=>({label:q[0].startsWith("Altman")?"Altman Z-score":q[0],cur:q[1],prev:q[2]}));
    heading("Quality of earnings",tilesFirstRowH(QT,4));tiles(QT,4);
    const pio=r.qoe.piotroski,pioH=Math.ceil(pio.tests.length/2)*15+10;
    sub(`Piotroski F-score: ${pio.score} of 9`,pioH);
    pio.tests.forEach((t,i)=>{const cx=M+(i%2)*(CW/2),cy=y+Math.floor(i/2)*15;
      pill(t.pass?"PASS":"FAIL",t.pass?C.g:C.r,t.pass?C.gb:C.rb,cx,cy);font(8.8);doc.text(clean(t.name),cx+40,cy+9)});
    y+=Math.ceil(pio.tests.length/2)*15+10;
    const az=ch.altman;
    if(az?.z!=null){
      ensure(90);sub(`Altman Z-score: ${nf(az.z,1)}`);para(`Model: ${az.kind}`,{size:8.5,color:C.mut,gap:2});
      const max=Math.max(8,az.z*1.15),X=v=>M+Math.min(v,max)/max*CW,by=y+14;
      doc.setFillColor(...C.rb);doc.rect(X(0),by,X(az.lo)-X(0),12,"F");doc.setFillColor(...C.line);doc.rect(X(az.lo),by,X(az.hi)-X(az.lo),12,"F");
      doc.setFillColor(...C.gb);doc.rect(X(az.hi),by,X(max)-X(az.hi),12,"F");
      doc.setFillColor(...C.ink);const m=X(az.z);doc.triangle(m-5,by-8,m+5,by-8,m,by,"F");
      font(7.5,false,C.mut);[["Distress",0,az.lo],["Grey",az.lo,az.hi],["Safe",az.hi,max]].forEach(([l,a,b])=>doc.text(l,(X(a)+X(b))/2,by+24,{align:"center"}));
      y+=46;
    }
  }
  function risk(){
    const rk=r.risk;if(!rk)return;
    heading("Risk, disclosure and governance",18+bulletsH(rk.points));
    const [lbl,fg,bg]=STATUS[rk.status]||STATUS.unknown;font(10.5,true);const t="Audit opinion and disclosures";doc.text(t,M,y+10);pill(lbl,fg,bg,M+doc.getTextWidth(t)+8,y+1);y+=18;
    bullets(rk.points);
  }
  function dcfSection(d,title){
    heading(title,tableH(9));
    const inp={...d.inputs,shares:d.inputs.shares??NaN,nd:d.inputs.nd??NaN};
    const a={tax:d.inputs.tax,da:d.inputs.da,capex:d.inputs.capex,nwc:d.inputs.nwc??.45,years:5,...d.base,...(assumptions||{})};
    const ndKnown=ok(inp.nd),perShare=ndKnown&&ok(inp.shares),pr=d.inputs.price;
    const val=x=>{const q=dcf(inp,x);return perShare?q.perShare:ndKnown?q.equity:q.ev};
    const what=perShare?"value per share (Rs.)":ndKnown?"equity value (Rs. Mn)":"enterprise value (Rs. Mn; net debt not available)";
    const src=d.base.src||{};
    table({head:[["Assumption","Value","Source"]],columnStyles:{0:{cellWidth:260},1:{halign:"right"}},body:[
      ["Revenue growth",P(a.g),src.g],["Operating margin",P(a.m),src.m],["WACC",P(a.w),src.w],["Terminal growth",P(a.tg),src.tg],["Tax rate",P(a.tax),src.tax],
      ["D&A, % of revenue",P(a.da),src.da],["Capex, % of revenue",P(a.capex),src.capex],["Working capital per extra rupee of revenue",P(a.nwc),src.nwc],["Forecast years",String(a.years),src.years]]
      .map(([l,v,s])=>[l,v,s==="report"?"from report":s?"default":"set by you"])});
    const S3=[["Bear",{g:a.g-.03,m:a.m-.02}],["Base",{g:a.g,m:a.m}],["Bull",{g:a.g+.03,m:a.m+.025}]];
    const base=dcf(inp,a);
    table({head:[["Scenario","Revenue growth","Operating margin",`Scenario ${what}`]],columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"}},
      body:S3.map(([n,x])=>{const v=val({...a,...x});return[n,P(x.g),P(x.m),ok(v)?nf(v,2):"n/a"]})});
    const Wv=[a.w-.02,a.w,a.w+.02],Tv=[a.tg-.01,a.tg,a.tg+.01];
    sub("Sensitivity: WACC against terminal growth",tableH(3)+40);
    table({head:[["WACC \\ terminal growth",...Tv.map(P)]],columnStyles:{0:{fontStyle:"bold"},1:{halign:"right"},2:{halign:"right"},3:{halign:"right"}},
      body:Wv.map(w=>[P(w),...Tv.map(t=>{const v=val({...a,w,tg:t});return ok(v)?nf(v,2):"n/a"})]),
      didParseCell:c=>{if(c.section!=="body"||c.column.index===0||!(perShare&&ok(pr)))return;const v=parseFloat(String(c.cell.raw).replace(/,/g,""));
        if(ok(v)){c.cell.styles.fillColor=v>=pr?C.gb:C.rb;c.cell.styles.textColor=v>=pr?C.g:C.r}}});
    para(`${a.years}-year forecast. Each year and the terminal year use one formula: operating profit after tax + D&A - capex - working capital x revenue increase. Terminal value = next year's cash flow / (WACC - terminal growth)${ok(base.tvShare)?`, ${(base.tvShare*100).toFixed(0)}% of the base value`:""}.${perShare&&ok(pr)?` Green = above the share price of Rs. ${nf(pr,2)}, red = below.`:""} n/a = WACC not above terminal growth. Illustrative only.`,{size:8.5,color:C.mut});
  }
  function finSection(v){
    const d=v.fin,a={...d.base,...(finAssumptions||{})},inp={bv0:d.inputs.bv0,shares:d.inputs.shares??NaN},pr=d.inputs.price,bvps=d.inputs.bvps;
    const per=ok(inp.shares)&&inp.shares>0,q=finValuation(inp,a),val=x=>{const z=finValuation(inp,x);return per?z.riPerShare:z.ri};
    const src=d.base.src||{},S=s=>s==="report"?"from report":s?"default":"set by you";
    const T=[{label:"Price / book",cur:ok(pr)&&bvps>0?(pr/bvps).toFixed(2)+"x":"n/a",sub:ok(bvps)?`book value ${nf(bvps,2)} per share`:"needs EPS for shares"},
      {label:"Justified P/B",cur:ok(q.justifiedPB)?q.justifiedPB.toFixed(2)+"x":"n/a",sub:"(long-run ROE - g) / (COE - g)"},
      {label:`Residual income ${per?"/ share":"(Rs. Mn)"}`,cur:nf(per?q.riPerShare:q.ri,2),sub:ok(pr)?`vs price ${nf(pr,2)}`:"no price entered"},
      {label:`Dividend discount ${per?"/ share":"(Rs. Mn)"}`,cur:nf(per?q.ddmPerShare:q.ddm,2),sub:ok(pr)?`vs price ${nf(pr,2)}`:"no price entered"}];
    heading("Valuation: book value and returns",tilesFirstRowH(T,4)+tableH(6));
    tiles(T,4);
    table({head:[["Assumption","Value","Source"]],columnStyles:{0:{cellWidth:260},1:{halign:"right"}},body:[
      ["Cost of equity",P(a.coe),S(src.coe)],["Long-run growth",P(a.g),S(src.g)],["ROE this year",P(a.roe0),S(src.roe0)],["Long-run ROE",P(a.roeLong),S(src.roeLong)],["Payout ratio",P(a.payout),S(src.payout)],["Forecast years",String(a.years),S(src.years)]]});
    const C3=[a.coe-.02,a.coe,a.coe+.02],G3=[a.g-.01,a.g,a.g+.01];
    sub("Sensitivity: cost of equity against growth (residual income)",tableH(3)+40);
    table({head:[["COE \\ growth",...G3.map(P)]],columnStyles:{0:{fontStyle:"bold"},1:{halign:"right"},2:{halign:"right"},3:{halign:"right"}},
      body:C3.map(c=>[P(c),...G3.map(g=>{const x=val({...a,coe:c,g});return ok(x)?nf(x,2):"n/a"})]),
      didParseCell:c=>{if(c.section!=="body"||c.column.index===0||!(per&&ok(pr)))return;const x=parseFloat(String(c.cell.raw).replace(/,/g,""));
        if(ok(x)){c.cell.styles.fillColor=x>=pr?C.gb:C.rb;c.cell.styles.textColor=x>=pr?C.g:C.r}}});
    para(`ROE moves in a straight line from this year's to the long-run ROE over ${a.years} years; book value grows by retained profit. Residual income = book value + PV of (ROE - cost of equity) x opening book value. No conventional cash-flow DCF: deposits and policyholder liabilities are not ordinary debt.${q.invalid?` Check inputs: ${q.invalid}.`:""} Illustrative only.`,{size:8.5,color:C.mut});
  }
  function valuationV2(){
    const v=r.valuation;if(!v)return;const L=v.labels||{},nm=a=>a.map(k=>L[k]||k).join(", ");
    const lines=[`Preferred: ${nm(v.preferred)}`,...(v.conditional.length?[`Conditional: ${nm(v.conditional)}`]:[]),...(v.avoid.length?[`Not used as default: ${nm(v.avoid)}`]:[]),...(v.notes||[])];
    heading("Valuation approach for this sector",bulletsH(lines));bullets(lines);
    if(v.fin)finSection(v);
    if(v.dcf)dcfSection(v.dcf,"Discounted cash flow");
    if(v.nav){const T=[{label:"Book NAV per share",cur:nf(v.nav.navps,2),sub:"from the balance sheet"},{label:"Price / NAV",cur:v.nav.pnav!=null?v.nav.pnav.toFixed(2)+"x":"n/a",sub:v.nav.price!=null?`at price ${nf(v.nav.price,2)}`:"no price entered"}];
      heading("Net asset value",tilesFirstRowH(T,4)+30);tiles(T,4);para(v.nav.note,{size:8.5,color:C.mut})}
    if(v.sotp){const l=[v.sotp.note,...v.sotp.segments.map(s=>`${s.name}: revenue ${s.rev}, profit ${s.profit}`)];heading("Sum of the parts",bulletsH(l));bullets(l)}
  }
  function observations(){
    heading("Observations",20+bulletsH(none(r.positives)));
    sub("Positive observations",bulletsH(none(r.positives)));bullets(none(r.positives));
    sub("Areas of concern",bulletsH(none(r.concerns)));bullets(none(r.concerns));
    sub("Questions to ask the company",bulletsH(r.questions));bullets(r.questions,{numbered:true});
  }

  // ---- layout -------------------------------------------------------------------------------------
  cover();
  if(V2){
    identity();coreTiles(r.core,"Core financials (Rs. Mn)");
    if(!r.sectorKpis){para("The remaining sections are included in the full report.",{color:C.mut});return save()}
    sectorKpis();charts();bridge();segments();checks("Sector checks");qoe();risk();valuationV2();observations();
  }else{
    coreTiles(r.metrics,"Key figures (Rs. Mn)");checks("Eight checks");
    if(!r.qoe){para("The remaining sections are included in the full report.",{color:C.mut});return save()}
    charts();bridge();qoe();if(r.dcf)dcfSection(r.dcf,"Valuation scenarios");observations();
  }
  return save();

  function save(){
    const n=doc.getNumberOfPages();
    for(let i=1;i<=n;i++){doc.setPage(i);doc.setDrawColor(...C.line);doc.setLineWidth(.5);doc.line(M,H-34,W-M,H-34);
      font(7.5,false,C.mut);doc.text(clean(`${cut(company+period,62)} · CSE Report Analyzer · Not investment advice`),M,H-22);doc.text(`Page ${i} of ${n}`,W-M,H-22,{align:"right"})}
    const name=(company.replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-")||"report")+"-analysis.pdf";
    if(raw)return doc.output("arraybuffer");   // used by scripts/test-pdf.mjs
    doc.save(name);return name;
  }
}
