import {mkdir,writeFile,rename,readFile} from 'node:fs/promises';
import {request} from './request.mjs';
import {COMPARISON_URL,parseComparison} from './all-holdings/bio-comparison.mjs';
import {mergeComparisonHistory} from './all-holdings/bio-ranking.mjs';
const snapshot=parseComparison(await request(COMPARISON_URL,'text'));
await mkdir('state',{recursive:true});
const path='state/bio-comparison.json';
const historyPath='state/bio-comparison-history.json';
let history;
try{history=JSON.parse(await readFile(historyPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;history=[];}
const updated=mergeComparisonHistory(history,snapshot);
await writeFile(historyPath+'.tmp',JSON.stringify(updated,null,2)+'\n');
await rename(historyPath+'.tmp',historyPath);
await writeFile(path+'.tmp',JSON.stringify(snapshot,null,2)+'\n');
await rename(path+'.tmp',path);
console.log('FunETF bio comparison verified: '+snapshot.date+'; '+snapshot.products.map(p=>p.ticker+': '+p.count+' holdings').join(', '));
