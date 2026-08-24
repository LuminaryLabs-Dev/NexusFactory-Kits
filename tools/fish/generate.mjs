#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { kit } from '../../src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js';
import { parseArgs, parseParams, safeOutputDirectory, writeJson } from './lib/cli.mjs';

const options=parseArgs(process.argv.slice(2),{seed:'factory-object-creature-fish:001'});const params={...parseParams(options),...(options.quality?{quality:options.quality}:{})},artifact=kit.services.generate({seed:options.seed,params}),validation=kit.services.validate(artifact);if(!validation.valid)throw new Error(`Generated fish failed validation: ${validation.checks.filter((check)=>!check.pass).map((check)=>check.id).join(', ')}`);const output=safeOutputDirectory(options.output,artifact.deterministicHash.slice(-12)),glb=kit.services.export(artifact,'glb');fs.writeFileSync(path.join(output,glb.fileName),glb.bytes);writeJson(path.join(output,'artifact.json'),artifact);writeJson(path.join(output,'validation.json'),validation);console.log(JSON.stringify({output,seed:artifact.seed,hash:artifact.deterministicHash,statistics:artifact.statistics,glb:glb.fileName,glbBytes:glb.bytes.length},null,2));
