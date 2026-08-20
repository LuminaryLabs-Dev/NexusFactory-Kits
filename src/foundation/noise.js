import { hashSeed } from "./random.js";
const smooth = (t) => t*t*(3-2*t);
const lerp = (a,b,t) => a+(b-a)*t;
function lattice(seed,index){ return (hashSeed(`${seed}:${index}`)/0xffffffff)*2-1; }
export function valueNoise1D(seed,x){ const i=Math.floor(x), t=x-i; return lerp(lattice(seed,i),lattice(seed,i+1),smooth(t)); }
export function octaveNoise1D(seed,x,{octaves=3,lacunarity=2,gain=0.5}={}){
  let sum=0,amp=1,freq=1,norm=0;
  for(let i=0;i<octaves;i++){ sum+=valueNoise1D(`${seed}:${i}`,x*freq)*amp; norm+=amp; amp*=gain; freq*=lacunarity; }
  return norm ? sum/norm : 0;
}
