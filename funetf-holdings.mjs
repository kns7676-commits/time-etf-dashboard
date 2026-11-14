// FunETF product pages publish each ETF's full holdings (PDF) for a chosen date:
//   /api/public/product/view/etfpdf?itemId={ISIN}&gijunYmd={date}&etfPdfYmd={date}
// Used to fill past days for comparison ETFs whose official source only gives the latest date (bio tab).
// Weights are FunETF's evaluation-amount shares (evP); they match the official lists to about two decimals.
export const FUNETF_BIO_PRODUCTS=[
 {code:'13',isin:'KR7463050005',ticker:'463050',name:'TIME K바이오액티브',theme:'bio'},
 {code:'364970',isin:'KR7364970004',ticker:'364970',name:'TIGER 바이오TOP10',theme:'bio'},
 {code:'244580',isin:'KR7244580007',ticker:'244580',name:'KODEX 바이오',theme:'bio'}
];
export function parseFunetfPdf(list,date){
 if(!Array.isArray(list)||!list.length)throw Error('No FunETF holdings for '+date);
 if(list.some(r=>Number(r.total)!==list.length))throw Error('Incomplete FunETF holdings: '+list.length+' of '+list[0].total);
 const rows=list.map(r=>({code:String(r.ticker||r.grpItmNo||'').trim(),name:String(r.citmNm||'').trim(),weight:Math.round(Number(r.evP)*10000)/10000}));
 const bad=rows.filter(r=>!r.code||!r.name||!Number.isFinite(r.weight)),dup=rows.filter((r,i)=>rows.findIndex(x=>x.code===r.code)!==i);
 if(rows.length<5||bad.length||dup.length)throw Error('Invalid FunETF holdings: '+JSON.stringify(bad.concat(dup).slice(0,3)));
 const sum=rows.reduce((s,r)=>s+r.weight,0);
 if(sum<95||sum>105)throw Error('FunETF holdings weight sum outside expected range: '+sum);
 return {date,rows:rows.sort((a,b)=>b.weight-a.weight),source:'FunETF PDF',holdingsScope:'FunETF 구성종목(PDF) 전체 · 평가금액 비중'};
}
// Same contract as fetchKoactHoldings so backfill() can drive it: one request per product, paced, stops after a rate limit.
export async function fetchFunetfHoldings(request,date,{products=FUNETF_BIO_PRODUCTS,onFailure=(p,e)=>{throw e;},pause=()=>new Promise(r=>setTimeout(r,2000))}={}){
 const out={},ymd=date.replaceAll('-','');let blocked=null,sent=0;
 for(const p of products){
  if(blocked){onFailure(p,Error('Skipped after rate limit: '+blocked.message));continue;}
  try{
   if(sent++)await pause();
   const list=await request('https://www.funetf.co.kr/api/public/product/view/etfpdf?'+new URLSearchParams({itemId:p.isin,gijunYmd:ymd,etfPdfYmd:ymd}),'json');
   out[p.code]={name:p.name,ticker:p.ticker,theme:p.theme,...parseFunetfPdf(list,date)};
  }catch(e){if(/HTTP (429|5\d\d)/.test(e.message))blocked=e;onFailure(p,e);}
 }
 return out;
}
