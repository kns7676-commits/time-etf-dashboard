import {test} from 'node:test';
import assert from 'node:assert/strict';
import {overallStockSeries,overallHoldingsBrowser} from './overall-holdings-browser.mjs';
test('stock comparison preserves historical holders, zero holdings and missing ETF data',()=>{
 const stock=weight=>({code:'NVDA US EQUITY',name:'NVIDIA',weight});
 const p=rows=>({name:'ETF',date:'2026-09-22',rows});
 const history=[
  {sentDate:'2026-09-20',products:{a:p([stock(4)]),b:p([stock(2)])}},
  {sentDate:'2026-09-21',products:{a:p([])}},
  {sentDate:'2026-09-22',products:{a:p([stock(6)]),b:p([])}}
 ];
 const [row]=overallStockSeries(history,'overseas');
 assert.equal(row.total,6);
 assert.equal(row.count,1);
 assert.deepEqual(row.etfs.map(e=>e.points.map(p=>p.weight)),[[4,0,6],[2,null,0]]);
 const html=overallHoldingsBrowser(history);
 assert.equal((html.match(/class="stock-etf-legend"/g)||[]).length,2);
 for(const color of ['hsl(0 65% 42%)','hsl(45 65% 42%)']){
  assert(html.includes(`class="stock-etf-legend" style="color:${color}"`));
  assert(html.includes(`stroke="${color}"`));
 }
});
