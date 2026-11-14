import test from 'node:test';
import assert from 'node:assert/strict';
import {samsungList} from './samsung-list.mjs';
const base='https://example.test/?sort=DESC&pageNo=';
const page=ids=>({totalCnt:'3',etfs:ids.map(fId=>({fId}))});
test('recovers failed second page from reverse sort and deduplicates',async()=>{
 const data=await samsungList(async url=>{if(url.includes('ASC'))return page(['c','b']);if(url.endsWith('2'))throw Error('HTTP 500');return page(['a','b']);},base);
 assert.deepEqual(data.map(p=>p.fId),['a','b','c']);
});
test('refuses partial universe rather than publishing incorrect rankings',async()=>{
 await assert.rejects(samsungList(async url=>{if(url.endsWith('2'))throw Error('HTTP 500');return page(['a','b']);},base),/불완전/);
});
