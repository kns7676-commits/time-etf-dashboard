// Past VGT/VUG holdings from SEC Form N-PORT (user-directed 2026-11-15). Vanguard's own endpoint serves only the latest
// month-end, so the public quarterly N-PORT-P filings (fund-level shares and % of net assets, the same basis as that
// endpoint) fill earlier quarter-ends into state/overseas-holdings.json. N-PORT lists ISINs, not tickers: ISINs map
// through Vanguard's current holdings file first, then OpenFIGI; unmapped rows are dropped and reported.
// A date that already holds a Vanguard snapshot is kept as is. Re-running only adds or refreshes SEC-sourced dates.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {OVERSEAS_ETFS,securityKey,validateSnapshot,storeSnapshot} from './overseas-holdings.mjs';
export const NPORT_SERIES={
 VGT:{cik:'52848',series:'S000004452'},
 VUG:{cik:'36405',series:'S000002842'}
};
const UA={'user-agent':'TIME-ETF-report/1.0'};
const tag=(s,t)=>(s.match(new RegExp('<'+t+'>([^<]*)</'+t+'>'))||[])[1];
// Directly held long common equity only (assetCat EC, share units); cash, futures and other assets are excluded.
export function parseNport(xml){
 const asOf=tag(xml,'repPdDate'),seriesId=tag(xml,'seriesId');
 const rows=[...xml.matchAll(/<invstOrSec>([\s\S]*?)<\/invstOrSec>/g)].map(m=>m[1])
  .filter(s=>tag(s,'assetCat')==='EC'&&tag(s,'units')==='NS'&&tag(s,'payoffProfile')!=='Short')
  .map(s=>({isin:(s.match(/<isin value="([^"]+)"/)||[])[1]||null,name:tag(s,'name')||tag(s,'title')||'',shares:Number(tag(s,'balance')),weight:Number(tag(s,'pctVal'))}));
 return {asOf,seriesId,rows};
}
// keyOf: ISIN -> security key (or undefined). Returns the validated snapshot plus what could not be mapped.
export function nportSnapshot(etf,parsed,keyOf,today){
 const mapped=[],unmapped=[];
 for(const r of parsed.rows){const key=r.isin&&keyOf(r.isin);if(key)mapped.push({key,name:r.name,shares:r.shares,weight:r.weight});else unmapped.push(r);}
 const snap=validateSnapshot(etf,{asOf:parsed.asOf,rows:mapped},today);
 return {snap,unmapped,unmappedWeight:unmapped.reduce((s,r)=>s+(r.weight>0?r.weight:0),0)};
}
export function filingsFromAtom(atom){
 return [...atom.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>({type:tag(m[1],'filing-type'),date:tag(m[1],'filing-date'),href:tag(m[1],'filing-href')}))
  .filter(f=>/^NPORT-P(\/A)?$/.test(f.type||'')&&f.href).map(f=>({...f,xml:f.href.replace(/\/[^/]+-index\.htm$/,'/primary_doc.xml')}));
}
async function main(){
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),get=async(url,init={})=>{const r=await fetch(url,{...init,headers:{...UA,...init.headers},signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r;};
 const path='state/overseas-holdings.json',state=JSON.parse(await readFile(path,'utf8'));
 const today=new Date().toISOString().slice(0,10),cut=new Date(Date.parse(today)-400*86400000).toISOString().slice(0,10);
 // ISIN -> key from Vanguard's current files (same parser rules as overseas-holdings.mjs).
 const map=new Map();
 for(const id of Object.keys(NPORT_SERIES)){const j=await (await get(`https://investor.vanguard.com/irr/funds/profile/${id}-AdditionalFundData`)).json();
  for(const h of j.holdingDetails?.equityHoldings||[])if(h.isin&&h.ticker){const k=securityKey(h.ticker,h.isin.startsWith('US')?'US':h.isin.slice(0,2));if(k)map.set(h.isin,k);}}
 const parsed=[];
 for(const [id,s] of Object.entries(NPORT_SERIES)){
  const atom=await (await get(`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${s.series}&type=NPORT-P&dateb=&owner=include&count=40&output=atom`)).text();
  // Oldest filing first so an amendment (/A) for the same period replaces the original.
  const filings=filingsFromAtom(atom).filter(f=>f.date>=cut).sort((a,b)=>a.date.localeCompare(b.date));
  const byPeriod=new Map();
  for(const f of filings){await sleep(400);const p=parseNport(await (await get(f.xml)).text());
   if(p.seriesId!==s.series)throw Error(`${id}: ${f.xml} is series ${p.seriesId}, expected ${s.series}`);
   if(p.asOf>=cut)byPeriod.set(p.asOf,{...p,source:f.xml});}
  for(const p of byPeriod.values())parsed.push({id,p});
 }
 // OpenFIGI fallback for ISINs that left the funds before Vanguard's current file (10 per request, no key: 25/min).
 const missing=[...new Set(parsed.flatMap(x=>x.p.rows.map(r=>r.isin)).filter(i=>i&&!map.has(i)))];
 for(let i=0;i<missing.length;i+=10){const batch=missing.slice(i,i+10);if(i)await sleep(2600);
  const res=await (await get('https://api.openfigi.com/v3/mapping',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(batch.map(v=>({idType:'ID_ISIN',idValue:v,exchCode:'US'})))})).json();
  res.forEach((r,j)=>{const t=r.data?.find(d=>d.marketSector==='Equity')?.ticker;const k=t&&securityKey(t,'US');if(k)map.set(batch[j],k);});}
 let added=0;
 for(const {id,p} of parsed.sort((a,b)=>a.p.asOf.localeCompare(b.p.asOf))){
  const etf=OVERSEAS_ETFS.find(e=>e.id===id),have=state.etfs?.[id]?.snapshots?.[p.asOf];
  if(have&&!String(have.source).includes('sec.gov')){console.log(`${id} ${p.asOf}: Vanguard snapshot kept`);continue;}
  const {snap,unmapped,unmappedWeight}=nportSnapshot(etf,p,i=>map.get(i),today);
  const r=storeSnapshot(state,etf,snap,{fetchedAt:new Date().toISOString(),source:p.source});if(r!=='same')added++;
  console.log(`${id} ${p.asOf}: ${r}, ${snap.rows.length} holdings, ${unmapped.length} unmapped (${unmappedWeight.toFixed(3)}%)${unmapped.length?': '+unmapped.slice(0,5).map(u=>u.name).join(', '):''}`);
 }
 if(added){await writeFile(path+'.tmp',JSON.stringify(state)+'\n');await rename(path+'.tmp',path);}
 console.log(`N-PORT import: ${added} snapshots added or refreshed`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
