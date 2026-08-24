#!/usr/bin/env node
import path from 'node:path';
import { parseGlb } from './lib/glb-reader.mjs';
import { renderModel } from './lib/renderer.mjs';
import { writePng } from './lib/png.mjs';
import { parseArgs, safeOutputDirectory } from './lib/cli.mjs';
const options=parseArgs(process.argv.slice(2),{width:'900',height:'700',view:'hero',environment:'underwater'});if(!options.input)throw new Error('Usage: node tools/fish/render.mjs --input <fish.glb> [--output validation/fish/... --file preview.png]');const model=parseGlb(options.input),result=renderModel(model,{width:Number(options.width),height:Number(options.height),view:options.view,environment:options.environment,mode:options.mode,supersample:Number(options.supersample??1)}),output=safeOutputDirectory(options.output,'render'),file=path.join(output,options.file??'preview.png');writePng(file,result.image);console.log(JSON.stringify({file,stats:result.stats},null,2));
