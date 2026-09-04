// data/legal/sales-tax-nexus.json is GENERATED from SALES_TAX_NEXUS in
// calc-references.js by scripts/build-data.mjs. The runtime module is the
// declared source of truth; the shard is a projection of it.
//
// Nothing compared the two. Every other gate in this repo reads the shard --
// check-manifests recomputes the staleness note from it, check-verified-on-
// ledger reads its stamps, docs/data-sources.md is pinned to it -- so the whole
// verification apparatus agrees with itself while describing data the site does
// not serve. On 2026-09-04 five states (AK, ME, OK, SC, WY) were re-verified
// against their own published text in calc-references.js, and every gate stayed
// green reporting the superseded citations. A generated file that nobody checks
// against its generator is not a projection, it is a second copy.
//
// Pure read-and-report; no network, no mutation. Run `npm run data:refresh`
// when this fails.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SALES_TAX_NEXUS } from "../calc-references.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHARD = resolve(ROOT, "data", "legal", "sales-tax-nexus.json");

const errors = [];
const shard = JSON.parse(await readFile(SHARD, "utf8"));
const rows = shard.by_state || {};

// The rollup must be the oldest row stamp -- the CF-05 rule build-data applies.
const stamps = Object.values(SALES_TAX_NEXUS)
  .map((v) => v.verified_on || v.verifiedOn)
  .filter(Boolean)
  .sort();
if (rows.verifiedOn !== stamps[0]) {
  errors.push(
    "data/legal/sales-tax-nexus.json by_state.verifiedOn is " + rows.verifiedOn +
      " but the oldest row stamp in calc-references.js is " + stamps[0] + ".",
  );
}

const inModule = Object.keys(SALES_TAX_NEXUS).sort();
const inShard = Object.keys(rows).filter((k) => k !== "verifiedOn").sort();
for (const st of inModule) {
  if (!inShard.includes(st)) errors.push(st + " is in calc-references.js but not in the shard.");
}
for (const st of inShard) {
  if (!inModule.includes(st)) errors.push(st + " is in the shard but not in calc-references.js.");
}

for (const st of inModule) {
  const want = SALES_TAX_NEXUS[st];
  const got = rows[st];
  if (!got) continue;
  for (const key of new Set([...Object.keys(want), ...Object.keys(got)])) {
    if (JSON.stringify(want[key]) !== JSON.stringify(got[key])) {
      errors.push(
        st + "." + key + ": calc-references.js says " + JSON.stringify(want[key]) +
          ", the shard says " + JSON.stringify(got[key]) + ".",
      );
    }
  }
}

if (errors.length) {
  console.error("check-shard-source-drift FAILED:");
  for (const e of errors) console.error("  - " + e);
  console.error(
    "\ndata/legal/sales-tax-nexus.json is generated from calc-references.js. " +
      "Run `npm run data:refresh` and commit the regenerated shard with the module change.",
  );
  process.exit(1);
}

console.log(
  "check-shard-source-drift OK: all " + inModule.length +
    " sales-tax-nexus rows in data/legal match SALES_TAX_NEXUS in calc-references.js field-for-field, " +
    "and the by_state rollup equals the oldest row stamp. " +
    "NOT checked here: the other shards data:refresh writes -- only this one declares a runtime module as its source.",
);
