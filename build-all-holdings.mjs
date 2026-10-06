import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {groupedWeightReport} from './all-holdings/grouped-weight-report.mjs';
const history=JSON.parse(await readFile('state/cumulative.json','utf8'));
const {html}=groupedWeightReport(history);
await mkdir('output/site/all-holdings',{recursive:true});
await writeFile('output/site/all-holdings/index.html',html);
console.log('All-holdings updated through '+history.at(-1).sentDate+'; source dates '+Object.values(history.at(-1).products).map(p=>p.date).join(', '));
