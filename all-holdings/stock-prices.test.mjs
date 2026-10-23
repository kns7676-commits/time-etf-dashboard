import test from 'node:test';
import assert from 'node:assert/strict';
import {yahooSymbols,parsePrices,fetchStockPrice,fetchProductPrices,outcomes,pricePanel} from './stock-prices.mjs';
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
test('weight changes are matched to the close on or before the holdings date and judged by later price',()=>{
 const pts=['09-08','09-09','09-11','09-12','09-15','09-16','09-17','09-18'].map((d,i)=>({d:'2026-'+d,c:[100,110,120,90,95,100,105,132][i]}));
 const [inc,dec,last,early]=outcomes(pts,[{d:'2026-09-10',k:'increase'},{d:'2026-09-12',k:'decrease'},{d:'2026-09-18',k:'increase'},{d:'2026-09-01',k:'increase'}]);
 assert.equal(inc.baseDate,'2026-09-09');assert.equal(inc.base,110);assert.equal(inc.r5,-4.55);assert.equal(inc.now,20);assert.equal(inc.match,true);
 assert.equal(dec.base,90);assert.equal(dec.r5,null);assert.equal(dec.match,false);
 assert.equal(last.match,null);assert.equal(early,undefined);
});
test('panel data carries per-row weight path by holdings date and that row\'s major changes',()=>{
 const rows=[{code:'A',name:'A',points:[{sourceDate:'2026-09-08',weight:1},{sourceDate:'2026-09-08',weight:1},{sourceDate:'2026-09-09',weight:2}]}];
 const html=pricePanel(rows,{A:{symbol:'A',currency:'USD',points:[]}},{0:[{date:'2026-09-09',kind:'increase',symbol:'▲',before:1,after:2,delta:1}]});
 const data=JSON.parse(html.match(/class="price-data">(.*?)<\/script>/)[1])[0];
 assert.deepEqual(data.w,[['2026-09-08',1],['2026-09-09',2]]);assert.deepEqual(data.ev,[{d:'2026-09-09',k:'increase',s:'▲',b:1,a:2,dl:1}]);
});
