const url=products=>'https://www.funetf.co.kr/product/comparison/etf?itemIds='+products.map(p=>p.isin).join(',');
const bio=[
 {ticker:'364970',isin:'KR7364970004',name:'TIGER 바이오TOP10'},
 {ticker:'463050',isin:'KR7463050005',name:'TIME K바이오액티브'},
 {ticker:'462900',isin:'KR7462900002',name:'KoAct 바이오헬스케어액티브'},
 {ticker:'244580',isin:'KR7244580007',name:'KODEX 바이오'}
];
const us=[
 {ticker:'426030',isin:'KR7426030003',name:'TIME 미국나스닥100액티브'},
 {ticker:'456600',isin:'KR7456600006',name:'TIME 글로벌AI인공지능액티브'},
 {ticker:'0174B0',isin:'KR70174B0001',name:'KoAct 글로벌AI메모리반도체액티브'},
 {ticker:'0186L0',isin:'KR70186L0005',name:'KoAct 미국로봇피지컬AI액티브'},
 {ticker:'0015B0',isin:'KR70015B0004',name:'KoAct 미국나스닥성장기업액티브'}
];
const configs={bio:{label:'바이오',eyebrow:'BIO ETF MONITOR',products:bio,market:'국내주식'},us:{label:'미국대표',eyebrow:'US ETF MONITOR',products:us,market:'해외주식'}};
export function comparisonConfig(universe='bio'){
 const config=configs[universe];if(!config)throw Error('Unknown comparison universe: '+universe);
 return {...config,universe,count:config.products.length,source:url(config.products)};
}
