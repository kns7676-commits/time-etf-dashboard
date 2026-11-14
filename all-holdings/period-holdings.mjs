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
const pct=v=>v.toFixed(2)+' %';
function change(now,past){
 if(past===undefined)return '<span class="bio-period-new">신규</span>';
 const d=Math.round((now-past)*100)/100;
 return '<span class="'+(d>0?'up':d<0?'down':'flat')+'">'+(d>0?'+':'')+d.toFixed(2)+' %</span>';
}
const name=(r,i)=>'<td class="bio-period-name"><span class="bio-period-rank">'+(i+1)+'</span><span title="'+esc(r.name+(r.ticker?' · '+r.ticker:''))+'">'+esc(display(r))+'</span></td>';
export function periodHoldingsSection(cache,universe){
 const config=comparisonConfig(universe),items=config.products.map(p=>({p,e:cache?.products?.[p.isin]})).filter(x=>x.e?.current&&x.e.days[x.e.current]&&x.e.listing);
 if(!items.length)return '';
 const panels=items.map(({p,e},i)=>{
  const now=e.days[e.current],nowTop=top10(now);
  return PERIODS.map(([key,label])=>{
   const date=key==='listing'?e.listing.date:e.targets?.[key]?.date,past=date&&e.days[date];
   const head='<div class="bio-period-cards">';
   let body;
   if(!past)body='<p class="bio-period-empty">'+(key!=='listing'&&e.targets?.[key]&&e.targets[key].target<e.listing.date?label+'('+e.targets[key].target+')'+(e.listing.kind==='listing'?'에는 상장 전이라 구성종목이 없습니다.':' 자료는 FunETF 비중 공개 시작일('+e.listing.date+') 이전이라 없습니다.'):label+' 구성종목 자료를 가져오지 못했습니다.')+'</p>';
   else{
    const pastWeight=new Map(past.map(r=>[r.key,r.weight])),nowKeys=new Set(now.map(r=>r.key));
    body=head+'<table class="bio-period-table"><caption>현재 · '+e.current+'</caption><thead><tr><th scope="col">구성종목</th><th scope="col">비중(%)</th><th scope="col">비중 변동폭</th></tr></thead><tbody>'+nowTop.map((r,j)=>'<tr>'+name(r,j)+'<td>'+pct(r.weight)+'</td><td>'+change(r.weight,pastWeight.get(r.key))+'</td></tr>').join('')+'</tbody></table>'
     +'<table class="bio-period-table"><caption>'+(key==='listing'?(e.listing.kind==='listing'?'상장 초기':'FunETF 비중 공개 시작'+(e.listing.listed?' (상장 '+e.listing.listed.slice(0,7)+')':'')):label)+' · '+date+'</caption><thead><tr><th scope="col">구성종목</th><th scope="col">비중(%)</th></tr></thead><tbody>'+top10(past).map((r,j)=>'<tr>'+name(r,j)+'<td>'+pct(r.weight)+(nowKeys.has(r.key)?'':'<small class="bio-period-out">현재 미보유</small>')+'</td></tr>').join('')+'</tbody></table></div>';
   }
   return '<div class="bio-period-panel" data-period-etf="'+i+'" data-period="'+key+'"'+(i===0&&key==='m1'?'':' hidden')+'>'+body+'</div>';
  }).join('');
 }).join('');
 const capped=items.filter(x=>x.e.listing.kind!=='listing').map(x=>x.p.name);
 return `<section class="bio-periods" aria-labelledby="bio-periods-title"><div class="bio-history-heading"><h2 id="bio-periods-title">ETF별 구성종목 TOP10 기간 비교</h2><div class="bio-history-links"><a class="bio-ranking-jump" href="#bio-history-title">날짜별 비중 변화로 ↑</a><a class="bio-ranking-jump" href="#bio-comparison-title">${config.label} ETF 구성종목 비교로 ↑</a></div></div><p class="bio-guide">왼쪽은 현재 TOP10과 선택 기간 대비 비중 변동폭(현재 − 과거, %p), 오른쪽은 선택 시점의 TOP10입니다. 두 쪽 모두 FunETF 구성종목(PDF) 평가금액 비중이며 종목은 ISIN으로 맞춥니다. 현금은 제외합니다. 기준일이 휴일이면 직전 영업일 자료를 씁니다. 상장일은 FunETF에서 처음 구성종목이 공개된 날입니다.${capped.length?' '+esc(capped.join(', '))+'은 상장 초기 비중이 FunETF에 없어 비중 공개 시작일을 표시합니다.':''} FunETF 비중은 위 공식 자료 비중과 소폭 다를 수 있습니다.</p><div class="bio-period-etfs" role="group" aria-label="ETF 선택">${items.map(({p},i)=>`<button type="button" data-period-etf-select="${i}" aria-pressed="${i===0}">${esc(p.name)}</button>`).join('')}</div><div class="bio-period-tabs" role="group" aria-label="비교 기간">${PERIODS.map(([key,label],i)=>`<button type="button" data-period-select="${key}" aria-pressed="${i===0}">${label}</button>`).join('')}</div>${panels}</section><style>.bio-periods{margin-top:24px;border-top:1px solid #e5e9f0;padding-top:24px}.bio-periods h2{margin:0;font-size:24px}.bio-period-etfs,.bio-period-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.bio-period-etfs button,.bio-period-tabs button{font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #d3ddeb;border-radius:8px;background:#fff;color:#28558b;padding:8px 14px}.bio-period-tabs button{border:0;background:#e8f1ff;color:#2563eb;padding:9px 18px}.bio-period-etfs button[aria-pressed="true"]{background:#203d70;border-color:#203d70;color:#fff}.bio-period-tabs button[aria-pressed="true"]{background:#1d6ff2;color:#fff}.bio-periods button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.bio-period-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.bio-period-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #dbe4ee;border-radius:14px;overflow:hidden;font-size:14px}.bio-period-table caption{caption-side:top;text-align:left;font-size:13px;font-weight:700;color:#4a6283;padding:0 4px 6px}.bio-period-table thead th{background:#e8f1ff;font-weight:700;height:52px;padding:6px 12px}.bio-period-table td{border-top:1px solid #e5e9f0;height:44px;padding:6px 12px;text-align:right;white-space:nowrap;font-weight:600}.bio-period-table td.bio-period-name{text-align:left;font-weight:500;max-width:220px;overflow:hidden;text-overflow:ellipsis}.bio-period-rank{display:inline-flex;justify-content:center;align-items:center;width:18px;height:18px;margin-right:10px;border-radius:50%;background:#dbeafe;color:#2563eb;font-size:10px;font-weight:700;vertical-align:middle}.bio-period-table .up{color:#dc2626}.bio-period-table .down{color:#2563eb}.bio-period-table .flat{color:#52647a}.bio-period-new{color:#dc2626;font-size:12px;border:1px solid #fecaca;border-radius:6px;padding:1px 6px}.bio-period-out{display:block;color:#7d8b9c;font-size:11px;font-weight:500}.bio-period-empty{padding:24px;border:1px dashed #cbd5e1;border-radius:12px;color:#52647a;text-align:center}@media(max-width:760px){.bio-period-cards{grid-template-columns:1fr}.bio-period-table td.bio-period-name{max-width:150px}}</style><script>(()=>{const root=document.querySelector('.bio-periods');let etf=0,period='m1';const show=()=>{root.querySelectorAll('.bio-period-panel').forEach(p=>{p.hidden=!(Number(p.dataset.periodEtf)===etf&&p.dataset.period===period);});root.querySelectorAll('[data-period-etf-select]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.periodEtfSelect)===etf)));root.querySelectorAll('[data-period-select]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.periodSelect===period)));};root.querySelectorAll('[data-period-etf-select]').forEach(b=>b.addEventListener('click',()=>{etf=Number(b.dataset.periodEtfSelect);show();}));root.querySelectorAll('[data-period-select]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.periodSelect;show();}));})();</script>`;
}
