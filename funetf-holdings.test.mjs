import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFunetfPdf,fetchFunetfHoldings,FUNETF_BIO_PRODUCTS} from './funetf-holdings.mjs';
const item=(ticker,name,evP,total,grp)=>({ticker,grpItmNo:grp??'KR7'+ticker+'0',citmNm:name,evP,total});
const list=n=>[...Array.from({length:n-1},(_,i)=>item(String(100000+i),'종목'+i,(100-1)/(n-1),n)),item(null,'원화현금',1,n,'KRD010010001')];
test('FunETF dated holdings require the full list, keep cash by its KRD code and sum near 100',()=>{
 const r=parseFunetfPdf(list(6),'2026-10-01');
 assert.equal(r.date,'2026-10-01');assert.equal(r.rows.length,6);assert.ok(r.rows.some(x=>x.code==='KRD010010001'));
 assert.throws(()=>parseFunetfPdf([],'2026-10-01'),/No FunETF holdings/);
 assert.throws(()=>parseFunetfPdf(list(6).slice(1),'2026-10-01'),/Incomplete/);
 assert.throws(()=>parseFunetfPdf(list(6).map(x=>({...x,evP:5})),'2026-10-01'),/sum outside/);
});
test('FunETF fetch uses the ISIN and date, maps to the history key and stops after a rate limit',async()=>{
 const urls=[],failed=[];
 const out=await fetchFunetfHoldings(async url=>{urls.push(url);if(url.includes('KR7364970004'))throw Error('HTTP 429');return list(6);},'2026-10-01',{onFailure:p=>failed.push(p.code),pause:async()=>{}});
 assert.deepEqual(Object.keys(out),['13']);assert.equal(out['13'].name,'TIME K바이오액티브');assert.equal(out['13'].theme,'bio');
 assert.ok(urls[0].includes('itemId=KR7463050005')&&urls[0].includes('etfPdfYmd=20261001'));
 assert.deepEqual(failed,['364970','244580']);assert.equal(urls.length,2);
 assert.deepEqual(FUNETF_BIO_PRODUCTS.map(p=>p.code),['13','364970','244580']);
});
