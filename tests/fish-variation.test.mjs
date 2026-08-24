import test from 'node:test';
import assert from 'node:assert/strict';
import { kit } from '../src/domains/factory/object/creature/aquatic/kits/fish-kit/index.js';

const base={seed:'variation-fish',params:{quality:'preview',speciesFamily:'oval',tailProfile:'forked',patternType:'bands',palette:'azureGold',eyeProfile:'amber',mouthProfile:'terminal'}};
test('fixed-entropy randomization is reproducible and group-bounded',()=>{
  const a=kit.services.randomize({...base,groupId:'pattern',entropy:'fixed'}),b=kit.services.randomize({...base,groupId:'pattern',entropy:'fixed'});
  assert.equal(a.seed,base.seed);
  assert.deepEqual(a.params,b.params);
  assert.equal(a.artifact.deterministicHash,b.artifact.deterministicHash);
  for(const id of ['speciesFamily','tailProfile','eyeProfile','mouthProfile'])assert.equal(a.params[id],base.params[id]??a.params[id]);
  assert.equal(kit.services.validate(a.artifact).valid,true);
});
test('reroll changes seed while preserving normalized parameters',()=>{
  const a=kit.services.reroll({...base,entropy:'fixed'}),b=kit.services.reroll({...base,entropy:'fixed'});
  assert.notEqual(a.seed,base.seed);
  assert.equal(a.seed,b.seed);
  assert.deepEqual(a.params,b.params);
  assert.deepEqual(a.params,kit.services.generate(base).params);
});
