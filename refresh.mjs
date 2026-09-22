import {readFile,writeFile} from 'node:fs/promises';
import {request} from './request.mjs';
import {mergeHistory} from './weight-report.mjs';
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim(), num=x=>x==null||x===''?null:Number(String(x).replace(/,/g,''));
function parseTime(html,url){const name=clean((html.match(/class="prdName"[^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'TIME ETF').replace(/\s+/g,' '),section=html.split('id="constituentItems"')[1]||'',date=section.match(/id="pdfDate"[^>]*value="(\d{4}-\d{2}-\d{2})"/)?.[1],body=section.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'',rows=[...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>clean(x[1]))).filter(c=>c.length===5&&num(c[4])!==null).map(c=>({code:c[0]||c[1],name:c[1],weight:num(c[4])}));if(!date||rows.length<5)throw Error('TIME 자료 오류');return{name,code:url.match(/idx=(\d+)/)?.[1]||url,date,rows:rows.sort((a,b)=>b.weight-a.weight),source:url};}

const products={};
for(const code of ['6','2','11','15','24']){
 await new Promise(r=>setTimeout(r,1800));
 const p=parseTime(await request('https://timeetf.co.kr/m11_view.php?idx='+code,'text'),'https://timeetf.co.kr/m11_view.php?idx='+code);
 if(!p.rows.length||p.rows.some(r=>!r.code||!r.name||!Number.isFinite(r.weight)))throw Error('Invalid published holdings');
 products[code]={name:p.name,date:p.date,rows:p.rows};
}
const history=JSON.parse(await readFile('state/cumulative.json','utf8'));
const sentDate=new Date(Date.now()+9*3600*1000).toISOString().slice(0,10);
await writeFile('state/cumulative.json',JSON.stringify(mergeHistory(history,{sentDate,products})));
console.log('Public holdings refreshed: '+sentDate);
