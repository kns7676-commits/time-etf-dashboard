const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=n=>Math.round(n*100)/100;
const signed=n=>(n>0?'+':'')+n.toFixed(2);
export function mergeHistory(history,current){
 const days=new Map([...history].sort((a,b)=>a.sentDate.localeCompare(b.sentDate)).map(s=>[s.sentDate,s]));
 if(current)days.set(current.sentDate,current);
 return [...days.values()].sort((a,b)=>a.sentDate.localeCompare(b.sentDate));
}
export function weightSeries(history){
 const days=mergeHistory(history);if(!days.length)throw Error('누적 비교 기록 없음');
 const order=['6','2','11','15','24'];
 return Object.entries(days.at(-1).products).sort(([a],[b])=>order.indexOf(a)-order.indexOf(b)).map(([code,latest])=>{
  const samples=days.filter(s=>s.products[code]);const first=samples[0];
  const names=new Map();for(const s of samples)for(const r of s.products[code].rows)names.set(r.code,r.name);
  const rows=[...names].map(([id,name])=>{
   const baseline=first.products[code].rows.find(r=>r.code===id)?.weight??0;
   const points=samples.map((s,i)=>{
    const row=s.products[code].rows.find(r=>r.code===id),previous=i?samples[i-1].products[code].rows.find(r=>r.code===id):row;
    return {date:s.sentDate,sourceDate:s.products[code].date,weight:row?.weight??0,before:baseline,after:row?.weight??0,kind:i===0?'baseline':!previous&&row?'added':previous&&!row?'removed':'held'};
   });
   return {code:id,name,label:name,points};
  }).sort((a,b)=>b.points.at(-1).weight-a.points.at(-1).weight);
  rows.forEach((r,i)=>{r.rank=i+1;r.label=`${i+1}. ${r.name} · ${r.points.at(-1).weight.toFixed(2)}%`;});
  return {code,name:latest.name,baselineDate:first.sentDate,rows};
 });
}
function chart(row){
 const width=Math.max(660,row.points.length*65),max=Math.max(.01,...row.points.map(p=>p.weight))*1.2,min=Math.min(0,...row.points.map(p=>p.weight))*1.2;
 const x=i=>65+i*(width-100)/Math.max(1,row.points.length-1),y=v=>225-(v-min)/(max-min)*165;
 return `<figure><h3>${esc(row.label)}</h3><div class="scroll"><svg viewBox="0 0 ${width} 290" style="min-width:${width}px" role="img" aria-label="${esc(row.name)} 날짜별 실제 보유 비중"><text x="12" y="20">보유 비중 (%)</text>${[min,(max+min)/2,max].map(t=>`<line x1="60" x2="${width-25}" y1="${y(t)}" y2="${y(t)}" stroke="#e2e8f0"/><text x="52" y="${y(t)+4}" text-anchor="end">${t.toFixed(2)}</text>`).join('')}<polyline points="${row.points.map((p,i)=>`${x(i)},${y(p.weight)}`).join(' ')}" fill="none" stroke="#2874c5" stroke-width="3"/>${row.points.map((p,i)=>`<g><title>${p.date} 발송 / ${p.sourceDate} 자료 / 비중 ${p.weight.toFixed(2)}%</title><circle cx="${x(i)}" cy="${y(p.weight)}" r="4" fill="#2874c5"/><text x="${x(i)}" y="${y(p.weight)-12}" text-anchor="middle">${p.weight.toFixed(2)}</text><text x="${x(i)}" y="260" text-anchor="middle">${p.date.slice(5).replace('-','/')}</text>${['added','removed'].includes(p.kind)?`<text x="${x(i)}" y="${y(p.weight)-29}" text-anchor="middle">${p.kind==='added'?'신규':'편출'}</text>`:''}</g>`).join('')}</svg></div></figure>`;
}
export function weightReport(history){
 const series=weightSeries(history),latest=mergeHistory(history).at(-1);
 const note=`각 점은 해당 발송일에 확인한 실제 보유 비중(%)입니다. 예: 3.00% → 3.10% → 3.20%. 기록이 없는 날짜는 보간하지 않습니다.`;
 const text=[`TIME ETF 날짜별 보유 비중 변화 — ${latest.sentDate}`,note,'',...series.flatMap(p=>[`【${p.name}】`,`기록 시작: ${p.baselineDate} 발송분 · 현재 자료: ${latest.products[p.code].date}`,...[...latest.products[p.code].rows].sort((a,b)=>b.weight-a.weight).slice(0,10).map((r,i)=>{return `${i+1}. ${r.name} ${r.weight.toFixed(2)}%`;}),'']),'날짜별 그래프와 전체 종목은 첨부파일에서 확인하세요.'].join('\n');
 const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ETF 날짜별 보유 비중 변화</title><style>body{margin:0;background:#f4f7fb;color:#20314a;font:15px/1.6 system-ui,'Malgun Gothic',sans-serif}main{max-width:1400px;margin:auto;padding:24px}h1{font-size:26px}h2{margin-top:40px}h3{font-size:16px}figure{background:white;border-radius:12px;margin:12px 0;padding:16px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.scroll{overflow:auto}svg{width:100%;display:block}svg text{font-size:11px;fill:#364963}summary{padding:16px;cursor:pointer}@media(max-width:900px){.grid{grid-template-columns:1fr}}</style><main><h1>날짜별 보유 비중 변화</h1><p>발송일 ${latest.sentDate} · 단위 %<br>${note}<br>ETF별 현재 비중 상위 6종목을 먼저 표시합니다. 세로축 범위는 종목별로 다릅니다.</p>${series.map(p=>`<section><h2>${esc(p.name)}</h2><p>기록 시작일 ${p.baselineDate} · 현재 자료 기준일 ${latest.products[p.code].date}</p><div class="grid">${p.rows.slice(0,6).map(chart).join('')}</div><details><summary>나머지 ${Math.max(0,p.rows.length-6)}개 종목</summary><div class="grid">${p.rows.slice(6).map(chart).join('')}</div></details></section>`).join('')}<p>공식 보유 비중의 변화이며 수익 기여도가 아닙니다. 미편입 종목은 0%로 계산합니다.</p></main></html>`;
 return {text,html,series};
}
