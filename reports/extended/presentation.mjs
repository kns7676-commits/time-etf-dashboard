const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function sections(text){
  const lines=text.split('\n'),out=[];
  for(let i=0;i<lines.length;){
    const line=lines[i++];
    if(line.startsWith('순위 |')){
      const headers=line.split(' | ');
      const rows=[];
      while(i<lines.length&&/^\d+ \|/.test(lines[i]))rows.push(lines[i++].split(' | '));
      for(let col=1;col<headers.length;col+=2){
        const name=headers[col].startsWith('TIME')?'TIMEFOLIO':'삼성액티브';
        out.push(`<h3>${name}</h3><table><thead><tr><th>순위</th><th>ETF · 수익률</th><th>현재 비중 상위 5</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[col])}</td><td>${esc(r[col+1]).replaceAll(', ','<br>')}</td></tr>`).join('')}</tbody></table>`);
      }
    }else if(line.startsWith('【'))out.push(`<h2>${esc(line.replace(/[【】]/g,''))}</h2>`);
    else if(line.trim())out.push(`<p>${esc(line)}</p>`);
  }
  return out;
}

export function htmlReport(text){return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ETF 상황판</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#17243a;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:20px}h1{font-size:26px}h2{margin-top:36px;padding-top:18px;border-top:3px solid #2453a6;font-size:21px}h3{margin:20px 0 8px;color:#2453a6}p{overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;table-layout:fixed;background:white;margin-bottom:24px}th,td{padding:12px 9px;border:1px solid #d8e0ec;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#203d70;color:white}th:first-child{width:12%}th:nth-child(2){width:38%}th:nth-child(3){width:50%}tbody tr:nth-child(even){background:#f6f8fc}@media(max-width:480px){main{padding:12px}th,td{padding:9px 6px;font-size:13px}h1{font-size:23px}}@media print{body{background:white}tr{break-inside:avoid}}
</style></head><body><main><h1>ETF 상황판</h1><p>전체 보고서입니다. 아래로 스크롤하면 마지막 내용까지 볼 수 있습니다. 현재 보유비중은 수익 기여도와 다릅니다.</p>${sections(text).join('\n')}<p>— 보고서 끝 —</p></main></body></html>`;}

export function splitText(text,limit=3500){
 const parts=[];let remaining=text;
 while(remaining.length>limit){let at=remaining.lastIndexOf('\n',limit);if(at<1)at=limit;if(/[\uD800-\uDBFF]/.test(remaining[at-1]))at--;parts.push(remaining.slice(0,at));remaining=remaining.slice(at);}
 if(remaining)parts.push(remaining);return parts;
}

export async function sendReport(token,chat,url,{fetcher=fetch}={}){
 let parsed;try{parsed=new URL(url);}catch{throw Error('상황판 HTTPS 주소가 필요합니다.');}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('상황판 HTTPS 주소가 필요합니다.');
 const r=await fetcher('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chat,text:url,link_preview_options:{is_disabled:true}}),signal:AbortSignal.timeout(60000)});
 const d=await r.json();if(!r.ok||!d.ok)throw Error('Telegram sendMessage HTTP '+r.status);
}
