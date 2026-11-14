import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { sendReport } from './presentation.mjs';
import { request } from './request.mjs';
import { resolveProducts, monthBefore, buildCard, reportHtml, reportText } from './daily-report.mjs';
const TIME_LIST='https://timeetf.co.kr/m11.php', STATE='state/daily.json';
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim(), num=x=>x==null||x===''?null:Number(String(x).replace(/,/g,''));
async function text(url){return request(url,'text');}
function parseTime(html,url){const name=clean((html.match(/class="prdName"[^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'TIME ETF').replace(/\s+/g,' '),section=html.split('id="constituentItems"')[1]||'',date=section.match(/id="pdfDate"[^>]*value="(\d{4}-\d{2}-\d{2})"/)?.[1],body=section.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'',rows=[...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>clean(x[1]))).filter(c=>c.length===5&&num(c[4])!==null).map(c=>({code:c[0]||c[1],name:c[1],weight:num(c[4])}));if(!date||rows.length<5)throw Error('TIME 자료 오류');return{name,code:url.match(/idx=(\d+)/)?.[1]||url,date,rows:rows.sort((a,b)=>b.weight-a.weight),source:url};}
const FLAGS=['--dry-run','--telegram'];
// A mistyped flag used to fall through to the send path, so unknown options fail before any fetch.
export function resolveMode(argv){
 const flags=argv.filter(a=>a.startsWith('-')),unknown=flags.filter(f=>!FLAGS.includes(f));
 if(unknown.length)throw Error('알 수 없는 옵션: '+unknown.join(', ')+' (사용 가능: '+FLAGS.join(', ')+')');
 if(flags.includes('--dry-run')&&flags.includes('--telegram'))throw Error('--dry-run과 --telegram은 함께 쓸 수 없습니다');
 return flags.includes('--dry-run')?'preview':'telegram';
}
export function parseEnvFile(raw){
 const out={};
 for(const line of raw.split(/\r?\n/)){
  if(line.trimStart().startsWith('#'))continue;
  const m=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if(m)out[m[1]]=m[2].trim().replace(/^(['"])([\s\S]*)\1$/,'$2');
 }
 return out;
}
async function applyEnvFile(path='.env'){
 let raw;try{raw=await readFile(path,'utf8');}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const[k,v]of Object.entries(parseEnvFile(raw)))if(process.env[k]===undefined)process.env[k]=v;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const kstDate=()=>new Date(Date.now()+9*3600*1000).toISOString().slice(0,10);
async function snapshot(url,pdfDate){
 const target=pdfDate?url+(url.includes('?')?'&':'?')+'pdfDate='+pdfDate:url;
 return parseTime(await text(target),url);
}
// The site publishes holdings per date, so a missing baseline date steps back to the nearest published one.
async function baselineSnapshot(url,from){
 let date=monthBefore(from),last;
 for(let i=0;i<5;i++){
  try{const s=await snapshot(url,date);return {rows:s.rows,date:s.date,kind:'month'};}
  catch(e){last=e;const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);date=d.toISOString().slice(0,10);await wait(1200);}
 }
 throw Error('1개월 전 자료 확보 실패: '+last.message);
}
async function main(){
 const mode=resolveMode(process.argv.slice(2));
 let token,chat;
 if(mode==='telegram'){
  await applyEnvFile();
  token=process.env.TELEGRAM_BOT_TOKEN;chat=process.env.TELEGRAM_CHAT_ID;
  if(!token||!chat)throw Error('텔레그램 설정 없음: TELEGRAM_BOT_TOKEN과 TELEGRAM_CHAT_ID를 환경변수나 이 폴더의 .env 파일에 지정하세요. chat ID는 ./connect-telegram.ps1로 확인합니다. 발송 없이 확인만 하려면 --dry-run을 씁니다.');
 }
 const wanted=resolveProducts(await text(TIME_LIST));
 let prev=null;
 try{prev=JSON.parse(await readFile(STATE,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const today=[];
 for(const p of wanted){await wait(1800);today.push(await snapshot(p.url));}
 const cards=[];
 for(const s of today){
  const saved=prev?.products?.[s.code];
  const baseline=saved?{rows:saved.rows,date:saved.date,kind:'previous',sentDate:prev.sentDate}:(await wait(1800),await baselineSnapshot(s.source,s.date));
  cards.push(buildCard(s,baseline));
 }
 const meta={sentDate:kstDate()},body=reportText(cards,meta),html=reportHtml(cards,meta);
 await mkdir('output',{recursive:true});
 await writeFile('output/preview.txt',body+'\n\n'+JSON.stringify({meta,cards},null,2));
 await writeFile('output/report.html',html);
 if(mode==='preview'){console.log('미리보기 생성 (발송하지 않음): output/preview.txt, output/report.html');return;}
 await sendReport(token,chat,body,html);
 await mkdir('state',{recursive:true});
 await writeFile(STATE+'.tmp',JSON.stringify({sentDate:meta.sentDate,sentAt:new Date().toISOString(),products:Object.fromEntries(today.map(s=>[s.code,{name:s.name,date:s.date,rows:s.rows}]))}));
 await rename(STATE+'.tmp',STATE);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('리포트 처리 실패: '+e.message);process.exitCode=1;});

export function parse(html,url='https://timeetf.co.kr/m11_view.php?idx=test'){const p=parseTime(html,url);if(p.rows.length<10)throw Error('holdings rows are incomplete');return p;}
