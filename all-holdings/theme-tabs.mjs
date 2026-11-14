import {comparisonTable} from './bio-comparison.mjs';
import {bioRanking} from './bio-ranking.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function themeHistory(history,theme){
 if(theme==='all')return history;
 const isBio=p=>p.theme==='bio'||/바이오|헬스케어/i.test(p.name);
 return history.map(day=>({...day,products:Object.fromEntries(Object.entries(day.products).filter(([,p])=>theme==='bio'?isBio(p):!isBio(p)))})).filter(day=>Object.keys(day.products).length);
}
export function bioThemePage(comparison,history=[comparison]){
 return '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="bio-comparison-checked" content="'+esc(comparison.checkedAt)+'"><title>바이오 · ETF 보유종목</title><style>body{background:#f4f7fb;color:#20314a;font:15px/1.6 system-ui,\'Malgun Gothic\',sans-serif;margin:0}main{max-width:1150px;margin:auto;padding:24px}@media(max-width:600px){main{padding:12px}}</style><main><h1>전체 종목의 날짜별 비중 변화</h1>'+comparisonTable(comparison)+bioRanking(history,comparison)+'</main></html>';
}
export function addThemeTabs(html,theme,products,version=''){
 const title='<h1>전체 종목의 날짜별 비중 변화</h1>';
 if(!html.includes(title))throw Error('Holdings heading missing');
 const base=theme==='all'?'./':'../';
 const active=theme==='bio'?'bio':'ai';
 const query=version?'?v='+encodeURIComponent(version):'';
 const tabs='<nav class="theme-tabs" aria-label="ETF 테마">'+[['ai','AI',base],['bio','바이오',base+'bio/']].map(([key,label,path])=>'<a href="'+path+query+'"'+(active===key?' aria-current="page"':'')+'>'+label+'</a>').join('')+'</nav>';
 const style='<style>.theme-tabs{display:flex;gap:8px;border-bottom:1px solid #ccd8e7;margin:16px 0 24px;padding-bottom:10px}.theme-tabs a{display:block;margin:0;font-weight:700;text-decoration:none;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#52647a;padding:10px 28px}.theme-tabs a[aria-current="page"]{background:#203d70;border-color:#203d70;color:white}.theme-tabs a:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}.bio-products{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.bio-products article{background:white;border:1px solid #dbe4ee;border-radius:12px;padding:16px}.bio-products h2{font-size:16px;margin:8px 0}.bio-products h2 a{color:#20314a;text-decoration:none}.bio-products small,.bio-products p,.theme-note{color:#52647a;font-size:13px}.bio-products article>a{color:#2453a6;font-size:12px}@media(max-width:800px){.bio-products{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.theme-tabs a{flex:1;text-align:center;padding:10px 12px}}</style>';
 for(const [code,p] of Object.entries(products))if(p.holdingsScope)html=html.replace('<section id="etf-'+code+'">','<section id="etf-'+code+'"><p class="theme-note">'+esc(p.holdingsScope)+'</p>');
 return html.replace(title,tabs+title).replace('</html>',style+'</html>');
}
