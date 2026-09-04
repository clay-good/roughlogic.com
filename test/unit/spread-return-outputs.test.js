// The seven computes check-render-output-keys cannot read, checked by RUNNING
// them instead.
//
// That gate resolves each compute's returned object literal statically and
// compares it to the `r.<key>` references in its _simpleRenderer. Seven computes
// return a spread -- `{ ...t, term, citation }`, where `t` is a lookup-table row
// -- so their key set is not in the return statement and the gate skips them.
// a91a57e9 ratcheted that set so it cannot grow silently, which stops it getting
// worse but leaves those seven renderers unverified: a misspelled reference on
// one of them renders the literal text "undefined", which is exactly the bug the
// gate exists to catch and the one shape it is blind to.
//
// Rewriting the seven to enumerate their table's keys would trade a readable
// spread for a duplicate of the table's shape. Running them costs nothing here:
// each has a worked-example fixture, so the ACTUAL returned keys are available,
// which is strictly more than the static parse can know.
//
// The trade is honest and worth stating: this covers the worked example's input
// path only. A branch that returns a different shape on other inputs is still
// out of reach -- which is why the static gate stays, rather than this replacing
// it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPUTE_MAP } from "../fixtures/compute-map.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// The set the gate reports as skipped. Kept honest by the budget assertion
// below rather than by hand.
const SPREAD_RETURNS = [
  "computeConcreteAnchorSteelStrength",
  "computeFormworkPressure",
  "computeRecoveryCylinder",
  "computeBrakePadLife",
  "computeSpringNaturalFrequency",
  "computeHydraulicReservoirCooler",
  "computeIncoterm",
];

test("the list here matches the budget check-render-output-keys ratchets", async () => {
  const gate = await readFile(resolve(ROOT, "scripts", "check-render-output-keys.mjs"), "utf8");
  const m = gate.match(/const SKIPPED_BUDGET = (\d+);/);
  assert.ok(m, "check-render-output-keys no longer declares SKIPPED_BUDGET");
  assert.equal(
    SPREAD_RETURNS.length, Number(m[1]),
    "a compute joined or left the gate's skipped set; add or remove it here so the runtime check keeps covering exactly what the static one cannot",
  );
});

test("every renderer output reference on a spread-returning compute resolves at runtime", async () => {
  const examples = JSON.parse(
    await readFile(resolve(ROOT, "test", "fixtures", "worked-examples.json"), "utf8"),
  );
  const rows = Array.isArray(examples) ? examples : Object.values(examples).find(Array.isArray);
  const problems = [];
  let checked = 0;

  for (const [tileId, entry] of Object.entries(COMPUTE_MAP)) {
    if (!SPREAD_RETURNS.includes(entry.fn)) continue;
    const example = rows.find((r) => r.tile_id === tileId);
    assert.ok(example, `${tileId} has no worked-example fixture, so this check cannot run`);

    const modulePath = entry.module.replace("../../", "");
    const mod = await import(resolve(ROOT, modulePath));
    const result = mod[entry.fn](example.inputs);
    assert.ok(result && !result.error, `${tileId}: its own worked example returned ${JSON.stringify(result)}`);
    const returned = new Set(Object.keys(result));

    // The renderer block that names this compute.
    const src = await readFile(resolve(ROOT, modulePath), "utf8");
    const at = src.indexOf("compute: " + entry.fn);
    assert.ok(at > 0, `${tileId}: no _simpleRenderer names ${entry.fn}`);
    const start = src.lastIndexOf("_simpleRenderer({", at);
    let depth = 0, j = src.indexOf("{", start);
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) break; }
    }
    const block = src.slice(start, j);
    const refs = [...new Set([...block.matchAll(/\br\.(\w+)\b/g)].map((x) => x[1]))];
    assert.ok(refs.length > 0, `${tileId}: found no output references, so this check proved nothing`);

    for (const key of refs) {
      checked++;
      if (!returned.has(key)) {
        problems.push(`${tileId} (${entry.fn}): renderer reads r.${key}, which the compute does not return -- it renders as the literal text "undefined"`);
      }
    }
  }

  assert.ok(checked >= 30, `expected to check a real number of references, checked ${checked}`);
  assert.deepEqual(problems, []);
});
