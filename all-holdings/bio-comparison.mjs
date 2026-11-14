import {normalizeTop10} from './normalize-top10.mjs';
import {bioStockColors} from './bio-colors.mjs';
export const COMPARISON_URL='https://www.funetf.co.kr/product/comparison/etf?itemIds=KR7364970004,KR7463050005,KR7462900002,KR7244580007';
export const COMPARISON_PRODUCTS=[
 {ticker:'364970',isin:'KR7364970004',name:'TIGER 바이오TOP10'},
 {ticker:'463050',isin:'KR7463050005',name:'TIME K바이오액티브'},
 {ticker:'462900',isin:'KR7462900002',name:'KoAct 바이오헬스케어액티브'},
 {ticker:'244580',isin:'KR7244580007',name:'KODEX 바이오'}
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
// Extract balanced divs rather than stopping at the first nested closing tag.
function divs(html,match){
 const result=[],tags=/<\/?div\b[^>]*>/gi;let tag;
 while((tag=tags.exec(html))){
  if(tag[0].startsWith('</')||!match(tag[0]))continue;
  const start=tag.index;let depth=1,next;
  while(depth&&(next=tags.exec(html)))depth+=next[0].startsWith('</')?-1:1;
  if(depth)throw Error('FunETF comparison markup is incomplete');
  result.push(html.slice(start,tags.lastIndex));
 }
 return result;
}
export function validateComparison(snapshot,checkedAt=snapshot.checkedAt){
 const day=new Date(checkedAt);if(!Number.isFinite(day.getTime()))throw Error('Invalid comparison check time');
 const source=new Date(snapshot.date+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date)||!Number.isFinite(source.getTime())||source.toISOString().slice(0,10)!==snapshot.date)throw Error('Invalid comparison source date');
 const koreaDate=new Date(day.getTime()+9*3600000).toISOString().slice(0,10);
 if(snapshot.date>koreaDate||Date.parse(koreaDate)-source.getTime()>7*86400000)throw Error('FunETF comparison date is stale or in the future');
 if(snapshot.products?.length!==4)throw Error('Four comparison ETFs are required');
 snapshot.products.forEach((p,i)=>{
  if(p.ticker!==COMPARISON_PRODUCTS[i].ticker||!Number.isInteger(p.count)||p.count<10||p.rows?.length!==10)throw Error('Invalid comparison ETF or holdings count');
  if(new Set(p.rows.map(r=>r.code)).size!==10||p.rows.some(r=>!r.name||!/^[A-Z0-9]{6}$/.test(r.code)||!Number.isFinite(r.weight)||r.weight<0||r.weight>100))throw Error('Invalid comparison TOP10 holdings');
  if(p.rows.some((r,j)=>j&&r.weight>p.rows[j-1].weight))throw Error('Comparison holdings are not ranked');
  if(!Number.isFinite(p.top10Total)||p.top10Total<0||p.top10Total>101||Math.abs(p.rows.reduce((s,r)=>s+r.weight,0)-p.top10Total)>1)throw Error('Comparison TOP10 total does not match');
 });
 return snapshot;
}
export function verifyPublication(snapshot,now=new Date().toISOString()){
 validateComparison(snapshot,now);
 const koreaDay=t=>new Date(Date.parse(t)+9*3600000).toISOString().slice(0,10);
 if(!Number.isFinite(Date.parse(snapshot.checkedAt))||Date.parse(snapshot.checkedAt)>Date.parse(now)||koreaDay(snapshot.checkedAt)!==koreaDay(now))throw Error('FunETF comparison must be checked today before publication');
 return snapshot;
}
export function parseComparison(html,checkedAt=new Date().toISOString()){
 const rawDate=html.match(/class="[^"]*\btxtDate\b[^"]*"[^>]*>\s*한국\s+(\d{2})\.(\d{2})\.(\d{2})\s*기준/)?.slice(1);
 if(!rawDate)throw Error('FunETF comparison source date missing');
 const grid=divs(html,t=>/\bid="grid1-3"/.test(t))[0];
 if(!grid)throw Error('FunETF composition grid missing');
 const columns=divs(grid,t=>/class="cont-container"/.test(t));
 if(columns.length!==4)throw Error('FunETF comparison columns missing or changed');
 const products=columns.map((column,i)=>{
  const product=COMPARISON_PRODUCTS[i];
  const header=html.match(new RegExp('<a\\s+href="/product/etf/view/'+product.isin+'"[^>]*>[\\s\\S]*?</a>'))?.[0];
  if(!header||!text(header).includes(product.name))throw Error('FunETF comparison product header mismatch');
  if(!new RegExp('data-id="item'+(i+1)+'"').test(column))throw Error('FunETF comparison column order changed');
  const wraps=divs(column,t=>/class="cont-wrap(?:\s[^"]*)?"/.test(t));
  if(wraps.length!==13)throw Error('FunETF comparison row layout changed');
  const count=Number(text(wraps[0]));
  const rows=wraps.slice(1,11).map(w=>{
   const name=w.match(/<span[^>]*>([\s\S]*?)<\/span>/)?.[1],code=w.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1],weight=w.match(/class="data"[^>]*>([\s\S]*?)<\/div>/)?.[1];
   if(!name||!code||weight===undefined||!/^\d+(?:\.\d+)?$/.test(text(weight)))throw Error('FunETF holding name, code or weight missing');
   return {name:text(name),code:text(code),weight:Number(text(weight))};
  });
  return {...product,count,rows,top10Total:Number(text(wraps[11]))};
 });
 return validateComparison({date:'20'+rawDate.join('-'),checkedAt,source:COMPARISON_URL,products});
}
export function comparisonTable(snapshot){
 validateComparison(snapshot);
 const normalized=new Map(snapshot.products.map(p=>[p.ticker,normalizeTop10(p.rows)]));
 const colors=bioStockColors(snapshot);
 const stamp=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(snapshot.checkedAt));
 return `<section class="bio-comparison" aria-labelledby="bio-comparison-title" data-source-date="${snapshot.date}"><div class="bio-comparison-head"><div><span class="bio-kicker">BIO ETF COMPARISON</span><h2 id="bio-comparison-title">바이오 ETF 구성종목 비교</h2><p>자료 기준일 <strong>${snapshot.date}</strong> · 확인 ${esc(stamp)} (한국시간)</p></div><a href="${esc(COMPARISON_URL)}" target="_blank" rel="noopener">FunETF 원본 보기 ↗</a></div><p class="bio-guide">TOP10 보정 비중 (%) · ETF별 합계 100.00% · 여러 ETF에 함께 포함된 종목은 같은 색으로 표시합니다. 좌우로 넘겨 4개 ETF를 비교하세요.</p><div class="bio-table-scroll" tabindex="0" role="region" aria-label="바이오 ETF 4개 구성종목 비교표"><table><caption>자료 ${snapshot.date} 기준 구성종목 수와 TOP10 보정 비중 (%)</caption><thead><tr><th scope="col">순위</th>${snapshot.products.map(p=>`<th scope="colgroup" colspan="2"><small>${p.ticker} · 국내주식</small><a href="https://www.funetf.co.kr/product/etf/view/${p.isin}" target="_blank" rel="noopener">${esc(p.name)}</a></th>`).join('')}</tr></thead><tbody><tr class="bio-count"><th scope="row">구성종목 수</th>${snapshot.products.map(p=>`<td colspan="2">${p.count}</td>`).join('')}</tr>${Array.from({length:10},(_,i)=>`<tr><th scope="row">${i+1}</th>${snapshot.products.map(p=>{const r=p.rows[i],background=colors.get(r.code)||'#fff';return `<td class="bio-stock" style="background:${background}">${esc(r.name)}<small>${r.code}</small></td><td class="bio-weight" style="background:${background}">${normalized.get(p.ticker)[i].display.toFixed(2)}<small>원본 ${r.weight.toFixed(1)}%</small></td>`;}).join('')}</tr>`).join('')}<tr class="bio-total"><th scope="row">TOP10 보정 합계 (%)</th>${snapshot.products.map(p=>`<td colspan="2">${normalized.get(p.ticker).reduce((sum,r)=>sum+Math.round(r.display*100),0)/100 === 100 ? '100.00' : '계산 오류'}</td>`).join('')}</tr></tbody></table></div><p class="bio-guide">출처: FunETF 구성종목 비교 · 원본 TOP10의 비중 합계를 100%로 환산했습니다. 각 비중 아래에 원본 값을 함께 표시합니다. 구성종목 수에는 TOP10 이외 종목도 포함됩니다. 소수점 둘째 자리의 반올림 차이까지 배분해 표시 합계가 정확히 100.00%가 되도록 했습니다. 매일 오전 게시 전에 확인하며, 휴장일에는 최근 공개 기준일을 표시합니다.</p></section><style>.bio-comparison{background:white;border:1px solid #dbe4ee;border-radius:16px;margin:24px 0;padding:24px}.bio-comparison-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.bio-kicker{font-size:12px;font-weight:700;letter-spacing:.08em;color:#52786a}.bio-comparison h2{margin:4px 0 8px;font-size:24px}.bio-comparison-head p,.bio-guide{font-size:13px;color:#52647a}.bio-comparison a{color:#17477b}.bio-table-scroll{overflow:auto;border:1px solid #cbd5e1;border-radius:8px}.bio-comparison table{border-collapse:separate;border-spacing:0;width:100%;min-width:1000px;font-size:14px}.bio-comparison caption{text-align:left;padding:12px;font-size:13px;color:#52647a}.bio-comparison th,.bio-comparison td{padding:14px 12px;border-right:1px solid #d4dce8;border-bottom:1px solid #d4dce8}.bio-comparison th{background:#f0f4fa;text-align:center}.bio-comparison thead th{text-align:left;min-width:210px}.bio-comparison thead th:first-child{min-width:72px}.bio-comparison thead a{display:block;text-decoration:none;font-weight:700;margin-top:8px}.bio-comparison small{display:block;color:#7d8b9c;font-size:12px;font-weight:400;margin-top:3px}.bio-comparison tbody th{position:sticky;left:0;z-index:1;min-width:72px;font-size:12px}.bio-stock{min-width:130px}.bio-weight{text-align:right;font-variant-numeric:tabular-nums;min-width:42px}.bio-count td,.bio-total td{text-align:center;font-weight:700}.bio-total td{background:#f5f8fc}.bio-table-scroll:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(max-width:600px){.bio-comparison{padding:16px 12px}.bio-comparison-head{display:block}.bio-comparison-head>a{font-size:13px}.bio-comparison h2{font-size:21px}}</style>`;
}
