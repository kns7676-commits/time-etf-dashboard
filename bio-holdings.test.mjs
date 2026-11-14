import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceDate,parseSamsungHoldings,parseTigerHoldings,fetchBioHoldings,fetchKoactHoldings,KOACT_PRODUCTS} from './bio-holdings.mjs';
import {backfill,backfillTargets} from './backfill-koact.mjs';
const stocks=n=>Array.from({length:n},(_,i)=>({itmNo:String(100000+i),secNm:'종목'+i,ratio:String(100/n)}));
const samsung=(date,list)=>({pdf:{gijunYMD:date,totalCnt:list.length,list}});
const tigerRow=(code,name,weight,total)=>`<tr data-tot-cnt="${total}"><td>${code}</td><td>${name}</td><td>1</td><td>2</td><td>${weight}</td></tr>`;
test('source dates must be real calendar dates',()=>{
 assert.equal(sourceDate('20261113'),'2026-11-13');
 assert.equal(sourceDate('2026.11.13'),'2026-11-13');
 assert.throws(()=>sourceDate('20261131'),/Invalid source date/);
});
test('Samsung holdings skip unweighted cash only and reject incomplete lists',()=>{
 const parsed=parseSamsungHoldings(samsung('20261113',[...stocks(5),{itmNo:'KRD010010001',secNm:'원화예금',ratio:''}]));
 assert.equal(parsed.date,'2026-11-13');assert.equal(parsed.rows.length,5);
 assert.throws(()=>parseSamsungHoldings({pdf:{gijunYMD:'20261113',totalCnt:9,list:stocks(5)}}),/Incomplete/);
 assert.throws(()=>parseSamsungHoldings(samsung('20261113',[...stocks(5),{itmNo:'000001',secNm:'x',ratio:''}])),/Missing non-cash/);
 assert.equal(parseSamsungHoldings(samsung('20261113',[...stocks(5),{itmNo:'CASH00000001',secNm:'설정현금액',ratio:null}])).rows.length,5);
 assert.throws(()=>parseSamsungHoldings(samsung('20261113',[...stocks(5),{itmNo:'CASHFLOW',secNm:'x',ratio:''}])),/Missing non-cash/);
 assert.throws(()=>parseSamsungHoldings(samsung('20261113',stocks(5).map(r=>({...r,ratio:'10'})))),/sum outside/);
});
test('TIGER holdings require the full published row count and preserve negative cash',()=>{
 const rows=[...Array.from({length:10},(_,i)=>tigerRow('00000'+i,'종목'+i,'10.02',11)),tigerRow('KRD010010001','원화예금','-0.20',11)].join('');
 const parsed=parseTigerHoldings('<table>'+rows+'</table>','20261113');
 assert.equal(parsed.rows.length,11);assert.equal(parsed.rows.at(-1).weight,-0.2);
 assert.throws(()=>parseTigerHoldings('<table>'+rows.replace(/<tr[^>]*>[\s\S]*?<\/tr>/,'')+'</table>','20261113'),/Incomplete TIGER/);
});
test('bio fetch covers TIGER and KODEX, falls back to the latest business day and rejects stale data',async()=>{
 const tiger='<a href="?prfPrd=Week01&fixDate=20261113">',tigerRows=Array.from({length:5},(_,i)=>tigerRow('00000'+i,'종목'+i,'20',5)).join('');
 const request=async url=>{
  if(url.includes('pdf.ajax'))return tiger;
  if(url.includes('pdfListAjax'))return tigerRows;
  if(url.includes('20261113'))return samsung('20261113',stocks(5));
  throw Error('HTTP 404');
 };
 const result=await fetchBioHoldings(request,'2026-11-15');
 assert.deepEqual(Object.keys(result).sort(),['244580','364970']);
 for(const p of Object.values(result)){assert.equal(p.date,'2026-11-13');assert.equal(p.theme,'bio');}
 await assert.rejects(fetchBioHoldings(request,'2026-11-25'),/HTTP 404|Stale/);
});
test('KoAct products are fetched one at a time; a rate limit skips the rest without retrying',async()=>{
 const calls=[],failed=[],pauses=[];
 const request=async url=>{calls.push(url);if(url.includes('2ETFV2'))throw Error('자료 요청 실패: HTTP 429');return samsung('20261113',stocks(5));};
 const result=await fetchKoactHoldings(request,'2026-11-14',{onFailure:(p,e)=>failed.push(p.code+':'+/429|rate limit/.test(e.message)),pause:async()=>pauses.push(1)});
 assert.deepEqual(Object.keys(result),['0174B0','0186L0','0015B0']);
 assert.equal(result['0174B0'].theme,'koact');assert.equal(result['0174B0'].name,'KoAct 글로벌AI메모리반도체액티브');assert.ok(!('id' in result['0174B0']));
 assert.deepEqual(failed,['0193G0:true','495230:true','0163Y0:true','462900:true']);
 assert.equal(calls.filter(u=>u.includes('2ETFV2')).length,1);assert.equal(pauses.length,3);
 assert.equal(KOACT_PRODUCTS.find(p=>p.code==='462900').theme,'bio');
});
test('KoAct 5xx errors also stop the date walk-back',async()=>{
 const calls=[];
 await fetchKoactHoldings(async url=>{calls.push(url);throw Error('HTTP 503');},'2026-11-14',{products:KOACT_PRODUCTS.slice(0,1),onFailure:()=>{},pause:async()=>{}});
 assert.equal(calls.length,1);
});
test('backfill goes newest first on TIME source dates, waits out rate limits, stops products before listing and never invents data',async()=>{
 const time=date=>({name:'TIME 미국나스닥100액티브',date,rows:[]});
 const dates=['2026-11-10','2026-11-11','2026-11-12','2026-11-13'];
 const history=dates.map((d,i)=>({sentDate:'2026-11-'+(11+i),products:{'2':time(d)}}));
 const products=KOACT_PRODUCTS.slice(0,2),asked=[],waits=[];let limited=1;
 // 0186L0 has no data before 2026-11-12 (listed then); 2026-11-12 is rate limited once.
 const fetch=async(_,date,{products:want,onFailure})=>{const out={};for(const p of want){asked.push(date+':'+p.code);if(date==='2026-11-12'&&limited){limited--;onFailure(p,Error('HTTP 429'));continue;}if(p.code==='0186L0'&&date<'2026-11-12'){onFailure(p,Error('HTTP 404'));continue;}out[p.code]={name:p.name,date,rows:[{code:'MU US Equity',name:'MICRON',weight:100}],theme:'koact'};}return out;};
 let saves=0;
 const result=await backfill(history,{fetch,products,save:async()=>{saves++;},log:()=>{},pause:async ms=>{waits.push(ms);},gap:1,cooldown:99});
 assert.deepEqual(result,{added:6,stopped:false});
 assert.equal(asked[0],'2026-11-13:0174B0');
 assert.ok(waits.includes(99));
 assert.ok(!asked.includes('2026-11-10:0186L0')||asked.filter(a=>a.endsWith('0186L0')&&a<'2026-11-12').length===2);
 assert.equal(asked.filter(a=>a.endsWith(':0186L0')&&a.startsWith('2026-11-1')&&a<'2026-11-12').length,2);
 assert.ok(!history[0].products['0186L0']&&!history[1].products['0186L0']);
 assert.equal(history[3].products['0174B0'].date,'2026-11-13');
 assert.deepEqual(backfillTargets(history,products).map(t=>t.sentDate),['2026-11-11','2026-11-12']);
});
test('backfill saves progress and stops after the allowed number of rate-limit cooldowns',async()=>{
 const time=date=>({name:'TIME 미국나스닥100액티브',date,rows:[]});
 const history=[{sentDate:'2026-11-13',products:{'2':time('2026-11-12')}},{sentDate:'2026-11-14',products:{'2':time('2026-11-13')}}];
 const products=KOACT_PRODUCTS.slice(0,1);
 const fetch=async(_,date,{products:want,onFailure})=>{const out={};for(const p of want){if(date==='2026-11-12'){onFailure(p,Error('HTTP 429'));continue;}out[p.code]={name:p.name,date,rows:[],theme:'koact'};}return out;};
 let saves=0;const result=await backfill(history,{fetch,products,save:async()=>{saves++;},log:()=>{},pause:async()=>{},maxCooldowns:2});
 assert.deepEqual(result,{added:1,stopped:true});assert.equal(saves,1);
 assert.ok(history[1].products['0174B0']&&!history[0].products['0174B0']);
});
