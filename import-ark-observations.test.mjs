import test from 'node:test';
import assert from 'node:assert/strict';
import {buildObservations} from './import-ark-observations.mjs';
import {buildStockModel} from './all-holdings/stock-trends.mjs';
const rows=Array.from({length:12},(_,i)=>['US:S'+i,1100,8]);
const official={names:{},etfs:{ARKK:{snapshots:{'2026-11-13':{units:null,rows:[['US:NVDA',1497307,3.41],...rows]}}}}};
const rec=(date,ticker,prev,shares,wPrev,w)=>({date,etf:'ARKK',market:'US',name:ticker,ticker,kind:'',shares_prev:prev,shares,weight_prev:wPrev,weight:w});
const feed=changes=>({last_success:'2026-11-14T16:06:43+00:00',changes});
const day12=['NVDA',...rows.map(r=>r[0].slice(3))].map((t,i)=>rec('2026-11-12',t,1000,i?1100:1233904,8,i?8:3.44));
day12[0]=rec('2026-11-12','NVDA',1000000,1233904,3.6,3.44);
test('third-party ARK records are imported only after matching the official file on overlapping days',()=>{
 const ok=buildObservations(feed([...day12,rec('2026-11-13','NVDA',1233904,1497307,3.44,3.41),rec('2026-11-13','',1,2,0.1,0.1)]),official,{fetchedAt:'t'});
 assert.equal(ok.verified.matched,1);assert.equal(ok.records.length,14);assert.deepEqual(ok.records.find(r=>r[0]==='2026-11-13'),['2026-11-13','ARKK','US:NVDA',1497307,3.41,1233904,3.44]);
 assert.throws(()=>buildObservations(feed([rec('2026-11-13','NVDA',1,1497000,3.44,3.41)]),official),/disagree/);
 assert.throws(()=>buildObservations(feed(day12),official),/cannot verify/);
});
test('observations add hollow points before official collection and flow-adjusted estimates only with full coverage',()=>{
 const observations=buildObservations(feed([...day12,rec('2026-11-13','NVDA',1233904,1497307,3.44,3.41)]),official);
 const m=buildStockModel(official,[],{observations}),s=m.stocks['US:NVDA'],arkk=m.etfs.findIndex(e=>e.id==='ARKK');
 assert.deepEqual(s.w[arkk].map(p=>[m.dates[p[0]],p[1],p[3]||0]),[['2026-11-12',3.44,1],['2026-11-13',3.41,0]]);
 // 11-12 covers all 13 holdings: every other row grew 10% (flows), NVDA grew 23.4% → adjusted increase ≈ +12.2%.
 const c=s.c.find(x=>x[0]==='2026-11-12');assert.equal(m.kinds[c[2]],'증가');assert.equal(c[6],2);assert.ok(Math.abs(c[3]-0.1217)<0.001);
 // 11-13 has a single record (<80% coverage): no buy/sell estimate.
 assert.ok(!s.c.some(x=>x[0]==='2026-11-13'));
 assert.equal(m.third.from,'2026-11-12');assert.equal(m.third.matched,1);
});
