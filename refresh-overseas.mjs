// Collect official overseas ETF holdings into state/overseas-holdings.json (종목별 ETF 추이 탭).
// Individual ETF failures only warn; the state file is replaced atomically and only when something was collected.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {updateOverseasHoldings} from './overseas-holdings.mjs';
const path='state/overseas-holdings.json';
let state={};
try{state=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const summary=await updateOverseasHoldings(state);
const ok=summary.filter(s=>!s.failed).length;
console.log(`Overseas ETFs: ${ok}/${summary.length} collected, ${summary.reduce((s,x)=>s+x.added,0)} new or corrected snapshots`);
if(ok){await writeFile(path+'.tmp',JSON.stringify(state)+'\n');await rename(path+'.tmp',path);}
else console.warn('::warning::No overseas ETF holdings were collected; state left unchanged.');
