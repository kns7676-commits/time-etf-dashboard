import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { htmlReport } from './presentation.mjs';
import { request } from './request.mjs';
import { samsungList } from './samsung-list.mjs';
import { groupedWeightReport, mergeHistory } from './grouped-weight-report.mjs';
const TIME_LIST='https://timeetf.co.kr/m11.php', SAM_LIST='https://www.samsungactive.co.kr/api/v1/product/etf.do?graphTerm=week&sort=DESC&orderType=YIELD_WEEK&pageNo=', SAM_API='https://www.samsungactive.co.kr/api/v1/product/etf/', SAM_SITE='https://www.samsungactive.co.kr/etf/view.do?id=';
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim(), num=x=>x==null||x===''?null:Number(String(x).replace(/,/g,''));
async function get(url){for(let i=0;i<4;i++){const r=await fetch(url,{headers:{'user-agent':'TIME-ETF-report/1.0'},signal:AbortSignal.timeout(30000)});if(r.ok)return r; if(r.status===429||r.status>=500){await new Promise(x=>setTimeout(x,1500*(i+1)));continue;}throw Error(`HTTP ${r.status}`);}throw Error('HTTP 429: 잠시 후 재시도 필요');}
async function text(url){return request(url,'text');}
function parseTime(html,url){const name=clean((html.match(/class="prdName"[^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'TIME ETF').replace(/\s+/g,' '),section=html.split('id="constituentItems"')[1]||'',date=section.match(/id="pdfDate"[^>]*value="(\d{4}-\d{2}-\d{2})"/)?.[1],body=section.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'',rows=[...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>clean(x[1]))).filter(c=>c.length===5&&num(c[4])!==null).map(c=>({code:c[0]||c[1],name:c[1],weight:num(c[4])}));let returns={};const rt=html.match(/<td[^>]*>\s*기준가\s*<\/td>([\s\S]*?)<\/tr>/i);if(rt){const cells=[...rt[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>num(clean(m[1])));returns={week:cells[0],month:cells[1],month3:cells[2]}};if(!date||rows.length<5)throw Error('TIME 자료 오류');return{name,code:url.match(/idx=(\d+)/)?.[1]||url,date,rows:rows.sort((a,b)=>b.weight-a.weight),returns,source:url};}
async function json(url){return request(url,'json');}
async function getTime(){const html=await text(TIME_LIST),urls=[...html.matchAll(/href="(\.\/m11_view\.php\?idx=\d+)"/g)].map(x=>'https://timeetf.co.kr/'+x[1].replace('./','')).filter((x,i,a)=>a.indexOf(x)===i),out=[];for(const u of urls)try{await new Promise(r=>setTimeout(r,1800));out.push(parseTime(await text(u),u));}catch(e){throw Error('TIME 상품 수집 실패: '+e.message)}return out;}
async function getSamsung(){const all=await samsungList(json,SAM_LIST);const out=[];for(const x of all){const d=await json(SAM_API+x.fId+'.do'),rows=(d.pdf?.top10?.today||[]).map(r=>({code:r.secId||r.secNm,name:r.secNm,weight:num(r.wgt)})).filter(r=>Number.isFinite(r.weight)).sort((a,b)=>b.weight-a.weight);out.push({name:x.fNm,code:x.stkTicker,date:d.pdf?.gijunYMD||x.gijunYMD,holdingsScope:'상위 10개만 제공',rows,returns:{week:num(x.yieldWeek),month:num(x.yieldMon1),month3:num(x.yieldMon3)},source:SAM_SITE+x.fId});}return out;}
const rank=(ps,k)=>ps.filter(p=>Number.isFinite(p.returns?.[k])).sort((a,b)=>b.returns[k]-a.returns[k]).slice(0,5);
function changes(now,old){const b=new Map((old?.rows||[]).map(r=>[r.code,r])),n=new Set(now.rows.map(r=>r.code));return{a:now.rows.filter(r=>!b.has(r.code)),e:(old?.rows||[]).filter(r=>!n.has(r.code)),c:now.rows.map(r=>({...r,d:Math.round((r.weight-(b.get(r.code)?.weight??r.weight))*100)/100})).filter(r=>b.has(r.code)&&Math.abs(r.d)>=.01).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d))};}
export function usableProvider(products){
 if(!Array.isArray(products)||products.length<5)return false;
 const named=value=>typeof value==='string'&&value.trim().length>0;
 if(!products.every(p=>p&&named(p.name)&&named(p.date)&&Array.isArray(p.rows)&&p.rows.length>0&&p.rows.every(r=>r&&named(r.name)&&Number.isFinite(r.weight))&&p.rows.some(r=>r.weight>0)))return false;
 return ['week','month','month3'].every(k=>rank(products,k).length===5);
}
export function availableData(results){
 const [time,samsung]=results.map((r,i)=>{
  if(r.status==='fulfilled'&&usableProvider(r.value))return r.value;
  console.error((i===0?'TIME':'삼성')+' 자료 제외: '+(r.reason?.message||'상품 자료 부족'));
  return [];
 });
 if(!time.length&&!samsung.length)throw Error('양사 상품 자료 수집 실패');
 return {time,samsung};
}
export function report(data,prev){
 const providers=[{name:'TIME',title:'TIME',key:'time',products:data.time},
  {name:'삼성',title:'삼성액티브',key:'삼성',products:data.samsung}].filter(p=>usableProvider(p.products));
 if(!providers.length)throw Error('양사 상품 자료 수집 실패');
 const L=[providers.map(p=>p.title).join(' · ')+' ETF 데일리 리포트',
  '자료 기준: '+providers.map(p=>p.name+' '+p.products[0].date).join(' · '),''];
 for(const [k,label] of [['week','최근 1주'],['month','최근 1개월'],['month3','최근 3개월']]){
  L.push('【'+label+' 수익률 상위 5】');
  for(const provider of providers){
   L.push('순위 | '+provider.name+' 상품(수익률) | 현재 비중 상위 5 (기여도 아님)');
   rank(provider.products,k).forEach((p,i)=>L.push([i+1,p.name+' ('+p.returns[k].toFixed(2)+'%)',p.rows.slice(0,5).map(r=>r.name+' '+r.weight.toFixed(2)+'%').join(', ')].join(' | ')));
   L.push('');
  }
  L.push('');
 }
 L.push('【각 기간 1위 상품의 전회 대비 구성 변화】');
 for(const provider of providers)for(const k of ['week','month','month3']){
  const p=rank(provider.products,k)[0];if(!p)continue;
  const previous=prev?.[provider.key]?.[p.code],prefix=provider.name+' '+p.name;
  if(!previous){L.push(prefix+': 이전 보유내역이 없어 변화 비교 불가');continue;}
  if(provider.key==='삼성'){L.push(prefix+': 전체 보유내역 확보 전으로 편입·편출 판단 보류');continue;}
  const d=changes(p,previous);
  L.push(provider.name+' '+(k==='week'?'1주':k==='month'?'1개월':'3개월')+' 1위 '+p.name+': 신규 '+(d.a.map(r=>r.name).join(', ')||'없음')+' · 편출 '+(d.e.map(r=>r.name).join(', ')||'없음')+' · 비중 '+(d.c.slice(0,8).map(r=>r.name+' '+(r.d>0?'+':'')+r.d.toFixed(2)+'%p').join(', ')||'없음'));
 }
 L.push('','【투자 Insight】','단기·중기 수익률 1위가 다르면 주도 테마가 이동하는 신호일 수 있습니다. 종목별 실제 수익 기여도는 미확보입니다. 표는 현재 비중 상위 종목이며 기여도 순위가 아닙니다.');
 if(providers.some(p=>p.key==='삼성'))L.push('삼성 구성은 상위 10개까지만 확보했습니다.');
 L.push('수익률과 구성종목은 기준일 이후 변동되며 투자 권유가 아닙니다.');
 return L.join('\n');
}
async function main(){
 const dry=process.argv.includes('--dry-run'),build=process.argv.includes('--build');
 if(!dry&&!build)throw Error('먼저 --build로 생성하고 게시 후 notify.mjs를 실행하세요.');
 const saved=process.env.RESEND_SAVED==='true';
 const {time,samsung}=availableData(saved?await savedResults():await Promise.allSettled([getTime(),getSamsung()]));
 let prev=null;try{prev=JSON.parse(await readFile('state/latest.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const text=(saved?'【저장 자료 · 신규 조회 자료가 아닙니다】\n':'')+report({time,samsung},saved?null:prev);
 await mkdir('output/site',{recursive:true});
 await writeFile('output/preview.txt',text);
 let history=[];
 try{history=JSON.parse(await readFile('state/cumulative.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(!saved&&time.length){
  const codes=history.length?Object.keys(history.at(-1).products):['6','2','11','15','24'];
  const selected=time.filter(p=>codes.includes(p.code));
  if(selected.length!==codes.length)throw Error('누적 그래프 대상 ETF 자료가 누락되었습니다.');
  history=mergeHistory(history,{sentDate:new Date(Date.now()+9*3600*1000).toISOString().slice(0,10),products:Object.fromEntries(selected.map(p=>[p.code,p]))});
 }
 if(!history.length)throw Error('누적 그래프를 생성할 기록이 없습니다.');
 const graph=groupedWeightReport(history).html;
 const html=graph.replace('<h1>전체 종목의 날짜별 비중 변화</h1>','<h1>ETF 보유 비중 상황판</h1>'+(saved?'<p>저장된 기록으로 만든 미리보기입니다.</p>':'')).replace('</style>','svg{min-width:0!important}</style>').replace('</main>', '<details><summary>기간별 수익률 및 구성종목 표</summary>'+htmlReport(text).match(/<main>([\s\S]*)<\/main>/)[1]+'</details></main>');
 await writeFile('output/site/index.html',html);
 await writeFile('output/report.html',html);
 if(build)await writeFile('output/pending.json',JSON.stringify({saved,history,baseline:{time:time.length?Object.fromEntries(time.map(p=>[p.code,p])):prev?.time,삼성:samsung.length?Object.fromEntries(samsung.map(p=>[p.code,p])):prev?.삼성}}));
 console.log('상황판 생성: output/site/index.html');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('리포트 처리 실패: '+e.message);process.exitCode=1;});

export function parse(html,url='https://timeetf.co.kr/m11_view.php?idx=test'){const p=parseTime(html,url);if(p.rows.length<10)throw Error('holdings rows are incomplete');return p;}
export function compare(now,old){const d=changes(now,old);return{added:d.a,removed:d.e,changed:d.c.map(r=>({...r,delta:r.d}))};}
async function savedResults(){const saved=JSON.parse(await readFile('state/latest.json','utf8'));return ['time','삼성'].map(key=>saved[key]&&Object.keys(saved[key]).length?{status:'fulfilled',value:Object.values(saved[key])}:{status:'rejected',reason:new Error('직전 보고서에 확보된 자료 없음')});}
