import {comparisonConfig} from './comparison-config.mjs';
const capture=s=>new Date(Date.parse(s.checkedAt)+9*3600000).toISOString().slice(0,10);
const nameKey=s=>String(s).replace(/\s+/g,'').toUpperCase();
// This contract identity was verified against both stored TIME full-holdings records.
const aliases=new Map([['NAME:Nasdaq100 Emini 2026 12','NQZ6 INDEX']]);
function identity(code){
 const raw=String(code).trim();if(raw.startsWith('NAME:'))return aliases.has(raw)?identity(aliases.get(raw)):null;
 const value=raw.toUpperCase().replace(/\s+/g,' '),equity=value.match(/^([A-Z0-9._-]+) ([A-Z0-9]{2}) EQUITY$/);
 if(equity)return {code:equity[1],market:['US','UW','UN','UA'].includes(equity[2])?'US':equity[2]};
 if(/^[A-Z0-9._-]+$/.test(value))return {code:value,market:null};
 if(/^[A-Z0-9]+ INDEX$/.test(value))return {code:value,market:'INDEX'};
 return null;
}
function linkedProduct(day,product,universe){
 const link=comparisonConfig(universe).products.find(p=>p.ticker===product.ticker);
 if(!link?.historyId)return null;
 const p=day?.products?.[link.historyId];
 if(!p||nameKey(p.name)!==nameKey(product.name)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||p.date>day.sentDate||!Array.isArray(p.rows)||p.rows.length<5||p.rows.some(r=>!r.code||!Number.isFinite(r.weight)))return null;
 return p;
}
export function monitoringDates(history,holdingsHistory=[]){
 const latest=history.at(-1),last=capture(latest),dates=new Set(history.map(capture));
 for(const day of holdingsHistory)if(day.sentDate<=last&&latest.products.some(p=>linkedProduct(day,p,latest.universe)))dates.add(day.sentDate);
 return [...dates].sort();
}
export function stockTrendSeries(history,code,holdingsHistory=[]){
 const latest=history.at(-1),dates=monitoringDates(history,holdingsHistory),full=new Map(holdingsHistory.map(d=>[d.sentDate,d])),top=new Map(history.map(d=>[capture(d),d])),key=identity(code);
 return latest.products.map(product=>({ticker:product.ticker,name:product.name,points:dates.map(date=>{
  const comparison=top.get(date),p=comparison?.products.find(p=>p.ticker===product.ticker),fullProduct=linkedProduct(full.get(date),product,latest.universe);
  if(fullProduct&&(!p||fullProduct.date>=comparison.date)){
   const base={date,sourceDate:fullProduct.date,source:'ai-history',scope:'full'};
   if(!key)return {...base,weight:null,status:'identifier-unavailable'};
   const matched=fullProduct.rows.filter(r=>{const id=identity(r.code);return id?.code===key.code&&(!key.market||!id.market||key.market===id.market);});
   const markets=new Set(matched.map(r=>identity(r.code).market).filter(Boolean));
   if(markets.size>1)return {...base,weight:null,status:'identifier-unavailable'};
   return {...base,weight:matched.reduce((sum,r)=>sum+r.weight,0),status:matched.length?'reported':'not-held'};
  }
  const row=p?.rows.find(r=>r.code===code);
  return {date,sourceDate:p?comparison.date:null,source:p?'comparison':null,scope:p?'top10':null,weight:row?.weight??null,status:!p?'missing':row?'reported':'outside-top10'};
 })}));
}
export function monitoringSelections(ranking,history,holdingsHistory=[]){
 const result=ranking.map(r=>({...r})),seen=new Set(result.map(r=>identity(r.code)?.code||r.code)),latest=history.at(-1),last=capture(latest);
 const add=r=>{const id=identity(r.code),key=id?.code||(r.code.startsWith('NAME:')?r.code:null);if(!key||seen.has(key)||/CASH|KRD|현금|예금/i.test(r.code+' '+r.name))return;seen.add(key);result.push({code:key,displayCode:r.displayCode??id?.code??'코드 미제공',name:r.name,score:null,values:{},count:0});};
 for(const s of history)for(const p of s.products)for(const r of p.rows)add(r);
 for(const day of [...holdingsHistory].sort((a,b)=>a.sentDate.localeCompare(b.sentDate)))if(day.sentDate<=last)for(const p of latest.products){const linked=linkedProduct(day,p,latest.universe);if(linked)for(const r of linked.rows)add(r);}
 return result;
}
