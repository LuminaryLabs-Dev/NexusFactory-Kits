#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { kit } from '../../src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js';
import { runReviewPipeline } from './lib/review-pipeline.mjs';
import { parseArgs, parseParams, safeOutputDirectory, writeJson } from './lib/cli.mjs';
const options=parseArgs(process.argv.slice(2),{seed:'factory-object-creature-fish:review'}),output=safeOutputDirectory(options.output,'review'),artifact=kit.services.generate({seed:options.seed,params:parseParams(options)}),validation=kit.services.validate(artifact);if(!validation.valid)throw new Error('Fish artifact failed validation.');const exported=kit.services.export(artifact,'glb'),glbPath=path.join(output,exported.fileName);fs.writeFileSync(glbPath,exported.bytes);writeJson(path.join(output,'artifact.json'),artifact);writeJson(path.join(output,'validation.json'),validation);const artifactPath=path.join(output,'artifact.json');const manifest=await runReviewPipeline({artifactPath,glbPath,outputDirectory:output});console.log(JSON.stringify({output,glb:glbPath,valid:manifest.valid,loops:manifest.reviewLoops.map((loop)=>({id:loop.id,pass:loop.automatedPass,image:loop.image}))},null,2));if(!manifest.valid)process.exitCode=1;
