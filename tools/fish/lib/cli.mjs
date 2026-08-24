import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const validationRoot = path.join(repositoryRoot, 'validation', 'fish');
export function parseArgs(argv, defaults = {}) { const out={...defaults}; for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--'))throw new Error(`Unexpected argument: ${arg}`);const key=arg.slice(2);if(['help','high'].includes(key)){out[key]=true;continue;}const value=argv[++i];if(value===undefined)throw new Error(`Missing value for --${key}`);out[key]=value;}return out; }
export function safeOutputDirectory(value, fallbackName='procedural-reef-fish') { const target=path.resolve(value??path.join(validationRoot,fallbackName)); const root=path.resolve(validationRoot); if(target!==root&&!target.startsWith(`${root}${path.sep}`))throw new Error(`Output must stay under ${root}`); fs.mkdirSync(target,{recursive:true}); return target; }
export function readJson(filePath){return JSON.parse(fs.readFileSync(path.resolve(filePath),'utf8'));}
export function writeJson(filePath,value){fs.mkdirSync(path.dirname(filePath),{recursive:true});fs.writeFileSync(filePath,`${JSON.stringify(value,null,2)}\n`);}
export function parseParams(options){if(options.paramsFile)return readJson(options.paramsFile);if(options.params)return JSON.parse(options.params);return{};}
