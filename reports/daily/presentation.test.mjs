import test from 'node:test';
import assert from 'node:assert/strict';
import {splitText,sendReport} from './presentation.mjs';
test('long report is preserved without truncation',()=>{
 const text='【TIME 코스피액티브】\n1. 삼성전자 27.25% (+1.20%)\n'+'상세 내용\n'.repeat(2000)+'마지막 문장';
 assert.equal(splitText(text).join(''),text);
 assert.ok(splitText(text).every(s=>s.length<=3500));
});
test('unsupported rich messages fall back to every numbered text part',async()=>{
 const calls=[],text='상세 정보\n'.repeat(1200)+'마지막 문장';
 const fetcher=async(url,options)=>{calls.push({url,options});const ok=!url.endsWith('sendRichMessage');return{ok,status:ok?200:404,json:async()=>({ok,error_code:ok?undefined:404})};};
 await sendReport('test','123',text,'<html></html>',{blocks:['<h3>TIME</h3>'],fetcher,sleep:async()=>{}});
 const parts=calls.filter(c=>c.url.endsWith('/sendMessage')).map(c=>JSON.parse(c.options.body).text.replace(/^\[\d+\/\d+\]\n/,''));
 assert.equal(parts.join(''),text);assert.ok(calls[0].options.body.get('document').name.endsWith('.html'));
});
