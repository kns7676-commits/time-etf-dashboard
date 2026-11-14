export function bioStockColors(snapshot){
 const holders=new Map();
 for(const p of snapshot.products)for(const r of p.rows)holders.set(r.code,(holders.get(r.code)||0)+1);
 const shared=[...holders].filter(([,count])=>count>1).map(([code])=>code).sort();
 const palette=['#e6ddf5','#dceefa','#fff4cf','#d9eee2','#ece7d2','#d7edf0','#f8e1e4','#e2e8fa','#e9e4f4','#e1eddd'];
 return new Map(shared.map((code,i)=>[code,palette[i%palette.length]]));
}
