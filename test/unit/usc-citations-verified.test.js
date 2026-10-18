// Every U.S. Code section the catalog cites was read on 2026-10-17 (headings in
// test/fixtures/usc-verified.json). The pass found nothing wrong, which is the
// point of keeping it: a NEW statute pointer fails here until someone reads it.
// "IRC" is both the Internal Revenue Code (title 26) and the residential
// building code; building-code sections start with R (R318.7) and section
// numbers in a measurement ("IRC 4 in sphere") carry no section sign, so only
// "IRC §N" and the bare tax sections below count as title 26.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const USC = /(\d{1,2})\s*U\.?\s?S\.?\s?C\.?\s*(?:§+\s*)?(\d{1,5}[A-Z]?)(?:\/(\d{1,5}))?(?:-(\d{1,5}))?/g;
const IRC_TAX = /\bIRC\s*(?:§+\s*(\d{1,4}[A-Z]?)|\s(121|168|179|280A|1031|1245|1250|1401|1402|3101|3111|6654)\b)/g;

test("every U.S. Code section the catalog cites has been read", () => {
  const { headings } = JSON.parse(readFileSync(resolve(ROOT, "test/fixtures/usc-verified.json"), "utf8"));
  const files = ["citations.js", "tools-data.js", ...readdirSync(ROOT).filter((f) => /^calc-.*\.js$/.test(f))];
  const missing = new Set();
  let seen = 0;
  const need = (key, f) => { seen++; if (!headings[key]) missing.add(`${key} (${f})`); };
  for (const f of files) {
    const src = readFileSync(resolve(ROOT, f), "utf8");
    for (const m of src.matchAll(USC)) for (const s of [m[2], m[3], m[4]].filter(Boolean)) need(`${m[1]} USC ${s}`, f);
    for (const m of src.matchAll(IRC_TAX)) need(`26 USC ${m[1] || m[2]}`, f);
  }
  assert.ok(seen > 30, `only ${seen} U.S. Code citations found; did a pattern break?`);
  assert.deepEqual([...missing], [], "read these and add their headings to test/fixtures/usc-verified.json");
});
