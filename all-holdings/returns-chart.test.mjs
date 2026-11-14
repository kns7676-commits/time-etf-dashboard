import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReturns,returnsUrl,returnsChart,RETURN_INDICES,spliceReturns,fetchLongReturns} from './returns-chart.mjs';
const row=(evalD,etf,idx=0)=>({evalD,...Object.fromEntries(etf.map((v,i)=>['cmpr'+(i+1)+'Rt',v])),kospiIdx:idx,kospi200Idx:idx,kosdaqIdx:idx,sp500Idx:idx,nasdaqIdx:idx,spyIdx:null,qqqIdx:null});
test('return series request lists the five US ETFs by ISIN in tab order',()=>{
 const url=new URL(returnsUrl('us'));
 assert.equal(url.pathname,'/api/public/compare/view/etfchart');
 assert.deepEqual([1,2,3,4,5].map(i=>url.searchParams.get('compareCd_'+i)),['KR7426030003','KR7456600006','KR70174B0001','KR70186L0005','KR70015B0004']);
 assert.equal(url.searchParams.get('schSuikMode'),'T');
});
test('return series are validated: start at 0, ascending dates and numeric values',()=>{
 const r=parseReturns([row('20260428',[0,0,0,0,0]),row('20261113',[-18.79,-15.64,-8.48,-22.48,-24.93],3.6)],'us','2026-11-14T00:00:00Z');
 assert.equal(r.start,'2026-04-28');assert.equal(r.end,'2026-11-13');assert.deepEqual(r.points[1].etf,[-18.79,-15.64,-8.48,-22.48,-24.93]);assert.equal(r.points[1].idx.nasdaqIdx,3.6);
 assert.throws(()=>parseReturns([row('20260428',[0,0,0,0,0])],'us'),/missing/);
 assert.throws(()=>parseReturns([row('20260428',[1,0,0,0,0]),row('20260429',[1,1,1,1,1])],'us'),/start at 0/);
 assert.throws(()=>parseReturns([row('20260429',[0,0,0,0,0]),row('20260428',[1,1,1,1,1])],'us'),/ascending/);
 assert.throws(()=>parseReturns([row('20260428',[0,0,0,0,0]),row('20260429',['x',1,1,1,1])],'us'),/invalid/);
});
test('return chart shows ETFs by default and indices on demand, with source notes',()=>{
 const html=returnsChart(parseReturns([row('20260428',[0,0,0,0,0]),row('20261113',[-18.79,-15.64,-8.48,-22.48,-24.93],3.6)],'us'));
 assert.equal((html.match(/data-series="\d+" checked/g)||[]).length,5);
 assert.equal((html.match(/data-series=/g)||[]).length,5+RETURN_INDICES.length);
 assert.ok(html.includes('id="bio-returns-title"')&&html.includes('분배금 재투자')&&html.includes('-8.48%'));
 assert.equal(returnsChart(null),'');
});
test('weekly 10-year and daily 1-year series are spliced on the first shared date and rebased to the first point',()=>{
 const out=spliceReturns([{d:'2020-01-06',v:0},{d:'2025-11-17',v:50},{d:'2025-11-24',v:60}],[{d:'2025-11-13',v:0},{d:'2025-11-17',v:2},{d:'2026-11-13',v:12.2}]);
 assert.deepEqual(out.map(p=>p.d),['2020-01-06','2025-11-13','2025-11-17','2026-11-13']);
 assert.equal(out[2].v,50);assert.equal(out[3].v,Math.round((1.5*1.122/1.02-1)*1e6)/1e4);
 assert.deepEqual(spliceReturns([{d:'2026-05-04',v:null},{d:'2026-05-11',v:0}],[]).map(p=>p.v),[0]);
});
test('long returns are fetched per ETF so older ETFs are not cut to the youngest listing',async()=>{
 const urls=[],request=async url=>{urls.push(url);const u=new URL(url),isin=u.searchParams.get('compareCd_1'),young=isin==='KR70163Y0007';
  return u.searchParams.get('schSuikPeriod')==='120'?(young?[row('20260316',[0]),row('20261109',[5])]:[row('20210531',[0],0),row('20261109',[40],9)]):(young?[row('20251113',[null]),row('20260316',[0]),row('20261113',[6])]:[row('20251113',[0],0),row('20261113',[10],3)]);};
 const r=await fetchLongReturns(request,'kosdaq',{pause:async()=>{},checkedAt:'2026-11-14T00:00:00Z'});
 assert.equal(urls.length,4);assert.equal(r.start,'2021-05-31');assert.equal(r.products[1].first,'2026-03-16');
 assert.equal(r.points[0].etf[1],null);assert.ok(r.long);
 const html=returnsChart(r);
 assert.ok(html.includes('data-years="10"')&&html.includes('id="bio-returns-from"')&&html.includes('min="2021-05-31"'));
 assert.ok(!/\[sdw]/.test(html.match(/<script>([\s\S]*)<\/script>/)[1]),'browser script keeps no regex backslash escapes');
});
