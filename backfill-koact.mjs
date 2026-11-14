// Fills KoAct full holdings into existing days of state/cumulative.json from the official KoAct API.
// Each day uses the same source date as that day's TIME holdings, so comparison graphs line up by observation date.
// Requests go one at a time with a pause; on a rate limit (HTTP 429) the progress so far is saved and the run stops.
// Re-running continues where it stopped: days that already hold a KoAct product are skipped. Nothing is invented.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {request} from './request.mjs';
import {KOACT_PRODUCTS,fetchKoactHoldings} from './bio-holdings.mjs';
export const TIME_CODES=['2','6','11','15','24'];
export function backfillTargets(history,products=KOACT_PRODUCTS){
 const targets=[];
 for(const [index,day] of history.entries()){
  const date=TIME_CODES.map(c=>day.products?.[c]?.date).find(Boolean);if(!date)continue;
  const missing=products.filter(p=>!day.products[p.code]);if(missing.length)targets.push({index,sentDate:day.sentDate,date,missing});
 }
 return targets;
}
export async function backfill(history,{fetch=fetchKoactHoldings,products=KOACT_PRODUCTS,save=async()=>{},log=console.log}={}){
 const cache=new Map();let added=0,stopped=null;
 for(const target of backfillTargets(history,products)){
  const want=target.missing.filter(p=>!cache.has(p.code+'@'+target.date));
  if(want.length){
   let limited=null;
   const got=await fetch(request,target.date,{products:want,walkBack:4,onFailure:(p,e)=>{if(/429|rate limit/i.test(e.message))limited=e;else cache.set(p.code+'@'+target.date,null);}});
   for(const [code,snapshot] of Object.entries(got))cache.set(code+'@'+target.date,snapshot);
   if(limited){stopped=limited;}
  }
  const day=history[target.index];
  for(const p of target.missing){const snapshot=cache.get(p.code+'@'+target.date);if(snapshot){day.products[p.code]=snapshot;added++;}}
  await save(history);
  if(stopped){log('Stopped at '+target.sentDate+' (source '+target.date+'): '+stopped.message);break;}
 }
 return {added,stopped:!!stopped};
}
if(process.argv[1]?.endsWith('backfill-koact.mjs')){
 const path='state/cumulative.json',history=JSON.parse(await readFile(path,'utf8'));
 const save=async h=>{await writeFile(path+'.tmp',JSON.stringify(h));await rename(path+'.tmp',path);};
 const result=await backfill(history,{save});
 console.log('KoAct backfill: '+result.added+' product-days added'+(result.stopped?' · stopped by rate limit, re-run later to continue':' · complete'));
}
