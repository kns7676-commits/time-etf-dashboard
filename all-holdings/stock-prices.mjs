// 종목별 일별 종가 (Yahoo Finance) · 비중 그래프 아래 주가 차트
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
export function pricePanel(rows,prices){
 const data=JSON.stringify(rows.map(r=>({name:r.name,...(prices[r.code]||{skip:true})}))).replace(/</g,'\\u003c');
 return `<div class="price-panel"><h4 class="price-title"></h4><div class="scroll"><svg class="price-chart" viewBox="0 0 1000 280" role="img" aria-label="선택 종목 일별 주가"></svg></div><p class="price-reading" aria-live="polite"></p><p class="price-source">자료: Yahoo Finance 일별 종가 · 거래소 현지 날짜 · 휴장일 제외 · 지연 시세</p><script type="application/json" class="price-data">${data}</script></div>`;
}
export const priceStyle='.price-panel{border-top:1px solid #dbe4ee;margin-top:16px;padding-top:12px}.price-title{margin:0 0 4px;font-size:16px}.price-chart{min-width:640px}.price-chart text{font-size:13px}.price-reading{font-size:13px;color:#42526a;min-height:22px;margin:4px 0}.price-source{font-size:12px;color:#7a8799;margin:0}.price-empty{fill:#7a8799;font-size:16px}';
function priceScript(){
 const fmt=(v,cur)=>v.toLocaleString('en-US',{maximumFractionDigits:cur==='KRW'||cur==='JPY'?0:2,minimumFractionDigits:cur==='KRW'||cur==='JPY'?0:2});
 const pct=v=>v===null?'-':(v>0?'+':'')+v.toFixed(2)+'%';
 const tone=v=>v>0?'#dc2626':v<0?'#2563eb':'#64748b';
 document.querySelectorAll('figure').forEach(figure=>{
  const panel=figure.querySelector('.price-panel');if(!panel)return;
  const rows=JSON.parse(panel.querySelector('.price-data').textContent),svg=panel.querySelector('.price-chart'),title=panel.querySelector('.price-title'),reading=panel.querySelector('.price-reading');
  const render=index=>{
   const s=rows[index];
   if(!s||!s.points){title.textContent=(s?s.name:'')+' 주가';svg.innerHTML='<text class="price-empty" x="500" y="140" text-anchor="middle">'+(s&&s.error?'주가 자료를 가져오지 못했습니다 ('+s.symbol+')':'선물·지수·현금·국내 상장 ETF 등은 주가 차트를 제공하지 않습니다')+'</text>';reading.textContent='';svg.onpointermove=null;return;}
   const pts=s.points,cs=pts.map(p=>p.c),lo=Math.min(...cs),hi=Math.max(...cs),pad=(hi-lo||hi*.02||1)*.12,min=lo-pad,max=hi+pad;
   const x=i=>80+i*880/Math.max(1,pts.length-1),y=v=>230-(v-min)/(max-min)*200;
   const total=(pts.at(-1).c/pts[0].c-1)*100,step=Math.ceil(pts.length/14);
   title.innerHTML='';title.append(s.name+' ('+s.symbol+') 주가 · 일별 종가 '+s.currency+' ');const t=document.createElement('span');t.style.color=tone(total);t.textContent='기간 '+pct(total);title.append(t);
   svg.innerHTML=Array.from({length:5},(_,i)=>{const v=min+(max-min)*i/4;return '<line x1="75" x2="965" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#dce4ed"/><text x="68" y="'+(y(v)+4)+'" text-anchor="end">'+fmt(v,s.currency)+'</text>';}).join('')
    +'<polyline fill="none" stroke="#334155" stroke-width="2.5" points="'+pts.map((p,i)=>x(i)+','+y(p.c)).join(' ')+'"/>'
    +pts.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+y(p.c)+'" r="4" fill="'+tone(p.p)+'" stroke="white"><title>'+p.d+' · 종가 '+fmt(p.c,s.currency)+' · 전일 대비 '+pct(p.p)+'</title></circle>').join('')
    +pts.map((p,i)=>i%step&&i!==pts.length-1?'':'<text x="'+x(i)+'" y="256" text-anchor="middle">'+p.d.slice(5)+'</text>').join('')
    +'<line class="price-cursor" y1="25" y2="232" stroke="#94a3b8" stroke-dasharray="4 4" visibility="hidden"/>';
   const last=pts.at(-1),summary=pts[0].d+' ~ '+last.d+' · '+fmt(pts[0].c,s.currency)+' → '+fmt(last.c,s.currency)+' · 최근 일간 '+pct(last.p);
   reading.textContent=summary;
   svg.onpointermove=e=>{const box=svg.getBoundingClientRect(),px=(e.clientX-box.left)/box.width*1000,i=Math.max(0,Math.min(pts.length-1,Math.round((px-80)/880*(pts.length-1)))),line=svg.querySelector('.price-cursor');line.setAttribute('x1',x(i));line.setAttribute('x2',x(i));line.setAttribute('visibility','visible');reading.textContent=pts[i].d+' · 종가 '+fmt(pts[i].c,s.currency)+' · 전일 대비 '+pct(pts[i].p);};
   svg.onpointerleave=()=>{svg.querySelector('.price-cursor').setAttribute('visibility','hidden');reading.textContent=summary;};
  };
  figure.addEventListener('row-change',e=>render(Number(e.detail.row)));render(0);
 });
}
export const priceInteraction='('+priceScript.toString()+')();';
