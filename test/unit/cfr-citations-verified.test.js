// Every Code of Federal Regulations section or part the catalog cites was read
// on the eCFR API on 2026-10-17 and its heading recorded in
// test/fixtures/cfr-verified.json. That pass found the coliform tile sending
// every small water system to 40 CFR 141.854, the rule for NON-community ground
// water systems, while describing the community-system schedule (141.855).
// A pointer that exists is not the same as a pointer that is right, so the
// fixture keeps the heading for a reader to compare; this test makes a NEW
// citation fail until someone has read it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PAT = /(\d{1,2})\s*CFR\s*(?:Part\s*|§\s*|Sec\.?\s*)?(\d{1,4}(?:\.\d+[a-z]?)?)/gi;

test("every CFR section the catalog cites has been read on eCFR", () => {
  const { headings } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/cfr-verified.json"), "utf8"));
  const files = ["citations.js", "tools-data.js", ...readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))];
  const missing = new Set();
  let seen = 0;
  for (const f of files) {
    for (const m of readFileSync(resolve(ROOT, f), "utf8").matchAll(PAT)) {
      seen++;
      const key = `${m[1]} CFR ${m[2]}`;
      if (!headings[key]) missing.add(`${key} (${f})`);
    }
  }
  assert.ok(seen > 100, `only ${seen} CFR citations found; did the pattern break?`);
  assert.deepEqual([...missing], [], "read these on ecfr.gov and add their headings to test/fixtures/cfr-verified.json");
});

test("a small water system is routed to the rule for its type, not only 141.854", async () => {
  const { computeRtcrColiformSamples } = await import("../../calc-reliefwater.js");
  const r = computeRtcrColiformSamples({ population_served: 500 });
  for (const sec of ["141.854", "141.855", "141.856"]) assert.match(r.routing, new RegExp(sec.replace(".", "\\.")));
  assert.match(r.routing, /141\.855 \(community/);
});
