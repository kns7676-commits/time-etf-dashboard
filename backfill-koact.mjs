// Fills KoAct full holdings into existing days of state/cumulative.json from the official KoAct API.
// Each day uses the same source date as that day's TIME holdings, so comparison graphs line up by observation date.
// Politeness: one request at a time with a gap, newest dates first, and products stop once they predate their listing
// (two consecutive dates without data). On HTTP 429 the run waits out a cooldown before continuing; after
// `maxCooldowns` waits it saves and stops. Re-running continues where it stopped. Nothing is invented.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {request} from './request.mjs';
import {KOACT_PRODUCTS,fetchKoactHoldings} from './bio-holdings.mjs';
export const TIME_CODES=['2','6','11','15','24'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function backfillTargets(history,products=KOACT_PRODUCTS){
 const targets=[];
 for(const [index,day] of history.entries()){
  const date=TIME_CODES.map(c=>day.products?.[c]?.date).find(Boolean);if(!date)continue;
  const missing=products.filter(p=>!day.products[p.code]);if(missing.length)targets.push({index,sentDate:day.sentDate,date,missing});
 }
 return targets;
}
export async function backfill(history,{fetch=fetchKoactHoldings,products=KOACT_PRODUCTS,save=async()=>{},log=console.log,pause=sleep,gap=4000,cooldown=120000,maxCooldowns=4}={}){
 const cache=new Map(),misses=new Map(),ended=new Set(),key=(p,date)=>p.code+'@'+date;
 let added=0,cooldowns=0,stopped=false;
 for(const target of backfillTargets(history,products).reverse()){
  let want=target.missing.filter(p=>!ended.has(p.code)&&!cache.has(key(p,target.date)));
  while(want.length){
   let limited=null;
   const got=await fetch(request,target.date,{products:want,walkBack:1,pause:()=>pause(gap),onFailure:(p,e)=>{
    if(/429|rate limit/i.test(e.message)){limited=e;return;}
    cache.set(key(p,target.date),null);
    const n=(misses.get(p.code)||0)+1;misses.set(p.code,n);
    if(n>=2){ended.add(p.code);log(p.name+': no data on two consecutive dates through '+target.date+'; treating as before listing');}
   }});
   for(const [code,snapshot] of Object.entries(got)){cache.set(code+'@'+target.date,snapshot);misses.set(code,0);}
   if(!limited)break;
   if(cooldowns>=maxCooldowns){stopped=true;log('Stopped at '+target.sentDate+' (source '+target.date+'): '+limited.message);break;}
   cooldowns++;log('Rate limited at '+target.date+'; waiting '+Math.round(cooldown/1000)+'s before continuing ('+cooldowns+'/'+maxCooldowns+')');
   await pause(cooldown);
   want=want.filter(p=>!cache.has(key(p,target.date)));
  }
  const day=history[target.index];let changed=false;
  for(const p of target.missing){const snapshot=cache.get(key(p,target.date));if(snapshot){day.products[p.code]=snapshot;added++;changed=true;}}
  if(changed)await save(history);
  if(stopped)break;
  await pause(gap);
 }
 return {added,stopped};
}
if(process.argv[1]?.endsWith('backfill-koact.mjs')){
 const path='state/cumulative.json',history=JSON.parse(await readFile(path,'utf8'));
 const save=async h=>{await writeFile(path+'.tmp',JSON.stringify(h));await rename(path+'.tmp',path);};
 const result=await backfill(history,{save});
 console.log('KoAct backfill: '+result.added+' product-days added'+(result.stopped?' · stopped by rate limit, re-run later to continue':' · complete'));
}
