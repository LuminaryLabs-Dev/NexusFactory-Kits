#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const target=fileURLToPath(new URL('./render-review-set.mjs',import.meta.url));
const result=spawnSync(process.execPath,['--expose-gc',target,...process.argv.slice(2)],{stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
