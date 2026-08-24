import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/domains/factory/object/creature/aquatic');
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?files(path.join(directory,entry.name)):entry.name.endsWith('.js')?[path.join(directory,entry.name)]:[]);}

test('registered procedural fish runtime is browser-safe',()=>{
  const runtimeFiles=files(root);
  assert.ok(runtimeFiles.length>=8);
  for(const file of runtimeFiles){const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/from\s+["']node:|import\s+["']node:|require\s*\(\s*["']node:/,path.relative(root,file));}
});
