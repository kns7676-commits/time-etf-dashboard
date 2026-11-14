import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceDate,parseSamsungHoldings,parseTigerHoldings,fetchBioHoldings} from './bio-holdings.mjs';
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
 assert.throws(()=>parseSamsungHoldings(samsung('20261113',stocks(5).map(r=>({...r,ratio:'10'})))),/sum outside/);
});
test('TIGER holdings require the full published row count and preserve negative cash',()=>{
 const rows=[...Array.from({length:10},(_,i)=>tigerRow('00000'+i,'종목'+i,'10.02',11)),tigerRow('KRD010010001','원화예금','-0.20',11)].join('');
 const parsed=parseTigerHoldings('<table>'+rows+'</table>','20261113');
 assert.equal(parsed.rows.length,11);assert.equal(parsed.rows.at(-1).weight,-0.2);
 assert.throws(()=>parseTigerHoldings('<table>'+rows.replace(/<tr[^>]*>[\s\S]*?<\/tr>/,'')+'</table>','20261113'),/Incomplete TIGER/);
});
test('fetch falls back to the latest business day for Samsung sources and rejects stale data',async()=>{
 const tiger='<a href="?prfPrd=Week01&fixDate=20261113">',tigerRows=Array.from({length:5},(_,i)=>tigerRow('00000'+i,'종목'+i,'20',5)).join('');
 const request=async url=>{
  if(url.includes('pdf.ajax'))return tiger;
  if(url.includes('pdfListAjax'))return tigerRows;
  if(url.includes('20261113'))return samsung('20261113',stocks(5));
  throw Error('HTTP 404');
 };
 const result=await fetchBioHoldings(request,'2026-11-15');
 assert.deepEqual(Object.keys(result).sort(),['244580','364970','462900']);
 for(const p of Object.values(result)){assert.equal(p.date,'2026-11-13');assert.equal(p.theme,'bio');}
 await assert.rejects(fetchBioHoldings(request,'2026-11-25'),/HTTP 404|Stale/);
});
test('a rate-limited source stops date fallback and only that ETF is skipped when failures are tolerated',async()=>{
 const tiger='<a href="?prfPrd=Week01&fixDate=20261113">',tigerRows=Array.from({length:5},(_,i)=>tigerRow('00000'+i,'종목'+i,'20',5)).join('');
 const calls=[],failed=[];
 const request=async url=>{
  calls.push(url);
  if(url.includes('pdf.ajax'))return tiger;
  if(url.includes('pdfListAjax'))return tigerRows;
  if(url.includes('samsungactive'))throw Error('자료 요청 실패: HTTP 429');
  return samsung('20261113',stocks(5));
 };
 const result=await fetchBioHoldings(request,'2026-11-14',{onFailure:p=>failed.push(p.ticker)});
 assert.deepEqual(Object.keys(result).sort(),['244580','364970']);
 assert.deepEqual(failed,['462900']);
 assert.equal(calls.filter(u=>u.includes('samsungactive')).length,1);
});
