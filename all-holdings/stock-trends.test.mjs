import test from 'node:test';
import assert from 'node:assert/strict';
import {flowFactor,holdingChanges,buildStockModel,stockTrendsPage,priceCandidates,priceCode} from './stock-trends.mjs';
const snap=(rows,units=null)=>({units,rows});
const base=Array.from({length:12},(_,i)=>['US:S'+i,1000,5]);
test('holding changes remove fund-wide flows before calling an increase or decrease',()=>{
 const cur=base.map(([k,s,w],i)=>[k,i===0?s*1.2:i===1?s*1.1*0.9:s*1.1,w]);
 assert.equal(Math.round(flowFactor(snap(base),snap(cur)).f*1000)/1000,1.1);
 const ch=holdingChanges(snap(base),snap(cur));
 assert.deepEqual(ch.map(c=>[c.key,c.kind,Math.round(c.adj*1000)/1000,c.method]),[['US:S0','증가',0.091,'중앙값 보정'],['US:S1','감소',-0.1,'중앙값 보정']]);
 // Units published (iShares): per-unit shares decide, regardless of the median.
 const u=holdingChanges(snap(base,100),snap(base.map(([k,s,w])=>[k,s*2,w]),200));assert.deepEqual(u,[]);
 assert.equal(flowFactor(snap(base,100),snap(base,200)).method,'1좌당');
});
test('additions and removals are reported, and too few common holdings withhold buy/sell estimates',()=>{
 const cur=[...base.slice(1),['US:NEW',50,1]];
 assert.deepEqual(holdingChanges(snap(base),snap(cur)).map(c=>c.kind).sort(),['편입','편출']);
 const small=base.slice(0,5),grown=small.map(([k,s,w],i)=>[k,i?s:s*3,w]);
 assert.equal(flowFactor(snap(small),snap(grown)),null);assert.deepEqual(holdingChanges(snap(small),snap(grown)),[]);
});
const overseas={names:{'US:NVDA':'NVIDIA Corp','US:AAPL':'Apple Inc'},etfs:{
 ARKK:{snapshots:{'2026-11-12':{units:null,rows:[['US:NVDA',100,3.4],...base]},'2026-11-13':{units:null,rows:[['US:NVDA',130,3.5],...base]}}},
 VGT:{snapshots:{'2026-09-30':{units:null,rows:[['US:NVDA',500,17.5],['US:AAPL',400,15],...base]}}}}};
const history=[{sentDate:'2026-11-12',products:{'2':{name:'TIME 미국나스닥100액티브',date:'2026-11-12',rows:[{code:'NVDA US EQUITY',name:'NVIDIA',weight:6.7},{code:'005930',name:'삼성전자',weight:3}]},'99':{name:'TIME 코스피액티브',date:'2026-11-12',rows:[{code:'000660',name:'SK하이닉스',weight:9}]}}},
 {sentDate:'2026-11-13',products:{'2':{name:'TIME 미국나스닥100액티브',date:'2026-11-13',rows:[{code:'NVDA US EQUITY',name:'NVIDIA',weight:5.4}]}}}];
test('stock model joins overseas and domestic ETFs on the same security key',()=>{
 const m=buildStockModel(overseas,history);const s=m.stocks['US:NVDA'];
 assert.equal(m.latest,'2026-11-13');assert.deepEqual(m.etfs.map(e=>[e.id,e.type]),[['ARKK','active'],['VGT','monthly'],['2','domestic']]);
 assert.equal(s.h,3);assert.equal(s.n,'NVIDIA Corp');
 const kinds=s.c.map(c=>[c[0],m.etfs[c[1]].id,m.kinds[c[2]]]);
 assert.deepEqual(kinds,[['2026-11-13','ARKK','증가'],['2026-11-13','2','비중↓']]);
 const arkk=s.c.find(c=>m.etfs[c[1]].id==='ARKK');assert.deepEqual([arkk[8],arkk[9]],[100,130]);
 assert.equal(s.w[0].at(-1)[4],130,'series points carry the share count');assert.ok(s.c.find(c=>m.etfs[c[1]].id==='2')[9]==null,'domestic ETFs have no share counts');
 assert.ok(!m.etfs.some(e=>e.name==='TIME 코스피액티브'),'domestic ETFs without any overseas-held security are omitted');
 assert.equal(priceCode('US:NVDA'),'NVDA US EQUITY');assert.equal(priceCode('JP:6954'),'6954 JP EQUITY');assert.equal(priceCode('CN:603666'),null);
 assert.equal(priceCandidates(m)[0],'US:NVDA');
});
test('stock trends page has six theme tabs, defaults to NVIDIA and ships a compiling script',()=>{
 const html=stockTrendsPage(buildStockModel(overseas,history),{prices:{'US:NVDA':{currency:'USD',points:[{d:'2026-11-12',c:170},{d:'2026-11-13',c:162.85}]}},version:'v1'});
 const tabs=html.match(/<nav class="theme-tabs"[\s\S]*?<\/nav>/)[0];
 assert.equal((tabs.match(/<a /g)||[]).length,6);assert.ok(tabs.includes('aria-current="page">종목별 ETF 추이'));assert.ok(tabs.includes('href="../?v=v1"'));
 assert.ok(html.includes('기본 종목은 엔비디아'));assert.ok(html.includes("M.stocks['US:NVDA']?'US:NVDA'"));
 for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(s[1]);
 assert.ok(!html.includes('</script><'+'/script>'));
 const empty=stockTrendsPage(null);assert.ok(empty.includes('수집 전'));assert.ok(empty.includes('class="theme-tabs"'));
});
