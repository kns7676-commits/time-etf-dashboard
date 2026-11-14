// Fills past days of the bio comparison ETFs (TIME K바이오, TIGER, KODEX) from FunETF's dated holdings,
// on each day's TIME source date. Same pacing, resume and no-invention rules as backfill-koact.mjs.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {backfill} from './backfill-koact.mjs';
import {FUNETF_BIO_PRODUCTS,fetchFunetfHoldings} from './funetf-holdings.mjs';
const path='state/cumulative.json',history=JSON.parse(await readFile(path,'utf8'));
const save=async h=>{await writeFile(path+'.tmp',JSON.stringify(h));await rename(path+'.tmp',path);};
const result=await backfill(history,{fetch:fetchFunetfHoldings,products:FUNETF_BIO_PRODUCTS,save,gap:2000});
console.log('FunETF bio backfill: '+result.added+' product-days added'+(result.stopped?' · stopped by rate limit, re-run later to continue':' · complete'));
