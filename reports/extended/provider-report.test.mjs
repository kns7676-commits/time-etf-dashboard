import test from 'node:test';
import assert from 'node:assert/strict';
import {availableData,report} from './weekly.mjs';
import {htmlReport,sendReport} from './presentation.mjs';

const products=name=>Array.from({length:5},(_,i)=>({name:name+' 상품 '+i,code:String(i),date:'2026-09-13',returns:{week:5-i,month:10-i,month3:15-i},rows:[{code:'A',name:'종목 A',weight:20}]}));
const ok=value=>({status:'fulfilled',value});
const failed={status:'rejected',reason:new Error('timeout')};
for(const missing of ['TIME','삼성'])for(const rich of [true,false]){
 test(`${missing} failure is absent from all outgoing payloads (rich=${rich})`,async()=>{
  const data=availableData(missing==='TIME'?[failed,ok(products('삼성'))]:[ok(products('TIME')),failed]);
  const previous={time:Object.fromEntries(products('TIME').map(p=>[p.code,p])),삼성:Object.fromEntries(products('삼성').map(p=>[p.code,p]))};
  const text=report(data,previous),html=htmlReport(text);
  const forbidden=missing==='TIME'?/TIME|TIMEFOLIO/:/삼성/;
  assert.doesNotMatch(text,forbidden);assert.doesNotMatch(html,forbidden);
  assert.equal((html.match(/<table>/g)||[]).length,3);
  assert.match(text,missing==='TIME'?/삼성 상품 0/:/TIME 상품 0/);
  const sent=[];
  await sendReport('test','123','https://example.com/dashboard/',{fetcher:async(url,options)=>{
   if(options.body instanceof FormData){
    sent.push(options.body.get('caption'),await options.body.get('document').text());
   }else sent.push(options.body);
   const success=rich||!url.endsWith('/sendRichMessage');
   return {ok:success,status:success?200:404,json:async()=>({ok:success,error_code:success?undefined:404})};
  }});
  for(const payload of sent)assert.doesNotMatch(payload,forbidden);
 });
}
test('both providers retain six HTML tables',()=>{
 const text=report(availableData([ok(products('TIME')),ok(products('삼성'))]),null);
 assert.match(text,/TIME · 삼성액티브/);
 assert.equal((htmlReport(text).match(/<table>/g)||[]).length,6);
});
test('both failures prevent report creation and empty responses are excluded',()=>{
 assert.throws(()=>availableData([failed,failed]),/양사/);
 assert.throws(()=>availableData([ok([]),failed]),/양사/);
 assert.deepEqual(availableData([ok(products('TIME')),ok([])]).samsung,[]);
 assert.deepEqual(availableData([ok(products('TIME').slice(0,2)),ok(products('삼성'))]).time,[]);
});
for(const missing of ['TIME','삼성'])for(const defect of ['holdings','returns','period','name','weight','date']){
 test(`${missing} successful response with invalid ${defect} is omitted`,()=>{
  const invalid=products(missing);
  for(const p of invalid){
   if(defect==='holdings')p.rows=[];
   if(defect==='returns')p.returns={week:null,month:null,month3:null};
   if(defect==='period')p.returns.month3=null;
   if(defect==='name')p.rows[0].name=' ';
   if(defect==='weight')p.rows[0].weight=null;
   if(defect==='date')p.date='';
  }
  const raw=missing==='TIME'?{time:invalid,samsung:products('삼성')}:{time:products('TIME'),samsung:invalid};
  const data=availableData([ok(raw.time),ok(raw.samsung)]);
  for(const input of [raw,data]){
   const text=report(input,null),html=htmlReport(text);
   assert.doesNotMatch(text,missing==='TIME'?/TIME/:/삼성/);
   assert.doesNotMatch(html,missing==='TIME'?/TIME/:/삼성/);
   assert.doesNotMatch(html,/<td>\s*<\/td>|undefined|NaN/);
   assert.equal((html.match(/<table>/g)||[]).length,3);
  }
 });
}
