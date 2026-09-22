import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupedWeightReport} from './grouped-weight-report.mjs';
test('every holding including exits is graphed exactly once in groups of five with distinct colors',()=>{
 const rows=Array.from({length:12},(_,i)=>({code:String(i),name:'Stock '+i,weight:i+1}));
 const snapshot=(sentDate,rows)=>({sentDate,products:{'2':{name:'ETF',date:sentDate,rows}}});
 const history=[snapshot('2026-09-13',rows),snapshot('2026-09-14',rows.slice(1).concat({code:'NEW',name:'New stock',weight:20}))];
 const r=groupedWeightReport(history),p=r.series[0],groups=p.groups;
 assert.deepEqual(groups.map(g=>g.rows.length),[5,5,3]);
 const all=groups.flatMap(g=>g.rows);assert.equal(new Set(all.map(r=>r.code)).size,13);
 for(const g of groups)assert.equal(new Set(g.rows.map(r=>r.color)).size,g.rows.length);
 assert.equal(all[0].code,'NEW');assert.equal(all.at(-1).code,'0');
 assert.equal(groups.flatMap(g=>g.events).filter(e=>e.kind==='added').length,1);
 assert.equal(groups.flatMap(g=>g.events).filter(e=>e.kind==='removed').length,1);
 assert.equal((r.html.match(/<polyline /g)||[]).length,13);
 assert.ok(r.text.includes('편입: New stock'));assert.ok(r.text.includes('편출: Stock 0'));
});
