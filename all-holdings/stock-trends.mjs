// 종목별 ETF 추이: one stock across overseas ETFs (official daily/monthly holdings) and domestic ETFs (weights only).
// Holding changes are *estimates*: share counts are adjusted for fund-wide creations/redemptions, either per ETF unit
// (iShares publishes shares outstanding) or by the median share ratio of holdings common to both days. Domestic ETFs
// have weights only, so they show weight changes and are never classified as buys or sells.
import {OVERSEAS_ETFS,securityKey} from '../overseas-holdings.mjs';
import {themeNav,THEME_TAB_STYLE} from './theme-tabs.mjs';
export const DEFAULT_STOCK='US:NVDA';
export const CHANGE_THRESHOLD=0.005;
const KINDS=['편입','증가','감소','편출','비중↑','비중↓'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=v=>Math.round(v*100)/100,r4=v=>Math.round(v*10000)/10000;
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const dayGap=(a,b)=>(Date.parse(b)-Date.parse(a))/86400000;
// Flow factor between two snapshots of one ETF. Returns null when the estimate is not reliable enough.
export function flowFactor(prev,cur){
 if(prev.units>0&&cur.units>0)return {f:cur.units/prev.units,method:'1좌당'};
 const p=new Map(prev.rows.map(r=>[r[0],r[1]])),ratios=[];
 for(const [k,s] of cur.rows){const q=p.get(k);if(q>0&&s>0)ratios.push(s/q);}
 if(ratios.length<10||ratios.length<0.5*Math.max(prev.rows.length,cur.rows.length))return null;
 return {f:median(ratios),method:'중앙값 보정'};
}
// Per-stock changes between consecutive snapshots. Additions/removals need both snapshots to be complete files.
export function holdingChanges(prev,cur,{threshold=CHANGE_THRESHOLD,monthly=false}={}){
 const flow=flowFactor(prev,cur),p=new Map(prev.rows.map(r=>[r[0],r])),c=new Map(cur.rows.map(r=>[r[0],r])),out=[];
 for(const [k,r] of c){const q=p.get(k);
  if(!q){out.push({key:k,kind:'편입',adj:null,wPrev:null,wNow:r[2]});continue;}
  if(!flow||!(q[1]>0)||!(r[1]>0))continue;
  const adj=r[1]/(q[1]*flow.f)-1;
  if(Math.abs(adj)>threshold)out.push({key:k,kind:adj>0?'증가':'감소',adj,wPrev:q[2],wNow:r[2],method:flow.method});
 }
 for(const [k,q] of p)if(!c.has(k))out.push({key:k,kind:'편출',adj:null,wPrev:q[2],wNow:null});
 return out.map(x=>({...x,monthly}));
}
const domesticKey=code=>{const k=securityKey(code);return k&&!k.startsWith('KR:')?k:k;};
// Build the browser model. windowDays limits embedded history so the page stays small as history grows.
export function buildStockModel(overseas,history,{etfs=OVERSEAS_ETFS,windowDays=100}={}){
 const list=[],series=new Map(),changes=new Map(),names=overseas?.names||{};
 const add=(map,key,v)=>{let a=map.get(key);if(!a)map.set(key,a=[]);a.push(v);};
 const all=etfs.filter(e=>Object.keys(overseas?.etfs?.[e.id]?.snapshots||{}).length);
 const latestDate=[...all.flatMap(e=>Object.keys(overseas.etfs[e.id].snapshots)),...history.map(d=>Object.values(d.products).map(p=>p.date)).flat()].sort().at(-1);
 if(!latestDate)return null;
 const from=new Date(Date.parse(latestDate)-windowDays*86400000).toISOString().slice(0,10);
 const dateSet=new Set(),overseasKeys=new Set();
 for(const etf of all){
  const snaps=overseas.etfs[etf.id].snapshots,dates=Object.keys(snaps).sort(),idx=list.length;
  const shown=dates.filter(d=>d>=from||etf.type==='monthly'&&d===dates.at(-1));
  list.push({id:etf.id,name:etf.name,issuer:etf.issuer,type:etf.type,page:etf.page,asOf:dates.at(-1),first:dates[0],days:dates.length});
  for(const d of shown){dateSet.add(d);snaps[d].rows.forEach((r,rank)=>{overseasKeys.add(r[0]);add(series,r[0]+'|'+idx,[d,r[2],rank+1]);});}
  for(let i=1;i<dates.length;i++){if(dates[i]<from)continue;
   const gap=etf.type!=='monthly'&&dayGap(dates[i-1],dates[i])>5;
   for(const ch of holdingChanges(snaps[dates[i-1]],snaps[dates[i]],{monthly:etf.type==='monthly'}))add(changes,ch.key,[dates[i],idx,KINDS.indexOf(ch.kind),ch.adj===null?null:r4(ch.adj),ch.wPrev,ch.wNow,ch.method==='1좌당'?1:0,gap||etf.type==='monthly'?dates[i-1]:null]);
  }
 }
 // Domestic ETFs (state/cumulative.json): every product that holds at least one security found in the overseas ETFs.
 const domestic=new Map();
 for(const day of history)for(const [code,p] of Object.entries(day.products)){if(p.date<from)continue;
  const rows=p.rows.map(r=>({key:domesticKey(r.code),w:r.weight,name:r.name})).filter(r=>r.key&&r.w>0).sort((a,b)=>b.w-a.w);
  if(!rows.some(r=>overseasKeys.has(r.key)))continue;
  let d=domestic.get(code);if(!d)domestic.set(code,d={name:p.name,snaps:new Map()});d.snaps.set(p.date,rows);
 }
 for(const [code,d] of domestic){
  const idx=list.length,dates=[...d.snaps.keys()].sort();
  list.push({id:code,name:d.name,issuer:/^KoAct/.test(d.name)?'삼성액티브':/^TIME/.test(d.name)?'타임폴리오':'',type:'domestic',asOf:dates.at(-1),first:dates[0],days:dates.length});
  for(const date of dates){dateSet.add(date);d.snaps.get(date).forEach((r,rank)=>{if(overseasKeys.has(r.key))add(series,r.key+'|'+idx,[date,r2(r.w),rank+1]);});}
  for(let i=1;i<dates.length;i++){const p=new Map(d.snaps.get(dates[i-1]).map(r=>[r.key,r.w])),c=new Map(d.snaps.get(dates[i]).map(r=>[r.key,r.w]));
   for(const k of new Set([...p.keys(),...c.keys()])){if(!overseasKeys.has(k))continue;const a=p.get(k),b=c.get(k);
    const kind=a===undefined?'편입':b===undefined?'편출':b-a>=0.5?'비중↑':a-b>=0.5?'비중↓':null;
    if(kind)add(changes,k,[dates[i],idx,KINDS.indexOf(kind),null,a===undefined?null:r2(a),b===undefined?null:r2(b),0,null]);}}
 }
 const dates=[...dateSet].sort(),di=new Map(dates.map((d,i)=>[d,i]));
 const stocks={};
 for(const key of overseasKeys){
  const w={};let holders=0,total=0;
  list.forEach((e,idx)=>{const s=series.get(key+'|'+idx);if(!s)return;w[idx]=s.map(([d,v,rank])=>[di.get(d),v,rank]);const last=s.at(-1);if(last[0]===e.asOf){holders++;total+=last[1];}});
  stocks[key]={n:names[key]||key,h:holders,t:r2(total),w,c:(changes.get(key)||[]).sort((a,b)=>b[0].localeCompare(a[0]))};
 }
 return {dates,etfs:list,stocks,kinds:KINDS,latest:latestDate,from};
}
// Stocks for which a closing-price line is worth fetching: the default plus every security held by ≥2 ETFs today.
export function priceCandidates(model,limit=150){
 return Object.entries(model.stocks).filter(([k,s])=>k===DEFAULT_STOCK||s.h>=2).sort((a,b)=>(b[0]===DEFAULT_STOCK)-(a[0]===DEFAULT_STOCK)||b[1].h-a[1].h||b[1].t-a[1].t).slice(0,limit).map(([k])=>k);
}
export function priceCode(key){
 const [m,t]=key.split(':');
 return {US:t+' US EQUITY',JP:t+' JP EQUITY',TW:t+' TT EQUITY',HK:t+' HK EQUITY',KR:t}[m]||null;
}
// Browser code is passed as a real function (Function#toString) so no escaping happens inside a template literal.
function client(M,P){
 var COLORS=['#2563eb','#dc2626','#059669','#d97706','#7c3aed','#db2777','#0891b2','#65a30d','#ea580c','#4f46e5','#0d9488','#be123c','#a16207','#9333ea','#0369a1','#15803d','#b45309','#e11d48','#475569','#6d28d9'];
 var TYPE={index:'지수형',active:'액티브',monthly:'월간(월말 기준)',domestic:'국내 (비중만)'};
 var $=function(id){return document.getElementById(id);};
 var nm=function(e){return e.type==='domestic'?e.name:e.id;};
 var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 var pct=function(v,d){return v===null||v===undefined?'–':v.toFixed(d===undefined?2:d)+'%';};
 var pp=function(v){if(v===null||v===undefined)return '<span class="st-muted">–</span>';var c=v>0.005?'st-up':v<-0.005?'st-down':'';return '<span class="'+c+'">'+(v>0?'+':'')+v.toFixed(2)+'%p</span>';};
 var keys=Object.keys(M.stocks).sort(function(a,b){var x=M.stocks[a],y=M.stocks[b];return y.h-x.h||y.t-x.t;});
 var label=function(k){var t=k.split(':');return t[1]+' · '+M.stocks[k].n+(t[0]!=='US'?' ('+t[0]+')':'');};
 $('st-list').innerHTML=keys.map(function(k){return '<option value="'+esc(label(k))+'">';}).join('');
 $('st-chips').innerHTML=keys.slice(0,14).map(function(k){return '<button type="button" data-k="'+esc(k)+'">'+esc(k.split(':')[1])+'</button>';}).join('');
 var at=function(arr,dateIdx){var best=null;for(var i=0;i<arr.length;i++)if(arr[i][0]<=dateIdx)best=arr[i];return best;};
 var dateBack=function(days){var t=Date.parse(M.latest)-days*86400000,b=-1;for(var i=0;i<M.dates.length;i++)if(Date.parse(M.dates[i])<=t)b=i;return b;};
 function chart(k,s){
  var D=M.dates,n=D.length,ids=Object.keys(s.w);if(!ids.length)return '<p class="st-muted">표시할 비중 기록이 없습니다.</p>';
  var step=Math.max(16,Math.min(56,900/Math.max(1,n-1))),L=56,R=60,T=16,B=40,W=L+R+step*Math.max(1,n-1),H=320;
  var vals=[];ids.forEach(function(i){s.w[i].forEach(function(p){vals.push(p[1]);});});
  var lo=Math.min.apply(null,vals),hi=Math.max.apply(null,vals),pad=Math.max(0.2,(hi-lo)*0.12);lo=Math.max(0,lo-pad);hi=hi+pad;if(lo<hi*0.25)lo=0;
  var x=function(i){return L+i*step;},y=function(v){return T+(H-T-B)*(1-(v-lo)/(hi-lo));};
  var out='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(s.n)+' ETF별 비중 추이">';
  for(var g=0;g<=4;g++){var v=lo+(hi-lo)*g/4;out+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#e5ebf2"/><text x="'+(L-6)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="11" fill="#64748b">'+v.toFixed(1)+'%</text>';}
  var every=Math.max(1,Math.ceil(70/step));for(var i=0;i<n;i+=every)out+='<text x="'+x(i)+'" y="'+(H-B+16)+'" text-anchor="middle" font-size="11" fill="#64748b">'+D[i].slice(5)+'</text>';
  var pr=P[k];if(pr&&pr.points&&pr.points.length>1){var pts=[],cl=[];for(var j=0;j<n;j++){var c=null;for(var q=0;q<pr.points.length;q++)if(pr.points[q].d<=D[j])c=pr.points[q].c;pts.push(c);if(c!==null)cl.push(c);}
   if(cl.length>1){var pl=Math.min.apply(null,cl),ph=Math.max.apply(null,cl),pg=(ph-pl)*0.1||ph*0.05;pl-=pg;ph+=pg;var py=function(v){return T+(H-T-B)*(1-(v-pl)/(ph-pl));};
    var path='';pts.forEach(function(c,j){if(c!==null)path+=(path?'L':'M')+x(j)+' '+py(c);});out+='<path d="'+path+'" fill="none" stroke="#111827" stroke-width="1.6" stroke-dasharray="5 4"/>';
    for(var g2=0;g2<=4;g2++){var v2=pl+(ph-pl)*g2/4;out+='<text x="'+(W-R+6)+'" y="'+(py(v2)+4)+'" font-size="11" fill="#111827">'+(v2>=1000?Math.round(v2).toLocaleString():v2.toFixed(2))+'</text>';}}}
  ids.forEach(function(i){var e=M.etfs[i],col=COLORS[i%COLORS.length],seg='',prev=null;s.w[i].forEach(function(p){seg+=(prev!==null&&p[0]-prev<=(e.type==='monthly'?999:6)?'L':'M')+x(p[0])+' '+y(p[1]);prev=p[0];});
   out+='<path d="'+seg+'" fill="none" stroke="'+col+'" stroke-width="'+(e.type==='domestic'?2.4:2)+'"'+(e.type==='domestic'?' stroke-dasharray="1 4" stroke-linecap="round"':'')+'/>';
   s.w[i].forEach(function(p){out+='<circle cx="'+x(p[0])+'" cy="'+y(p[1])+'" r="2.6" fill="'+col+'"><title>'+esc(nm(e)+' '+D[p[0]]+' '+p[1].toFixed(2)+'%')+'</title></circle>';});});
  s.c.forEach(function(c){var di=M.dates.indexOf(c[0]),e=M.etfs[c[1]];if(di<0)return;var up=c[2]===0||c[2]===1||c[2]===4,v=c[5]!==null?c[5]:c[4];if(v===null)return;var cy=y(v)+(up?-9:9);
   out+='<text x="'+x(di)+'" y="'+(cy+4)+'" text-anchor="middle" font-size="12" fill="'+COLORS[c[1]%COLORS.length]+'">'+(up?'▲':'▼')+'<title>'+esc(nm(e)+' '+M.kinds[c[2]]+' '+c[0])+'</title></text>';});
  return out+'</svg>';
 }
 function render(k){
  var s=M.stocks[k];if(!s)return;
  $('st-input').value=label(k);
  var chips=document.querySelectorAll('#st-chips button');for(var ci=0;ci<chips.length;ci++)chips[ci].setAttribute('aria-pressed',chips[ci].dataset.k===k?'true':'false');
  var latestIdx=M.dates.length-1,d1=dateBack(1),d7=dateBack(7),d30=dateBack(30);
  var holders=[];Object.keys(s.w).forEach(function(i){var e=M.etfs[i],arr=s.w[i],last=arr[arr.length-1];if(M.dates[last[0]]!==e.asOf)return;holders.push({i:+i,e:e,last:last,arr:arr});});
  holders.sort(function(a,b){return b.last[1]-a.last[1];});
  var since=M.dates[Math.max(0,dateBack(7))],recent=s.c.filter(function(c){return c[0]>since;});
  var cnt=function(f){return recent.filter(f).length;};
  var act=function(c){return M.etfs[c[1]].type==='active';},idx=function(c){var t=M.etfs[c[1]].type;return t==='index'||t==='monthly';};
  var top=holders[0];
  $('st-summary').innerHTML='<div class="st-card"><b>'+esc(s.n)+'</b><span>'+esc(k)+'</span></div>'+
   '<div class="st-card"><small>보유 ETF</small><b>'+holders.length+'개</b><span>해외 '+holders.filter(function(h){return h.e.type!=='domestic';}).length+' · 국내 '+holders.filter(function(h){return h.e.type==='domestic';}).length+'</span></div>'+
   '<div class="st-card"><small>최대 비중</small><b>'+(top?pct(top.last[1]):'–')+'</b><span>'+(top?esc(top.e.type==='domestic'?top.e.name:top.e.id+' '+top.e.name):'보유 ETF 없음')+'</span></div>'+
   '<div class="st-card"><small>최근 7일 보유량 변화 (추정)</small><b>액티브 ▲'+cnt(function(c){return act(c)&&(c[2]===0||c[2]===1);})+' ▼'+cnt(function(c){return act(c)&&(c[2]===2||c[2]===3);})+'</b><span>지수형 ▲'+cnt(function(c){return idx(c)&&(c[2]===0||c[2]===1);})+' ▼'+cnt(function(c){return idx(c)&&(c[2]===2||c[2]===3);})+' · 국내 비중 변화 '+cnt(function(c){return M.etfs[c[1]].type==='domestic';})+'</span></div>';
  var delta=function(arr,back){if(back<0)return null;var p=at(arr,back),l=arr[arr.length-1];return p&&p[0]<l[0]?l[1]-p[1]:null;};
  $('st-holders').innerHTML=holders.length?'<table><thead><tr><th>ETF</th><th>유형</th><th>기준일</th><th>비중</th><th>펀드 내 순위</th><th title="직전 기록 대비">1일</th><th>1주</th><th>1개월</th><th>최근 보유량 변화 (추정)</th></tr></thead><tbody>'+holders.map(function(h){
    var last=s.c.filter(function(c){return c[1]===h.i;})[0],col=COLORS[h.i%COLORS.length];
    var lastTxt=!last?'<span class="st-muted">변화 없음</span>':esc(M.kinds[last[2]])+(last[3]!==null?' '+(last[3]>0?'+':'')+(last[3]*100).toFixed(1)+'%':'')+' <small>'+last[0].slice(5)+'</small>';
    var name=h.e.page?'<a href="'+esc(h.e.page)+'" target="_blank" rel="noopener">'+esc(h.e.id)+'</a>':esc(nm(h.e));
    return '<tr><td><i style="background:'+col+'"></i>'+name+'<small>'+esc(h.e.type==='domestic'?h.e.issuer||'국내 ETF':h.e.issuer+' · '+h.e.name)+'</small></td><td>'+TYPE[h.e.type]+'</td><td>'+h.e.asOf+'</td><td><b>'+pct(h.last[1])+'</b></td><td>'+h.last[2]+'위</td><td>'+pp(h.e.type==='monthly'?null:delta(h.arr,h.last[0]-1))+'</td><td>'+pp(h.e.type==='monthly'?null:delta(h.arr,d7))+'</td><td>'+pp(delta(h.arr,d30))+'</td><td>'+lastTxt+'</td></tr>';}).join('')+'</tbody></table>':'<p class="st-muted">현재 이 종목을 보유한 ETF가 없습니다.</p>';
  var legend=Object.keys(s.w).map(function(i){var e=M.etfs[i];return '<span><i style="background:'+COLORS[i%COLORS.length]+'"></i>'+esc(nm(e))+'</span>';}).join('')+(P[k]&&P[k].points?'<span><i class="st-price"></i>종가 ('+esc(P[k].currency||'')+')</span>':'');
  $('st-chart').innerHTML='<div class="st-legend">'+legend+'</div><div class="st-scroll">'+chart(k,s)+'</div>';
  var sc=document.querySelector('#st-chart .st-scroll');if(sc)sc.scrollLeft=sc.scrollWidth;
  $('st-log').innerHTML=s.c.length?'<table><thead><tr><th>날짜</th><th>ETF</th><th>유형</th><th>구분</th><th>조정 보유량 변화</th><th>비중</th><th>비고</th></tr></thead><tbody>'+s.c.slice(0,150).map(function(c){var e=M.etfs[c[1]],up=c[2]===0||c[2]===1||c[2]===4;
    var note=[c[6]?'1좌당 기준':c[3]!==null?'펀드 전체 증감 보정':'',c[7]?(e.type==='monthly'?'직전 공개 '+c[7]+' 대비':'관측 구간 '+c[7]+'~'):''].filter(Boolean).join(' · ');
    return '<tr><td>'+c[0]+'</td><td><i style="background:'+COLORS[c[1]%COLORS.length]+'"></i>'+esc(nm(e))+'</td><td>'+TYPE[e.type]+'</td><td class="'+(up?'st-up':'st-down')+'">'+M.kinds[c[2]]+'</td><td>'+(c[3]===null?'<span class="st-muted">–</span>':(c[3]>0?'+':'')+(c[3]*100).toFixed(1)+'%')+'</td><td>'+pct(c[4])+' → '+pct(c[5])+'</td><td><small>'+esc(note)+'</small></td></tr>';}).join('')+'</tbody></table>':'<p class="st-muted">기록 기간 안에 보유량·비중 변화가 없습니다.</p>';
  if(location.hash!=='#'+k)history.replaceState(null,'','#'+k);
 }
 var pick=function(v){v=String(v||'').trim();if(!v)return;var up=v.toUpperCase(),hit=keys.filter(function(k){return label(k)===v||k===up||k.split(':')[1]===up;})[0]||keys.filter(function(k){return label(k).toUpperCase().indexOf(up)>=0;})[0];if(hit)render(hit);};
 $('st-input').addEventListener('change',function(){pick(this.value);});
 $('st-form').addEventListener('submit',function(ev){ev.preventDefault();pick($('st-input').value);});
 $('st-chips').addEventListener('click',function(ev){var b=ev.target.closest('button');if(b)render(b.dataset.k);});
 var start=decodeURIComponent(location.hash.slice(1));render(M.stocks[start]?start:M.stocks['US:NVDA']?'US:NVDA':keys[0]);
}
const STYLE='body{background:#f4f7fb;color:#20314a;font:15px/1.6 system-ui,\'Malgun Gothic\',sans-serif;margin:0}main{max-width:1150px;margin:auto;padding:24px}h1{font-size:28px;margin:8px 0 4px}h2{font-size:19px;margin:0 0 10px}.st-lead{color:#52647a;margin:0 0 18px}.st-box{background:white;border:1px solid #dbe4ee;border-radius:14px;padding:18px;margin:0 0 18px}#st-form{display:flex;gap:8px;flex-wrap:wrap}#st-input{flex:1 1 280px;font:inherit;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px}#st-form button[type=submit]{font:inherit;font-weight:700;border:0;border-radius:10px;background:#203d70;color:white;padding:10px 20px;cursor:pointer}#st-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}#st-chips button{font:inherit;font-size:13px;border:1px solid #cbd5e1;border-radius:999px;background:white;color:#20314a;padding:4px 12px;cursor:pointer}#st-chips button[aria-pressed=true]{background:#203d70;border-color:#203d70;color:white}#st-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 18px}.st-card{background:white;border:1px solid #dbe4ee;border-radius:12px;padding:14px;display:flex;flex-direction:column}.st-card small{color:#64748b}.st-card b{font-size:20px}.st-card span{color:#52647a;font-size:13px}.st-box table{width:100%;border-collapse:collapse;font-size:14px}.st-box th{text-align:left;color:#52647a;font-weight:600;border-bottom:1px solid #dbe4ee;padding:8px 6px;white-space:nowrap}.st-box td{border-bottom:1px solid #eef2f7;padding:8px 6px;vertical-align:top}.st-box td small{display:block;color:#64748b;font-size:12px}.st-box i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:middle}.st-table{overflow-x:auto}.st-up{color:#dc2626;font-weight:700}.st-down{color:#2563eb;font-weight:700}.st-muted{color:#94a3b8}.st-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;margin-bottom:8px}.st-legend i.st-price{width:18px;height:0;border-top:2px dashed #111827;border-radius:0}.st-scroll{overflow-x:auto}.st-note{color:#52647a;font-size:13px}.st-note li{margin:2px 0}@media(max-width:800px){#st-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){main{padding:12px}h1{font-size:23px}}';
export function stockTrendsPage(model,{prices={},version=''}={}){
 const nav=themeNav('stocks','../',version);
 if(!model)return '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>종목별 ETF 추이</title><style>'+STYLE+THEME_TAB_STYLE+'</style><main>'+nav+'<h1>종목별 ETF 추이</h1><p class="st-lead">해외 ETF 구성종목 수집 전입니다.</p></main></html>';
 const used=Object.fromEntries(Object.entries(prices).filter(([k,v])=>model.stocks[k]&&v?.points).map(([k,v])=>[k,{currency:v.currency,points:v.points.filter(p=>p.d>=model.from).map(p=>({d:p.d,c:Math.round(p.c*100)/100}))}]));
 const sources=model.etfs.filter(e=>e.type!=='domestic').map(e=>'<a href="'+esc(e.page)+'" target="_blank" rel="noopener">'+esc(e.id)+'</a>').join(' · ');
 const data=JSON.stringify(model).replace(/</g,'\\u003c'),priceData=JSON.stringify(used).replace(/</g,'\\u003c');
 return '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="stock-trends-latest" content="'+esc(model.latest)+'"><title>종목별 ETF 추이 · ETF 보유종목</title><style>'+STYLE+THEME_TAB_STYLE+'</style><main>'+nav+
  '<h1>종목별 ETF 추이</h1><p class="st-lead">한 종목을 해외 ETF와 국내 ETF가 얼마나 담고 있는지, 날짜별 비중과 보유량 변화를 함께 봅니다. 기본 종목은 엔비디아입니다.</p>'+
  '<section class="st-box" aria-label="종목 선택"><form id="st-form"><input id="st-input" list="st-list" placeholder="종목명 또는 티커 (예: NVDA, Apple, 6954)" aria-label="종목 검색" autocomplete="off"><datalist id="st-list"></datalist><button type="submit">보기</button></form><div id="st-chips" aria-label="많이 보유된 종목"></div></section>'+
  '<div id="st-summary"></div>'+
  '<section class="st-box"><h2 id="st-holders-title">보유 ETF</h2><div id="st-holders" class="st-table"></div></section>'+
  '<section class="st-box"><h2>ETF별 비중 추이</h2><div id="st-chart"></div><p class="st-note">실선: 해외 ETF 비중 · 점선(색): 국내 ETF 비중 · 검은 파선: 종가(오른쪽 축) · ▲▼: 보유량·비중 변화. 기록이 없는 날은 선을 잇지 않습니다.</p></section>'+
  '<section class="st-box"><h2>보유량 변화·매매 추정</h2><div id="st-log" class="st-table"></div></section>'+
  '<section class="st-box st-note"><h2>읽는 법</h2><ul>'+
  '<li><b>조정 보유량 변화</b>는 추정치입니다. ETF 자금 유입·유출(설정·환매)로 모든 종목 수량이 함께 늘거나 주는 효과를 빼고 계산합니다. iShares는 ETF 1좌당 보유 주식 수, 나머지는 두 날짜에 공통으로 보유한 종목들의 수량 비율 중앙값으로 보정합니다. ±0.5%를 넘을 때만 증가·감소로 표시합니다.</li>'+
  '<li><b>지수형</b> ETF의 변화는 대부분 지수 변경·리밸런싱, <b>액티브</b> ETF는 운용 판단일 가능성이 큽니다. 실제 거래 내역은 아닙니다.</li>'+
  '<li><b>국내</b> ETF는 비중만 있어 매수·매도를 판단하지 않고 0.5%p 이상 비중 변화만 표시합니다. 비중은 주가만 움직여도 바뀝니다.</li>'+
  '<li><b>월간</b>(Vanguard)은 월말 기준 공개 자료로 직전 공개 대비 변화입니다. 같은 종목이라도 ADR과 현지 주식(예: TSM과 2330)은 따로 셉니다.</li>'+
  '<li>해외 ETF 기록은 Global X(BOTZ·AIQ)만 공식 과거 파일로 '+esc(model.etfs.filter(e=>e.issuer==='Global X').map(e=>e.first).sort()[0]||'-')+' 이후를 채웠고, 나머지는 수집을 시작한 날부터 쌓입니다. 기준일은 미국 장 마감 기준입니다.</li>'+
  '<li>출처(운용사 공식 페이지): '+sources+'</li></ul></section>'+
  '<script>('+client.toString()+')('+data+','+priceData+');</script></main></html>';
}
