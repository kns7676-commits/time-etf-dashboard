import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSox,fetchSox,insertSox} from './sox-card.mjs';
test('SOX filters missing prices and rejects unavailable charts',()=>{
 assert.deepEqual(parseSox({chart:{result:[{meta:{},timestamp:[1,2,3],indicators:{quote:[{close:[10,null,12]}]}}]}}).points,[{t:1,v:10},{t:3,v:12}]);
 assert.throws(()=>parseSox({chart:{error:{code:'Not Found'}}}),/unavailable/);
});
test('SOX quote uses previous close from intraday data and sits immediately before holdings',async()=>{
 const data=await fetchSox(async url=>({ok:true,json:async()=>({chart:{result:[{meta:{regularMarketPrice:110,previousClose:url.includes('range=1d&')?100:50,regularMarketTime:3},timestamp:[1,2],indicators:{quote:[{close:[100,105]}]}}]}})}));
 assert.equal(data.previous,100);assert.deepEqual(data.day.at(-1),{t:3,v:110});
 const html=insertSox('<main><section class="overall-holdings">Holdings</section></main>',data);
 assert.ok(html.indexOf('id="sox-card"')<html.indexOf('class="overall-holdings"'));
 assert.match(html,/\+10\.00%/);assert.match(html,/data-period="5Y"/);
 await assert.rejects(fetchSox(async()=>({ok:false,status:429})),/429/);
});
