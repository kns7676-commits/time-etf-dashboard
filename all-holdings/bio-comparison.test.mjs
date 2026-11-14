import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPARISON_PRODUCTS,parseComparison,validateComparison,verifyPublication,comparisonTable} from './bio-comparison.mjs';
import {bioThemePage,addThemeTabs,themeHistory} from './theme-tabs.mjs';
import {readFileSync} from 'node:fs';
const checkedAt='2026-11-14T00:00:00.000Z';
function fixture(){
 const headers=COMPARISON_PRODUCTS.map(p=>`<a href="/product/etf/view/${p.isin}" id="compareNm">${p.name}</a>`).join('');
 const columns=COMPARISON_PRODUCTS.map((p,i)=>`<div class="cont-container" data-id="item${i+1}"><div class="cont-wrap"><div class="prd-name">${[11,28,27,51][i]}</div></div>${Array.from({length:10},(_,j)=>`<div class="cont-wrap overlap-01"><div class="cont-item"><div class="left"><span>${j===0?'공통 종목':'종목 '+j}</span><p>${String(j===0?68270:i*10000+j).padStart(6,'0')}</p></div></div><div class="cont-item"><div class="data">${10-j*.5}</div></div></div>`).join('')}<div class="cont-wrap"><div>77.5</div></div><div class="cont-wrap"><div>-</div></div></div>`).join('');
 return `<span class="rlwns txtDate">한국 26.11.13 기준</span>${headers}<div id="grid1-3">${columns}</div>`;
}
test('FunETF extracts four ordered products, reported counts and all TOP10 weights from nested markup',()=>{
 const s=parseComparison(fixture(),checkedAt);
 assert.equal(s.date,'2026-11-13');assert.deepEqual(s.products.map(p=>p.count),[11,28,27,51]);
 assert.equal(s.products[0].rows[0].code,'068270');assert.equal(s.products[3].rows[9].weight,5.5);
 assert.equal(s.products[1].top10Total,77.5);
});
test('FunETF rejects changed headers, missing columns, invalid weights and incomplete markup',()=>{
 for(const html of [fixture().replace('KR7364970004','WRONG'),fixture().replace('id="grid1-3"','id="missing"'),fixture().replace('10</div>','-</div>'),fixture().replace('data-id="item2"','data-id="item5"'),fixture().slice(0,-15)])assert.throws(()=>parseComparison(html,checkedAt));
 const s=parseComparison(fixture(),checkedAt);s.products[0].rows.pop();assert.throws(()=>validateComparison(s));
});
test('scheduled delivery verifies comparison before build and deploy, then sends the published link',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/dashboard.yml',import.meta.url),'utf8');
 const steps=['node refresh-bio-comparison.mjs','node build-all-holdings.mjs','actions/deploy-pages@v4','node notify.mjs'].map(s=>workflow.indexOf(s));
 assert.ok(steps.every((v,i)=>v>=0&&(!i||v>steps[i-1])));
 assert.ok(workflow.includes('git add state/cumulative.json state/bio-comparison.json'));
 assert.ok(!workflow.includes('continue-on-error: true'));
});
test('publication requires a check today and rejects old or future source dates',()=>{
 const s=parseComparison(fixture(),checkedAt);
 assert.equal(verifyPublication(s,'2026-11-14T01:00:00Z'),s);
 assert.throws(()=>verifyPublication(s,'2026-11-15T00:00:00Z'),/checked today/);
 assert.throws(()=>verifyPublication(s,'2026-11-13T23:59:00Z'),/checked today/);
 assert.throws(()=>validateComparison({...s,date:'2026-11-01'}),/stale/);
 assert.throws(()=>validateComparison({...s,date:'2026-11-15'}),/future/);
});
test('bio tab preserves the complete designed sharing content and navigation without SOX',()=>{
 const s=parseComparison(fixture(),checkedAt);s.products[0].rows[0].name='<script>bad</script>';
 const table=comparisonTable(s);assert.ok(table.includes('&lt;script&gt;'));assert.ok(!table.includes('<script>bad'));
 assert.equal((table.match(/class="bio-stock"/g)||[]).length,40);
 assert.equal((table.match(/>100\.00<\/td>/g)||[]).length,4);
 const standalone=bioThemePage(s),page=addThemeTabs(standalone,'bio',{},s.checkedAt);
 assert.ok(!page.includes('id="sox-card"'));
 assert.ok(page.includes('<main><nav class="theme-tabs"'));
 assert.ok(page.indexOf('<nav class="theme-tabs"')<page.indexOf('class="bio-comparison"'));
 assert.ok(page.includes('data-source-date="2026-11-13"'));
 assert.ok(page.includes('../bio/?v='+encodeURIComponent(s.checkedAt)));
 const main=html=>html.slice(html.indexOf('<main>'),html.indexOf('</main>')+7);
 assert.equal(main(page).replace(/<nav class="theme-tabs"[\s\S]*?<\/nav>/,''),main(standalone));
 for(const id of ['bio-comparison-title','bio-ranking-title','bio-history-title'])assert.ok(page.includes('id="'+id+'"'));
 assert.ok(page.includes('class="bio-history-links"'));
 assert.ok(page.includes('class="bio-ranking-heading"'));
 assert.ok(!page.includes('font/woff2;base64,')&&page.includes("'Malgun Gothic'"));
 const h=[{products:{a:{name:'기존 ETF'},b:{name:'바이오 ETF'}}}];assert.deepEqual(Object.keys(themeHistory(h,'ai')[0].products),['a']);
});
