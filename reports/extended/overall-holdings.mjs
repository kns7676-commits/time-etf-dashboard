const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function holdingMarket(row){
 const code=String(row.code||'').trim().toUpperCase();
 if(/현금|CASH|INDEX|FUTURE/i.test(code)||/ETF|액티브/.test(row.name))return 'other';
 if(/^\d{6}$/.test(code)||/\s(KS|KQ)\sEQUITY$/.test(code))return 'korea';
 if(/\s[A-Z]{2}\sEQUITY$/.test(code))return 'overseas';
 return 'other';
}
export function overallHoldings(products,market){
 const etfs=Object.entries(products),holdings=new Map();
 for(const [etf,product] of etfs)for(const row of product.rows){
  if(!Number.isFinite(row.weight)||row.weight<=0||(market&&holdingMarket(row)!==market))continue;
  const key=String(row.code||row.name).trim().toUpperCase();
  if(!holdings.has(key))holdings.set(key,{code:row.code,name:row.name,total:0,weights:{}});
  const holding=holdings.get(key);
  holding.total+=row.weight;
  holding.weights[etf]=(holding.weights[etf]||0)+row.weight;
 }
 return [...holdings.values()].map(r=>({...r,average:r.total/etfs.length,count:Object.keys(r.weights).length})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'ko')).slice(0,20);
}
export function overallHoldingsTable(products){
 const etfs=Object.entries(products);
 const table=(market,title)=>{
 const rows=overallHoldings(products,market);
 return `<h3>${title} · 비중 상위 20종목</h3><div class="scroll"><table><thead><tr><th>순위</th><th>종목</th><th>비중 합계</th><th>동일 투자 평균 비중</th><th>보유 ETF 수</th>${etfs.map(([,p])=>`<th>${esc(p.name)}<br><small>자료 ${esc(p.date)}</small></th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><th style="text-align:left">${esc(r.name)}<br><small>${esc(r.code||'')}</small></th><td><strong>${r.total.toFixed(2)}%</strong></td><td>${r.average.toFixed(2)}%</td><td>${r.count}</td>${etfs.map(([code])=>`<td>${r.weights[code]===undefined?'—':r.weights[code].toFixed(2)+'%'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${rows.length?'':'<p>해당 주식 자료가 없습니다.</p>'}`;
 };
 return `<section class="overall-holdings" style="background:white;border-radius:12px;padding:20px;margin:24px 0"><h2 style="margin-top:0">전체 ETF 통합 · 해외 / 한국 주식</h2><p>보고서에 포함된 ${etfs.length}개 ETF의 최신 보유 비중을 종목코드 기준으로 합산해 해외와 한국 주식 각각의 순위를 정했습니다. 상장 시장 기준으로 구분하며, 해외 시장에 편입된 한국 기업도 해외 주식으로 표시합니다. 현금·지수 선물·ETF 및 분류가 불명확한 자산은 순위에서 제외합니다.</p><p>동일 투자 평균 비중은 비중 합계를 전체 ${etfs.length}개 ETF로 나눈 값입니다. ETF 순자산 규모는 반영하지 않습니다.</p>${table('overseas','해외 주식')}${table('korea','한국 주식')}<p style="font-size:13px;color:#52647a">비중 합계는 ETF별 비중을 더한 비교 지표입니다. —는 해당 ETF에서 미보유를 뜻합니다.</p></section>`;
}
