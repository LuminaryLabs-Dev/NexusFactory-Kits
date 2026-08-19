import test from "node:test";
import assert from "node:assert/strict";
import { sha256Hex } from "../src/foundation/hash.js";

test("portable SHA-256 matches the standard abc vector", () => {
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
