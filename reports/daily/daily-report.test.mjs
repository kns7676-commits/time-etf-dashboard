import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCTS, resolveProducts, monthBefore, buildCard, reportHtml, reportText } from './daily-report.mjs';

const today={name:'TIME 글로벌AI인공지능액티브',code:'6',date:'2026-09-11',source:'https://timeetf.co.kr/m11_view.php?idx=6',
 rows:[{code:'A',name:'Sandisk Corp',weight:5.54},{code:'B',name:'SK hynix Inc',weight:4.86},{code:'C',name:'Kioxia Holdings Corp',weight:4.19},{code:'D',name:'NASDAQ 100 E-MINI INDEX SEPT 2026',weight:4.11},{code:'E',name:'Intel Corp',weight:4.07}]};
const baseline={date:'2026-08-11',kind:'month',rows:[{code:'A',name:'Sandisk Corp',weight:4.27},{code:'B',name:'SK hynix Inc',weight:2.49},{code:'C',name:'Kioxia Holdings Corp',weight:5.48},{code:'E',name:'Intel Corp',weight:4.02},{code:'Z',name:'현금',weight:6.06}]};

test('report keeps the requested product order',async()=>{
 const list=await readFile(new URL('./time-list.html', import.meta.url),'utf8');
 const resolved=resolveProducts(list);
 assert.deepEqual(resolved.map(p=>p.name),PRODUCTS);
 assert.ok(resolved.every(p=>/m11_view\.php\?idx=\d+$/.test(p.url)));
 assert.equal(new Set(resolved.map(p=>p.url)).size,PRODUCTS.length);
});
test('a product missing from the site fails instead of silently shrinking the report',()=>{
 assert.throws(()=>resolveProducts('<a href="./m11_view.php?idx=11">TIME 코스피액티브</a>'),/찾지 못함/);
});
test('one month back clamps to a real calendar date',()=>{
 assert.equal(monthBefore('2026-09-11'),'2026-08-11');
 assert.equal(monthBefore('2026-01-15'),'2025-12-15');
 assert.equal(monthBefore('2026-03-31'),'2026-02-28');
});
test('weight changes, new entries and exits are derived from the baseline',()=>{
 const c=buildCard(today,baseline);
 assert.deepEqual(c.rows.map(r=>r.delta),[1.27,2.37,-1.29,null,0.05]);
 assert.equal(c.rows[3].name,'NASDAQ 100 E-MINI INDEX SEPT 2026');
 assert.deepEqual(c.removed,['현금']);
 assert.equal(c.rows.length,5);
});
test('table renders rise, fall and new markers with the attachment colours',()=>{
 const html=reportHtml([buildCard(today,baseline)],{sentDate:'2026-09-13'});
 assert.match(html,/<span class="up">\+1\.27%<\/span>/);
 assert.match(html,/<span class="down">-1\.29%<\/span>/);
 assert.match(html,/<span class="new">신규<\/span>/);
 assert.match(html,/\.up\{color:#e5484d\}/);
 assert.match(html,/\.down\{color:#2f6fed\}/);
 assert.match(html,/<th class="n">증감\*<\/th>/);
});
test('both baseline dates are stated wherever the comparison is shown',()=>{
 const month=buildCard(today,baseline);
 const previous=buildCard(today,{...baseline,date:'2026-09-10',kind:'previous',sentDate:'2026-09-12'});
 for(const [card,label] of [[month,'2026-08-11 (1개월 전)'],[previous,'2026-09-10 (2026-09-12 발송분)']]){
  for(const out of [reportHtml([card],{sentDate:'2026-09-13'}),reportText([card],{sentDate:'2026-09-13'})]){
   assert.ok(out.includes(label),`missing ${label}`);
   assert.ok(out.includes('2026-09-11'),'missing holdings date');
  }
 }
});
test('chat text carries every holding and its change as plain text',()=>{
 const body=reportText([buildCard(today,baseline)],{sentDate:'2026-09-13'});
 assert.match(body,/1\. Sandisk Corp 5\.54% \(\+1\.27%\)/);
 assert.match(body,/3\. Kioxia Holdings Corp 4\.19% \(-1\.29%\)/);
 assert.match(body,/4\. NASDAQ 100 E-MINI INDEX SEPT 2026 4\.11% \(신규\)/);
 assert.match(body,/편출: 현금/);
 assert.doesNotMatch(body,/[\u{1F300}-\u{1FAFF}]|<b>|<i>/u);
});
