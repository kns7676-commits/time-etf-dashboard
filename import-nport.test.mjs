import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNport,nportSnapshot,filingsFromAtom} from './import-nport.mjs';
import {OVERSEAS_ETFS} from './overseas-holdings.mjs';
import {buildStockModel} from './all-holdings/stock-trends.mjs';

const sec=(name,isin,bal,pct,{cat='EC',units='NS'}={})=>`<invstOrSec><name>${name}</name><title>${name.toUpperCase()}</title><cusip>x</cusip><identifiers><isin value="${isin}"/></identifiers><balance>${bal}</balance><units>${units}</units><curCd>USD</curCd><valUSD>1</valUSD><pctVal>${pct}</pctVal><payoffProfile>Long</payoffProfile><assetCat>${cat}</assetCat></invstOrSec>`;
const xml=d=>`<edgarSubmission><genInfo><seriesId>S000004452</seriesId><repPdDate>${d}</repPdDate></genInfo><invstOrSecs>`+
 sec('NVIDIA Corp','US67066G1040','137381211.00000000','17.77321588932')+
 Array.from({length:11},(_,i)=>sec('Stock '+i,'US00000000'+String(i).padStart(2,'0'),'1000','7.5')).join('')+
 sec('Gone Corp','US9999999999','10','0.2')+
 sec('E-mini Future','',1,'0.1',{cat:'DE',units:'NC'})+sec('Cash Fund','US1111111111','5','0.3',{cat:'STIV'})+'</invstOrSecs></edgarSubmission>';

test('parseNport keeps directly held equities with fund-level shares and % of net assets', () => {
 const p=parseNport(xml('2026-08-31'));
 assert.equal(p.asOf,'2026-08-31');assert.equal(p.seriesId,'S000004452');
 assert.equal(p.rows.length,13);
 assert.deepEqual(p.rows[0],{isin:'US67066G1040',name:'NVIDIA Corp',shares:137381211,weight:17.77321588932});
});

test('nportSnapshot maps ISINs to keys and reports unmapped rows instead of guessing', () => {
 const keys=new Map([['US67066G1040','US:NVDA'],...Array.from({length:11},(_,i)=>['US00000000'+String(i).padStart(2,'0'),'US:S'+i])]);
 const vgt=OVERSEAS_ETFS.find(e=>e.id==='VGT');
 const {snap,unmapped,unmappedWeight}=nportSnapshot(vgt,parseNport(xml('2026-08-31')),i=>keys.get(i),'2026-11-15');
 assert.equal(snap.rows[0].key,'US:NVDA');assert.equal(snap.rows[0].shares,137381211);
 assert.equal(snap.rows.length,12);assert.deepEqual(unmapped.map(u=>u.name),['Gone Corp']);assert.equal(unmappedWeight,0.2);
 assert.throws(()=>nportSnapshot(vgt,parseNport(xml('2026-08-31')),()=>undefined,'2026-11-15'),/only 0 holdings/);
});

test('filingsFromAtom lists N-PORT filings with their primary XML documents', () => {
 const atom='<feed><entry><content><filing-date>2026-10-29</filing-date><filing-href>https://www.sec.gov/Archives/edgar/data/52848/000005284826001199/0000052848-26-001199-index.htm</filing-href><filing-type>NPORT-P</filing-type></content></entry><entry><content><filing-date>2026-10-01</filing-date><filing-href>https://x/y-index.htm</filing-href><filing-type>N-CSR</filing-type></content></entry></feed>';
 assert.deepEqual(filingsFromAtom(atom),[{type:'NPORT-P',date:'2026-10-29',href:'https://www.sec.gov/Archives/edgar/data/52848/000005284826001199/0000052848-26-001199-index.htm',xml:'https://www.sec.gov/Archives/edgar/data/52848/000005284826001199/primary_doc.xml'}]);
});

test('monthly ETFs keep quarter-end history older than the daily window', () => {
 const snap=(w,s)=>({rows:[['US:NVDA',s,w],...Array.from({length:12},(_,i)=>['US:S'+i,1000,6])]});
 const overseas={names:{'US:NVDA':'NVIDIA'},etfs:{VGT:{snapshots:{'2026-02-28':snap(15,140e6),'2026-05-31':snap(16,139e6),'2026-09-30':snap(17.58,137370698)}},
  QQQ:{snapshots:{'2026-11-12':snap(9,1),'2026-11-13':snap(9.1,1)}}}};
 const m=buildStockModel(overseas,[]);
 const vgt=m.etfs.findIndex(e=>e.id==='VGT'),pts=m.stocks['US:NVDA'].w[vgt];
 assert.deepEqual(pts.map(p=>m.dates[p[0]]),['2026-02-28','2026-05-31','2026-09-30']);
 assert.ok(m.stocks['US:NVDA'].c.some(c=>c[0]==='2026-05-31'&&c[1]===vgt&&c[7]==='2026-02-28'));
});
