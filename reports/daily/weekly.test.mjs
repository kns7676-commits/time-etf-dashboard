import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, resolveMode, parseEnvFile } from './weekly.mjs';
test('send mode is explicit and typos never reach the send path',()=>{
 assert.equal(resolveMode([]),'telegram');
 assert.equal(resolveMode(['--telegram']),'telegram');
 assert.equal(resolveMode(['--dry-run']),'preview');
 assert.throws(()=>resolveMode(['--dryrun']),/알 수 없는 옵션/);
 assert.throws(()=>resolveMode(['--dry-run','--telegram']),/함께 쓸 수 없습니다/);
});
test('local .env supplies telegram credentials without exporting shell variables',()=>{
 const env=parseEnvFile('# comment\nTELEGRAM_BOT_TOKEN=123:abc\nexport TELEGRAM_CHAT_ID="45678"\nBLANK\n');
 assert.deepEqual(env,{TELEGRAM_BOT_TOKEN:'123:abc',TELEGRAM_CHAT_ID:'45678'});
});
test('reads actual HTML product name',()=>{
 const html='<div class="prdName">TIME<br>글로벌AI인공지능액티브</div>'+fixture();
 assert.equal(parse(html).name,'TIME글로벌AI인공지능액티브');
});
const fixture=(count=10)=>`<div id="constituentItems"><input id="pdfDate" value="2026-09-11"><tbody>${Array.from({length:count},(_,i)=>`<tr><td>${i}</td><td>Company ${i}</td><td>1</td><td>100</td><td>10.00</td></tr>`).join('')}</tbody>`;
test('parses holdings date and rows',()=>{const p=parse(fixture());assert.equal(p.date,'2026-09-11');assert.equal(p.rows.length,10);assert.throws(()=>parse(fixture(9)));});
