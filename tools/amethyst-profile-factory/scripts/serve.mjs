import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function serve(port=0){const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const bytes=await readFile(file);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes);}catch{res.writeHead(404).end('Not found');}});await new Promise(r=>server.listen(port,'127.0.0.1',r));return {server,url:`http://127.0.0.1:${server.address().port}`};}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {url}=await serve(Number(process.env.PORT??4173));console.log(url);}
