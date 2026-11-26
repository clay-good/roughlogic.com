#!/usr/bin/env node
// The kind of a CONDITIONALLY RENDERED input, recovered by driving the page.
//
// extract-bespoke-schemas.mjs reads a render function's SOURCE, so it sees one
// branch of a mode select. concrete builds its dimension boxes inside
// `refreshDims()` -- three for a slab, two for a column, five for a footing
// with a stem -- and metal-weight builds a different set per profile. The
// branch the source happens to show is the one the extractor emits, so the
// others reach `describe()` with `kind: null`, and the type witnesses cannot
// help: the worked example exercises one shape, and these parameters carry no
// literal default. 54 params are in that position.
//
// This drives each renderer under the fake DOM instead, walks every option of
// every mode select, and recovers the kind of the controls the page actually
// builds. Two things make it sound rather than a guess:
//
//   1. THE CONTROL -> PARAMETER MAP IS MEASURED, NOT PARSED. Each visible
//      control is set to a unique sentinel value, the compute is spied, and the
//      key carrying that sentinel IS that control's parameter. No id convention
//      is assumed -- `co-w` is `waste_factor`, which no prefix rule reaches --
//      and a sentinel that lands on two keys is dropped as ambiguous.
//
//   2. THE KIND IS READ FROM inputMode, NOT FROM type. `makeNumber` ends with
//      `if (unit) makeLengthEntry(...)`, so a box whose label names feet or
//      inches is `type="text"` on purpose, to take 8'6" and 3-1/2. Reading
//      `type` reports concrete's diameter and metal-weight's seven profile
//      dimensions as free text, and publishing that would tell an agent to send
//      a string where the page sends a number. `makeNumber` sets
//      `inputMode = "decimal"` before length entry can rewrite `type`;
//      `makeText` sets none. See test/unit/numeric-box-marker.test.js.
//
// ONLY `kind` is emitted. The controls also carry min/max/step, and publishing
// those would reopen the declared-bound-versus-enforced question on fields
// whose computes were never asked to honour them -- a separate decision.
//
// THE TARGET LIST MUST BE COMPUTED WITHOUT THE SPY. The spy loader rebinds each
// `export function computeX` to a wrapper, so `describe()` reads the wrapper's
// signature and returns the wrong input set -- a run that ignored this reported
// 3 tiles where there are 29. So this script runs in two phases: a clean child
// process dumps the parameters that need a kind, then this process drives the
// renderers with the spy registered.
//
// Default mode: report. `--write` emits test/fixtures/conditional-kinds.js,
// `--check` fails if that file is out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as nodeModule from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = resolve(ROOT, "test/fixtures/conditional-kinds.js");
const write = process.argv.includes("--write");
const check = process.argv.includes("--check");

// Phase 1, in a clean process: which parameters reach describe() with no kind
// and no type witness at all.
const TARGETS = `
import { describe } from ${JSON.stringify(resolve(ROOT, "mcp/catalog.mjs"))};
import { RENDERER_MAP } from ${JSON.stringify(resolve(ROOT, "test/fixtures/renderer-map.js"))};
const out = {};
for (const id of Object.keys(RENDERER_MAP)) {
  let d; try { d = await describe({ id }); } catch { continue; }
  if (!Array.isArray(d.inputs)) continue;
  const rows = d.examples || (d.example ? [d.example] : []);
  const ex = (rows[0] && rows[0].inputs) || {};
  // EVERY kind-less param, not only the ones no witness types. The witnesses
  // decide COERCION; the kind is what the contract PUBLISHES, and concrete
  // publishing number for its column diameter while publishing nothing for its
  // slab length -- both numeric, both on the same page -- is incoherent to a
  // reader. A param an example types still has no published kind.
  const want = d.inputs.filter((f) => !f.kind
    && !Array.isArray(f.default) && !(f.default && typeof f.default === "object")).map((f) => f.key);
  if (want.length) out[id] = want;
}
process.stdout.write(JSON.stringify(out));
`;
// ROUGHLOGIC_RAW_KINDS makes describe() skip the merge of this script's own
// output. Without it the generator is not idempotent: the kinds it published
// last time remove those params from its target list, so the next run emits an
// empty fixture and --check calls a file it just wrote stale.
const targets = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", TARGETS], {
  encoding: "utf8",
  maxBuffer: 1 << 24,
  env: { ...process.env, ROUGHLOGIC_RAW_KINDS: "1" },
}));

// Phase 2: drive the renderers with the compute spied.
if (nodeModule.registerHooks) nodeModule.registerHooks({ load: (await import("../test/fixtures/compute-spy-loader.js")).load });
else nodeModule.register("../test/fixtures/compute-spy-loader.js", import.meta.url);
const calls = [];
globalThis.__computeSpy = (fn) => function (...args) {
  if (args[0] && typeof args[0] === "object") calls.push({ ...args[0] });
  return fn.apply(this, args);
};
const { installDocument, installTimers, flushTimers } = await import("../test/fixtures/fake-dom.js");
const { RENDERER_MAP } = await import("../test/fixtures/renderer-map.js");
installTimers();
const doc = installDocument();

const recovered = {};
let params = 0, ambiguous = 0, unresolved = 0;
for (const [id, want] of Object.entries(targets)) {
  const reg = RENDERER_MAP[id];
  if (!reg) continue;
  let ns;
  try { ns = await import(resolve(ROOT, reg.module.replace(/^(\.\.\/)+/, ""))); } catch { continue; }
  const render = ns[reg.exportName] && ns[reg.exportName][id];
  if (typeof render !== "function") continue;

  const inputRegion = doc.createElement("div");
  const outputRegion = doc.createElement("div");
  doc.body.replaceChildren();
  doc.body.appendChild(inputRegion);
  doc.body.appendChild(outputRegion);
  try { render(inputRegion, outputRegion, doc.createElement("p")); flushTimers(); } catch { continue; }

  const found = new Map();
  const probe = () => {
    const controls = [...inputRegion.querySelectorAll("input"), ...inputRegion.querySelectorAll("textarea")]
      .filter((c) => c.id && c.type !== "checkbox");
    controls.forEach((c, i) => { c.value = String(10007 + i * 13); });
    calls.length = 0;
    for (const c of controls) { try { c.dispatchEvent(new globalThis.Event("input", { bubbles: true })); } catch { /* keep going */ } }
    flushTimers();
    const last = calls[calls.length - 1];
    if (!last) return;
    for (const c of controls) {
      // The received value must be a SCALAR. A makeNumber box can hold a
      // comma-separated LIST -- decibel-converter's "Source levels (dB,
      // comma-separated)" is one, and its compute refuses anything that is not
      // an Array -- and the renderer parses it before the compute sees it. With
      // a single sentinel in the box the compute receives `[10007]`, and
      // `String([10007])` is `"10007"`, so a plain string compare matched an
      // array as though it were a number and would have published `number` for
      // a list. A scalar check is the whole guard.
      const hits = Object.entries(last).filter(([, v]) =>
        (typeof v === "string" || typeof v === "number") && String(v) === c.value);
      if (hits.length !== 1) { if (hits.length > 1) ambiguous += 1; continue; }
      // inputMode, not type: see the header.
      found.set(hits[0][0], c.inputMode === "decimal" ? "number" : "text");
    }
  };
  probe();
  for (const sel of [...inputRegion.querySelectorAll("select")].filter((s) => s.options.length > 1)) {
    for (const value of [...sel.options].map((o) => o.value)) {
      sel.value = value;
      try { sel.dispatchEvent(new globalThis.Event("input", { bubbles: true })); flushTimers(); } catch { /* keep going */ }
      probe();
    }
  }
  const got = {};
  for (const key of want) {
    if (!found.has(key)) { unresolved += 1; continue; }
    got[key] = found.get(key);
    params += 1;
  }
  if (Object.keys(got).length) recovered[id] = got;
}

const rows = Object.keys(recovered).sort()
  .map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(recovered[id], Object.keys(recovered[id]).sort())},`)
  .join("\n");
const body = `// GENERATED by scripts/extract-conditional-kinds.mjs. Do not hand-edit.
//
// The kind of an input the renderer builds inside a MODE BRANCH, which
// extract-bespoke-schemas.mjs cannot see because it reads the render function's
// source and so reads one branch. Recovered by driving the page: each control is
// set to a unique sentinel, the compute is spied, and the key carrying that
// sentinel is that control's parameter. Read from \`inputMode\`, never \`type\` --
// a length box is \`type="text"\` on purpose so it can take 8'6".
//
// mcp/catalog.mjs merges these ONLY where describe() has no kind already.
export const CONDITIONAL_KINDS = {
${rows}
};
`;

if (write) {
  writeFileSync(FIXTURE, body);
  console.log(`extract-conditional-kinds: wrote ${Object.keys(recovered).length} tile(s), ${params} param(s)`);
} else if (check) {
  let current = "";
  try { current = readFileSync(FIXTURE, "utf8"); } catch { /* missing */ }
  if (current !== body) {
    console.error("extract-conditional-kinds FAILED: test/fixtures/conditional-kinds.js is stale. Run `node scripts/extract-conditional-kinds.mjs --write` and commit.");
    process.exit(1);
  }
  console.log(`extract-conditional-kinds OK: ${params} conditionally-rendered param(s) across ${Object.keys(recovered).length} tile(s) carry the kind the page builds.`);
} else {
  console.log(`tiles needing a kind: ${Object.keys(targets).length} | recovered: ${params} | unresolved: ${unresolved} | ambiguous sentinels: ${ambiguous}`);
  for (const id of Object.keys(recovered).sort()) console.log(`  ${id}: ${Object.entries(recovered[id]).map(([k, v]) => k + "=" + v).join(", ")}`);
}
