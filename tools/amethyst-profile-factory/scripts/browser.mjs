import {readFile,writeFile,mkdir,stat,chmod} from 'node:fs/promises';
import {brotliDecompressSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';
export async function browser(){const root=fileURLToPath(new URL('../runtime/chromium/',import.meta.url));await mkdir(root,{recursive:true});const bin=path.join(root,'chromium');let ready=false;try{ready=(await stat(bin)).size>1000000;}catch{}
 if(!ready){const pkg=fileURLToPath(new URL('../node_modules/@sparticuz/chromium/bin/',import.meta.url));for(const name of ['chromium','swiftshader.tar','fonts.tar']){const bytes=brotliDecompressSync(await readFile(path.join(pkg,name+'.br')));if(name==='chromium'){await writeFile(bin,bytes);await chmod(bin,0o700);}else{const tar=spawnSync('tar',['--no-same-owner','-xf','-','-C',root],{input:bytes,maxBuffer:1024*1024});if(tar.status!==0)throw new Error(tar.stderr.toString());}}}
 return chromium.launch({executablePath:bin,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files'],env:{...process.env,LD_LIBRARY_PATH:root+(process.env.LD_LIBRARY_PATH?':'+process.env.LD_LIBRARY_PATH:''),FONTCONFIG_PATH:path.join(root,'fonts')}});
}
