// Standalone bio-tab page whose source is not readable as plain HTML: the sharing page (same transform as
// build-bio-share.mjs) is gzip-compressed, XOR-scrambled with a random key and base64-encoded; a small loader
// restores it in the browser. This is obfuscation, not encryption: anyone with developer tools can see the result.
// Usage: node build-bio-protected.mjs [outDir]   (default output/bio-share; the workflow publishes output/site/bio-share)
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {randomBytes} from 'node:crypto';
import {applyBioDesign} from './all-holdings/bio-design.mjs';
export function shareHtml(html){
 html=html.replace(/<section id="sox-card"[\s\S]*?<\/section>\s*<script>[\s\S]*?<\/script>/,'').replace(/<nav class="theme-tabs"[\s\S]*?<\/nav>/,'');
 html=applyBioDesign(html);
 if(html.includes('id="sox-card"')||html.includes('<nav class="theme-tabs"')||html.includes('kns7676'))throw Error('Sharing page contains excluded content');
 if(!html.includes('id="bio-comparison-title"'))throw Error('Sharing page is missing the bio comparison');
 return html;
}
export function protectHtml(html,key=randomBytes(32)){
 const data=gzipSync(Buffer.from(html,'utf8'),{level:9});
 for(let i=0;i<data.length;i++)data[i]^=key[i%key.length];
 const title=(html.match(/<title>([^<]*)<\/title>/)||[,'바이오 ETF'])[1];
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+title+'</title><style>body{margin:0;background:#fff;font:15px system-ui,sans-serif;color:#52647a}#l{padding:40px;text-align:center}</style></head><body><div id="l">불러오는 중…</div><noscript><p style="padding:24px">이 페이지를 보려면 JavaScript를 켜 주세요.</p></noscript><script>(async()=>{try{const k=['+[...key].join(',')+'],b=atob("'+data.toString('base64')+'"),d=new Uint8Array(b.length);for(let i=0;i<b.length;i++)d[i]=b.charCodeAt(i)^k[i%k.length];const t=await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream("gzip"))).text();document.open();document.write(t);document.close();}catch(e){document.getElementById("l").textContent="이 브라우저에서는 페이지를 열 수 없습니다. 최신 Chrome, Edge, Safari 또는 Firefox로 열어 주세요.";}})();</script></body></html>';
}
if(/build-bio-protected\.mjs$/.test(process.argv[1]||'')){
 const out=process.argv[2]||'output/bio-share';
 const html=shareHtml(await readFile('output/site/all-holdings/bio/index.html','utf8'));
 const page=protectHtml(html);
 await mkdir(out,{recursive:true});
 await writeFile(out+'/index.html',page);
 console.log('Protected bio page: '+out+'/index.html ('+(page.length/1048576).toFixed(2)+' MB, source '+(html.length/1048576).toFixed(2)+' MB)');
}
