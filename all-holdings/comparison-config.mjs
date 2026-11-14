const url=products=>'https://www.funetf.co.kr/product/comparison/etf?itemIds='+products.map(p=>p.isin).join(',');
const bio=[
 {ticker:'364970',isin:'KR7364970004',name:'TIGER 바이오TOP10',historyId:'364970'},
 {ticker:'463050',isin:'KR7463050005',name:'TIME K바이오액티브',historyId:'13'},
 {ticker:'462900',isin:'KR7462900002',name:'KoAct 바이오헬스케어액티브',historyId:'462900'},
 {ticker:'244580',isin:'KR7244580007',name:'KODEX 바이오',historyId:'244580'}
];
const us=[
 {ticker:'426030',isin:'KR7426030003',name:'TIME 미국나스닥100액티브',historyId:'2'},
 {ticker:'456600',isin:'KR7456600006',name:'TIME 글로벌AI인공지능액티브',historyId:'6'},
 {ticker:'0174B0',isin:'KR70174B0001',name:'KoAct 글로벌AI메모리반도체액티브',historyId:'0174B0'},
 {ticker:'0186L0',isin:'KR70186L0005',name:'KoAct 미국로봇피지컬AI액티브',historyId:'0186L0'},
 {ticker:'0015B0',isin:'KR70015B0004',name:'KoAct 미국나스닥성장기업액티브',historyId:'0015B0'}
];
const kospi=[
 {ticker:'385720',isin:'KR7385720008',name:'TIME 코스피액티브',historyId:'11'},
 {ticker:'0193G0',isin:'KR70193G0003',name:'KoAct 코스피액티브',historyId:'0193G0'},
 {ticker:'495060',isin:'KR7495060006',name:'TIME 코리아밸류업액티브',historyId:'15'},
 {ticker:'495230',isin:'KR7495230005',name:'KoAct 코리아밸류업액티브',historyId:'495230'}
];
const kosdaq=[
 {ticker:'0162Y0',isin:'KR70162Y0008',name:'TIME 코스닥액티브',historyId:'24'},
 {ticker:'0163Y0',isin:'KR70163Y0007',name:'KoAct 코스닥액티브',historyId:'0163Y0'}
];
const configs={bio:{label:'바이오',eyebrow:'BIO ETF MONITOR',products:bio,market:'국내주식'},us:{label:'미국대표',eyebrow:'US ETF MONITOR',products:us,market:'해외주식'},kospi:{label:'KOSPI',eyebrow:'KOSPI ETF MONITOR',products:kospi,market:'국내주식'},kosdaq:{label:'KOSDAQ',eyebrow:'KOSDAQ ETF MONITOR',products:kosdaq,market:'국내주식'}};
export function comparisonConfig(universe='bio'){
 const config=configs[universe];if(!config)throw Error('Unknown comparison universe: '+universe);
 return {...config,universe,count:config.products.length,source:url(config.products)};
}
