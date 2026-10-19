import {requireThat} from './contract.js';

export function mean(values){let sum=0,error=0;for(const v of values){const y=v-error,t=sum+y;error=(t-sum)-y;sum=t;}return sum/values.length;}
export function quantile(sorted,p){requireThat(sorted.length>0&&p>=0&&p<=1,'QUANTILE');const index=(sorted.length-1)*p,lo=Math.floor(index),part=index-lo;return sorted[lo]+(sorted[Math.min(lo+1,sorted.length-1)]-sorted[lo])*part;}
export function describe(values){
  requireThat(values.length>0&&values.every(Number.isFinite),'METRIC_NONFINITE');const sorted=[...values].sort((a,b)=>a-b),avg=mean(values);
  return {mean:avg,median:quantile(sorted,.5),p5:quantile(sorted,.05),p10:quantile(sorted,.1),p50:quantile(sorted,.5),p90:quantile(sorted,.9),p95:quantile(sorted,.95),sampleMinimum:sorted[0],sampleMaximum:sorted.at(-1)};
}
export function histogram(values,bins=20){const min=values.reduce((a,b)=>Math.min(a,b),Infinity),max=values.reduce((a,b)=>Math.max(a,b),-Infinity);if(min===max)return [{min,max,count:values.length}];const width=(max-min)/bins,out=Array.from({length:bins},(_,i)=>({min:min+i*width,max:i===bins-1?max:min+(i+1)*width,count:0}));for(const v of values)out[Math.min(bins-1,Math.floor((v-min)/width))].count++;return out;}
export function spearman(x,y){
  const rank=values=>{const sorted=values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v||a.i-b.i),r=[];for(let i=0;i<sorted.length;){let end=i+1;while(end<sorted.length&&sorted[end].v===sorted[i].v)end++;for(let j=i;j<end;j++)r[sorted[j].i]=(i+end-1)/2;i=end;}return r;};
  const a=rank(x),b=rank(y),ma=mean(a),mb=mean(b);let numerator=0,va=0,vb=0;for(let i=0;i<a.length;i++){const da=a[i]-ma,db=b[i]-mb;numerator+=da*db;va+=da*da;vb+=db*db;}return va===0||vb===0?null:numerator/Math.sqrt(va*vb);
}
export function standardError(values){if(values.length<2)return null;const avg=mean(values);return Math.sqrt(mean(values.map(v=>(v-avg)**2))/(values.length-1));}
