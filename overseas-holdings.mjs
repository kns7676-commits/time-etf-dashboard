// 해외 상장 ETF 전체 구성종목 수집 (종목별 ETF 추이 탭).
// Official issuer files only. A failed ETF only emits ::warning:: and keeps its earlier snapshots; it never blocks
// the domestic dashboard or Telegram delivery. Past days are filled only where the issuer serves dated files
// (Global X); every other ETF's history starts on its first collected day. Never invent or reconstruct history.
import {inflateRawSync} from 'node:zlib';
const ARK='https://assets.ark-funds.com/fund-documents/funds-etf-csv/';
export const OVERSEAS_ETFS=[
 {id:'QQQ',name:'Invesco QQQ Trust',issuer:'Invesco',type:'index',parser:'invesco',url:'https://dng-api.invesco.com/cache/v1/accounts/en_US/shareclasses/QQQ/holdings/fund?idType=ticker&productType=ETF',page:'https://www.invesco.com/us/en/financial-products/etfs/invesco-qqq-trust-series-1.html'},
 {id:'XLK',name:'Technology Select Sector SPDR',issuer:'State Street',type:'index',parser:'spdr',url:'https://www.ssga.com/us/en/intermediary/library-content/products/fund-data/etfs/us/holdings-daily-us-en-xlk.xlsx',page:'https://www.ssga.com/us/en/intermediary/etfs/state-street-technology-select-sector-spdr-etf-xlk'},
 {id:'SMH',name:'VanEck Semiconductor ETF',issuer:'VanEck',type:'index',parser:'vaneck',url:'https://www.vaneck.com/us/en/etf/equity/smh/holdings/download/xlsx/',cookiePage:'https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/holdings/',page:'https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/holdings/'},
 {id:'SOXX',name:'iShares Semiconductor ETF',issuer:'iShares',type:'index',parser:'ishares',url:'https://www.ishares.com/us/products/239705/ishares-semiconductor-etf/latest-holdings.csv',page:'https://www.ishares.com/us/products/239705/ishares-semiconductor-etf'},
 {id:'IGV',name:'iShares Expanded Tech-Software Sector ETF',issuer:'iShares',type:'index',parser:'ishares',url:'https://www.ishares.com/us/products/239771/ishares-expanded-tech-software-sector-etf/latest-holdings.csv',page:'https://www.ishares.com/us/products/239771/ishares-expanded-tech-software-sector-etf'},
 {id:'AIQ',name:'Global X AI & Technology ETF',issuer:'Global X',type:'index',parser:'globalx',url:'https://assets.globalxetfs.com/funds/holdings/aiq_full-holdings_{date}.csv',dated:true,page:'https://www.globalxetfs.com/funds/aiq/'},
 {id:'BOTZ',name:'Global X Robotics & AI ETF',issuer:'Global X',type:'index',parser:'globalx',url:'https://assets.globalxetfs.com/funds/holdings/botz_full-holdings_{date}.csv',dated:true,page:'https://www.globalxetfs.com/funds/botz/'},
 {id:'ARKK',name:'ARK Innovation ETF',issuer:'ARK',type:'active',parser:'ark',url:ARK+'ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv',page:'https://www.ark-funds.com/funds/arkk'},
 {id:'ARKQ',name:'ARK Autonomous Tech. & Robotics ETF',issuer:'ARK',type:'active',parser:'ark',url:ARK+'ARK_AUTONOMOUS_TECH._%26_ROBOTICS_ETF_ARKQ_HOLDINGS.csv',page:'https://www.ark-funds.com/funds/arkq'},
 {id:'ARKX',name:'ARK Space & Defense Innovation ETF',issuer:'ARK',type:'active',parser:'ark',url:ARK+'ARK_SPACE_%26_DEFENSE_INNOVATION_ETF_ARKX_HOLDINGS.csv',page:'https://www.ark-funds.com/funds/arkx'},
 {id:'ARKF',name:'ARK Blockchain & Fintech Innovation ETF',issuer:'ARK',type:'active',parser:'ark',url:ARK+'ARK_BLOCKCHAIN_%26_FINTECH_INNOVATION_ETF_ARKF_HOLDINGS.csv',page:'https://www.ark-funds.com/funds/arkf'},
 {id:'ARKG',name:'ARK Genomic Revolution ETF',issuer:'ARK',type:'active',parser:'ark',url:ARK+'ARK_GENOMIC_REVOLUTION_ETF_ARKG_HOLDINGS.csv',page:'https://www.ark-funds.com/funds/arkg'},
 {id:'VGT',name:'Vanguard Information Technology ETF',issuer:'Vanguard',type:'monthly',parser:'vanguard',url:'https://investor.vanguard.com/irr/funds/profile/VGT-AdditionalFundData',page:'https://investor.vanguard.com/investment-products/etfs/profile/vgt'},
 {id:'VUG',name:'Vanguard Growth ETF',issuer:'Vanguard',type:'monthly',parser:'vanguard',url:'https://investor.vanguard.com/irr/funds/profile/VUG-AdditionalFundData',page:'https://investor.vanguard.com/investment-products/etfs/profile/vug'}
];
const VENUE={US:'US',UW:'US',UQ:'US',UN:'US',UA:'US',UP:'US',UR:'US',JP:'JP',JT:'JP',TT:'TW',HK:'HK',KS:'KR',KQ:'KR',C1:'CN',C2:'CN',CH:'CN',GR:'DE',GY:'DE',FP:'FR',NA:'NL',LN:'GB',SW:'CH',SE:'CH',IM:'IT',SQ:'ES',SS:'SE',FH:'FI',DC:'DK',NO:'NO',AU:'AU',CN:'CA',CT:'CA',IT:'IL'};
const COUNTRY={'United States':'US',Taiwan:'TW',Japan:'JP','Korea (South)':'KR',Netherlands:'NL',Germany:'DE',France:'FR','United Kingdom':'GB',Switzerland:'CH',China:'CN','Hong Kong':'HK',Canada:'CA',Israel:'IL'};
// One key per listed security: market + local ticker. ADRs and local shares stay distinct (US:TSM ≠ TW:2330).
export function securityKey(code,country='US'){
 const c=String(code??'').trim().toUpperCase().replace(/\s+EQUITY$/,'');
 if(!c||c==='-'||/\b(INDEX|COMDTY|CURNCY)\b/.test(c)||c==='현금')return null;
 if(/^\d[0-9A-Z]{5}$/.test(c))return 'KR:'+c;
 let m=c.match(/^(\S+)\s+([A-Z0-9]{2})$/);
 if(m)return VENUE[m[2]]?VENUE[m[2]]+':'+m[1].replace('/','.'):null;
 if(/^[A-Z0-9][A-Z0-9.\/-]{0,9}$/.test(c))return (COUNTRY[country]||country||'US')+':'+c.replace('/','.');
 return null;
}
const num=s=>{const v=Number(String(s??'').replace(/[$,%\s"]/g,''));return String(s??'').trim()===''?NaN:v;};
export function csvRows(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
  else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=ch;}
 if(cell||row.length){row.push(cell);rows.push(row);}
 return rows;
}
const usDate=s=>{const m=String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:null;};
const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const textDate=s=>{let m=String(s).match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),\s*(\d{4})/);if(m)return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2,'0')}-${m[2].padStart(2,'0')}`;m=String(s).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);return m?`${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2,'0')}-${m[1].padStart(2,'0')}`:null;};
// Minimal XLSX reader: first worksheet as arrays of cell strings (shared and inline strings, numbers).
export function xlsxRows(buffer){
 const b=Buffer.from(buffer);let eocd=-1;for(let i=b.length-22;i>=0;i--)if(b.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw Error('Not an xlsx file');
 const files={};let p=b.readUInt32LE(eocd+16);const n=b.readUInt16LE(eocd+10);
 for(let k=0;k<n;k++){const method=b.readUInt16LE(p+10),size=b.readUInt32LE(p+20),nameLen=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30),comment=b.readUInt16LE(p+32),local=b.readUInt32LE(p+42),name=b.subarray(p+46,p+46+nameLen).toString();
  const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28),raw=b.subarray(start,start+size);files[name]=(method===8?inflateRawSync(raw):raw).toString('utf8');p+=46+nameLen+extra+comment;}
 const strip=x=>(x||'').replace(/<(\/?)[a-z]+:/gi,'<$1');
 const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&');
 const shared=[...strip(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>decode(m[1]));
 const sheet=strip(files['xl/worksheets/sheet1.xml']||Object.entries(files).find(([k])=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))?.[1]);
 if(!sheet)throw Error('xlsx worksheet missing');
 const col=s=>[...s].reduce((v,ch)=>v*26+ch.charCodeAt(0)-64,0)-1;
 return [...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map(r=>{const out=[];for(const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){const ref=c[1].match(/r="([A-Z]+)\d+"/)?.[1],t=c[1].match(/t="(\w+)"/)?.[1],v=c[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1];if(!ref)continue;out[col(ref)]=t==='s'?shared[+v]:t==='inlineStr'?decode(c[2].match(/<is>([\s\S]*?)<\/is>/)?.[1]||''):v!==undefined?decode(v):'';}return Array.from(out,x=>x??'');});
}
const row=(code,name,shares,weight,country)=>({key:securityKey(code,country),name:String(name).trim(),shares,weight});
export const PARSERS={
 ark(text){const r=csvRows(text);const head=r[0].map(s=>s.trim().toLowerCase());const at=n=>head.indexOf(n);
  const body=r.slice(1).filter(x=>x[at('fund')]);const asOf=usDate(body[0]?.[at('date')]);
  return {asOf,rows:body.filter(x=>x[at('ticker')]&&!/CASH|MONEY MARKET|TREASURY|OBLIG/i.test(x[at('company')])).map(x=>row(x[at('ticker')],x[at('company')],num(x[at('shares')]),num(x[at('weight (%)')])))};},
 globalx(text){const r=csvRows(text);const asOf=usDate(text.match(/as of ([\d/]+)/i)?.[1]);const h=r.findIndex(x=>x[0]?.trim()==='% of Net Assets');if(h<0)throw Error('Global X header missing');
  return {asOf,rows:r.slice(h+1).filter(x=>x[1]?.trim()&&Number.isFinite(num(x[0]))).map(x=>row(x[1],x[2],num(x[5]),num(x[0])))};},
 ishares(text){const r=csvRows(text);const asOf=textDate(r.find(x=>x[0]==='Fund Holdings as of')?.[1]);const units=num(r.find(x=>x[0]==='Shares Outstanding')?.[1]);
  const h=r.findIndex(x=>x[0]==='Ticker');if(h<0)throw Error('iShares header missing');const head=r[h],at=n=>head.indexOf(n);const out=[];
  for(const x of r.slice(h+1)){if(x.length<5)break;if(x[at('Asset Class')]!=='Equity')continue;out.push(row(x[at('Ticker')],x[at('Name')],num(x[at('Quantity')]),num(x[at('Weight (%)')]),x[at('Location')]));}
  return {asOf,units:Number.isFinite(units)?units:null,rows:out};},
 invesco(json){const j=typeof json==='string'?JSON.parse(json):json;return {asOf:j.effectiveDate,rows:j.holdings.filter(h=>!/cash|future|money market|treasury|bill/i.test(h.securityTypeName||'')).map(h=>row(h.ticker,h.issuerName,Number(h.units),Number(h.percentageOfTotalNetAssets)))};},
 spdr(buffer){const r=xlsxRows(buffer);const asOf=textDate(r.flat().find(s=>/As of \d/i.test(s))||'');const h=r.findIndex(x=>x.includes('Ticker')&&x.includes('Weight'));if(h<0)throw Error('SPDR header missing');
  const head=r[h],at=n=>head.indexOf(n),out=[];for(const x of r.slice(h+1)){if(!x[at('Ticker')]||!x[at('Name')])break;if(/CASH|USD|SSI US GOV/i.test(x[at('Name')])&&!Number.isFinite(num(x[at('Shares Held')])))continue;out.push(row(x[at('Ticker')],x[at('Name')],num(x[at('Shares Held')]),num(x[at('Weight')])));}
  return {asOf,rows:out.filter(x=>!/^(CASH|USD|-)$/i.test(x.name))};},
 vaneck(buffer){const r=xlsxRows(buffer);const asOf=usDate(r.flat().find(s=>/Daily Holdings/i.test(s))||'');const h=r.findIndex(x=>x.includes('Ticker')&&x.includes('Asset Class'));if(h<0)throw Error('VanEck header missing');
  const head=r[h],at=n=>head.indexOf(n);return {asOf,rows:r.slice(h+1).filter(x=>x[at('Asset Class')]==='Stock').map(x=>row(x[at('Ticker')],x[at('Holding Name')],num(x[at('Shares')]),num(x[at('% of Net Assets')])))};},
 vanguard(json){const j=typeof json==='string'?JSON.parse(json):json;const d=j.holdingDetails;if(!d?.equityHoldings)throw Error('Vanguard holdings missing');
  return {asOf:usDate(d.asOfDate),rows:d.equityHoldings.filter(h=>h.ticker).map(h=>row(h.ticker,h.securityLongDescription,num(h.shareQuantity),num(h.marketValuePercentage),h.isin&&!h.isin.startsWith('US')?h.isin.slice(0,2):'US'))};}
};
// Rows without a recognisable listed-security key (cash, currency, futures, unlisted stakes) are dropped here.
export function validateSnapshot(etf,parsed,today){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(parsed.asOf||''))throw Error(etf.id+': source date missing');
 if(parsed.asOf>today)throw Error(etf.id+': source date '+parsed.asOf+' is in the future');
 const rows=parsed.rows.filter(r=>r.key&&Number.isFinite(r.weight)&&r.weight>0);
 const merged=new Map();for(const r of rows){const m=merged.get(r.key);if(m){m.weight+=r.weight;m.shares=(m.shares||0)+(r.shares||0);}else merged.set(r.key,{...r});}
 const list=[...merged.values()].sort((a,b)=>b.weight-a.weight),sum=list.reduce((s,r)=>s+r.weight,0);
 if(list.length<10)throw Error(etf.id+': only '+list.length+' holdings parsed');
 if(sum<60||sum>110)throw Error(etf.id+': holdings weight sum '+sum.toFixed(1)+' outside 60–110');
 return {asOf:parsed.asOf,units:parsed.units??null,rows:list};
}
const round=(v,d)=>Number.isFinite(v)?Math.round(v*10**d)/10**d:null;
export function storeSnapshot(state,etf,snap,{fetchedAt,source}){
 state.schemaVersion=1;state.etfs??={};state.names??={};
 const e=state.etfs[etf.id]??={snapshots:{}};
 const dates=Object.keys(e.snapshots).sort();
 if(!e.snapshots[snap.asOf]&&etf.type!=='monthly'&&!etf.dated&&dates.length&&snap.asOf<dates.at(-1))return 'older';
 for(const r of snap.rows)state.names[r.key]??=r.name;
 const record={fetchedAt,source,units:snap.units,count:snap.rows.length,rows:snap.rows.map(r=>[r.key,Number.isFinite(r.shares)?r.shares:null,round(r.weight,4)])};
 const was=e.snapshots[snap.asOf];e.snapshots[snap.asOf]=record;
 return was?(JSON.stringify(was.rows)===JSON.stringify(record.rows)?'same':'corrected'):'added';
}
export function pruneSnapshots(state,today,days=400){
 const cut=new Date(Date.parse(today)-days*86400000).toISOString().slice(0,10);
 for(const e of Object.values(state.etfs||{}))for(const d of Object.keys(e.snapshots))if(d<cut)delete e.snapshots[d];
}
async function fetchBody(etf,url,fetcher){
 const headers={'user-agent':'TIME-ETF-report/1.0'};
 if(etf.cookiePage){const r=await fetcher(etf.cookiePage,{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});await r.body?.cancel();headers.cookie=(r.headers.getSetCookie?.()||[]).map(s=>s.split(';')[0]).join('; ');}
 const r=await fetcher(url,{headers,signal:AbortSignal.timeout(60000)});
 if(!r.ok){await r.body?.cancel();const e=Error('HTTP '+r.status);e.status=r.status;throw e;}
 const buf=Buffer.from(await r.arrayBuffer());
 const wrong=m=>Object.assign(Error(m),{permanent:true});
 if(['spdr','vaneck'].includes(etf.parser)){if(buf.length<4||buf.readUInt32LE(0)!==0x04034b50)throw wrong('expected xlsx, got '+(r.headers.get('content-type')||'unknown'));return buf;}
 const text=buf.toString('utf8');if(/^\s*<!doctype html|^\s*<html/i.test(text))throw wrong('expected data file, got an HTML page');
 return text;
}
// Transient failures (network errors, timeouts, HTTP 5xx) are retried twice with 3s/6s pauses. HTTP 429 is never
// retried (respect the issuer's rate limit), nor are 404s (no file for that day) or wrong-content responses.
export const RETRY_ATTEMPTS=3;
export async function fetchWithRetry(etf,url,fetcher,sleep,log=console){
 for(let attempt=1;;attempt++){
  try{return await fetchBody(etf,url,fetcher);}
  catch(e){
   const transient=!e.permanent&&(e.status===undefined||e.status>=500);
   if(!transient||attempt>=RETRY_ATTEMPTS)throw e;
   log.log(`${etf.id}: ${e.message}; retry ${attempt+1}/${RETRY_ATTEMPTS}`);
   await sleep(3000*attempt);
  }
 }
}
const weekdays=(today,days)=>{const out=[];for(let i=1;i<=days;i++){const d=new Date(Date.parse(today)-i*86400000);if(d.getUTCDay()%6)out.push(d.toISOString().slice(0,10));}return out;};
export async function updateOverseasHoldings(state,{fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=new Date(),backfillDays=31,etfs=OVERSEAS_ETFS,log=console}={}){
 const today=new Date(now.getTime()+9*3600000).toISOString().slice(0,10),fetchedAt=now.toISOString(),summary=[];
 state.schemaVersion=1;state.etfs??={};state.names??={};
 for(const etf of etfs){
  const tries=etf.dated?[today,...weekdays(today,backfillDays)]:[null];
  const e=state.etfs[etf.id]??={snapshots:{}};e.missing??=[];
  let added=0,failed=null;
  for(const date of tries){
   if(date&&date!==today&&(e.snapshots[date]||e.missing.includes(date)))continue;
   const url=date?etf.url.replace('{date}',date.replaceAll('-','')):etf.url;
   try{
    const body=await fetchWithRetry(etf,url,fetcher,sleep,log);
    const snap=validateSnapshot(etf,PARSERS[etf.parser](body),today);
    const result=storeSnapshot(state,etf,snap,{fetchedAt,source:url});
    if(result==='added'||result==='corrected')added++;
    log.log(`${etf.id} ${snap.asOf}: ${snap.rows.length} holdings (${result})`);
   }catch(err){
    if(date&&err.status===404){if(date!==today)e.missing.push(date);}
    else{failed=err.message;if(err.status===429||err.status>=500)break;}
   }
   if(tries.length>1)await sleep(1000);
  }
  e.missing=e.missing.filter(d=>d>=weekdays(today,backfillDays).at(-1)).sort();
  if(failed)log.warn(`::warning::Overseas ETF ${etf.id} skipped: ${failed}`);
  summary.push({id:etf.id,added,failed});
  await sleep(1000);
 }
 pruneSnapshots(state,today);
 return summary;
}
