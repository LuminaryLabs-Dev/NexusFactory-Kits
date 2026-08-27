import { deepClone, assert, stableStringify } from './runtime-service.mjs';

const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);

function decodePointer(pointer) {
  assert(typeof pointer === 'string' && pointer.startsWith('/'), `Invalid JSON pointer: ${pointer}`, 'INVALID_POINTER');
  return pointer.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function locate(root, pointer, allowAppend = false) {
  const parts = decodePointer(pointer);
  const key = parts.pop();
  assert(!unsafeKeys.has(key), `Unsafe patch key: ${key}`, 'UNSAFE_PATCH');
  let parent = root;
  for (const part of parts) {
    assert(!unsafeKeys.has(part), `Unsafe patch path segment: ${part}`, 'UNSAFE_PATCH');
    assert(parent && Object.hasOwn(parent, part), `Patch path does not exist: ${pointer}`, 'MISSING_PATH');
    parent = parent[part];
  }
  if (Array.isArray(parent) && key !== '-') {
    const index = Number(key);
    assert(Number.isInteger(index) && index >= 0 && (allowAppend ? index <= parent.length : index < parent.length), `Invalid array index: ${pointer}`, 'INVALID_INDEX');
    return { parent, key: index };
  }
  return { parent, key };
}

export function getAtPointer(root, pointer) {
  if (pointer === '') return root;
  const { parent, key } = locate(root, pointer);
  assert(parent && Object.hasOwn(parent, key), `Patch path does not exist: ${pointer}`, 'MISSING_PATH');
  return parent[key];
}

export function applyJsonPatch(source, operations) {
  assert(Array.isArray(operations) && operations.length > 0, 'patch must contain operations', 'EMPTY_PATCH');
  assert(operations.length <= 128, 'patch exceeds 128-operation safety limit', 'PATCH_TOO_LARGE');
  const document = deepClone(source);
  const touched = [];
  for (const operation of operations) {
    assert(operation && typeof operation === 'object', 'Patch operation must be an object', 'INVALID_PATCH');
    assert(['add', 'replace', 'remove', 'test'].includes(operation.op), `Unsupported patch operation: ${operation.op}`, 'UNSUPPORTED_PATCH_OPERATION');
    assert(typeof operation.path === 'string', 'Patch path is required', 'INVALID_PATCH');
    if (operation.op === 'test') {
      assert(stableStringify(getAtPointer(document, operation.path)) === stableStringify(operation.value), `Patch test failed: ${operation.path}`, 'PATCH_TEST_FAILED');
      continue;
    }
    const { parent, key } = locate(document, operation.path, operation.op === 'add');
    if (operation.op === 'replace') {
      assert(parent && Object.hasOwn(parent, key), `Replace path does not exist: ${operation.path}`, 'MISSING_PATH');
      parent[key] = deepClone(operation.value);
    } else if (operation.op === 'add') {
      if (Array.isArray(parent)) {
        if (key === '-') parent.push(deepClone(operation.value));
        else parent.splice(key, 0, deepClone(operation.value));
      } else parent[key] = deepClone(operation.value);
    } else if (operation.op === 'remove') {
      assert(parent && Object.hasOwn(parent, key), `Remove path does not exist: ${operation.path}`, 'MISSING_PATH');
      if (Array.isArray(parent)) parent.splice(key, 1);
      else delete parent[key];
    }
    touched.push(operation.path);
  }
  return { document, touched };
}
