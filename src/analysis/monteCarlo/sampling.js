import {createHash} from 'node:crypto';
import {VARIABLES,requireThat,validateDistribution} from './contract.js';

export function generator(seed){
  requireThat(typeof seed==='string'&&seed.length>0,'SEED');
  let state=createHash('sha256').update(seed,'utf8').digest().readUInt32LE(0);
  return ()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function choose(outcomes,u){let cumulative=0;for(const o of outcomes){cumulative+=o.probability;if(u<cumulative)return o;}return outcomes.at(-1);}
export function sample(d,u){
  requireThat(Number.isFinite(u)&&u>=0&&u<1,'UNIFORM_DOMAIN');
  if(d.family==='CONSTANT')return d.value;
  if(d.family==='DISCRETE')return choose(d.outcomes,u).value;
  if(d.family==='TRIANGULAR'){const width=d.max-d.min,split=(d.mode-d.min)/width;return u<split?d.min+Math.sqrt(u*width*(d.mode-d.min)):d.max-Math.sqrt((1-u)*width*(d.max-d.mode));}
  throw new Error('MC_DISTRIBUTION_FAMILY');
}
export function drawScenarios(input){
  const rng=generator(input.simulation.seed),rows=[];
  for(let i=0;i<input.simulation.iterations;i++){
    // Always consume exactly five uniforms, including degenerate variables.
    const regime=choose(input.uncertainty.dependence.scenarios,rng()),row={regime:regime.name};
    for(const k of VARIABLES)row[k]=sample(input.uncertainty.variables[k],rng())*regime.factors[k];
    rows.push(row);
  }
  return rows;
}
export function distributionBounds(d){return validateDistribution(d,'bounds');}
