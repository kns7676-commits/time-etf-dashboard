// FunETF comparison "수익률 추이": cumulative NAV returns (distributions reinvested, costs included) per ETF,
// plus market indices, from the same JSON endpoint the FunETF comparison page uses.
import {comparisonConfig} from './comparison-config.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const RETURN_INDICES=[['sp500Idx','S&P500(H)','#CC244E'],['nasdaqIdx','나스닥100(H)','#65a30d'],['kospi200Idx','코스피200','#864c00'],['kospiIdx','KOSPI','#B9946E'],['kosdaqIdx','KOSDAQ','#a78bfa']];
export const ETF_COLORS=['#2563eb','#d97706','#059669','#9333ea','#dc2626'];
export function returnsUrl(universe,months=12){
 const config=comparisonConfig(universe),params=new URLSearchParams();
 config.products.forEach((p,i)=>{params.set('compareCd_'+(i+1),p.isin);params.set('compareNat_'+(i+1),'KR');});
 params.set('schSuikMode','T');params.set('schSuikPeriod',String(months));params.set('compNat','KR');
 return 'https://www.funetf.co.kr/api/public/compare/view/etfchart?'+params;
}
const iso=d=>/^\d{8}$/.test(d)?d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6):null;
const value=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):NaN;
export function parseReturns(data,universe,checkedAt=new Date().toISOString()){
 const config=comparisonConfig(universe);
 if(!Array.isArray(data)||data.length<2)throw Error('FunETF return series missing');
 const points=data.map(r=>({d:iso(String(r.evalD)),etf:config.products.map((_,i)=>value(r['cmpr'+(i+1)+'Rt'])),idx:Object.fromEntries(RETURN_INDICES.map(([k])=>[k,value(r[k])]))}));
 if(points.some(p=>!p.d||p.etf.some(Number.isNaN)||Object.values(p.idx).some(Number.isNaN)))throw Error('FunETF return series has invalid values');
 if(points.some((p,i)=>i&&p.d<=points[i-1].d))throw Error('FunETF return dates are not ascending');
 if(points[0].etf.some(v=>v!==0&&v!==null))throw Error('FunETF returns must start at 0');
 return {universe,checkedAt,source:returnsUrl(universe),start:points[0].d,end:points.at(-1).d,products:config.products.map(p=>({ticker:p.ticker,name:p.name})),points};
}
export async function fetchReturns(request,universe){
 return parseReturns(await request(returnsUrl(universe),'json'),universe);
}
// One ETF per request: FunETF aligns a multi-ETF request to the youngest listing, so long ranges are fetched per ETF.
// schSuikPeriod=12 returns daily points; 120 (10 years, FunETF's limit) returns weekly points.
export const singleReturnsUrl=(isin,months)=>'https://www.funetf.co.kr/api/public/compare/view/etfchart?'+new URLSearchParams({compareCd_1:isin,compareNat_1:'KR',schSuikMode:'T',schSuikPeriod:String(months),compNat:'KR'});
export function parseSingleReturns(data){
 if(!Array.isArray(data)||data.length<2)throw Error('FunETF return series missing');
 const pts=data.map(r=>({d:iso(String(r.evalD)),etf:value(r.cmpr1Rt),idx:Object.fromEntries(RETURN_INDICES.map(([k])=>[k,value(r[k])]))}));
 if(pts.some(p=>!p.d||Number.isNaN(p.etf)||Object.values(p.idx).some(Number.isNaN)))throw Error('FunETF return series has invalid values');
 if(pts.some((p,i)=>i&&p.d<=pts[i-1].d))throw Error('FunETF return dates are not ascending');
 return pts;
}
// Joins a 10-year weekly series with the latest 1-year daily series. Both are cumulative returns (%) from their own
// start, so they become levels and the daily part is scaled to the weekly level on the first shared date.
export function spliceReturns(weekly,daily){
 const w=weekly.filter(p=>p.v!==null),d=daily.filter(p=>p.v!==null);
 if(!d.length||!w.length){const only=d.length?d:w;if(!only.length)return [];const b=1+only[0].v/100;return only.map(p=>({d:p.d,v:Math.round(((1+p.v/100)/b-1)*1e6)/1e4}));}
 const wMap=new Map(w.map(p=>[p.d,p.v])),join=d.find(p=>wMap.has(p.d))??d[0],wBase=wMap.get(join.d)??[...w].reverse().find(p=>p.d<=join.d)?.v??w[0].v,factor=(1+wBase/100)/(1+join.v/100);
 const levels=[...w.filter(p=>p.d<d[0].d).map(p=>({d:p.d,l:1+p.v/100})),...d.map(p=>({d:p.d,l:(1+p.v/100)*factor}))];
 const base=levels[0].l;return levels.map(p=>({d:p.d,v:Math.round((p.l/base-1)*1e6)/1e4}));
}
export async function fetchLongReturns(request,universe,{pause=()=>new Promise(r=>setTimeout(r,1500)),checkedAt=new Date().toISOString()}={}){
 const config=comparisonConfig(universe),runs=[];let sent=0;
 for(const p of config.products){
  const get=async months=>{if(sent++)await pause();return parseSingleReturns(await request(singleReturnsUrl(p.isin,months),'json'));};
  runs.push({weekly:await get(120),daily:await get(12)});
 }
 const pick=(run,f)=>spliceReturns(run.weekly.map(p=>({d:p.d,v:f(p)})),run.daily.map(p=>({d:p.d,v:f(p)})));
 const etfs=runs.map(r=>pick(r,p=>p.etf));
 // Index series come from the ETF request that reaches back furthest.
 const idxRun=runs.reduce((a,b)=>b.weekly[0].d<a.weekly[0].d?b:a);
 const idx=Object.fromEntries(RETURN_INDICES.map(([k])=>[k,pick(idxRun,p=>p.idx[k])]));
 const dates=[...new Set([...etfs.flat(),...Object.values(idx).flat()].map(p=>p.d))].sort(),look=list=>new Map(list.map(p=>[p.d,p.v]));
 const etfMaps=etfs.map(look),idxMaps=Object.fromEntries(Object.entries(idx).map(([k,l])=>[k,look(l)]));
 const points=dates.map(d=>({d,etf:etfMaps.map(m=>m.get(d)??null),idx:Object.fromEntries(Object.keys(idxMaps).map(k=>[k,idxMaps[k].get(d)??null]))}));
 if(dates.length<2)throw Error('FunETF return series missing');
 return {universe,checkedAt,source:singleReturnsUrl(config.products[0].isin,120),start:dates[0],end:dates.at(-1),long:true,products:config.products.map((p,i)=>({ticker:p.ticker,name:p.name,first:etfs[i][0]?.d??null})),points};
}
export function returnsChart(returns){
 if(!returns)return '';
 const series=[...returns.products.map((p,i)=>({key:'etf'+i,name:p.name,color:ETF_COLORS[i],on:true,values:returns.points.map(x=>x.etf[i])})),...RETURN_INDICES.map(([k,name,color])=>({key:k,name,color,on:false,dash:'6 4',values:returns.points.map(x=>x.idx[k])}))];
 const payload=JSON.stringify({dates:returns.points.map(p=>p.d),series}).replace(/</g,'\\u003c');
 const last=s=>{const v=s.values.filter(v=>v!==null).at(-1);return v===undefined?'-':(v>0?'+':'')+v.toFixed(2)+'%';};
 const box=(s,i)=>`<label style="--c:${s.color}"><input type="checkbox" data-series="${i}"${s.on?' checked':''}><span>${esc(s.name)}</span><b>${last(s)}</b></label>`;
 const late=returns.products.filter(p=>p.first&&p.first>returns.start).map(p=>esc(p.name)+' '+p.first);
 const note=returns.long?'1년·3년·5년·10년 버튼이나 시작일·종료일로 기간을 고르면 선택한 시작일을 0%로 다시 계산합니다. 최근 1년은 일별, 그 이전은 주별 자료이며 FunETF 조회 한도는 10년입니다. 시작일보다 늦게 상장된 ETF는 첫 자료일부터 0%로 시작합니다'+(late.length?' ('+late.join(', ')+')':'')+'.':'기간은 최근 12개월이며, 그보다 늦게 상장된 ETF가 있으면 비교 ETF가 모두 상장된 날부터입니다.';
 return `<section class="bio-returns" aria-labelledby="bio-returns-title"><div class="bio-returns-head"><h2 id="bio-returns-title">수익률 추이</h2><p>자료 ${returns.start} ~ ${returns.end} · 누적 수익률(%) · <a href="${esc('https://www.funetf.co.kr/product/comparison/etf?itemIds='+comparisonConfig(returns.universe).products.map(p=>p.isin).join(','))}" target="_blank" rel="noopener">FunETF 원본 ↗</a></p></div><div class="bio-returns-range"><div class="bio-returns-presets" role="group" aria-label="기간 선택">${[1,3,5,10].map(y=>`<button type="button" data-years="${y}" aria-pressed="${y===1}">${y}년</button>`).join('')}</div><form class="bio-returns-dates"><label><span>시작일</span><input type="date" id="bio-returns-from" min="${returns.start}" max="${returns.end}" required></label><span aria-hidden="true">~</span><label><span>종료일</span><input type="date" id="bio-returns-to" min="${returns.start}" max="${returns.end}" required></label><button type="submit">조회</button></form></div><p id="bio-returns-period" class="bio-guide" aria-live="polite"></p><div class="bio-returns-legend">${series.slice(0,returns.products.length).map((s,i)=>box(s,i)).join('')}</div><div class="bio-returns-chart"><svg id="bio-returns-svg" viewBox="0 0 1000 380" role="img" aria-label="ETF별 누적 수익률 추이"></svg><p id="bio-returns-reading" aria-live="polite"></p></div><div class="bio-returns-legend bio-returns-index">${series.slice(returns.products.length).map((s,i)=>box(s,i+returns.products.length)).join('')}</div><ul class="bio-guide bio-returns-note"><li>수익률(NAV) 그래프는 분배금 재투자를 가정한 수정기준가 기준입니다(자료: FunETF).</li><li>수익률에는 실비용(총보수+기타비용+매매중개수수료율)이 이미 반영되어 있습니다.</li><li>${note} 지수(점선)는 체크하면 표시됩니다.</li></ul></section><style>.bio-returns{margin-top:36px;padding-top:28px;border-top:1px solid #e5e9f0}.bio-returns-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}.bio-returns-head h2{margin:0;font-size:24px}.bio-returns-head p{margin:0;font-size:13px;color:#63768e}.bio-returns-head a{color:#17477b}.bio-returns-range{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:14px 0 4px}.bio-returns-presets{display:grid;grid-template-columns:repeat(4,minmax(56px,1fr));background:#f1f3f6;border-radius:8px;padding:3px;flex:1 1 300px;max-width:520px}.bio-returns-presets button{font:inherit;font-size:14px;border:1px solid transparent;border-radius:6px;background:transparent;color:#7e8794;padding:7px 10px;cursor:pointer}.bio-returns-presets button[aria-pressed="true"]{background:#fff;border-color:#1d6ff2;color:#1d6ff2;font-weight:700}.bio-returns-dates{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.bio-returns-dates label span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.bio-returns-dates input{font:inherit;font-size:14px;border:1px solid #d3dbe6;border-radius:6px;padding:7px 10px;color:#20314a;background:#fff}.bio-returns-dates button{font:inherit;font-size:14px;font-weight:700;border:0;border-radius:6px;background:#7b8ca8;color:#fff;padding:8px 14px;cursor:pointer}.bio-returns-dates button:hover{background:#5f7190}.bio-returns-range button:focus-visible,.bio-returns-dates input:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}#bio-returns-period{margin:4px 0}.bio-returns-legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin:14px 0 6px}.bio-returns-legend label{display:inline-flex;align-items:center;gap:7px;font-size:14px;cursor:pointer;color:#20314a}.bio-returns-legend input{appearance:none;width:18px;height:18px;border:2px solid var(--c);border-radius:4px;margin:0;display:grid;place-content:center;cursor:pointer}.bio-returns-legend input:checked{background:var(--c)}.bio-returns-legend input:checked:after{content:'';width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}.bio-returns-legend input:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.bio-returns-legend b{font-size:13px;font-weight:600;color:#52647a}.bio-returns-index label{font-size:13px}.bio-returns-chart svg{display:block;width:100%;height:auto;touch-action:pan-y}.bio-returns-chart svg text{font-size:12px;fill:#7e90a6}#bio-returns-reading{min-height:22px;margin:4px 0;font-size:13px;color:#42526a}.bio-returns-note{padding-left:18px;margin:8px 0 0}.bio-returns-note li{margin:2px 0}@media(max-width:600px){.bio-returns-head h2{font-size:21px}.bio-returns-legend label{font-size:13px}.bio-returns-presets{max-width:none}.bio-returns-dates input{width:140px}}</style><script>(()=>{const data=${payload};${returnsInteraction}})();</script>`;
}
// Browser script inside a template literal: avoid backslash escapes.
const returnsInteraction=`
const svg=document.getElementById('bio-returns-svg'),reading=document.getElementById('bio-returns-reading'),period=document.getElementById('bio-returns-period'),from=document.getElementById('bio-returns-from'),to=document.getElementById('bio-returns-to'),W=1000,X0=56,X1=W-20,T=20,B=340,all=data.dates;
const pct=v=>v===null||v===undefined?'-':(v>0?'+':'')+v.toFixed(2)+'%';
const day=d=>Date.parse(d+'T00:00:00Z')/864e5,isoDay=n=>new Date(n*864e5).toISOString().slice(0,10);
const yearsBefore=(d,y)=>{const t=new Date(d+'T00:00:00Z');t.setUTCFullYear(t.getUTCFullYear()-y);return t.toISOString().slice(0,10);};
let dates=[],view=[];
// Rebase each series to its first value inside the selected range: (1+v)/(1+base)-1.
function rebase(a,b){view=data.series.map(s=>{let base=null;const out=[];for(let i=a;i<=b;i++){const v=s.values[i];if(v===null){out.push(null);continue;}if(base===null)base=v;out.push(((1+v/100)/(1+base/100)-1)*100);}return out;});}
function lastAt(k,j){const v=view[k];for(let i=j;i>=0;i--)if(v[i]!==null)return v[i];return null;}
function draw(){
 const n=dates.length,d0=day(dates[0]),d1=day(dates[n-1]),x=d=>X0+(d1===d0?0:(day(d)-d0)/(d1-d0))*(X1-X0);
 const shown=data.series.map((s,k)=>({s,k})).filter(o=>o.s.on),vals=shown.flatMap(o=>view[o.k].filter(v=>v!==null));
 let lo=Math.min(0,...vals),hi=Math.max(0,...vals);if(lo===hi)hi=lo+1;const pad=(hi-lo)*.08;lo-=pad;hi+=pad;
 const raw=(hi-lo)/5,mag=Math.pow(10,Math.floor(Math.log10(raw))),step=[1,2,5,10].map(k=>k*mag).find(k=>k>=raw),ticks=[];for(let t=Math.ceil(lo/step)*step;t<=hi;t+=step)ticks.push(Math.round(t*1e6)/1e6);
 const y=v=>B-(v-lo)/(hi-lo)*(B-T);
 svg.innerHTML=ticks.map(t=>'<line x1="'+X0+'" x2="'+X1+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="'+(t===0?'#94a3b8':'#e5e9f0')+'"'+(t===0?'':' stroke-dasharray="4 4"')+'/><text x="'+(X0-8)+'" y="'+(y(t)+4)+'" text-anchor="end">'+t+'</text>').join('')
  +[0,1,2,3,4,5].map(i=>'<text x="'+(X0+(X1-X0)*i/5)+'" y="'+(B+24)+'" text-anchor="'+(i===0?'start':i===5?'end':'middle')+'">'+isoDay(Math.round(d0+(d1-d0)*i/5)).slice(2).split('-').join('.')+'</text>').join('')
  +shown.map(({s,k})=>{const pts=[];view[k].forEach((v,i)=>{if(v!==null)pts.push(x(dates[i])+','+y(v));});return pts.length>1?'<polyline fill="none" stroke="'+s.color+'" stroke-width="'+(s.dash?2:2.2)+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+' stroke-linejoin="round" points="'+pts.join(' ')+'"/>':'';}).join('')
  +'<line class="returns-cursor" y1="'+T+'" y2="'+B+'" stroke="#94a3b8" stroke-dasharray="3 3" visibility="hidden"/>';
 document.querySelectorAll('.bio-returns [data-series]').forEach(box=>{box.parentElement.querySelector('b').textContent=pct(lastAt(Number(box.dataset.series),n-1));});
 reading.textContent=dates[n-1]+' 기준 · '+shown.map(({s,k})=>s.name+' '+pct(lastAt(k,n-1))).join(' · ');
 svg.onpointermove=e=>{const b=svg.getBoundingClientRect(),t=d0+Math.max(0,Math.min(1,((e.clientX-b.left)/b.width*W-X0)/(X1-X0)))*(d1-d0);let j=0;while(j<n-1&&day(dates[j+1])<=t)j++;const c=svg.querySelector('.returns-cursor');c.setAttribute('x1',x(dates[j]));c.setAttribute('x2',x(dates[j]));c.setAttribute('visibility','visible');reading.textContent=dates[j]+' · '+shown.map(({s,k})=>s.name+' '+pct(lastAt(k,j))).join(' · ');};
}
function apply(a,b,years){
 if(a>b){const t=a;a=b;b=t;}
 let i=all.findIndex(d=>d>=a);if(i<0)i=all.length-1;let j=all.length-1;while(j>0&&all[j]>b)j--;if(j<=i)i=Math.max(0,j-1);
 dates=all.slice(i,j+1);rebase(i,j);from.value=all[i];to.value=all[j];
 document.querySelectorAll('.bio-returns [data-years]').forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.years)===years)));
 period.textContent='선택 기간 '+all[i]+' ~ '+all[j]+' · 시작일을 0%로 본 누적 수익률'+(day(all[0])-day(a)>7?' · 자료가 '+all[0]+'부터라 그날부터 표시':'');
 draw();
}
document.querySelectorAll('.bio-returns [data-series]').forEach(box=>box.addEventListener('change',()=>{data.series[Number(box.dataset.series)].on=box.checked;draw();}));
document.querySelectorAll('.bio-returns [data-years]').forEach(btn=>btn.addEventListener('click',()=>{const y=Number(btn.dataset.years),end=all[all.length-1];apply(yearsBefore(end,y),end,y);}));
document.querySelector('.bio-returns-dates').addEventListener('submit',e=>{e.preventDefault();if(from.value&&to.value)apply(from.value,to.value,0);});
svg.addEventListener('pointerleave',draw);
apply(yearsBefore(all[all.length-1],1),all[all.length-1],1);`;
