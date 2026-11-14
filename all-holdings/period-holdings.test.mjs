import test from 'node:test';
import assert from 'node:assert/strict';
import {monthsBefore,parsePeriodPdf,updatePeriodHoldings,periodHoldingsSection,combinedPeriodRows} from './period-holdings.mjs';
import {comparisonConfig} from './comparison-config.mjs';
const row=(isin,name,evP,total,ticker=isin.slice(3,9))=>({grpItmNo:isin,ticker,citmNm:name,evP,total});
const day=(shiftA=0)=>{const list=[row('KR7000000001','가종목',40+shiftA,7),row('KR7000000002','나종목',20,7),row('KR7000000003','다종목',15,7),row('KR7000000004','라종목',10,7),row('KR7000000005','마종목',8,7),row('KRD010010001','원화예금',2,7),row('KR7000000006','바종목',5-shiftA,7)];return list;};
test('months are counted back with month-end clamping',()=>{
 assert.equal(monthsBefore('2026-11-13',1),'2026-10-13');assert.equal(monthsBefore('2026-05-31',3),'2026-02-28');assert.equal(monthsBefore('2026-01-15',6),'2025-07-15');
});
test('pre-listing cash-only and empty holiday lists mean no holdings',()=>{
 assert.equal(parsePeriodPdf([]),null);assert.equal(parsePeriodPdf([row('KRD000','설정현금액',0,1)]),null);
 assert.equal(parsePeriodPdf(day()).length,7);
});
test('resolves listing, current and period dates from FunETF with holiday walk-back and stops on rate limits',async()=>{
 const isin=comparisonConfig('kosdaq').products[0].isin,calls=[];
 const request=async url=>{calls.push(url);const u=new URL(url);
  if(u.pathname.endsWith('etfchart'))return u.searchParams.get('compareCd_1')===isin?[{evalD:'20260608'}]:(()=>{throw Error('자료 요청 실패: HTTP 429');})();
  const d=u.searchParams.get('gijunYmd');if(d<'20260603'||d==='20261013')return [];return day(d>='20261113'?3:0);};
 const warnings=[],out=await updatePeriodHoldings(request,{},{universes:['kosdaq'],latest:{kosdaq:'2026-11-13'},pause:async()=>{},warn:m=>warnings.push(m),today:'2026-11-14'});
 const e=out.products[isin];
 assert.equal(e.listing.date,'2026-06-03');assert.equal(e.current,'2026-11-13');assert.equal(e.targets.m1.date,'2026-10-12');assert.equal(e.targets.m6.date,null);
 assert.match(warnings[0],/HTTP 429/);
 const html=periodHoldingsSection(out,'kosdaq');
 assert.ok(html.includes('id="bio-periods-title"'));assert.ok(html.includes('+3.00%'));assert.ok(html.includes('-3.00%'));assert.ok(!html.includes('원화예금'));
 assert.match(html,/상장 전/);assert.ok(!html.includes('data-period-etf-select'));
 const before=calls.length;await updatePeriodHoldings(request,out,{universes:['kosdaq'],latest:{kosdaq:'2026-11-13'},pause:async()=>{},warn:()=>{},today:'2026-11-14'});
 assert.equal(calls.filter((u,i)=>i>=before&&u.includes(isin)).length,0,'cached dates are not requested again');
});
test('section is omitted without data',()=>{assert.equal(periodHoldingsSection(null,'bio'),'');});
test('combined table puts shared stocks first and leaves ETFs blank where the stock is outside both TOP10s',()=>{
 const mk=(list,past)=>({current:'2026-11-13',listing:{date:'2026-01-02',kind:'listing'},targets:{m1:{target:'2026-10-13',date:'2026-10-13'}},days:{'2026-11-13':list,'2026-10-13':past}});
 const r=(key,weight)=>({key,ticker:key,name:key,weight});
 const a=mk([r('S',30),r('A',20)],[r('S',25),r('X',10)]),b=mk([r('S',40),r('B',15)],[r('S',40),r('B',15)]);
 const rows=combinedPeriodRows([{e:a},{e:b}],'m1');
 assert.deepEqual(rows.map(x=>x.key),['S','A','B','X']);
 assert.deepEqual(rows[0].cells.map(c=>[c.now,c.past]),[[30,25],[40,40]]);
 assert.equal(rows[1].cells[1],null);assert.equal(rows[1].cells[0].past,undefined);
 assert.equal(rows[3].cells[0].now,undefined);assert.equal(rows[3].cells[0].past,10);
});
