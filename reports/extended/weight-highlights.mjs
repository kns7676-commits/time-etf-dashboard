const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>(n>0?'+':'')+n.toFixed(2);
// Source dates, rather than repeated delivery dates, define new observations.
export function majorChanges(product){
 const changes=[];
 for(const group of product.groups)for(const [rowIndex,row] of group.rows.entries()){
  let previous=row.points[0];
  for(let i=1;i<row.points.length;i++){
   const point=row.points[i];
   if(point.sourceDate===previous.sourceDate)continue;
   const delta=Math.round((point.weight-previous.weight)*100)/100;
   const membership=['added','removed'].includes(point.kind);
   const rank=1+product.rows.filter(r=>r.points[i].weight>point.weight).length;
   if(membership||Math.abs(delta)>=.5||(rank<=5&&Math.abs(delta)>=.2)){
    const kind=membership?point.kind:delta>0?'increase':'decrease';
    changes.push({name:row.name,groupId:group.id,rowIndex,pointIndex:i,date:point.sourceDate,previousDate:previous.sourceDate,before:previous.weight,after:point.weight,delta,rank,kind,
     symbol:{added:'＋',removed:'×',increase:'▲',decrease:'▼'}[kind],
     label:membership?(kind==='added'?'신규 편입':'전량 편출'):rank===1?'비중 1위 · 추가 '+(delta>0?'증가':'감소'):rank<=5?'상위 '+rank+'위 · 비중 '+(delta>0?'증가':'감소'):'비중 '+(delta>0?'증가':'감소')});
   }
   previous=point;
  }
 }
 return changes.sort((a,b)=>b.date.localeCompare(a.date)||Number(['added','removed'].includes(b.kind))-Number(['added','removed'].includes(a.kind))||Math.abs(b.delta)-Math.abs(a.delta));
}
function changeButton(change){
 return `<button type="button" class="change-card ${change.kind}" data-chart="g-${change.groupId}" data-row="${change.rowIndex}" data-point="${change.pointIndex}"><span class="change-heading">${change.symbol} ${esc(change.name)} <time>${change.date.slice(5).replace('-','/')}</time></span><span>${change.label}</span><strong>${change.before.toFixed(2)}% → ${change.after.toFixed(2)}% <em>${signed(change.delta)}%p</em></strong><small>자료 ${change.previousDate} → ${change.date} · 그래프에서 확인 ↗</small></button>`;
}
export function highlights(product){
 const changes=majorChanges(product);
 return `<aside class="highlights"><h3>주요 비중 변화</h3><p class="highlight-note">자료 날짜 기준 · 최근 변화부터 표시 · 편입·편출 전체, 하루 ±0.50%p 이상 또는 해당일 상위 5종목 ±0.20%p 이상을 선정합니다.</p>${changes.length?`<div class="change-grid">${changes.slice(0,5).map(changeButton).join('')}</div>${changes.length>5?`<details><summary>나머지 주요 변화 ${changes.length-5}건 보기</summary><div class="change-grid">${changes.slice(5).map(changeButton).join('')}</div></details>`:''}`:'<p>선정 기준에 해당하는 변화가 없습니다.</p>'}<p class="highlight-note">비중 변화에는 가격 변동도 반영됩니다. 매수·매도를 의미하지 않습니다.</p></aside>`;
}
export const highlightStyle=`.highlights{background:#fff;border:1px solid #dbe4ee;border-radius:14px;padding:20px;margin:20px 0}.highlights h3{margin:0}.highlight-note{font-size:13px;color:#52647a}.change-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.change-card{display:flex;flex-direction:column;gap:5px;text-align:left;font:inherit;background:#f8fafc;border:1px solid #dbe4ee;border-left:5px solid #2563eb;border-radius:8px;padding:14px;cursor:pointer;color:#20314a}.change-card:hover,.change-card:focus-visible{background:#edf4ff;outline:2px solid #2563eb}.change-card.decrease,.change-card.removed{border-left-color:#c2410c}.change-heading{font-weight:700;display:flex;justify-content:space-between;gap:8px}.change-heading time{white-space:nowrap}.change-card strong{font-size:17px}.change-card em{font-style:normal;color:#1d4ed8;white-space:nowrap}.change-card.decrease em,.change-card.removed em{color:#c2410c}.change-card small{color:#52647a}.series .change-marker{font-size:17px;font-weight:bold;paint-order:stroke;stroke:white;stroke-width:4px}.series .spotlight{stroke:#0f172a;stroke-width:4;r:10}@media(max-width:650px){.change-grid{grid-template-columns:1fr}}`;
export const highlightInteraction=`document.querySelectorAll('.change-card').forEach(card=>card.addEventListener('click',()=>{const figure=document.getElementById(card.dataset.chart);const fold=figure.closest('details.group-fold');if(fold)fold.open=true;figure.dispatchEvent(new CustomEvent('highlight-row',{detail:{row:card.dataset.row,point:card.dataset.point}}));figure.scrollIntoView({behavior:'smooth',block:'start'});}));`;
