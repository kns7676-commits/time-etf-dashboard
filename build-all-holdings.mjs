import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {groupedWeightReport} from './all-holdings/grouped-weight-report.mjs';
import {copyFile} from 'node:fs/promises';
import {fetchSox,insertSox} from './all-holdings/sox-card.mjs';
import {fetchProductPrices} from './all-holdings/stock-prices.mjs';
import {addThemeTabs,themeHistory,bioThemePage,COMPARISON_THEMES} from './all-holdings/theme-tabs.mjs';
import {verifyPublication} from './all-holdings/bio-comparison.mjs';
const history=JSON.parse(await readFile('state/cumulative.json','utf8'));
const comparisons={};
for(const universe of COMPARISON_THEMES)comparisons[universe]={snapshot:verifyPublication(JSON.parse(await readFile('state/'+universe+'-comparison.json','utf8'))),history:JSON.parse(await readFile('state/'+universe+'-comparison-history.json','utf8'))};
const data=await fetchSox();
const prices=await fetchProductPrices(history);
const scoped=themeHistory(history,'ai');
if(!scoped.length)throw Error('No holdings for theme: ai');
const aiPage=groupedWeightReport(scoped,{prices}).html;
for(const theme of ['all','ai',...COMPARISON_THEMES]){
 const isComparison=COMPARISON_THEMES.includes(theme),snapshot=comparisons[isComparison?theme:'bio'].snapshot;
 let html=isComparison?bioThemePage(snapshot,comparisons[theme].history,{holdingsHistory:history}):aiPage;
 if(!isComparison)html=insertSox(html,data);
 html=addThemeTabs(html,theme,isComparison?{}:scoped.at(-1).products,snapshot.checkedAt);
 const path='output/site/all-holdings'+(theme==='all'?'':'/'+theme);
 await mkdir(path,{recursive:true});
 await writeFile(path+'/index.html',html);
 if(isComparison)await copyFile('assets/fonts/Pretendard-LICENSE.txt',path+'/Pretendard-LICENSE.txt');
 console.log(isComparison?'Theme '+theme+': FunETF comparison through '+snapshot.date:'Theme '+theme+': '+Object.keys(scoped.at(-1).products).length+' ETFs through '+scoped.at(-1).sentDate);
}
console.log('SOX '+data.price+' at '+new Date(data.time*1000).toISOString());
for(const [code,list] of Object.entries(prices)){const v=Object.values(list);console.log(`Prices for product ${code}: ${v.filter(x=>x.points).length} charts, ${v.filter(x=>x.skip).length} not applicable, ${v.filter(x=>x.error).length} failed`);}
