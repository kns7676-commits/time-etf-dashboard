import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {groupedWeightReport} from './all-holdings/grouped-weight-report.mjs';
import {fetchSox,insertSox} from './all-holdings/sox-card.mjs';
import {fetchProductPrices} from './all-holdings/stock-prices.mjs';
const history=JSON.parse(await readFile('state/cumulative.json','utf8'));
const data=await fetchSox();
const prices=await fetchProductPrices(history);
const {html}=groupedWeightReport(history,{prices});
await mkdir('output/site/all-holdings',{recursive:true});
await writeFile('output/site/all-holdings/index.html',insertSox(html,data));
console.log('All-holdings updated through '+history.at(-1).sentDate+'; SOX '+data.price+' at '+new Date(data.time*1000).toISOString());
for(const [code,list] of Object.entries(prices)){const v=Object.values(list);console.log(`Prices for product ${code}: ${v.filter(x=>x.points).length} charts, ${v.filter(x=>x.skip).length} not applicable, ${v.filter(x=>x.error).length} failed`+(v.some(x=>x.error)?' ('+v.filter(x=>x.error).map(x=>x.symbol).join(', ')+')':''));}
