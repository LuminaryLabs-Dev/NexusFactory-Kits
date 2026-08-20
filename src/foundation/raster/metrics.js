export function rasterMetrics(surface){
  let occupied=0,minX=surface.width,minY=surface.height,maxX=-1,maxY=-1; const colors=new Set();
  for(let y=0;y<surface.height;y++)for(let x=0;x<surface.width;x++){const i=(y*surface.width+x)*4,a=surface.pixels[i+3]; if(a){occupied++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);colors.add(`${surface.pixels[i]},${surface.pixels[i+1]},${surface.pixels[i+2]},${a}`);}}
  const total=surface.width*surface.height,bounds=maxX<0?null:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
  return {occupiedPixels:occupied,occupiedRatio:occupied/total,paletteSize:colors.size,bounds,boundsCoverage:bounds?(bounds.width*bounds.height)/total:0};
}
export function connectedComponentsAlpha(surface){const w=surface.width,h=surface.height,seen=new Uint8Array(w*h);let count=0;const opaque=(i)=>surface.pixels[i*4+3]>0;for(let start=0;start<w*h;start++){if(seen[start]||!opaque(start))continue;count++;const stack=[start];seen[start]=1;while(stack.length){const i=stack.pop(),x=i%w,y=Math.floor(i/w);for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1],[x-1,y-1],[x+1,y-1],[x-1,y+1],[x+1,y+1]]){if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;if(!seen[ni]&&opaque(ni)){seen[ni]=1;stack.push(ni);}}}}return count;}
