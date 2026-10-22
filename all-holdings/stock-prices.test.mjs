import test from 'node:test';
import assert from 'node:assert/strict';
import {yahooSymbols,parsePrices,fetchStockPrice,fetchProductPrices} from './stock-prices.mjs';
import {groupedWeightReport} from './grouped-weight-report.mjs';
const chart=(closes,start=Date.parse('2026-09-08T13:30:00Z')/1000)=>({chart:{result:[{meta:{currency:'USD',gmtoffset:-14400},timestamp:closes.map((_,i)=>start+i*86400),indicators:{quote:[{close:closes}]}}]}});
test('holding codes map to Yahoo symbols; futures, cash and Korean ETFs have none',()=>{
 assert.deepEqual(yahooSymbols('INTC US EQUITY'),['INTC']);
 assert.deepEqual(yahooSymbols('BRK/B US EQUITY'),['BRK-B']);
 assert.deepEqual(yahooSymbols('285A JP EQUITY'),['285A.T']);
 assert.deepEqual(yahooSymbols('300308 CH EQUITY'),['300308.SZ']);
 assert.deepEqual(yahooSymbols('600519 CH EQUITY'),['600519.SS']);
 assert.deepEqual(yahooSymbols('009150'),['009150.KS','009150.KQ']);
 for(const code of ['NQZ6 INDEX','현금','0043Y0'])assert.deepEqual(yahooSymbols(code),[]);
});
test('daily change uses the previous close and points start at the holdings start date',()=>{
 const r=parsePrices(chart([100,null,110,99]),'2026-09-10');
 assert.deepEqual(r.points,[{d:'2026-09-10',c:110,p:10},{d:'2026-09-11',c:99,p:-10}]);
 assert.throws(()=>parsePrices({chart:{error:{code:'Not Found'}}},'2026-09-10'),/unavailable/);
});
test('Korean codes fall back to KOSDAQ and failures never throw',async()=>{
 const seen=[];
 const r=await fetchStockPrice('036930','2026-09-08',async url=>{seen.push(url);return url.includes('.KS')?{ok:false,status:404}:{ok:true,status:200,json:async()=>chart([1,2,3])};});
 assert.equal(r.symbol,'036930.KQ');assert.equal(seen.length,2);
 assert.deepEqual(await fetchStockPrice('NQZ6 INDEX','2026-09-08',async()=>assert.fail()),{skip:true});
 assert.deepEqual(await fetchStockPrice('INTC US EQUITY','2026-09-08',async()=>({ok:false,status:429}),async()=>{}),{symbol:'INTC',error:true});
});
test('price panel appears only for the configured ETF, after the weight chart',async()=>{
 const snapshot=(sentDate,code,rows)=>({sentDate,products:{[code]:{name:'ETF '+code,date:sentDate,rows}}});
 const rows=[{code:'INTC US EQUITY',name:'Intel Corp',weight:5},{code:'현금',name:'현금',weight:1}];
 const history=[{sentDate:'2026-09-08',products:{...snapshot('2026-09-08','6',rows).products,...snapshot('2026-09-08','2',rows).products}},{sentDate:'2026-09-09',products:{...snapshot('2026-09-09','6',rows).products,...snapshot('2026-09-09','2',rows).products}}];
 const prices=await fetchProductPrices(history,['6'],async()=>({ok:true,status:200,json:async()=>chart([10,11,12])}));
 assert.deepEqual(Object.keys(prices),['6']);assert.equal(prices['6']['INTC US EQUITY'].symbol,'INTC');assert.ok(prices['6']['현금'].skip);
 const {html}=groupedWeightReport(history,{prices});
 assert.equal((html.match(/class="price-panel"/g)||[]).length,1);
 const etf6=html.slice(html.indexOf('id="etf-6"'));
 assert.ok(etf6.indexOf('class="price-panel"')>etf6.indexOf('class="series"'));
 assert.match(html,/row-change/);
});
