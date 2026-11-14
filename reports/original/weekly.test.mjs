import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, compare } from './weekly.mjs';
test('reads actual HTML product name and NAV returns',()=>{
 const html='<div class="prdName">TIME<br>글로벌AI인공지능액티브</div><table><tr><td>기준가</td><td>3.06</td><td>-1.59</td><td>-12.89</td></tr></table>'+fixture();
 const p=parse(html);
 assert.equal(p.name,'TIME글로벌AI인공지능액티브');
 assert.deepEqual(p.returns,{week:3.06,month:-1.59,month3:-12.89});
});
const fixture=(count=10)=>`<div id="constituentItems"><input id="pdfDate" value="2026-09-11"><tbody>${Array.from({length:count},(_,i)=>`<tr><td>${i}</td><td>Company ${i}</td><td>1</td><td>100</td><td>10.00</td></tr>`).join('')}</tbody>`;
test('parses holdings date and rows',()=>{const p=parse(fixture());assert.equal(p.date,'2026-09-11');assert.equal(p.rows.length,10);assert.throws(()=>parse(fixture(9)));});
test('detects additions, exits and weight changes',()=>{const old={rows:[{code:'A',name:'A',weight:5},{code:'B',name:'B',weight:2}]},now={rows:[{code:'A',name:'renamed A',weight:6.2},{code:'C',name:'C',weight:1}]},d=compare(now,old);assert.equal(d.added[0].code,'C');assert.equal(d.removed[0].code,'B');assert.equal(d.changed[0].delta,1.2);});
