import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlReport,splitText,sendReport} from './presentation.mjs';
test('long report is preserved without truncation and escapes markup',()=>{
 const text='【최근 1주】\n순위 | TIME 상품 | 종목 | 삼성 상품 | 종목\n1 | A & B | X < Y, NVIDIA | C | D\n'+'상세 내용\n'.repeat(2000)+'마지막 문장';
 assert.equal(splitText(text).join(''),text);
 assert.ok(splitText(text).every(s=>s.length<=3500));
 const html=htmlReport(text);assert.match(html,/<table>/);assert.match(html,/A &amp; B/);assert.match(html,/X &lt; Y/);assert.match(html,/마지막 문장/);
});
test('sends only one URL with preview disabled',async()=>{
 const calls=[],url='https://example.com/dashboard/';
 await sendReport('test','123',url,{fetcher:async(endpoint,options)=>{calls.push({endpoint,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true})};}});
 assert.equal(calls.length,1);assert.ok(calls[0].endpoint.endsWith('/sendMessage'));
 assert.deepEqual(calls[0].body,{chat_id:'123',text:url,link_preview_options:{is_disabled:true}});
});
test('invalid URLs fail before sending',async()=>{
 for(const url of [undefined,'','http://example.com','file:///report.html','https://user:pass@example.com'])await assert.rejects(sendReport('test','123',url,{fetcher:()=>assert.fail('must not send')}));
});
test('Telegram errors propagate',async()=>{
 await assert.rejects(sendReport('test','123','https://example.com',{fetcher:async()=>({ok:false,status:403,json:async()=>({ok:false})})}),/403/);
});
