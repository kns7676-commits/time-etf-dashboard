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
export function returnsChart(returns){
 if(!returns)return '';
 const series=[...returns.products.map((p,i)=>({key:'etf'+i,name:p.name,color:ETF_COLORS[i],on:true,values:returns.points.map(x=>x.etf[i])})),...RETURN_INDICES.map(([k,name,color])=>({key:k,name,color,on:false,dash:'6 4',values:returns.points.map(x=>x.idx[k])}))];
 const payload=JSON.stringify({dates:returns.points.map(p=>p.d),series}).replace(/</g,'\\u003c');
 const last=s=>{const v=s.values.filter(v=>v!==null).at(-1);return v===undefined?'-':(v>0?'+':'')+v.toFixed(2)+'%';};
 const box=(s,i)=>`<label style="--c:${s.color}"><input type="checkbox" data-series="${i}"${s.on?' checked':''}><span>${esc(s.name)}</span><b>${last(s)}</b></label>`;
 return `<section class="bio-returns" aria-labelledby="bio-returns-title"><div class="bio-returns-head"><h2 id="bio-returns-title">수익률 추이</h2><p>${returns.start} ~ ${returns.end} · 누적 수익률(%) · <a href="${esc('https://www.funetf.co.kr/product/comparison/etf?itemIds='+comparisonConfig(returns.universe).products.map(p=>p.isin).join(','))}" target="_blank" rel="noopener">FunETF 원본 ↗</a></p></div><div class="bio-returns-legend">${series.slice(0,returns.products.length).map((s,i)=>box(s,i)).join('')}</div><div class="bio-returns-chart"><svg id="bio-returns-svg" viewBox="0 0 1000 380" role="img" aria-label="ETF별 누적 수익률 추이"></svg><p id="bio-returns-reading" aria-live="polite"></p></div><div class="bio-returns-legend bio-returns-index">${series.slice(returns.products.length).map((s,i)=>box(s,i+returns.products.length)).join('')}</div><ul class="bio-guide bio-returns-note"><li>수익률(NAV) 그래프는 분배금 재투자를 가정한 수정기준가 기준입니다(자료: FunETF).</li><li>수익률에는 실비용(총보수+기타비용+매매중개수수료율)이 이미 반영되어 있습니다.</li><li>시작일은 비교 ETF가 모두 상장된 날부터이며, 지수(점선)는 체크하면 표시됩니다.</li></ul></section><style>.bio-returns{margin-top:36px;padding-top:28px;border-top:1px solid #e5e9f0}.bio-returns-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}.bio-returns-head h2{margin:0;font-size:24px}.bio-returns-head p{margin:0;font-size:13px;color:#63768e}.bio-returns-head a{color:#17477b}.bio-returns-legend{display:flex;flex-wrap:wrap;gap:8px 18px;margin:14px 0 6px}.bio-returns-legend label{display:inline-flex;align-items:center;gap:7px;font-size:14px;cursor:pointer;color:#20314a}.bio-returns-legend input{appearance:none;width:18px;height:18px;border:2px solid var(--c);border-radius:4px;margin:0;display:grid;place-content:center;cursor:pointer}.bio-returns-legend input:checked{background:var(--c)}.bio-returns-legend input:checked:after{content:'';width:5px;height:9px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}.bio-returns-legend input:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.bio-returns-legend b{font-size:13px;font-weight:600;color:#52647a}.bio-returns-index label{font-size:13px}.bio-returns-chart svg{display:block;width:100%;height:auto;touch-action:pan-y}.bio-returns-chart svg text{font-size:12px;fill:#7e90a6}#bio-returns-reading{min-height:22px;margin:4px 0;font-size:13px;color:#42526a}.bio-returns-note{padding-left:18px;margin:8px 0 0}.bio-returns-note li{margin:2px 0}@media(max-width:600px){.bio-returns-head h2{font-size:21px}.bio-returns-legend label{font-size:13px}}</style><script>(()=>{const data=${payload};${returnsInteraction}})();</script>`;
}
const returnsInteraction=`
const svg=document.getElementById('bio-returns-svg'),reading=document.getElementById('bio-returns-reading'),W=1000,H=380,X0=56,X1=W-20,T=20,B=H-40,n=data.dates.length;
const pct=v=>v===null?'-':(v>0?'+':'')+v.toFixed(2)+'%';
const x=i=>X0+i*(X1-X0)/Math.max(1,n-1);
function draw(){
 const shown=data.series.filter(s=>s.on),vals=shown.flatMap(s=>s.values.filter(v=>v!==null));
 let lo=Math.min(0,...vals),hi=Math.max(0,...vals);if(lo===hi)hi=lo+1;const pad=(hi-lo)*.08;lo-=pad;hi+=pad;
 const raw=(hi-lo)/5,mag=Math.pow(10,Math.floor(Math.log10(raw))),step=[1,2,5,10].map(k=>k*mag).find(k=>k>=raw),ticks=[];for(let t=Math.ceil(lo/step)*step;t<=hi;t+=step)ticks.push(Math.round(t*1e6)/1e6);
 const y=v=>B-(v-lo)/(hi-lo)*(B-T),labelEvery=Math.max(1,Math.ceil(n/6));
 svg.innerHTML=ticks.map(t=>'<line x1="'+X0+'" x2="'+X1+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="'+(t===0?'#94a3b8':'#e5e9f0')+'"'+(t===0?'':' stroke-dasharray="4 4"')+'/><text x="'+(X0-8)+'" y="'+(y(t)+4)+'" text-anchor="end">'+t+'</text>').join('')
  +data.dates.map((d,i)=>i%labelEvery&&i!==n-1?'':'<text x="'+x(i)+'" y="'+(B+24)+'" text-anchor="'+(i===0?'start':i===n-1?'end':'middle')+'">'+d.slice(2).replaceAll('-','.')+'</text>').join('')
  +shown.map(s=>{let seg=[],out='';s.values.forEach((v,i)=>{if(v===null){if(seg.length>1)out+='<polyline points="'+seg.join(' ')+'"/>';seg=[];}else seg.push(x(i)+','+y(v));});if(seg.length>1)out+='<polyline points="'+seg.join(' ')+'"/>';return '<g fill="none" stroke="'+s.color+'" stroke-width="'+(s.dash?2:2.5)+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+'>'+out+'</g>';}).join('')
  +'<line class="returns-cursor" y1="'+T+'" y2="'+B+'" stroke="#94a3b8" stroke-dasharray="3 3" visibility="hidden"/>';
 reading.textContent=data.dates[n-1]+' 기준 · '+shown.map(s=>s.name+' '+pct(s.values[n-1])).join(' · ');
}
document.querySelectorAll('.bio-returns [data-series]').forEach(box=>box.addEventListener('change',()=>{data.series[Number(box.dataset.series)].on=box.checked;draw();}));
svg.addEventListener('pointermove',e=>{const b=svg.getBoundingClientRect(),i=Math.max(0,Math.min(n-1,Math.round(((e.clientX-b.left)/b.width*W-X0)/(X1-X0)*(n-1)))),c=svg.querySelector('.returns-cursor');c.setAttribute('x1',x(i));c.setAttribute('x2',x(i));c.setAttribute('visibility','visible');reading.textContent=data.dates[i]+' · '+data.series.filter(s=>s.on).map(s=>s.name+' '+pct(s.values[i])).join(' · ');});
svg.addEventListener('pointerleave',draw);
draw();`;
