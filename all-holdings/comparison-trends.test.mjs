import test from 'node:test';
import assert from 'node:assert/strict';
import {monitoringDates,stockTrendSeries,monitoringSelections} from './comparison-trends.mjs';
const row=(code,weight,name=code)=>({code,name,weight});
const filler=n=>Array.from({length:n},(_,i)=>row('F'+i+' US EQUITY',1));
// Two-product US snapshot: 426030 is linked to AI history id 2, 0015B0 has only TOP10 data.
const comparison=(checkedAt,date,rows426,rows0015)=>({universe:'us',checkedAt,date,products:[
 {ticker:'426030',name:'TIME 미국나스닥100액티브',rows:rows426},
 {ticker:'0015B0',name:'KoAct 미국나스닥성장기업액티브',rows:rows0015}
]});
const day=(sentDate,date,rows,name='TIME 미국나스닥100액티브')=>({sentDate,products:{'2':{name,date,rows}}});
const history=[comparison('2026-11-14T01:00:00Z','2026-11-13',[row('AMD',9),row('MSFT',8)],[row('AMZN',10),row('AMD',7)])];
const holdings=[
 day('2026-11-11','2026-11-10',[row('AMD US EQUITY',8.5),row('NVDA UW EQUITY',4),...filler(5)]),
 day('2026-11-12','2026-11-11',[row('NVDA UW EQUITY',5),...filler(5)]),
 day('2026-11-13','2026-11-12',[row('AMD UQ EQUITY',1),...filler(5)],'다른 상품'),
 day('2026-11-15','2026-11-14',[row('AMD US EQUITY',9.9),...filler(5)])
];
test('monitoring dates add linked full-holdings days up to the latest comparison capture',()=>{
 assert.deepEqual(monitoringDates(history,holdings),['2026-11-11','2026-11-12','2026-11-14']);
 assert.deepEqual(monitoringDates(history,[]),['2026-11-14']);
});
test('full holdings connect venue aliases, record verified absence as zero and keep TOP10-only gaps unknown',()=>{
 const [time,koact]=stockTrendSeries(history,'AMD',holdings);
 assert.deepEqual(time.points.map(p=>[p.date,p.weight,p.status,p.source]),[
  ['2026-11-11',8.5,'reported','ai-history'],
  ['2026-11-12',0,'not-held','ai-history'],
  ['2026-11-14',9,'reported','comparison']
 ]);
 assert.deepEqual(koact.points.map(p=>[p.weight,p.status]),[[null,'missing'],[null,'missing'],[7,'reported']]);
 const outside=stockTrendSeries(history,'NVDA',holdings)[1].points.at(-1);
 assert.deepEqual([outside.weight,outside.status],[null,'outside-top10']);
});
test('name mismatches and unresolvable instrument names are not linked or guessed',()=>{
 const points=stockTrendSeries(history,'AMD',holdings)[0].points;
 assert.ok(!points.some(p=>p.date==='2026-11-13'));
 const unknown=stockTrendSeries(history,'NAME:Unknown future',holdings)[0].points[0];
 assert.deepEqual([unknown.weight,unknown.status],[null,'identifier-unavailable']);
 const future=[day('2026-11-11','2026-11-10',[row('NQZ6 INDEX',2.5),...filler(5)])];
 assert.equal(stockTrendSeries(history,'NAME:Nasdaq100 Emini 2026 12',future)[0].points[0].weight,2.5);
});
test('a newer comparison date takes precedence over an older same-day full-holdings record',()=>{
 const sameDay=[day('2026-11-14','2026-11-12',[row('AMD US EQUITY',1),...filler(5)])];
 const point=stockTrendSeries(history,'AMD',sameDay)[0].points.at(-1);
 assert.deepEqual([point.weight,point.source],[9,'comparison']);
});
test('historical selections append past holdings once, without cash or current-ranking duplicates',()=>{
 const ranking=[{code:'AMD',displayCode:'AMD',name:'AMD',score:50,values:{}}];
 const extra=[day('2026-11-10','2026-11-09',[row('NVDA UW EQUITY',3,'NVIDIA'),row('KRD010010001',2,'원화예금'),row('AMD US EQUITY',2),...filler(3)])];
 const rows=monitoringSelections(ranking,history,extra);
 assert.equal(rows[0].score,50);
 assert.deepEqual(rows.filter(r=>r.code==='NVDA').map(r=>[r.name,r.score]),[['NVIDIA',null]]);
 assert.ok(!rows.some(r=>/KRD|예금/.test(r.code+r.name)));
 assert.equal(rows.filter(r=>r.code==='AMD').length,1);
});
