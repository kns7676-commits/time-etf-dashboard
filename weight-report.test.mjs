import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weightSeries,weightReport,mergeHistory} from './weight-report.mjs';
const snapshot=(date,rows)=>({sentDate:date,products:{'6':{name:'Test ETF',date,rows:rows.map(([code,weight])=>({code,name:code,weight}))}}});
test('graphs show actual weights, including constant holdings, exits and new entries',()=>{
 const h=[snapshot('2026-09-13',[['A',3],['B',2],['D',1]]),snapshot('2026-09-14',[['A',3.1],['C',.5],['D',1]]),snapshot('2026-09-15',[['A',3.2],['B',1],['D',1]])];
 const rows=weightSeries(h)[0].rows;
 assert.deepEqual(rows.find(r=>r.code==='A').points.map(p=>p.weight),[3,3.1,3.2]);
 assert.deepEqual(rows.find(r=>r.code==='B').points.map(p=>p.weight),[2,0,1]);
 assert.deepEqual(rows.find(r=>r.code==='C').points.map(p=>p.weight),[0,.5,0]);
 assert.deepEqual(rows.find(r=>r.code==='D').points.map(p=>p.weight),[1,1,1]);
 const r=weightReport(h);assert.ok(!r.html.includes('%p'));assert.ok(!r.text.includes('누적'));assert.ok(r.html.includes('3.20'));assert.ok(r.html.includes('polyline'));
});
test('same-day report retains only latest actual weights',()=>{
 const h=mergeHistory([snapshot('2026-09-13',[['A',3]])],snapshot('2026-09-13',[['A',3.1]]));
 assert.equal(h.length,1);assert.equal(weightSeries(h)[0].rows[0].points[0].weight,3.1);
});
