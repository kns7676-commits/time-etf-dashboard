// One-time import of ARK holding *observations* (2026-10-23..) from market-breadth-monitor's change feed
// (https://market-breadth-monitor.vercel.app/etf), user-approved 2026-11-15 to cover ARK days before official
// collection began. The feed lists only changed rows and has gaps, so it is never turned into full snapshots:
// each record is kept as a dated (shares, weight) observation in state/overseas-observations.json, separate from
// the official state. The import aborts unless every record dated on an official snapshot day matches it exactly.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {securityKey} from './overseas-holdings.mjs';
export const OBSERVATION_SOURCE='https://market-breadth-monitor.vercel.app/api/etf';
const ARK=['ARKK','ARKQ','ARKX','ARKF','ARKG'];
export function buildObservations(feed,official,{fetchedAt=new Date().toISOString()}={}){
 const recs=feed.changes.filter(c=>c.market==='US'&&ARK.includes(c.etf)&&c.ticker).map(c=>({...c,key:securityKey(c.ticker)})).filter(c=>c.key);
 let matched=0;const mismatched=[];
 for(const c of recs){const snap=official.etfs?.[c.etf]?.snapshots?.[c.date];if(!snap)continue;
  const r=snap.rows.find(r=>r[0]===c.key);
  if(r&&r[1]===c.shares&&Math.abs(r[2]-c.weight)<0.006)matched++;else mismatched.push(`${c.date} ${c.etf} ${c.ticker}: official ${r?r[1]+'/'+r[2]:'absent'} vs ${c.shares}/${c.weight}`);
 }
 if(mismatched.length)throw Error('Third-party records disagree with official ARK files: '+mismatched.slice(0,5).join('; '));
 if(!matched)throw Error('No third-party record overlaps an official snapshot; cannot verify the feed');
 // Keep only days on or before each ETF's first official snapshot (later days come from official files).
 const first=Object.fromEntries(ARK.map(id=>[id,Object.keys(official.etfs?.[id]?.snapshots||{}).sort()[0]]));
 const records=recs.filter(c=>first[c.etf]&&c.date<=first[c.etf]).sort((a,b)=>a.date.localeCompare(b.date)||a.etf.localeCompare(b.etf)||a.key.localeCompare(b.key))
  .map(c=>[c.date,c.etf,c.key,c.shares,c.weight,c.shares_prev,c.weight_prev]);
 return {source:OBSERVATION_SOURCE,fetchedAt,feedUpdated:feed.last_success||null,verified:{matched,mismatched:0,against:'ARK official holdings CSV'},
  note:'Changed rows only; days without a record are unknown, not unchanged.',fields:['date','etf','key','shares','weight','sharesPrev','weightPrev'],records};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=await fetch(OBSERVATION_SOURCE+'?days=90',{headers:{'user-agent':'TIME-ETF-report/1.0'},signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw Error('HTTP '+r.status);
 const official=JSON.parse(await readFile('state/overseas-holdings.json','utf8'));
 const out=buildObservations(await r.json(),official);
 await writeFile('state/overseas-observations.json.tmp',JSON.stringify(out)+'\n');await rename('state/overseas-observations.json.tmp','state/overseas-observations.json');
 const days=[...new Set(out.records.map(x=>x[0]))];
 console.log(`Imported ${out.records.length} ARK observations over ${days.length} days (${days[0]}..${days.at(-1)}); verified ${out.verified.matched} records against official files`);
}
