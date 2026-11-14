import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizedRanking,mergeComparisonHistory,comparisonStockSeries,bioRanking} from './bio-ranking.mjs';
import {runInNewContext} from 'node:vm';
const fixture=()=>JSON.parse(readFileSync(new URL('../state/bio-comparison.json',import.meta.url),'utf8'));
test('each TOP10 normalizes to 100 and all combined scores sum to 100 with equal ETF weights',()=>{
 const s=fixture(),ranked=normalizedRanking(s);
 for(const p of s.products)assert.ok(Math.abs(ranked.reduce((sum,r)=>sum+(r.values[p.ticker]?.normalized??0),0)-100)<1e-9);
 assert.ok(Math.abs(ranked.reduce((sum,r)=>sum+r.score,0)-100)<1e-9);
 assert.ok(ranked.every((r,i)=>!i||ranked[i-1].score>=r.score));
 const r=ranked.find(r=>r.count<4);assert.ok(r);assert.ok(Math.abs(r.score-Object.values(r.values).reduce((sum,v)=>sum+v.normalized,0)/4)<1e-9);
});
test('normalization uses the actual displayed TOP10 sum rather than total holdings count or rounded reported total',()=>{
 const s=fixture();s.products.forEach((p,i)=>{p.rows=Array.from({length:10},(_,j)=>({code:String(j),name:'Stock '+j,weight:(10-j)*(i+1)}));p.count=100*(i+1);p.top10Total=999;});
 const ranked=normalizedRanking(s),first=ranked[0];
 assert.ok(Math.abs(first.score-10/55*100)<1e-9);
 for(const v of Object.values(first.values))assert.ok(Math.abs(v.normalized-10/55*100)<1e-9);
 s.products[0].rows.forEach(r=>r.weight=0);assert.throws(()=>normalizedRanking(s),/empty/);
});
test('daily history replaces same-day observations and preserves prior days without fabricating earlier data',()=>{
 const first=fixture(),replacement=structuredClone(first),tomorrow=structuredClone(first);
 replacement.checkedAt=new Date(Date.parse(first.checkedAt)+1000).toISOString();
 tomorrow.checkedAt=new Date(Date.parse(first.checkedAt)+86400000).toISOString();
 const same=mergeComparisonHistory([first],replacement);assert.equal(same.length,1);assert.equal(same[0].checkedAt,replacement.checkedAt);
 const days=mergeComparisonHistory(same,tomorrow);assert.equal(days.length,2);assert.equal(days[0].checkedAt,replacement.checkedAt);
 const code=first.products[0].rows[0].code,etfs=comparisonStockSeries(days,code);assert.equal(etfs.length,4);assert.equal(etfs[0].points.length,2);
});
test('outside TOP10 is unknown in raw history graphs and cannot be represented as a zero holding',()=>{
 const first=fixture(),second=structuredClone(first),code=first.products[0].rows[0].code;
 second.checkedAt=new Date(Date.parse(first.checkedAt)+86400000).toISOString();
 second.products[0].rows[0]={...second.products[0].rows[0],code:'999999',name:'Replacement'};
 const series=comparisonStockSeries([first,second],code);
 assert.equal(series[0].points[0].weight,first.products[0].rows[0].weight);
 assert.equal(series[0].points[1].weight,null);assert.equal(series[0].points[1].status,'outside-top10');
 const page=bioRanking([first,second],second);assert.ok(page.includes('data-bio-select="0"'));assert.ok(page.includes('bio-stock-select'));assert.ok(page.includes('bio-weight-chart'));
 const stale=structuredClone(second);stale.checkedAt=first.checkedAt;assert.throws(()=>bioRanking([first,second],stale),/does not match/);
});
test('rendered stock controls update selection, graph, legend and exact weights together',()=>{
 const s=fixture(),html=bioRanking([s],s),rows=normalizedRanking(s);
 function element(dataset={}){return {dataset,value:'0',style:{},attrs:{},events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},scrollIntoView(){this.scrolled=true;},closest(){return this;}};}
 const nodes=new Map(),get=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
 const buttons=rows.map((_,i)=>element({bioSelect:String(i)})),zooms=['out','in','fit'].map(bioZoom=>element({bioZoom}));
 const sent=[],document={dispatchEvent:e=>sent.push(e),getElementById:id=>get('#'+id),querySelector:get,querySelectorAll:selector=>selector==='[data-bio-select]'?buttons:selector==='[data-bio-zoom]'?zooms:[]};
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];runInNewContext(script,{document,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}}});
 assert.ok(get('#bio-selected-name').textContent.includes(rows[0].name));
 assert.equal(get('[data-bio-prev]').disabled,true);
 const select=get('#bio-stock-select');select.value='1';select.events.change();
 assert.deepEqual([sent.at(-1).type,sent.at(-1).detail.code],['bio-stock-change',rows[1].code]);
 assert.ok(get('#bio-selected-name').textContent.includes(rows[1].name));assert.equal(buttons[1].attrs['aria-pressed'],'true');assert.equal(buttons[0].attrs['aria-pressed'],'false');
 assert.ok(get('#bio-weight-chart').innerHTML.includes('<circle'));assert.equal(get('#bio-weight-chart').attrs['aria-label'],rows[1].name+' ETF별 실제 비중 변화');
 for(const p of s.products){assert.ok(get('.bio-etf-legend').innerHTML.includes(p.name));assert.ok(get('#bio-exact-weights').innerHTML.includes(p.name));}
 buttons[2].events.click();assert.equal(select.value,'2');assert.equal(get('.bio-history').scrolled,true);
 zooms[1].events.click();assert.equal(get('#bio-weight-chart').style.width,'140%');assert.equal(get('#bio-weight-chart').attrs.viewBox,'0 0 1400 450');
 zooms[2].events.click();assert.equal(get('#bio-weight-chart').style.width,'100%');
 get('[data-bio-first]').events.click();assert.equal(select.value,'0');
});
