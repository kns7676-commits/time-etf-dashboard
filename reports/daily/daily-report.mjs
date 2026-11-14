const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).replace(/\s+/g,'');
const round2=n=>Math.round(n*100)/100;
const pct=n=>n.toFixed(2)+'%';
const signed=n=>(n>0?'+':'')+n.toFixed(2)+'%';

// Report order is fixed by the recipient, not by weight or return.
export const PRODUCTS=['TIME 글로벌AI인공지능액티브','TIME 미국나스닥100액티브','TIME 코스피액티브','TIME 코리아밸류업액티브','TIME 코스닥액티브'];

export function resolveProducts(listHtml){
 const found=new Map();
 for(const m of listHtml.matchAll(/href="\.\/(m11_view\.php\?idx=\d+)"[^>]*>([\s\S]{0,800}?)<\/a>/g)){
  const name=m[2].replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  if(name)found.set(norm(name),'https://timeetf.co.kr/'+m[1]);
 }
 const out=PRODUCTS.map(name=>({name,url:found.get(norm(name))}));
 const missing=out.filter(p=>!p.url).map(p=>p.name);
 if(missing.length)throw Error('상품 목록에서 찾지 못함: '+missing.join(', '));
 return out;
}

// The site serves holdings for any past date, so the first run can compare against a real dated snapshot.
export function monthBefore(date){
 const [y,m,d]=date.split('-').map(Number);
 const year=m===1?y-1:y,month=m===1?12:m-1;
 const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
 return `${year}-${String(month).padStart(2,'0')}-${String(Math.min(d,lastDay)).padStart(2,'0')}`;
}

export function buildCard(today,baseline){
 const base=new Map((baseline.rows||[]).map(r=>[r.code,r.weight]));
 const rows=today.rows.slice(0,10).map((r,i)=>({
  rank:i+1,name:r.name,weight:r.weight,
  delta:base.has(r.code)?round2(r.weight-base.get(r.code)):null
 }));
 const live=new Set(today.rows.map(r=>r.code));
 const removed=(baseline.rows||[]).slice(0,10).filter(r=>!live.has(r.code)).map(r=>r.name);
 return {name:today.name,code:today.code,date:today.date,source:today.source,baseline:{date:baseline.date,kind:baseline.kind,sentDate:baseline.sentDate},rows,removed};
}

const baselineLabel=b=>b.kind==='month'
 ? `${b.date} (1개월 전)`
 : `${b.date} (${b.sentDate} 발송분)`;

export function reportText(cards,meta){
 const L=[`TIME ETF 보유종목 일간 비교 — ${meta.sentDate}`,''];
 for(const c of cards){
  L.push(`【${c.name}】`,`기준일 ${c.date} · 증감은 ${baselineLabel(c.baseline)} 대비`);
  for(const r of c.rows)L.push(`${r.rank}. ${r.name} ${pct(r.weight)} (${r.delta===null?'신규':signed(r.delta)})`);
  if(c.removed.length)L.push(`편출: ${c.removed.join(', ')}`);
  L.push('');
 }
 L.push('비중은 공식 상품 페이지의 기준일 기준이며 수익 기여도가 아닙니다. 투자 권유가 아닙니다.');
 return L.join('\n');
}

const cardTable=c=>`<table><thead><tr><th class="r"></th><th>종목명</th><th class="n">비중(%)</th><th class="n">증감*</th></tr></thead><tbody>${
 c.rows.map(r=>`<tr><td class="r">${r.rank}</td><td>${esc(r.name)}</td><td class="n">${pct(r.weight)}</td><td class="n">${
  r.delta===null?'<span class="new">신규</span>':`<span class="${r.delta>=0?'up':'down'}">${signed(r.delta)}</span>`
 }</td></tr>`).join('')
}</tbody></table>`;

export function reportHtml(cards,meta){
 return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TIME ETF 보유종목 일간 비교</title><style>
*{box-sizing:border-box}
body{margin:0;background:#f2f4f7;color:#111827;font:15px/1.55 system-ui,-apple-system,'Malgun Gothic',sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 48px}
h1{font-size:20px;margin:0 0 6px}
.sub{color:#6b7280;font-size:13px;margin:0 0 22px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:16px}
.head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
.today{background:#111827;color:#fff;font-size:12px;font-weight:600;border-radius:8px;padding:4px 12px}
.pname{font-size:15px;font-weight:600}
.note{margin-left:auto;color:#4b7bd6;font-size:11.5px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{padding:11px 8px;font-size:13.5px;border-bottom:1px solid #f0f1f4;text-align:left;overflow-wrap:anywhere}
thead th{background:#f7f8fa;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb}
th.r,td.r{width:38px;text-align:center}
th.n,td.n{text-align:right;white-space:nowrap}
th.n:last-child,td.n:last-child{width:76px}
th.n:nth-child(3),td.n:nth-child(3){width:72px}
td.r{color:#3b82f6;font-weight:600}
tbody tr:last-child td{border-bottom:none}
.up{color:#e5484d}
.down{color:#2f6fed}
.new{background:#17b0bf;color:#fff;font-size:11.5px;font-weight:600;border-radius:6px;padding:2px 8px}
.out{margin:10px 0 0;color:#6b7280;font-size:12px}
footer{color:#6b7280;font-size:12px;margin-top:24px}
@media(max-width:480px){main{padding:14px 12px 36px}th,td{padding:9px 5px;font-size:12.5px}}
</style></head><body><main>
<h1>TIME ETF 보유종목 일간 비교</h1>
<p class="sub">발송일 ${meta.sentDate} · 각 상품 상위 10종목 · 증감은 직전 발송분 대비 비중 변화입니다.</p>
${cards.map(c=>`<section class="card">
<div class="head"><span class="today">오늘 ${c.date}</span><span class="pname">${esc(c.name)}</span><span class="note">* 증감: ${baselineLabel(c.baseline)} 대비 비중 변화</span></div>
${cardTable(c)}
${c.removed.length?`<p class="out">편출: ${esc(c.removed.join(', '))}</p>`:''}
</section>`).join('\n')}
<footer>비중은 공식 상품 페이지의 기준일 기준이며 수익 기여도가 아닙니다. 기준일 이후 변동될 수 있고 투자 권유가 아닙니다.</footer>
</main></body></html>`;
}
