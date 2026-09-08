export function hash(text) { let h=2166136261; for(const c of String(text)) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
export function stream(seed,name) { let a=hash(`${seed}:${name}`); return ()=>{a=(a+0x6d2b79f5)>>>0; let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; }
export function stable(v){if(Array.isArray(v))return `[${v.map(stable).join(',')}]`;if(v&&typeof v==='object')return `{${Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')}}`;return JSON.stringify(v);}
export const mix=(a,b,t)=>a+(b-a)*t;
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function weighted(choices,r){const total=Object.values(choices).reduce((a,b)=>a+b,0);let n=r()*total;for(const [key,w] of Object.entries(choices)){n-=w;if(n<0)return key;}return Object.keys(choices).at(-1);}
export function sample(d,r){let t=r();if(d.distribution==='centerWeighted')t=(t+r()+r())/3;else if(d.distribution==='lowWeighted')t=t*t;else if(d.distribution==='highWeighted')t=1-(1-t)**2;else if(d.distribution==='clustered'){const center=d.centers[Math.floor(r()*d.centers.length)];t=clamp(center+(t-.5)*d.spread,0,1);}const n=mix(d.min,d.max,t);return d.integer?Math.round(n):Number(n.toFixed(6));}
