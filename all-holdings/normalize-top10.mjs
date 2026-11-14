// Allocate hundredths by largest remainder so displayed percentages sum to 100.00.
export function normalizeTop10(rows){
 const total=rows.reduce((sum,r)=>sum+r.weight,0);
 if(!rows.length||!(total>0)||rows.some(r=>!Number.isFinite(r.weight)||r.weight<0))throw Error('Cannot normalize an empty or invalid TOP10 portfolio');
 const values=rows.map((r,index)=>{const scaled=r.weight/total*10000,units=Math.floor(scaled);return {...r,index,normalized:scaled/100,units,remainder:scaled-units};});
 const remaining=10000-values.reduce((sum,r)=>sum+r.units,0);
 const order=[...values].sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
 for(let i=0;i<remaining;i++)order[i].units++;
 return values.map(({index,units,remainder,...r})=>({...r,display:units/100}));
}
