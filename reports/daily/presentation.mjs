export function splitText(text,limit=3500){
 const parts=[];let remaining=text;
 while(remaining.length>limit){let at=remaining.lastIndexOf('\n',limit);if(at<1)at=limit;if(/[\uD800-\uDBFF]/.test(remaining[at-1]))at--;parts.push(remaining.slice(0,at));remaining=remaining.slice(at);}
 if(remaining)parts.push(remaining);return parts;
}

export async function sendReport(token,chat,text,html,{fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const call=async(method,body)=>{
  const r=await fetcher(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',...(body instanceof FormData?{body}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});
  const d=await r.json();if(!r.ok||!d.ok){const e=Error(`Telegram ${method} HTTP ${r.status}`);e.code=d.error_code||r.status;throw e;}return d;
 };
 const form=new FormData();form.set('chat_id',chat);form.set('caption','색깔 표가 들어간 전체 보고서입니다. 아래 채팅 본문에도 같은 내용을 이어서 보냅니다.');
 form.set('document',new Blob([html],{type:'text/html;charset=utf-8'}),`ETF-report-${new Date().toISOString().slice(0,10)}.html`);
 await call('sendDocument',form);
 const parts=splitText(text);
 for(let i=0;i<parts.length;i++){
  await sleep(1100);
  await call('sendMessage',{chat_id:chat,text:parts.length>1?`[${i+1}/${parts.length}]\n${parts[i]}`:parts[i],disable_notification:true});
 }
 console.log('텔레그램 전체 보고서 전송 성공 (HTML 첨부 및 채팅 본문)');
}
