import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {groupedWeightReport} from './all-holdings/grouped-weight-report.mjs';
import {fetchSox,insertSox} from './all-holdings/sox-card.mjs';
const history=JSON.parse(await readFile('state/cumulative.json','utf8'));
const data=await fetchSox();
const {html}=groupedWeightReport(history);
await mkdir('output/site/all-holdings',{recursive:true});
await writeFile('output/site/all-holdings/index.html',insertSox(html,data));
console.log('All-holdings updated through '+history.at(-1).sentDate+'; SOX '+data.price+' at '+new Date(data.time*1000).toISOString());
