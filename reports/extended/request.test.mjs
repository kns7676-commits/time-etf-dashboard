import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from './request.mjs';
test('retries timeout while reading response body',async()=>{
  let calls=0;
  const result=await request('https://example.test/data','json',{sleep:async()=>{},fetcher:async()=>({ok:true,json:async()=>{if(++calls===1)throw new DOMException('timeout','TimeoutError');return {ok:1};}})});
  assert.deepEqual(result,{ok:1});assert.equal(calls,2);
});
test('final timeout identifies failing URL and limits attempts',async()=>{
  let calls=0;
  await assert.rejects(request('https://example.test/slow','json',{sleep:async()=>{},fetcher:async()=>{calls++;throw new DOMException('timeout','TimeoutError');}}),/example.test\/slow/);
  assert.equal(calls,3);
});
