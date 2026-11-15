import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {securityKey,PARSERS,xlsxRows,validateSnapshot,storeSnapshot,updateOverseasHoldings,OVERSEAS_ETFS} from './overseas-holdings.mjs';
// Minimal zip writer so xlsx parsing is tested without fixtures on disk.
function zip(files){
 const locals=[],central=[];let offset=0;
 for(const [name,text] of Object.entries(files)){
  const data=deflateRawSync(Buffer.from(text)),n=Buffer.from(name),h=Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(8,8);h.writeUInt32LE(data.length,18);h.writeUInt16LE(n.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(8,10);c.writeUInt32LE(data.length,20);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
  locals.push(h,n,data);central.push(c,n);offset+=30+n.length+data.length;
 }
 const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,cd,end]);
}
const sheet=rows=>zip({'xl/sharedStrings.xml':'<x:sst xmlns:x="m">'+rows.flat().filter(v=>typeof v==='string').map(s=>'<x:si><x:t>'+s.replace(/&/g,'&amp;')+'</x:t></x:si>').join('')+'</x:sst>',
 'xl/worksheets/sheet1.xml':(()=>{const strings=rows.flat().filter(v=>typeof v==='string');return '<x:worksheet><x:sheetData>'+rows.map((r,i)=>'<x:row r="'+(i+1)+'">'+r.map((v,j)=>{const ref=String.fromCharCode(65+j)+(i+1);return typeof v==='string'?'<x:c r="'+ref+'" t="s"><x:v>'+strings.indexOf(v)+'</x:v></x:c>':'<x:c r="'+ref+'"><x:v>'+v+'</x:v></x:c>';}).join('')+'</x:row>').join('')+'</x:sheetData></x:worksheet>';})()});
const many=(n,fmt)=>Array.from({length:n},(_,i)=>fmt(i)).join('\n');
test('security keys unify US venues and keep markets and ADRs distinct',()=>{
 assert.equal(securityKey('NVDA'),'US:NVDA');assert.equal(securityKey('NVDA US EQUITY'),'US:NVDA');assert.equal(securityKey('MU UW Equity'),'US:MU');
 assert.equal(securityKey('6954 JP'),'JP:6954');assert.equal(securityKey('6857 JP Equity'),'JP:6857');assert.equal(securityKey('603666 C1'),'CN:603666');
 assert.equal(securityKey('005930'),'KR:005930');assert.equal(securityKey('388720 KS'),'KR:388720');assert.equal(securityKey('2330','Taiwan'),'TW:2330');
 assert.equal(securityKey('TSM'),'US:TSM');assert.equal(securityKey('BRK/B'),'US:BRK.B');
 for(const x of ['NQZ6 Index','현금','','-',null])assert.equal(securityKey(x),null);
});
test('ARK, Global X, iShares, Invesco and Vanguard files parse into listed equities only',()=>{
 const ark=PARSERS.ark('date,fund,company,ticker,cusip,shares,market value ($),weight (%)\r\n11/13/2026,ARKK,TESLA INC,TSLA,1,"2,196,770","$1",11.98%\r\n11/13/2026,ARKK,GOLDMAN FS TRSY OBLIG INST 468,X,1,"5","$1",0.18%\r\n11/13/2026,ARKK,OPENAI GROUP PBC SERIES C,,1,"5","$1",3.46%\r\n');
 assert.equal(ark.asOf,'2026-11-13');assert.deepEqual(ark.rows.map(r=>[r.key,r.shares,r.weight]),[['US:TSLA',2196770,11.98]]);
 const gx=PARSERS.globalx('Global X Robotics\nFund Holdings Data as of 11/13/2026\n% of Net Assets,Ticker,Name,SEDOL,Market Price ($),Shares Held,Market Value ($)\n8.50,6954 JP,FANUC CORP,X,1,"1,000.00",1\n0.01,"",CASH,"",1,"5",5\n0.37,NQZ6 Index,NASDAQ FUT,"",1,1,1\n');
 assert.equal(gx.asOf,'2026-11-13');assert.deepEqual(gx.rows.filter(r=>r.key).map(r=>[r.key,r.shares]),[['JP:6954',1000]]);
 const ish=PARSERS.ishares('iShares Semiconductor ETF\nFund Holdings as of,"Nov 12, 2026"\nShares Outstanding,"288,700,000.00"\n\nTicker,Name,Sector,Asset Class,Market Value,Weight (%),Notional Value,Quantity,Price,Location,Exchange\n"NVDA","NVIDIA","IT","Equity","1","6.61","1","17,019,628.00","1","United States","NASDAQ"\n"USD","USD CASH","Cash","Cash","1","0.1","1","1","1","United States","-"\n\n"The content contained herein"\n');
 assert.equal(ish.asOf,'2026-11-12');assert.equal(ish.units,288700000);assert.deepEqual(ish.rows.map(r=>[r.key,r.shares,r.weight]),[['US:NVDA',17019628,6.61]]);
 const inv=PARSERS.invesco({effectiveDate:'2026-11-12',holdings:[{ticker:'AAPL',issuerName:'Apple',units:5,percentageOfTotalNetAssets:8.4,securityTypeName:'Common Stock'},{ticker:'NQZ6',issuerName:'fut',units:1,percentageOfTotalNetAssets:1,securityTypeName:'Index Future'}]});
 assert.deepEqual(inv.rows.map(r=>r.key),['US:AAPL']);
 const vg=PARSERS.vanguard({holdingDetails:{asOfDate:'09/30/2026',equityHoldings:[{ticker:'NVDA',securityLongDescription:'NVIDIA Corp',marketValuePercentage:'17.58%',shareQuantity:'137,370,698',isin:'US67066G1040'}]}});
 assert.equal(vg.asOf,'2026-09-30');assert.deepEqual(vg.rows.map(r=>[r.key,r.shares,r.weight]),[['US:NVDA',137370698,17.58]]);
});
test('SPDR and VanEck xlsx files parse from shared strings with namespaced XML',()=>{
 const spdr=PARSERS.spdr(sheet([['Fund Name:','Technology'],['Holdings:','As of 12-Nov-2026'],[],['Name','Ticker','Identifier','SEDOL','Weight','Sector','Shares Held','Local Currency'],['NVIDIA CORP','NVDA','67066G104','2379504',12.62,'IT',1000,'USD'],['APPLE INC','AAPL','x','y',11.5,'IT',900,'USD'],[],['Disclaimer text']]));
 assert.equal(spdr.asOf,'2026-11-12');assert.deepEqual(spdr.rows.map(r=>[r.key,r.weight,r.shares]),[['US:NVDA',12.62,1000],['US:AAPL',11.5,900]]);
 const ve=PARSERS.vaneck(sheet([['Daily Holdings (%)  11/12/2026'],[],['Number','Ticker','Holding Name','Identifier (FIGI)','Shares','Asset Class','Market Value (US$)','Notional Value','% of Net Assets'],[1,'NVDA','Nvidia Corp','B','66,457,749','Stock','$1','--','17.08%'],['','','Cash','','','Cash','$1','','0.1%']]));
 assert.equal(ve.asOf,'2026-11-12');assert.deepEqual(ve.rows.map(r=>[r.key,r.shares,r.weight]),[['US:NVDA',66457749,17.08]]);
 assert.throws(()=>xlsxRows(Buffer.from('not a zip file at all, definitely')),/xlsx/);
});
test('snapshots are validated, deduplicated by source date and never regress to older files',()=>{
 const etf={id:'T',type:'index'},rows=Array.from({length:12},(_,i)=>({key:'US:S'+i,name:'S'+i,shares:100,weight:8}));
 assert.throws(()=>validateSnapshot(etf,{asOf:'2026-11-12',rows:rows.slice(0,5)},'2026-11-15'),/only 5/);
 assert.throws(()=>validateSnapshot(etf,{asOf:'2026-11-20',rows},'2026-11-15'),/future/);
 assert.throws(()=>validateSnapshot(etf,{asOf:'',rows},'2026-11-15'),/source date/);
 const snap=validateSnapshot(etf,{asOf:'2026-11-12',rows},'2026-11-15'),state={};
 assert.equal(storeSnapshot(state,etf,snap,{fetchedAt:'a',source:'u'}),'added');
 assert.equal(storeSnapshot(state,etf,snap,{fetchedAt:'b',source:'u'}),'same');
 assert.equal(storeSnapshot(state,etf,{...snap,rows:snap.rows.map((r,i)=>i?r:{...r,weight:9})},{fetchedAt:'c',source:'u'}),'corrected');
 assert.equal(storeSnapshot(state,etf,{...snap,asOf:'2026-11-10'},{fetchedAt:'d',source:'u'}),'older');
 assert.deepEqual(Object.keys(state.etfs.T.snapshots),['2026-11-12']);
});
test('collection isolates failures, rejects HTML pages and backfills only dated Global X files',async()=>{
 const csv=(d)=>'Global X\nFund Holdings Data as of '+d+'\n% of Net Assets,Ticker,Name,SEDOL,Market Price ($),Shares Held,Market Value ($)\n'+many(12,i=>'8.0,S'+i+',Stock '+i+',x,1,100,1');
 const etfs=[OVERSEAS_ETFS.find(e=>e.id==='BOTZ'),OVERSEAS_ETFS.find(e=>e.id==='QQQ'),OVERSEAS_ETFS.find(e=>e.id==='SOXX')],seen=[];
 const fetcher=async url=>{seen.push(url);
  if(url.includes('globalx')){const d=url.match(/(\d{8})\.csv/)[1];if(d==='20261113'||d==='20261112')return new Response(csv(d.slice(4,6)+'/'+d.slice(6)+'/'+d.slice(0,4)));return new Response('no',{status:404});}
  if(url.includes('invesco'))return new Response('err',{status:500});
  return new Response('<!DOCTYPE html><html>login</html>');};
 const warns=[],state={};
 const summary=await updateOverseasHoldings(state,{fetcher,sleep:async()=>{},now:new Date('2026-11-15T01:00:00Z'),backfillDays:5,etfs,log:{log(){},warn:m=>warns.push(m)}});
 assert.deepEqual(Object.keys(state.etfs.BOTZ.snapshots).sort(),['2026-11-12','2026-11-13']);
 assert.deepEqual(state.etfs.BOTZ.missing,['2026-11-10','2026-11-11']);
 assert.equal(summary.find(s=>s.id==='QQQ').failed,'HTTP 500');assert.match(summary.find(s=>s.id==='SOXX').failed,/HTML page/);
 assert.ok(warns.some(w=>w.startsWith('::warning::Overseas ETF QQQ'))&&warns.some(w=>w.includes('SOXX')));
 const again=seen.length;await updateOverseasHoldings(state,{fetcher,sleep:async()=>{},now:new Date('2026-11-15T01:00:00Z'),backfillDays:5,etfs:[etfs[0]],log:{log(){},warn(){}}});
 assert.equal(seen.length-again,1,'known and missing Global X dates are not fetched again; only today is retried');
});
