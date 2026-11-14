// ETF별 구성종목 TOP10 기간 비교: current FunETF holdings beside those of 1/3/6 months ago and the listing date.
// Both sides come from the same FunETF dated PDF endpoint so the change column compares like with like;
// securities are matched by ISIN (grpItmNo). Dated holdings never change, so they are cached in state/period-holdings.json.
import {comparisonConfig} from './comparison-config.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const PERIODS=[['m1','1개월 전',1],['m3','3개월 전',3],['m6','6개월 전',6],['listing','상장일',null]];
const pdfUrl=(isin,date)=>{const ymd=date.replaceAll('-','');return 'https://www.funetf.co.kr/api/public/product/view/etfpdf?'+new URLSearchParams({itemId:isin,gijunYmd:ymd,etfPdfYmd:ymd});};
const chartUrl=isin=>'https://www.funetf.co.kr/api/public/compare/view/etfchart?'+new URLSearchParams({compareCd_1:isin,compareNat_1:'KR',schSuikMode:'T',schSuikPeriod:'120',compNat:'KR'});
const iso=d=>d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6);
const shift=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*864e5).toISOString().slice(0,10);
const weekend=date=>[0,6].includes(new Date(date+'T00:00:00Z').getUTCDay());
export function monthsBefore(date,months){
 const [y,m,d]=date.split('-').map(Number),t=new Date(Date.UTC(y,m-1-months,1)),last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate();
 return new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),Math.min(d,last))).toISOString().slice(0,10);
}
const isCash=r=>/^KRD|^CASH\d/i.test(r.key)||/현금|예금|CASH/i.test(r.name);
// A usable day has at least five weighted securities summing to about 100%. Before listing FunETF lists only
// "설정현금액", and holidays return an empty list: both mean "no holdings on this date", not an error.
export function parsePeriodPdf(list){
 if(!Array.isArray(list)||!list.length)return null;
 const rows=list.map(r=>({key:String(r.grpItmNo||r.ticker||'').trim(),ticker:r.ticker==null?null:String(r.ticker).trim(),name:String(r.citmNm||'').trim(),weight:Math.round(Number(r.evP)*10000)/10000}));
 if(rows.some(r=>!r.key||!r.name||!Number.isFinite(r.weight)))throw Error('Invalid FunETF holdings row');
 const sum=rows.reduce((s,r)=>s+r.weight,0);
 if(rows.filter(r=>r.weight>0).length<5||sum<95||sum>105)return null;
 return rows.sort((a,b)=>b.weight-a.weight);
}
// Walks back from the target to the nearest business day with holdings (at most ten calendar days).
async function resolveDay(get,item,target,floor){
 for(let i=0;i<10;i++){
  const date=shift(target,-i);
  if(floor&&date<floor)return null;
  if(weekend(date))continue;
  if(await get(item,date))return date;
 }
 return null;
}
export async function updatePeriodHoldings(request,cache={},{universes,latest,pause=()=>new Promise(r=>setTimeout(r,1500)),warn=m=>console.warn('::warning::'+m),today=new Date().toISOString().slice(0,10)}={}){
 const out={products:{...(cache.products||{})}};let sent=0,blocked=null;
 const call=async url=>{if(blocked)throw blocked;if(sent++)await pause();try{return await request(url,'json');}catch(e){if(/HTTP (429|5\d\d)|fetch failed|abort|timeout/i.test(e.message))blocked=e;throw e;}};
 const entry=isin=>out.products[isin]??={days:{},empty:[]};
 const get=async(item,date)=>{
  const e=entry(item.isin);
  if(e.days[date])return e.days[date];
  if(e.empty.includes(date))return null;
  const rows=parsePeriodPdf(await call(pdfUrl(item.isin,date)));
  if(rows)e.days[date]=rows;else e.empty.push(date);
  return rows;
 };
 const used={};
 for(const universe of universes){
  const config=comparisonConfig(universe),date=latest[universe];
  for(const item of config.products){
   const e=entry(item.isin),keep=used[item.isin]??=new Set();
   try{
    // Listing: FunETF's single-ETF return series starts in the listing week (or 10 years ago at most). The first day
    // with weighted holdings near it is the listing date. FunETF publishes no weights for older dates (evP null), so
    // for those ETFs binary-search the first date with weights and label it as the data start, not the listing date.
    if(!e.listing){
     const series=await call(chartUrl(item.isin)),first=Array.isArray(series)&&series[0]?.evalD?iso(String(series[0].evalD)):null;
     if(!first)throw Error('No FunETF return series for '+item.name);
     const capped=first<=shift(monthsBefore(today,120),14),usable=async(from,span)=>{for(let i=0;i<span;i++){const d=shift(from,i);if(d>date)return null;if(!weekend(d)&&await get(item,d))return d;}return null;};
     let start=capped?null:await usable(shift(first,-10),21);
     if(start){for(let d=shift(start,-1),misses=0,n=0;misses<3&&n<40;d=shift(d,-1),n++){if(weekend(d))continue;if(await get(item,d)){start=d;misses=0;}else misses++;}e.listing={date:start,kind:'listing',listed:start};}
     else{
      let lo=Date.parse(first+'T00:00:00Z')/864e5,hi=Date.parse(date+'T00:00:00Z')/864e5,found=await usable(date,1)||await resolveDay(get,item,date,null);
      if(!found)throw Error('No weighted holdings up to '+date);
      while(hi-lo>7){const mid=Math.floor((lo+hi)/2),d=new Date(mid*864e5).toISOString().slice(0,10),hit=await usable(d,7);if(hit){found=hit;hi=mid;}else lo=mid;}
      const day=n=>new Date(n*864e5).toISOString().slice(0,10),tail=await usable(day(lo+1),hi-lo+7);if(tail&&tail<found)found=tail;
      e.listing={date:found,kind:'earliest',listed:capped?null:first};
     }
    }
    keep.add(e.listing.date);
    e.current=await resolveDay(get,item,date,null);if(e.current)keep.add(e.current);
    e.targets={};
    for(const [key,,months] of PERIODS){if(!months)continue;const target=monthsBefore(date,months);e.targets[key]=target<e.listing.date?{target,date:null}:{target,date:await resolveDay(get,item,target,e.listing.date)};if(e.targets[key].date)keep.add(e.targets[key].date);}
   }catch(err){warn('Period holdings skipped for '+item.name+': '+err.message);}
  }
 }
 for(const [isin,e] of Object.entries(out.products)){const keep=used[isin];if(!keep)continue;e.days=Object.fromEntries(Object.entries(e.days).filter(([d])=>keep.has(d)));e.empty=e.empty.filter(d=>d>=shift(today,-200)).slice(-60);}
 return out;
}
const display=r=>{const parts=r.name.split('/');return parts.length>1&&/[가-힣]/.test(parts[0])?parts[0]:r.name;};
const top10=rows=>rows.filter(r=>!isCash(r)).slice(0,10);
const pct=v=>v.toFixed(2)+'%';
function change(now,past){
 if(now===undefined)return '<span class="bio-period-gone">편출</span>';
 if(past===undefined)return '<span class="bio-period-new">신규</span>';
 const d=Math.round((now-past)*100)/100;
 return '<span class="'+(d>0?'up':d<0?'down':'flat')+'">'+(d>0?'+':'')+d.toFixed(2)+'%</span>';
}
// One combined table per period: rows are every stock in any ETF's current or past TOP10 (matched by ISIN);
// each ETF has current weight, change and past weight. An ETF whose TOP10s do not include the stock stays blank.
export function combinedPeriodRows(items,key){
 const rows=new Map();
 items.forEach(({e},k)=>{
  const now=e.days[e.current],date=key==='listing'?e.listing.date:e.targets?.[key]?.date,past=date?e.days[date]:null;
  const nowMap=new Map(now.map(r=>[r.key,r])),pastMap=new Map((past||[]).map(r=>[r.key,r]));
  const pastTop=past?top10(past):[],nowTop=top10(now);
  for(const r of [...nowTop,...pastTop]){
   if(!rows.has(r.key))rows.set(r.key,{key:r.key,name:r.name,ticker:r.ticker,cells:items.map(()=>null)});
   const row=rows.get(r.key);if(row.cells[k])continue;
   row.cells[k]={now:nowMap.get(r.key)?.weight,past:past?pastMap.get(r.key)?.weight:null,hasPast:!!past,inNowTop:nowTop.some(x=>x.key===r.key)};
  }
 });
 const score=r=>r.cells.reduce((s,c)=>s+(c?.now??0),0);
 return [...rows.values()].sort((a,b)=>b.cells.filter(Boolean).length-a.cells.filter(Boolean).length||score(b)-score(a));
}
export function periodHoldingsSection(cache,universe){
 const config=comparisonConfig(universe),items=config.products.map(p=>({p,e:cache?.products?.[p.isin]})).filter(x=>x.e?.current&&x.e.days[x.e.current]&&x.e.listing);
 if(!items.length)return '';
 const panels=PERIODS.map(([key,label],pi)=>{
  const rows=combinedPeriodRows(items,key);
  const head=items.map(({p,e})=>{const date=key==='listing'?e.listing.date:e.targets?.[key]?.date,target=e.targets?.[key]?.target;
   const pastNote=date?(key==='listing'?(e.listing.kind==='listing'?'상장 초기 ':'비중 공개 시작 '):'')+date:key!=='listing'&&target&&target<e.listing.date?(e.listing.kind==='listing'?'상장 전':'비중 자료 없음'):'자료 없음';
   return {name:p.name,current:e.current,pastNote,hasPast:!!date};});
  const pastLabel=key==='listing'?'상장일 비중':label+' 비중';
  const table='<div class="bio-table-scroll bio-period-scroll"><table class="bio-period-table"><thead><tr><th scope="col" rowspan="2" class="bio-period-stock">구성종목</th>'+head.map(h=>'<th scope="colgroup" colspan="3">'+esc(h.name)+'<small>현재 '+h.current+' · '+esc(label)+' '+esc(h.pastNote)+'</small></th>').join('')+'</tr><tr>'+head.map(()=>'<th scope="col">비중</th><th scope="col">비중 변동폭</th><th scope="col">'+esc(pastLabel)+'</th>').join('')+'</tr></thead><tbody>'
   +rows.map(r=>'<tr><th scope="row" class="bio-period-stock"><span title="'+esc(r.name+(r.ticker?' · '+r.ticker:''))+'">'+esc(display(r))+'</span>'+(r.ticker?'<small>'+esc(r.ticker)+'</small>':'')+'</th>'+r.cells.map(c=>!c?'<td class="blank"></td><td class="blank"></td><td class="blank sep"></td>':'<td>'+(c.now===undefined?'<span class="bio-period-gone">미보유</span>':pct(c.now)+(c.inNowTop?'':'<small>TOP10 밖</small>'))+'</td><td>'+(c.hasPast?change(c.now,c.past):'-')+'</td><td class="sep">'+(!c.hasPast?'-':c.past===undefined?'<span class="bio-period-gone">미보유</span>':pct(c.past))+'</td>').join('')+'</tr>').join('')
   +'</tbody></table></div>';
  return '<div class="bio-period-panel" data-period="'+key+'"'+(pi===0?'':' hidden')+'>'+table+'</div>';
 }).join('');
 const capped=items.filter(x=>x.e.listing.kind!=='listing').map(x=>x.p.name);
 return `<section class="bio-periods" aria-labelledby="bio-periods-title"><div class="bio-history-heading"><h2 id="bio-periods-title">ETF별 구성종목 TOP10 기간 비교</h2><div class="bio-history-links"><a class="bio-ranking-jump" href="#bio-history-title">날짜별 비중 변화로 ↑</a><a class="bio-ranking-jump" href="#bio-comparison-title">${config.label} ETF 구성종목 비교로 ↑</a></div></div><p class="bio-guide">${items.length}개 ETF의 현재 TOP10과 선택 시점 TOP10에 든 종목을 한 표로 모았습니다. ETF마다 현재 비중, 비중 변동폭(현재 − 과거, %p), 선택 시점 비중을 보여주며, 그 ETF의 두 TOP10 어디에도 없는 종목은 공란입니다. 여러 ETF에 공통된 종목이 위에 옵니다. 비중은 FunETF 구성종목(PDF) 평가금액 비중이고 종목은 ISIN으로 맞춥니다. 현금은 제외합니다. 기준일이 휴일이면 직전 영업일 자료를 씁니다. 상장일은 FunETF에서 처음 구성종목이 공개된 날입니다.${capped.length?' '+esc(capped.join(', '))+'은 상장 초기 비중이 FunETF에 없어 비중 공개 시작일을 표시합니다.':''} FunETF 비중은 위 공식 자료 비중과 소폭 다를 수 있습니다.</p><div class="bio-period-tabs" role="group" aria-label="비교 기간">${PERIODS.map(([key,label],i)=>`<button type="button" data-period-select="${key}" aria-pressed="${i===0}">${label}</button>`).join('')}</div>${panels}</section><style>.bio-periods{margin-top:24px;border-top:1px solid #e5e9f0;padding-top:24px}.bio-periods h2{margin:0;font-size:24px}.bio-period-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.bio-period-tabs button{font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:0;border-radius:8px;background:#e8f1ff;color:#2563eb;padding:9px 18px}.bio-period-tabs button[aria-pressed="true"]{background:#1d6ff2;color:#fff}.bio-periods button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.bio-period-scroll{overflow:auto;max-height:760px;border:1px solid #dbe4ee;border-radius:12px}.bio-period-table{border-collapse:separate;border-spacing:0;font-size:13px;white-space:nowrap;min-width:100%}.bio-period-table thead th{position:sticky;top:0;z-index:2;background:#e8f1ff;font-weight:700;padding:6px 10px;border-bottom:1px solid #dbe4ee;text-align:center}.bio-period-table thead tr:first-child th[colspan]{border-left:2px solid #c7d6ea;height:52px}.bio-period-table thead tr:first-child th small{display:block;font-size:11px;font-weight:500;color:#5b6f88}.bio-period-table thead tr:nth-child(2) th{top:53px;font-size:12px;font-weight:600}.bio-period-table thead tr:nth-child(2) th:nth-child(3n+1){border-left:2px solid #c7d6ea}.bio-period-table th.bio-period-stock{position:sticky;left:0;z-index:1;background:#fff;text-align:left;font-weight:500;min-width:150px;max-width:190px;overflow:hidden;text-overflow:ellipsis;padding:6px 12px;border-right:1px solid #dbe4ee}.bio-period-table thead th.bio-period-stock{z-index:3;background:#e8f1ff}.bio-period-table th.bio-period-stock small{display:block;color:#7d8b9c;font-size:11px}.bio-period-table tbody td{border-top:1px solid #edf1f6;height:40px;padding:4px 10px;text-align:right;font-weight:600}.bio-period-table tbody th{border-top:1px solid #edf1f6}.bio-period-table tbody td:nth-of-type(3n+1){border-left:2px solid #e1e9f4}.bio-period-table td small{display:block;color:#7d8b9c;font-size:10px;font-weight:500}.bio-period-table td.blank{background:#fafbfd}.bio-period-table .up{color:#dc2626}.bio-period-table .down{color:#2563eb}.bio-period-table .flat{color:#52647a}.bio-period-new{color:#dc2626;font-size:11px;border:1px solid #fecaca;border-radius:6px;padding:1px 6px}.bio-period-gone{color:#2563eb;font-size:11px;border:1px solid #bfdbfe;border-radius:6px;padding:1px 6px}@media(max-width:760px){.bio-period-table th.bio-period-stock{min-width:110px;max-width:130px}}</style><script>(()=>{const root=document.querySelector('.bio-periods');root.querySelectorAll('[data-period-select]').forEach(b=>b.addEventListener('click',()=>{const period=b.dataset.periodSelect;root.querySelectorAll('.bio-period-panel').forEach(p=>{p.hidden=p.dataset.period!==period;});root.querySelectorAll('[data-period-select]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));})();</script>`;
}
