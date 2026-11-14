import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {protectHtml} from './build-bio-protected.mjs';
test('protected page hides the source text and restores it with the embedded key',()=>{
 const html='<!doctype html><title>바이오 · ETF 보유종목</title><main><h2 id="bio-comparison-title">셀트리온 비교</h2></main>';
 const page=protectHtml(html,Buffer.alloc(32,7));
 assert.ok(!page.includes('셀트리온')&&!page.includes('bio-comparison-title'));
 assert.ok(page.includes('<title>바이오 · ETF 보유종목</title>')&&page.includes('noindex'));
 const key=page.match(/const k=\[([0-9,]+)\]/)[1].split(',').map(Number),data=Buffer.from(page.match(/atob\("([^"]+)"\)/)[1],'base64');
 for(let i=0;i<data.length;i++)data[i]^=key[i%key.length];
 assert.equal(gunzipSync(data).toString('utf8'),html);
});
