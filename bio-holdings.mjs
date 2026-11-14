export const BIO_PRODUCTS = [
  {code:'364970', ticker:'364970', name:'TIGER 바이오TOP10', provider:'TIGER', source:'https://investments.miraeasset.com/tigeretf/ko/product/search/detail/index.do?ksdFund=KR7364970004'},
  {code:'13', ticker:'463050', name:'TIME K바이오액티브', provider:'TIME', source:'https://timeetf.co.kr/m11_view.php?idx=13'},
  {code:'462900', ticker:'462900', name:'KoAct 바이오헬스케어액티브', provider:'KoAct', source:'https://www.samsungactive.co.kr/etf/view.do?id=2ETFJ9'},
  {code:'244580', ticker:'244580', name:'KODEX 바이오', provider:'KODEX', source:'https://www.samsungfund.com/etf/product/view.do?id=2ETF63'}
];
const clean=s=>String(s).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
const num=s=>s===null||s===undefined||String(s).trim()===''?null:Number(String(s).replaceAll(',',''));
export function sourceDate(value){
 const raw=String(value).replace(/[.-]/g,'');
 if(!/^\d{8}$/.test(raw))throw Error('Invalid source date');
 const iso=raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6);
 if(new Date(iso+'T00:00:00Z').toISOString().slice(0,10)!==iso)throw Error('Invalid source date');
 return iso;
}
function validateRows(rows){
 if(rows.length<5||new Set(rows.map(r=>r.code)).size!==rows.length||rows.some(r=>!r.code||!r.name||!Number.isFinite(r.weight)))throw Error('Invalid or incomplete holdings');
 const sum=rows.reduce((s,r)=>s+r.weight,0);
 if(sum<95||sum>105)throw Error('Holdings weight sum outside expected range: '+sum);
 return rows.sort((a,b)=>b.weight-a.weight);
}
export function parseSamsungHoldings(data){
 const pdf=data.pdf;
 if(!pdf||!Array.isArray(pdf.list)||pdf.list.length!==Number(pdf.totalCnt))throw Error('Incomplete Samsung holdings list');
 const rows=[];
 for(const r of pdf.list){
  const weight=num(r.ratio);
  if(weight===null&&/^KRD/.test(r.itmNo))continue;
  if(weight===null)throw Error('Missing non-cash holding weight');
  rows.push({code:String(r.itmNo),name:r.secNm,weight});
 }
 return {date:sourceDate(pdf.gijunYMD),rows:validateRows(rows),holdingsScope:'공식 비중 제공 종목 전체 · 비중 미제공 현금 제외'};
}
export function parseTigerHoldings(html,date){
 const matches=[...html.matchAll(/<tr\b[^>]*data-tot-cnt="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi)];
 if(!matches.length||matches.length!==Number(matches[0][1])||matches.some(m=>m[1]!==matches[0][1]))throw Error('Incomplete TIGER holdings list');
 const rows=matches.map(m=>[...m[2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>clean(c[1]))).map(c=>({code:c[0],name:c[1],weight:num(c[4])}));
 return {date:sourceDate(date),rows:validateRows(rows),holdingsScope:'공식 구성종목 전체 · 현금 포함'};
}
// A failed source leaves only that ETF's day unknown; it never substitutes older or invented holdings.
export async function fetchBioHoldings(request,date,{onFailure=(product,error)=>{throw error;}}={}){
 const get=async product=>{
  if(product.provider==='TIME')return null;
  let snapshot;
  if(product.provider==='TIGER'){
   const page=await request('https://investments.miraeasset.com/tigeretf/ko/product/search/detail/pdf.ajax?ksdFund=KR7364970004','text');
   const published=page.match(/prfPrd=Week01&fixDate=(\d{8})/)?.[1];
   if(!published)throw Error('TIGER published date missing');
   const resolved=sourceDate(published);
   if(resolved>date)throw Error('TIGER source date is in the future');
   const url='https://investments.miraeasset.com/tigeretf/ko/product/search/detail/pdfListAjax.ajax?'+new URLSearchParams({ksdFund:'KR7364970004',fixDate:resolved.replaceAll('-','.'),prfPrd:'Week01',order:'SRD',pageIndex:'1',firstIndex:'0',listCnt:'500'});
   snapshot=parseTigerHoldings(await request(url,'text'),resolved);
  }else{
   const base=product.provider==='KoAct'?'https://www.samsungactive.co.kr/api/v1/product/etf-pdf/2ETFJ9.do':'https://www.samsungfund.com/api/v1/kodex/product-pdf/2ETF63.do';
   let last;
   // On weekends and before publication, request the most recent available business date.
   for(let i=0;i<7;i++){
    const day=new Date(date+'T00:00:00Z');day.setUTCDate(day.getUTCDate()-i);const wanted=day.toISOString().slice(0,10);
    try{snapshot=parseSamsungHoldings(await request(base+'?gijunYMD='+wanted.replaceAll('-',''),'json'));if(snapshot.date>date)throw Error('Future holdings date');break;}catch(e){snapshot=undefined;last=e;if(/HTTP (429|5dd)/.test(e.message))break;}
   }
   if(!snapshot)throw last;
  }
  if(Date.parse(date)-Date.parse(snapshot.date)>7*86400000)throw Error('Stale bio holdings');
  return [product.code,{...product,...snapshot,theme:'bio'}];
 };
 const targets=BIO_PRODUCTS.filter(p=>p.provider!=='TIME'),results=await Promise.allSettled(targets.map(get));
 const collected=[];
 results.forEach((r,i)=>r.status==='fulfilled'?collected.push(r.value):onFailure(targets[i],r.reason));
 return Object.fromEntries(collected);
}
