import test from 'node:test';
import assert from 'node:assert/strict';
import {productWeightCharts} from './grouped-weight-report.mjs';
const day=(sentDate,products)=>({sentDate,products});
const product=(name,rows)=>({name,date:'2026-11-13',rows:rows.map(([code,weight])=>({code,name:code,weight}))});
const history=[
 day('2026-11-12',{'11':product('TIME 코스피액티브',[['005930',20],['000660',15]]),'2':product('TIME 미국나스닥100액티브',[['AMD US EQUITY',9]])}),
 day('2026-11-13',{'11':product('TIME 코스피액티브',[['005930',21],['000660',14],['035420',2]]),'15':product('TIME 코리아밸류업액티브',[['000660',22]]),'2':product('TIME 미국나스닥100액티브',[['AMD US EQUITY',9]])})
];
test('comparison tabs get one AI-style chart per requested ETF, in configured order, excluding other products',()=>{
 const html=productWeightCharts(history,['15','11'],{missing:['KoAct 코스피액티브']});
 const names=[...html.matchAll(/<h3 class="etf-weight-name">([^<]+)/g)].map(m=>m[1]);
 assert.deepEqual(names,['TIME 코리아밸류업액티브','TIME 코스피액티브']);
 assert.ok(!html.includes('나스닥100'));
 assert.equal((html.match(/<figure id="g-/g)||[]).length,2);
 assert.ok(html.includes('data-code="035420"'));
 assert.ok(html.includes('KoAct 코스피액티브는 전체 보유 이력이 아직 없어'));
 assert.ok(html.includes("figure[id^=\"g-\"]")&&html.includes('bio-stock-change'));
 assert.equal(productWeightCharts(history,['999']),'');
 // The browser-side matcher must map Bloomberg-style codes onto FunETF tickers.
 const key=new Function('return '+html.match(/const key=(c=>[^;]*);/)[1])();
 assert.equal(key('AMD US EQUITY'),'AMD');assert.equal(key('nvda  uw equity'),'NVDA');assert.equal(key('005930'),'005930');
});
