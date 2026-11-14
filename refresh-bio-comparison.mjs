import {mkdir,writeFile,rename,readFile} from 'node:fs/promises';
import {request} from './request.mjs';
import {parseComparison} from './all-holdings/bio-comparison.mjs';
import {comparisonConfig} from './all-holdings/comparison-config.mjs';
import {mergeComparisonHistory} from './all-holdings/bio-ranking.mjs';
const config=comparisonConfig(process.argv[2]||'bio');
const snapshot=parseComparison(await request(config.source,'text'),new Date().toISOString(),config.universe);
await mkdir('state',{recursive:true});
const path='state/'+config.universe+'-comparison.json';
const historyPath='state/'+config.universe+'-comparison-history.json';
let history;
try{history=JSON.parse(await readFile(historyPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;history=[];}
const updated=mergeComparisonHistory(history,snapshot);
await writeFile(historyPath+'.tmp',JSON.stringify(updated,null,2)+'\n');
await rename(historyPath+'.tmp',historyPath);
await writeFile(path+'.tmp',JSON.stringify(snapshot,null,2)+'\n');
await rename(path+'.tmp',path);
console.log('FunETF '+config.universe+' comparison verified: '+snapshot.date+'; '+snapshot.products.map(p=>p.ticker+': '+p.count+' holdings').join(', '));
