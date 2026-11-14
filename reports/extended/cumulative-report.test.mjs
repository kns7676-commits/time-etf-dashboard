import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cumulativeSeries,mergeHistory,cumulativeReport} from './cumulative-report.mjs';
const snapshot=(date,rows)=>({sentDate:date,products:{'6':{name:'Test ETF',date,rows:rows.map(([code,weight])=>({code,name:code,weight}))}}});
test('daily +0.1 and +0.1 accumulate to +0.1 and +0.2, including exits and reentry',()=>{
 const history=[snapshot('2026-09-13',[['A',1],['B',2]]),snapshot('2026-09-14',[['A',1.1],['C',.5]]),snapshot('2026-09-15',[['A',1.2],['B',1]])];
 const rows=cumulativeSeries(history)[0].rows;
 assert.deepEqual(rows.find(r=>r.code==='A').points.map(p=>p.delta),[0,.1,.2]);
 assert.deepEqual(rows.find(r=>r.code==='B').points.map(p=>p.delta),[0,-2,-1]);
 assert.deepEqual(rows.find(r=>r.code==='C').points.map(p=>p.delta),[0,.5,0]);
 const report=cumulativeReport(history);assert.ok(!report.html.includes('직전 발송 대비'));assert.ok(report.html.includes('polyline'));
});
test('same-day resend replaces the date instead of double-counting',()=>{
 const h=mergeHistory([snapshot('2026-09-13',[['A',1]]),snapshot('2026-09-14',[['A',1.1]])],snapshot('2026-09-14',[['A',1.2]]));
 assert.equal(h.length,2);assert.deepEqual(cumulativeSeries(h)[0].rows[0].points.map(p=>p.delta),[0,.2]);
});
