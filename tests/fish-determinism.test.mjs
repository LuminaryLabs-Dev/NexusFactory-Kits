import test from 'node:test';
import assert from 'node:assert/strict';
import { kit } from '../src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js';

const families=['oval','torpedo','disc','boxy'];
test('fish generation is deterministic, seed-sensitive and valid across body families',()=>{
  for(const family of families){const request={seed:`determinism:${family}`,params:{speciesFamily:family,quality:'preview'}},a=kit.services.generate(request),b=kit.services.generate(request),c=kit.services.generate({...request,seed:`${request.seed}:other`});assert.equal(a.deterministicHash,b.deterministicHash);assert.notEqual(a.deterministicHash,c.deterministicHash);assert.equal(kit.services.validate(a).valid,true);assert.ok(a.statistics.triangleCount>1000);assert.ok(a.statistics.textureCount>=5);}
});
