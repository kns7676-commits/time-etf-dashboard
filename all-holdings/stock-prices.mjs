// 종목별 일별 종가 (Yahoo Finance) · 비중 그래프에 겹쳐 그리는 주가 선(오른쪽 축)
export const PRICE_PRODUCTS=['6'];
export function yahooSymbols(code){
 const c=String(code).trim().toUpperCase();let m;
 if((m=c.match(/^([A-Z0-9./]+) US EQUITY$/)))return [m[1].replace(/[/.]/g,'-')];
 if((m=c.match(/^([0-9A-Z]{4}) JP EQUITY$/)))return [m[1]+'.T'];
 if((m=c.match(/^(\d{6}) CH EQUITY$/)))return [m[1]+(m[1].startsWith('6')?'.SS':'.SZ')];
 if((m=c.match(/^(\d{1,5}) HK EQUITY$/)))return [m[1].padStart(4,'0')+'.HK'];
 if((m=c.match(/^(\d{4}) TT EQUITY$/)))return [m[1]+'.TW'];
 if(/^\d{6}$/.test(c))return [c+'.KS',c+'.KQ'];
 return [];
}
export function parsePrices(data,from){
 const result=data?.chart?.result?.[0];
 if(data?.chart?.error||!result)throw Error('price chart unavailable');
 const offset=result.meta?.gmtoffset||0,closes=result.indicators?.quote?.[0]?.close||[];
 const all=(result.timestamp||[]).map((t,i)=>({d:new Date((t+offset)*1000).toISOString().slice(0,10),c:closes[i]})).filter(p=>Number.isFinite(p.c));
 const points=all.map((p,i)=>({...p,p:i?Math.round((p.c/all[i-1].c-1)*10000)/100:null})).filter(p=>p.d>=from);
 if(points.length<2)throw Error('price points unavailable');
 return {currency:result.meta?.currency||'',points};
}
export async function fetchStockPrice(code,from,fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))){
 const symbols=yahooSymbols(code);if(!symbols.length)return {skip:true};
 const period1=Math.floor((Date.parse(from)-10*86400000)/1000),period2=Math.floor(Date.now()/1000)+86400;
 for(const symbol of symbols)for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetcher(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`,{headers:{'user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(30000)});
   if(r.status===429||r.status>=500){await sleep(1500*(attempt+1));continue;}
   if(!r.ok)break;
   return {symbol,...parsePrices(await r.json(),from)};
  }catch{break;}
 }
 return {symbol:symbols[0],error:true};
}
// 상품별로 기간 내 등장한 모든 종목(편출 포함)의 주가를 받습니다. 개별 실패는 상황판 발행을 막지 않습니다.
export async function fetchProductPrices(history,products=PRICE_PRODUCTS,fetcher=fetch,sleep){
 const out={};
 for(const product of products){
  const days=history.filter(s=>s.products[product]);if(!days.length)continue;
  const from=days.map(s=>s.products[product].date).sort()[0],codes=[...new Set(days.flatMap(s=>s.products[product].rows.map(r=>r.code)))];
  const prices={};let next=0;
  await Promise.all(Array.from({length:4},async()=>{while(next<codes.length){const code=codes[next++];prices[code]=await fetchStockPrice(code,from,fetcher,sleep);}}));
  out[product]=prices;
 }
 return out;
}
// 비중 조정(▲▼＋×) 시점의 종가와 이후 주가 흐름. 자료일 당일 또는 직전 거래일 종가를 기준으로 합니다.
export function outcomes(pts,ev){
 return ev.map(e=>{
  let i=-1;for(let j=0;j<pts.length&&pts[j].d<=e.d;j++)i=j;
  if(i<0)return null;
  const base=pts[i].c,ret=c=>Math.round((c/base-1)*10000)/100,pending=i===pts.length-1,now=ret(pts.at(-1).c);
  return {...e,i,baseDate:pts[i].d,base,r5:pts[i+5]?ret(pts[i+5].c):null,now,match:pending||now===0?null:['increase','added'].includes(e.k)?now>0:now<0};
 }).filter(Boolean);
}
export function pricePanel(rows,prices,events={},axis={width:900,dates:[]}){
 const data=JSON.stringify(rows.map((r,i)=>{
  const w=[];for(const p of r.points){if(w.length&&w.at(-1)[0]===p.sourceDate)w.at(-1)[1]=p.weight;else w.push([p.sourceDate,p.weight]);}
  const ev=(events[i]||[]).map(e=>({d:e.date,k:e.kind,s:e.symbol,b:e.before,a:e.after,dl:e.delta,x:r.points[e.pointIndex]?.date})).sort((a,b)=>a.d.localeCompare(b.d));
  return {name:r.name,w,sw:r.points.map(p=>[p.date,p.weight]),ev,...(prices[r.code]||{skip:true})};
 })).replace(/</g,'\\u003c');
 return `<div class="price-panel" data-axis="${JSON.stringify(axis).replace(/"/g,'&quot;')}"><h4 class="price-title"></h4><p class="price-legend"><span style="color:#0f172a">━ 주가 (위 그래프 오른쪽 축)</span> <span style="color:#64748b">· 선택 종목의 보유 비중은 같은 그래프 왼쪽 축</span> <span style="color:#dc2626">┊▲ 비중 확대</span> <span style="color:#2563eb">┊▼ 비중 축소</span> <span style="color:#059669">┊＋ 편입</span> <span style="color:#c2410c">┊× 편출</span></p><p class="price-reading" aria-live="polite"></p><div class="price-events"></div><p class="price-source">자료: Yahoo Finance 일별 종가 · 거래소 현지 날짜 · 휴장일 제외 · 지연 시세. 비중 조정 기준가는 보유내역 자료일(또는 직전 거래일) 종가입니다. 비중 변화에는 주가 변동 자체의 효과도 섞여 있어 실제 매수·매도와 같지 않으며, 이후 주가 방향은 사후 결과일 뿐 운용 성과나 투자 판단 근거가 아닙니다.</p><script type="application/json" class="price-data">${data}</script></div>`;
}
export const priceStyle='.price-panel{border-top:1px solid #dbe4ee;margin-top:16px;padding-top:12px}.price-title{margin:0 0 4px;font-size:16px}.price-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;font-weight:600;margin:4px 0}.price-layer text{font-size:12px;fill:#0f172a}.price-layer .price-axis-title{font-weight:600}.price-reading{font-size:13px;color:#42526a;min-height:22px;margin:4px 0}.price-events table{width:100%;font-size:13px}.price-events td,.price-events th{padding:6px 8px;text-align:right}.price-events td:nth-child(-n+2),.price-events th:nth-child(-n+2){text-align:left}.price-events tbody tr{cursor:pointer}.price-events tbody tr:hover,.price-events tbody tr.on{background:#edf4ff}.price-summary{font-size:14px;font-weight:600;margin:8px 0}.price-source{font-size:12px;color:#7a8799;margin:8px 0 0}.price-layer .price-empty{fill:#7a8799}';
function priceScript(outcomes){
 const fmt=(v,cur)=>v.toLocaleString('en-US',{maximumFractionDigits:cur==='KRW'||cur==='JPY'?0:2,minimumFractionDigits:cur==='KRW'||cur==='JPY'?0:2});
 const pct=v=>v===null||v===undefined?'-':(v>0?'+':'')+v.toFixed(2)+'%';
 const tone=v=>v>0?'#dc2626':v<0?'#2563eb':'#64748b';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const kinds={increase:['비중 확대','#dc2626'],decrease:['비중 축소','#2563eb'],added:['신규 편입','#059669'],removed:['전량 편출','#c2410c']};
 const verdict=o=>o.match===null?'<span style="color:#64748b">판단 이름</span>':(['increase','added'].includes(o.k)?(o.match?'확대 후 <b style="color:#dc2626">상승</b> · 방향 일치':'확대 후 <b style="color:#2563eb">하락</b> · 방향 반대'):(o.match?'축소 후 <b style="color:#2563eb">하락</b> · 방향 일치':'축소 후 <b style="color:#dc2626">상승</b> · 방향 반대'));
 document.querySelectorAll('figure').forEach(figure=>{
  const panel=figure.querySelector('.price-panel');if(!panel)return;
  // 주가는 위 비중 그래프(같은 SVG)에 겹쳐 그리고, 눈금은 오른쪽 축에 둡니다.
  const axis=JSON.parse(panel.dataset.axis),W=axis.width,X0=axis.x0,SPAN=axis.span,rows=JSON.parse(panel.querySelector('.price-data').textContent),svg=figure.querySelector(':scope > .scroll svg'),title=panel.querySelector('.price-title'),reading=panel.querySelector('.price-reading'),box=panel.querySelector('.price-events');
  const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.setAttribute('class','price-layer');svg.appendChild(layer);
  const dayNo=d=>Date.parse(d+'T00:00:00Z')/864e5;
  const render=index=>{
   const s=rows[index];
   if(!s||!s.points){title.textContent=(s?s.name:'')+' 주가';layer.innerHTML='<text class="price-empty" x="'+(W-5)+'" y="22" text-anchor="end">'+(s&&s.error?'주가 자료를 가져오지 못했습니다 ('+esc(s.symbol)+')':'선물·지수·현금·국내 상장 ETF 등은 주가를 표시하지 않습니다')+'</text>';reading.textContent='';box.innerHTML='';svg.onpointermove=null;svg.onpointerleave=null;return;}
   const all=s.points,list=outcomes(all,s.ev),D=axis.dates.length>1?axis.dates:[all[0].d,all.at(-1).d],inRange=all.filter(p=>p.d>=D[0]&&p.d<=D.at(-1)),pts=inRange.length>1?inRange:all,cs=pts.map(p=>p.c),lo=Math.min(...cs),hi=Math.max(...cs),pad=(hi-lo||hi*.02||1)*.12,min=lo-pad,max=hi+pad;
   const wAt=d=>{let v=null;for(const [wd,wv] of s.sw)if(wd<=d)v=wv;return v;},ws=pts.map(p=>wAt(p.d));
   const dx=d=>{const n=dayNo(d),a=D.map(dayNo),k=D.length-1,pos=i=>X0+i*SPAN/k;if(n<=a[0])return pos(0);if(n>=a[k])return pos(k);let i=0;while(a[i+1]<n)i++;return pos(i)+(n-a[i])/(a[i+1]-a[i])*(pos(i+1)-pos(i));},x=i=>dx(pts[i].d),y=v=>550-(v-min)/(max-min)*500;
   const total=(pts.at(-1).c/pts[0].c-1)*100;
   title.innerHTML=esc(s.name+' ('+s.symbol+') 주가와 보유 비중 · 일별 종가 '+s.currency)+' <span style="color:'+tone(total)+'">기간 '+pct(total)+'</span>';
   layer.innerHTML='<text class="price-axis-title" x="'+(W-5)+'" y="22" text-anchor="end">주가 ('+esc(s.currency)+')</text>'
    +Array.from({length:5},(_,i)=>{const v=min+(max-min)*i/4;return '<text x="'+(X0+SPAN+14)+'" y="'+(y(v)+4)+'">'+fmt(v,s.currency)+'</text>';}).join('')
    +list.map((o,n)=>'<g class="ev" data-ev="'+n+'"><line x1="'+dx(o.x||o.d)+'" x2="'+dx(o.x||o.d)+'" y1="50" y2="550" stroke="'+kinds[o.k][1]+'" stroke-width="1.5" stroke-dasharray="5 4" opacity=".6"/><title>'+o.d+' 자료 · '+kinds[o.k][0]+' '+o.b.toFixed(2)+'% → '+o.a.toFixed(2)+'% · 이후 현재까지 '+pct(o.now)+'</title></g>').join('')
    +'<polyline fill="none" stroke="#0f172a" stroke-width="2.5" points="'+pts.map((p,i)=>x(i)+','+y(p.c)).join(' ')+'"/>'
    +pts.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+y(p.c)+'" r="3" fill="#0f172a" stroke="white"><title>'+p.d+' · 종가 '+fmt(p.c,s.currency)+' · 전일 대비 '+pct(p.p)+(ws[i]!==null?' · 비중 '+ws[i].toFixed(2)+'%':'')+'</title></circle>').join('')
    +'<line class="price-cursor" y1="50" y2="550" stroke="#94a3b8" stroke-dasharray="4 4" visibility="hidden"/>';
   const last=pts.at(-1),summary=pts[0].d+' ~ '+last.d+' · '+fmt(pts[0].c,s.currency)+' → '+fmt(last.c,s.currency)+' · 최근 일간 '+pct(last.p);
   reading.textContent=summary;
   const up=list.filter(o=>['increase','added'].includes(o.k)&&o.match!==null),down=list.filter(o=>['decrease','removed'].includes(o.k)&&o.match!==null);
   box.innerHTML=list.length?'<p class="price-summary">비중 확대·편입 '+up.length+'회 중 이후 상승 <span style="color:#dc2626">'+up.filter(o=>o.match).length+'회</span> · 비중 축소·편출 '+down.length+'회 중 이후 하락 <span style="color:#2563eb">'+down.filter(o=>o.match).length+'회</span> <small style="font-weight:400;color:#52647a">(조정일 종가 → 최근 종가)</small></p><div class="scroll"><table><thead><tr><th>자료일</th><th>비중 조정</th><th>기준 종가</th><th>1주 후</th><th>현재까지</th><th>이후 주가</th></tr></thead><tbody>'+list.map((o,n)=>'<tr data-ev="'+n+'"><td>'+o.d+(o.baseDate!==o.d?'<br><small>종가 '+o.baseDate.slice(5)+'</small>':'')+'</td><td style="color:'+kinds[o.k][1]+'">'+o.s+' '+kinds[o.k][0]+' '+o.b.toFixed(2)+'% → '+o.a.toFixed(2)+'% ('+(o.dl>0?'+':'')+o.dl.toFixed(2)+'%p)</td><td>'+fmt(o.base,s.currency)+'</td><td style="color:'+tone(o.r5)+'">'+pct(o.r5)+'</td><td style="color:'+tone(o.now)+'">'+pct(o.now)+'</td><td>'+verdict(o)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="price-summary" style="font-weight:400">기간 중 큰 비중 변화(▲▼＋×)가 없습니다. 주황색 비중 선과 주가 선을 비교해 보세요.</p>';
   box.querySelectorAll('tbody tr').forEach(tr=>tr.addEventListener('click',()=>{const o=list[Number(tr.dataset.ev)];box.querySelectorAll('tr.on').forEach(r=>r.classList.remove('on'));tr.classList.add('on');svg.querySelectorAll('.ev line').forEach((l,n)=>l.setAttribute('stroke-width',n===Number(tr.dataset.ev)?'4':'1.5'));reading.textContent=o.d+' 자료 '+kinds[o.k][0]+' · 기준 종가 '+fmt(o.base,s.currency)+' ('+o.baseDate+') → 1주 후 '+pct(o.r5)+' · 현재까지 '+pct(o.now);}));
   svg.onpointermove=e=>{const b=svg.getBoundingClientRect(),px=(e.clientX-b.left)/b.width*W,i=pts.reduce((m,p,n)=>Math.abs(x(n)-px)<Math.abs(x(m)-px)?n:m,0),line=svg.querySelector('.price-cursor');line.setAttribute('x1',x(i));line.setAttribute('x2',x(i));line.setAttribute('visibility','visible');reading.textContent=pts[i].d+' · 종가 '+fmt(pts[i].c,s.currency)+' · 전일 대비 '+pct(pts[i].p)+(ws[i]!==null?' · 비중 '+ws[i].toFixed(2)+'%':'');};
   svg.onpointerleave=()=>{svg.querySelector('.price-cursor').setAttribute('visibility','hidden');reading.textContent=summary;};
  };
  figure.addEventListener('row-change',e=>render(Number(e.detail.row)));render(0);
 });
}
export const priceInteraction='('+priceScript.toString()+')('+outcomes.toString()+');';
