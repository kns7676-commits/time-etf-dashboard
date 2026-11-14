import test from 'node:test';
import assert from 'node:assert/strict';
import {monthsBefore,parsePeriodPdf,updatePeriodHoldings,periodHoldingsSection} from './period-holdings.mjs';
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
 assert.ok(html.includes('id="bio-periods-title"'));assert.ok(html.includes('+3.00 %'));assert.ok(html.includes('-3.00 %'));assert.ok(!html.includes('원화예금'));
 assert.match(html,/상장 전이라/);
 const before=calls.length;await updatePeriodHoldings(request,out,{universes:['kosdaq'],latest:{kosdaq:'2026-11-13'},pause:async()=>{},warn:()=>{},today:'2026-11-14'});
 assert.equal(calls.filter((u,i)=>i>=before&&u.includes(isin)).length,0,'cached dates are not requested again');
});
test('section is omitted without data',()=>{assert.equal(periodHoldingsSection(null,'bio'),'');});
