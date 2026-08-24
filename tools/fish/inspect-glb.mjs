#!/usr/bin/env node
import { inspectGlb } from './lib/glb-reader.mjs';
import { parseArgs } from './lib/cli.mjs';
const options=parseArgs(process.argv.slice(2));if(!options.input)throw new Error('Usage: node tools/fish/inspect-glb.mjs --input <fish.glb>');console.log(JSON.stringify(inspectGlb(options.input),null,2));
