#!/usr/bin/env node
import { kit } from '../../src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js';
import { parseArgs, parseParams, readJson } from './lib/cli.mjs';
const options=parseArgs(process.argv.slice(2),{seed:'factory-object-creature-fish:validation'}),artifact=options.input?readJson(options.input):kit.services.generate({seed:options.seed,params:parseParams(options)}),report=kit.services.validate(artifact);console.log(JSON.stringify(report,null,2));if(!report.valid)process.exitCode=1;
