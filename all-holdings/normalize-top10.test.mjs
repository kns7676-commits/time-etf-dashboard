import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTop10} from './normalize-top10.mjs';
test('displayed TOP10 weights sum to exactly 100.00 including rounding remainders',()=>{
 for(const weights of [[30.7,27.4,17,5.4,4.3,4.2,3.7,3.1,2.3,2.1],[4.4,3.6,2.8,2.7,2.6,2.4,2.3,2.3,2.3,2.3],[1,1,1],[1,0,0]]){
  const original=weights.map(weight=>({weight})),normalized=normalizeTop10(original);
  assert.equal(normalized.reduce((sum,r)=>sum+Math.round(r.display*100),0),10000);
  assert.deepEqual(original.map(r=>r.weight),weights);
  for(const r of normalized)assert.ok(Math.abs(r.display-r.normalized)<=.010000001);
 }
 assert.deepEqual(normalizeTop10([{weight:1},{weight:1},{weight:1}]).map(r=>r.display),[33.34,33.33,33.33]);
 assert.throws(()=>normalizeTop10([{weight:0}]),/empty/);
 assert.throws(()=>normalizeTop10([{weight:-1},{weight:2}]),/invalid/);
});
