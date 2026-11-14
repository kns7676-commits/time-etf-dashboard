import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {comparisonConfig} from './comparison-config.mjs';
import {parseComparison,validateComparison} from './bio-comparison.mjs';
import {normalizeTop10} from './normalize-top10.mjs';
import {normalizedRanking,bioRanking,comparisonStockSeries,mergeComparisonHistory} from './bio-ranking.mjs';
import {bioThemePage,addThemeTabs} from './theme-tabs.mjs';
const snapshot=()=>JSON.parse(readFileSync(new URL('../state/us-comparison.json',import.meta.url),'utf8'));
function fixture(s){
 return `<span class="rlwns txtDate">한국 ${s.date.slice(2).replaceAll('-','.')} 기준</span>`+s.products.map(p=>`<a href="/product/etf/view/${p.isin}">${p.name}</a>`).join('')+'<div id="grid1-3">'+s.products.map((p,i)=>`<div class="cont-container" data-id="item${i+1}"><div class="cont-wrap"><div>${p.count}</div></div>${p.rows.map(r=>`<div class="cont-wrap"><div><span>${r.name}</span><p>${r.code.startsWith('NAME:')?'':r.code}</p></div><div class="data">${r.weight}</div></div>`).join('')}<div class="cont-wrap"><div>${p.top10Total}</div></div><div class="cont-wrap"><div>-</div></div></div>`).join('')+'</div>';
}
test('US comparison validates the requested five ETFs, foreign tickers and source instruments without codes',()=>{
 const s=snapshot();
 s.products[0].rows[0].code='NAME:'+s.products[0].rows[0].name;
 s.products[0].rows[0].displayCode='코드 미제공';
 const parsed=parseComparison(fixture(s),s.checkedAt,'us');
 assert.deepEqual(parsed.products.map(p=>p.ticker),['426030','456600','0174B0','0186L0','0015B0']);
 assert.equal(parsed.products.length,5);assert.equal(parsed.products.flatMap(p=>p.rows).length,50);
 assert.ok(parsed.products.some(p=>p.rows.some(r=>r.code.startsWith('NAME:')&&r.displayCode==='코드 미제공')));
 assert.throws(()=>parseComparison(fixture(s),s.checkedAt),/columns/);
 assert.throws(()=>validateComparison({...s,products:s.products.slice(0,4)}),/Expected 5/);
 assert.throws(()=>parseComparison(fixture(s).replace('data-id="item5"','data-id="item9"'),s.checkedAt,'us'),/order/);
});
test('US normalized ranking uses five equal weights and preserves exactly 100.00 in each display column',()=>{
 const s=snapshot(),ranked=normalizedRanking(s);
 assert.ok(Math.abs(ranked.reduce((sum,r)=>sum+r.score,0)-100)<1e-9);
 for(const r of ranked)assert.ok(Math.abs(r.score-Object.values(r.values).reduce((sum,v)=>sum+v.normalized,0)/5)<1e-9);
 for(const p of s.products)assert.equal(normalizeTop10(p.rows).reduce((sum,r)=>sum+Math.round(r.display*100),0),10000);
 const series=comparisonStockSeries([s],ranked[0].code);assert.equal(series.length,5);
 const bio=JSON.parse(readFileSync(new URL('../state/bio-comparison.json',import.meta.url),'utf8'));
 assert.throws(()=>mergeComparisonHistory([bio],s),/mix/);
});
test('US tab reuses the BIO design, stock controls and return links with five-product wording',()=>{
 const s=snapshot(),page=addThemeTabs(bioThemePage(s),'us',{},s.checkedAt);
 assert.ok(page.includes('US ETF MONITOR'));assert.ok(page.includes('미국대표 ETF 5종의 구성종목과 보정 비중'));
 assert.ok(page.includes('5개 ETF를 각각 20%씩'));assert.ok(page.includes('보정 비중의 합 ÷ 5'));
 assert.equal((page.match(/class="bio-stock"/g)||[]).length,50);
 assert.equal((page.match(/>100\.00<\/td>/g)||[]).length,5);
 assert.ok(!page.includes('font/woff2;base64,')&&page.includes("'Malgun Gothic'"));assert.ok(page.includes('height:46px;padding:6px 12px!important'));
 assert.ok(page.includes('class="bio-ranking-heading"'));assert.ok(page.includes('class="bio-history-links"'));
 assert.ok(page.includes('href="#bio-comparison-title"'));assert.ok(page.includes('href="#bio-ranking-title"'));
 assert.ok(!page.includes('id="sox-card"'));assert.ok(!page.includes('바이오 ETF 4종'));
 const tabs=page.match(/<nav class="theme-tabs"[\s\S]*?<\/nav>/)[0];
 assert.equal((tabs.match(/<a /g)||[]).length,5);assert.ok(tabs.includes('../us/?v='));assert.ok(tabs.includes('aria-current="page">미국대표 ETF'));
 for(const script of page.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(script[1]);
 const rendered=bioRanking([s],s);assert.ok(rendered.includes("'#dc2626'"));
});
test('daily workflow checks both comparisons and saves separate histories before publishing or sending',()=>{
 const w=readFileSync(new URL('../.github/workflows/dashboard.yml',import.meta.url),'utf8');
 const steps=['run: node refresh-bio-comparison.mjs\n','run: node refresh-bio-comparison.mjs us','run: node build-all-holdings.mjs','actions/deploy-pages@v4','run: node notify.mjs'].map(s=>w.replaceAll('\r\n','\n').indexOf(s));
 assert.ok(steps.every((v,i)=>v>=0&&(!i||v>steps[i-1])));
 assert.ok(w.includes('state/us-comparison.json state/us-comparison-history.json'));
 assert.ok(!w.includes('continue-on-error: true'));
});
