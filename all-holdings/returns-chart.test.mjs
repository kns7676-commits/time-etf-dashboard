import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReturns,returnsUrl,returnsChart,RETURN_INDICES} from './returns-chart.mjs';
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
