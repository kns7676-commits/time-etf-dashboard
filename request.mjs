export async function request(url, kind, {fetcher=fetch, sleep=ms=>new Promise(r=>setTimeout(r,ms)), timeout=60000}={}) {
  for(let attempt=1;attempt<=3;attempt++) {
    console.log(`자료 요청 ${attempt}/3: ${url}`);
    try {
      const r=await fetcher(url,{headers:{'user-agent':'TIME-ETF-report/1.0'},signal:AbortSignal.timeout(timeout)});
      if(!r.ok) {
        const e=new Error(`HTTP ${r.status}`);
        e.retryable=r.status===429||r.status>=500;
        await r.body?.cancel();
        throw e;
      }
      return kind==='json'?await r.json():new TextDecoder('utf-8').decode(await r.arrayBuffer());
    } catch(e) {
      if(e.retryable===false||attempt===3)throw new Error(`자료 요청 실패 (${url}): ${e.message}`);
      console.warn(`재시도 예정 (${url}): ${e.message}`);
      await sleep(attempt*5000);
    }
  }
}
