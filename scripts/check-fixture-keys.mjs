#!/usr/bin/env node
// Worked-example fixture-key lint.
//
// test/fixtures/worked-examples.json pins each tile's inputs and expected
// outputs. If a fixture's input key does NOT match a parameter the compute
// function destructures, the key is silently ignored and the function runs on
// that parameter's default -- so the fixture pins (and the runner "validates")
// the default computation, not the scenario the fixture describes. This masks
// bugs (a renamed/refactored parameter, an abbreviated key, a missing required
// input) that neither the worked-example runner (which passes on defaults) nor
// the tile-contract fuzzer (which seeds from the signature) can catch.
//
// This gate parses each compute function's top-level destructured parameter
// names from its source and asserts every fixture input key is one of them.
// Functions with a rest element (...rest) accept arbitrary keys and are skipped.
//
// No network. No mutation. Pure read-and-report.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { COMPUTE_MAP } = await import(resolve(ROOT, "test", "fixtures", "compute-map.js"));
const examples = JSON.parse(await readFile(resolve(ROOT, "test", "fixtures", "worked-examples.json"), "utf8")).rows;

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

// Return the set of top-level destructured parameter names, or "REST" if the
// signature has a rest element (accepts any key), or null if not parseable.
function paramKeys(fn) {
  const s = stripComments(fn.toString());
  // Isolate the parameter list: the first (...) balanced group.
  const parenOpen = s.indexOf("(");
  if (parenOpen === -1) return null;
  let pd = 0, parenEnd = -1;
  for (let i = parenOpen; i < s.length; i++) {
    if (s[i] === "(") pd++;
    else if (s[i] === ")") { pd--; if (pd === 0) { parenEnd = i; break; } }
  }
  if (parenEnd === -1) return null;
  const params = s.slice(parenOpen + 1, parenEnd);
  // A destructured-object signature has a { inside the param list. If not
  // (a positional arg like `(input)`, or no args), we cannot determine the
  // accepted keys from the source -> skip rather than guess.
  const open = params.indexOf("{");
  if (open === -1) return null;
  let depth = 0, end = -1;
  for (let i = open; i < params.length; i++) {
    if (params[i] === "{") depth++;
    else if (params[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  const inner = params.slice(open + 1, end);
  if (/(^|,)\s*\.\.\./.test(inner)) return "REST";
  const keys = new Set();
  let d = 0, token = "";
  const flush = () => {
    if (token === "\0skip") return;
    const m = token.trim().match(/^([A-Za-z_$][\w$]*)/);
    if (m) keys.add(m[1]);
  };
  for (const ch of inner) {
    if (ch === "{" || ch === "[" || ch === "(") d++;
    else if (ch === "}" || ch === "]" || ch === ")") d--;
    if (d === 0 && ch === ",") { flush(); token = ""; continue; }
    if (d === 0 && ch === "=") { flush(); token = "\0skip"; continue; }
    token += ch;
  }
  flush();
  return keys;
}

const cache = new Map();
async function loadFn(mod, fnName) {
  const key = mod + "::" + fnName;
  if (!cache.has(key)) {
    try {
      const m = await import(resolve(ROOT, "test", "fixtures", mod));
      cache.set(key, m[fnName]);
    } catch { cache.set(key, null); }
  }
  return cache.get(key);
}

const problems = [];
let checked = 0, skipped = 0;
const skippedTiles = [];
for (const ex of examples) {
  const map = COMPUTE_MAP[ex.tile_id];
  if (!map || !ex.inputs) { skipped++; skippedTiles.push(ex.tile_id); continue; }
  const fn = await loadFn(map.module, map.fn);
  if (typeof fn !== "function") { skipped++; skippedTiles.push(ex.tile_id); continue; }
  const keys = paramKeys(fn);
  if (keys === "REST" || !keys || keys.size === 0) { skipped++; skippedTiles.push(ex.tile_id); continue; }
  checked++;
  const bad = Object.keys(ex.inputs).filter((k) => !keys.has(k));
  if (bad.length) {
    problems.push(
      `  ${ex.tile_id} (${map.fn}): fixture input key(s) not in the signature -> ${bad.join(", ")}\n` +
      `     signature params: ${[...keys].join(", ")}`
    );
  }
}

if (problems.length) {
  console.error(
    "check-fixture-keys FAIL: " + problems.length + " worked-example fixture(s) have input keys the compute " +
    "function ignores (the fixture is validating parameter defaults, not the scenario it describes):\n" +
    problems.join("\n") +
    "\nRename the keys to match the function's parameters and re-pin the outputs."
  );
  process.exit(1);
}
// A skipped fixture is a fixture whose input keys nothing verifies against the
// compute's own parameters -- the exact typo this gate exists to catch. The
// count was printed and never pinned, so it could climb one tile at a time.
// Ratchet it: fix a signature and lower the budget, add unchecked surface and
// raise it deliberately.
//
// WHAT THE 30 ACTUALLY ARE (classified 2026-09-10; 28 functions, two of them
// carrying two fixtures each). The budget is mostly a STRUCTURAL FLOOR, not a
// backlog, and the earlier message -- "destructure the compute signature" --
// was impossible advice for 21 of the 28:
//
//   21  take NO PARAMETER AT ALL: `computeColorCodes()`, `computeSmokeReading()`,
//       `computeWaterReference()` and the rest of the reference tiles, which
//       return a static table. There is nothing to destructure and nothing to
//       compare a fixture key against; the `inputs` on those fixtures belong to
//       the renderer's own controls. NOT drainable.
//    3  dispatch on a SHAPE and take the dimensions as a rest param --
//       `computeArea({ shape, ...dims })`, `computeGeometry`,
//       `computeConcreteVolume`. Which keys are valid depends on the shape, so
//       no single destructuring lists them. NOT drainable without an API change.
//    4  take a SINGLE OPAQUE OBJECT and could be destructured today:
//       `computeHudFmr(input)`, `computeLoanLimits(input)`,
//       `computeRentalWorksheet(inputs)`, `computePvPerformanceRatio(inputs = {})`.
//       These are the only drainable ones, and draining them is a signature
//       change on live tiles, not a comment edit.
//
// So the floor is 26 fixtures. Lower the budget past that only by converting
// one of those four.
const SKIPPED_BUDGET = 30;
if (skipped > SKIPPED_BUDGET) {
  console.error(
    `check-fixture-keys FAILED: ${skipped} fixture(s) are unchecked (the compute takes no parameter, ` +
    `dispatches on a shape with a rest param, or takes a single opaque object), over a budget of ` +
    `${SKIPPED_BUDGET}: ${skippedTiles.sort().join(", ")}. If the new one takes a single opaque object, ` +
    `destructure it so its input keys are visible; a no-parameter reference tile cannot be checked here ` +
    `at all, so raise the budget deliberately and say which kind it is.`);
  process.exit(1);
}
// The names go in the FAILURE message and behind --verbose, not into every
// green run: thirty tile ids on a passing line is a wall in the CI log, and the
// disclosure the summary owes a reader is the count and the budget.
console.log(`check-fixture-keys OK: ${checked} fixture(s) checked; every input key matches a compute parameter. ` +
  `NOT checked here: ${skipped} fixture(s) -- 21 reference tiles whose compute takes NO parameter, 3 that ` +
  `dispatch on a shape through a rest param, and 4 that take a single opaque object and could be ` +
  `destructured (budget ${SKIPPED_BUDGET}, structural floor 26; --verbose lists them).`);
if (process.argv.includes("--verbose")) {
  console.log("  unchecked: " + skippedTiles.sort().join(", "));
}
