import { writeFile } from "node:fs/promises";
import { createRegistry } from "../src/registry/registry.js";
import { domains, kits } from "../src/catalog.js";

const registry = createRegistry({ domains, kits });
const snapshot = registry.snapshot();
if (!snapshot.capabilityGraph.valid) {
  console.error(JSON.stringify(snapshot.capabilityGraph.missing, null, 2));
  process.exitCode = 1;
} else {
  await writeFile(new URL("../registry.json", import.meta.url), `${JSON.stringify(snapshot)}\n`);
  console.log(`registry: ${snapshot.domains.length} domains, ${snapshot.kits.length} kits, ${snapshot.integrity}`);
}
