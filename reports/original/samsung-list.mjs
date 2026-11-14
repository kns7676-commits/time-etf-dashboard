export async function samsungList(json, base) {
  const first=await json(base+'1');
  const products=new Map((first.etfs||[]).map(p=>[p.fId,p]));
  const total=Number(first.totalCnt);
  if(!Number.isInteger(total)||total<1||products.size===0)throw Error('삼성 ETF 목록 형식 오류');
  const pageSize=products.size;
  try {
    for(let page=2;products.size<total;page++) {
      const next=await json(base+page);
      const before=products.size;
      for(const p of next.etfs||[])products.set(p.fId,p);
      if(products.size===before)throw Error('삼성 ETF 페이지에 추가 상품 없음');
    }
  } catch(error) {
    console.warn(`삼성 목록 페이지 오류: ${error.message}. 반대 정렬 목록으로 완전성을 확인합니다.`);
    const ascending=await json(base.replace('sort=DESC','sort=ASC')+'1');
    if(Number(ascending.totalCnt)!==total)throw Error('삼성 상품 수가 수집 중 변경됨');
    for(const p of ascending.etfs||[])products.set(p.fId,p);
  }
  if(products.size!==total)throw Error(`삼성 ETF 전체 목록 불완전: ${products.size}/${total} (페이지 크기 ${pageSize})`);
  return [...products.values()];
}
