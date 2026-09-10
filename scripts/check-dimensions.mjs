#!/usr/bin/env node
// spec-v14 §7 Phase C dimensional-analysis lint (scaffolding).
//
// Reads each calc-*.js and pure-math.js source, walks each export, and
// asserts the function carries a parseable `// dims:` annotation
// declaring the input dimensions and the output dimension per
// spec-v14 §7.1. Annotation format:
//
//   // dims: in { length_m: L, current_A: I, ambient_C: T }
//   //        out: voltage_drop_V: M L^2 T^-3 I^-1
//
// Dimension grammar (SI base codes per spec-v14 §7.1):
//
//   - L (length), M (mass), T (time OR temperature; the spec uses T
//     for both per the ASCII shortcut), I (current), N (amount),
//     J (luminous intensity), or the literal `dimensionless` /
//     `dimensionless`.
//   - Products are written with spaces or `*`: `L^2 T^-3 I^-1`.
//   - Ratios are written with `/` (parsed left-to-right): `L^2 / T`.
//   - Powers are integer exponents written with `^`: `L^2`, `T^-3`.
//
// Behavior:
//   FAIL (exit 1):
//     - A function carries a `// dims:` line that does not parse
//       (malformed input list, missing `out:` line, unknown dimension
//       token).
//   WARN (does not fail; scaffolding):
//     - A function has no annotation. The spec-v14 §7.1 contract is
//       "every calculator carries a one-line dimension annotation",
//       but the per-function annotation rollout is incremental: this
//       scaffolding seeds the annotation on the pure-math primitives
//       and warns on the gap; once coverage exceeds the spec-v14 §16.2
//       Phase C ratchet (corpus + annotation in lockstep), the warning
//       graduates to a hard fail in the same way the v10 worked-
//       examples lint did.
//
// The lint is conservative: it does not verify floating-point math
// (CAS would be a third-party dependency); it verifies the dimensional
// skeleton at the source level so a unit-system mismatch between an
// input and the expression it feeds surfaces here.
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["pure-math.js"]; // calc-*.js files appended below.

// SI base-dimension tokens per spec-v14 §7.1.
const VALID_DIM_TOKENS = new Set(["L", "M", "T", "I", "N", "J", "dimensionless"]);

function parseDimensionExpression(expr) {
  // Returns { ok: bool, tokens: [...], message?: string }.
  // The grammar is "term ( (sp|*|/) term )*" where term is
  // "<base>" or "<base>^<int>".
  const t = expr.trim();
  if (t === "" || t === "_") return { ok: false, message: "empty dimension expression" };
  if (t === "dimensionless") return { ok: true, tokens: ["dimensionless"] };
  // Split on whitespace, `*`, `/`. The lint does not balance ratios
  // (Phase C scaffolding); it asserts every term parses to a known
  // base with an optional integer exponent.
  const parts = t.split(/[\s*/]+/).filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^([A-Za-z]+)(?:\^(-?\d+))?$/);
    if (!m) return { ok: false, message: "unparseable term '" + p + "'" };
    if (!VALID_DIM_TOKENS.has(m[1])) {
      return { ok: false, message: "unknown dimension base '" + m[1] + "' in '" + p + "' (valid: " + [...VALID_DIM_TOKENS].join(", ") + ")" };
    }
  }
  return { ok: true, tokens: parts };
}

function parseDimsAnnotation(text) {
  // Accepts three flavors:
  //   // dims: in { a: L, b: T } out: x: L^2                       (single output)
  //   // dims: in { a: L, b: T } out: { x: L^2, y: T^-1 }          (multi-output)
  //   // dims: in { a: L, b: T }                                   (multi-line OK)
  //   //        out: { x: L^2, y: T^-1 }
  // Returns { ok: bool, inputs: [...], outputs: [{name, expr}], message? }.
  const flat = text.replace(/\s+/g, " ");
  // Multi-output form: out: { ... }.
  let inputsText = null, outputsText = null, singleOutput = null;
  const mMulti = flat.match(/dims:\s*in\s*\{([^}]*)\}\s*out:\s*\{([^}]*)\}/);
  if (mMulti) {
    inputsText = mMulti[1].trim();
    outputsText = mMulti[2].trim();
  } else {
    const mSingle = flat.match(/dims:\s*in\s*\{([^}]*)\}\s*out:\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^}]+?)$/);
    if (!mSingle) {
      return { ok: false, message: "annotation does not match `dims: in { ... } out: name: <expr>` or `out: { ... }` shape (got: " + text.slice(0, 80) + "...)" };
    }
    inputsText = mSingle[1].trim();
    singleOutput = { name: mSingle[2], expr: mSingle[3].trim() };
  }
  const inputs = [];
  if (inputsText && inputsText.length > 0) {
    for (const entry of inputsText.split(",")) {
      const e = entry.trim();
      if (e === "") continue;
      const im = e.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
      if (!im) return { ok: false, message: "input entry '" + e + "' does not match `name: <expr>` shape" };
      const dim = parseDimensionExpression(im[2]);
      if (!dim.ok) return { ok: false, message: "input '" + im[1] + "': " + dim.message };
      inputs.push({ name: im[1], expr: im[2].trim(), tokens: dim.tokens });
    }
  }
  const outputs = [];
  if (singleOutput) {
    const od = parseDimensionExpression(singleOutput.expr);
    if (!od.ok) return { ok: false, message: "output '" + singleOutput.name + "': " + od.message };
    outputs.push({ name: singleOutput.name, expr: singleOutput.expr, tokens: od.tokens });
  } else {
    for (const entry of outputsText.split(",")) {
      const e = entry.trim();
      if (e === "") continue;
      const om = e.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
      if (!om) return { ok: false, message: "output entry '" + e + "' does not match `name: <expr>` shape" };
      const od = parseDimensionExpression(om[2]);
      if (!od.ok) return { ok: false, message: "output '" + om[1] + "': " + od.message };
      outputs.push({ name: om[1], expr: om[2].trim(), tokens: od.tokens });
    }
    if (outputs.length === 0) {
      return { ok: false, message: "multi-output `out: { ... }` form requires at least one output" };
    }
  }
  return { ok: true, inputs, outputs };
}

// ---------------------------------------------------------------------------
// Unit-tail agreement (added 2026-09-10).
//
// The annotation above is hand-written, and a hand-written declaration drifts.
// This check reads the one thing in the source that independently states a
// quantity's units: the key's own NAME. `nozzle_pressure_psi` is a pressure
// whatever its `// dims:` entry says, so an entry reading `dimensionless` is
// not an opinion -- it is wrong, and the annotation is the only thing that
// knows it.
//
// This does NOT make the README's old "every formula is dimensionally
// consistent" claim true; it checks a DECLARATION against a NAME, never an
// expression against its declared dimensions. What it does catch is the class
// that made the annotation untrustworthy in the first place: `dimensionless`
// used as filler, and typos like `L^3 T^-1*T^-1` that the grammar parser
// accepts term by term.
//
// SCOPE IS DELIBERATELY NARROW. Only unit tails whose physical quantity is
// unambiguous are covered:
//
//   - pressure (psi, psig, psia)      - volumetric flow (gpm, mgd, cfh, cfm, gph, cfs, gpd)
//   - velocity (mph, fps, fpm)        - rotational speed (rpm)
//   - volume (gal, gallons, ft3)      - area (ft2, sf, in2)
//   - power (hp, kw, kva)
//
// NOT covered, and why -- each of these would produce a wrong verdict, so the
// gate stays silent rather than flattering itself with coverage it lacks:
//
//   - TIME tails (hr, hours, days, years, months, sec). Systematically
//     ambiguous: `burden_hr` and `rate_usd_hr` are dollars per hour, T^-1;
//     `theoretical_ac_hr` is acres per hour; `heating_degree_days` is a
//     temperature-time product; `discharge_ph_min` is a MINIMUM, not minutes.
//   - `lb` and `pcf`. Pounds are force in `load_lb` (14 of 16 uses) and mass in
//     `lb_per_ft3`; unit weight `gamma_pcf` is genuinely a force per volume.
//     A convention, not a physical fact -- not this gate's call.
//   - COMPOUND tails, detected by the segment in front of the tail being itself
//     a unit or `per`: `lb_per_gal`, `refrig_density_lb_gal`, `allowable_btuh_ft2`,
//     `leak_rate_torr_cfm`, `unit_load_va_ft2`.
//   - Keys carrying a money or rate word, which turn any tail into a per-unit
//     rate: `price_per_gal`, `daily_manure_ft3`.
// ---------------------------------------------------------------------------

const UNIT_TAIL_DIMS = new Map(Object.entries({
  psi: "M L^-1 T^-2", psig: "M L^-1 T^-2", psia: "M L^-1 T^-2",
  gpm: "L^3 T^-1", mgd: "L^3 T^-1", cfh: "L^3 T^-1", cfm: "L^3 T^-1",
  gph: "L^3 T^-1", cfs: "L^3 T^-1", gpd: "L^3 T^-1",
  mph: "L T^-1", fps: "L T^-1", fpm: "L T^-1",
  rpm: "T^-1",
  gal: "L^3", gallons: "L^3", ft3: "L^3",
  ft2: "L^2", sf: "L^2", in2: "L^2",
  hp: "M L^2 T^-3", kw: "M L^2 T^-3", kva: "M L^2 T^-3",
}));

// A segment that, sitting directly in front of the tail, means the tail is the
// denominator of a compound unit rather than the quantity itself.
const COMPOUND_PREV = new Set([
  ...UNIT_TAIL_DIMS.keys(),
  "per", "lb", "lbs", "oz", "ton", "tons", "btu", "btuh", "kwh", "lbf",
  "in", "ft", "mi", "ac", "amp", "amps", "v", "w", "va", "ug", "mg", "g", "kg",
  "usd", "torr", "degree", "hg", "pcf", "wage", "fringe", "rev",
  // time segments: a tail behind one of these is a per-time rate (`flux_btu_hr_ft2`).
  "hr", "hour", "hours", "min", "sec", "day", "days", "year", "years", "month", "months",
]);

const MONEY_OR_RATE = /(^|_)(usd|cost|price|rate|wage|fringe|rev|fee|daily|annual|hourly|monthly|weekly)(_|$)/;

// Documented exceptions: the name understates the quantity and the sibling key
// proves it. `computeManureStorageVolume` and `computeManureCoverSavings` take
// three per-day volumes alongside `daily_manure_ft3` and a `storage_days`
// multiplier; the three that omit `daily_` are the same daily rate.
const UNIT_TAIL_EXEMPT = new Set([
  "calc-agriculture.js:computeManureStorageVolume:wastewater_ft3",
  "calc-agriculture.js:computeManureStorageVolume:bedding_ft3",
  "calc-agriculture.js:computeManureCoverSavings:wastewater_ft3",
  "calc-agriculture.js:computeManureCoverSavings:bedding_ft3",
]);

function canonicalDimension(expr) {
  // Fold a parsed expression to a sorted base^exponent signature so
  // `M L^-1 T^-2` and `M/L/T^2` compare equal. Returns null if unparseable.
  const t = expr.trim();
  if (t === "dimensionless") return "1";
  const map = new Map();
  let sign = 1;
  for (const tok of t.split(/(\s+|\*|\/)/)) {
    if (!tok || /^\s+$/.test(tok)) continue;
    if (tok === "*") { sign = 1; continue; }
    if (tok === "/") { sign = -1; continue; }
    const m = tok.match(/^([A-Za-z]+)(?:\^(-?\d+))?$/);
    if (!m) return null;
    const e = (m[2] ? parseInt(m[2], 10) : 1) * sign;
    map.set(m[1], (map.get(m[1]) || 0) + e);
    sign = 1;
  }
  const parts = [...map.entries()].filter(([, e]) => e !== 0).sort((a, b) => a[0].localeCompare(b[0]));
  return parts.length ? parts.map(([b, e]) => b + "^" + e).join(" ") : "1";
}

function unitTailExpectation(key) {
  // Returns the canonical dimension the key's own name implies, or null when
  // the name does not unambiguously state one.
  const segs = key.toLowerCase().split("_");
  if (segs.length < 2) return null;
  const tail = segs[segs.length - 1];
  const prev = segs[segs.length - 2];
  if (!UNIT_TAIL_DIMS.has(tail)) return null;
  if (COMPOUND_PREV.has(prev)) return null;
  if (MONEY_OR_RATE.test(key.toLowerCase())) return null;
  return canonicalDimension(UNIT_TAIL_DIMS.get(tail));
}

// ---------------------------------------------------------------------------
// One key name, one dimension (added 2026-09-10).
//
// The unit-tail rule above only sees keys whose name spells a unit. This one
// needs no unit table: it asks whether the corpus contradicts ITSELF. If
// `rpm` is `T^-1` in fourteen functions and `dimensionless` in four, the four
// are wrong, and no physics knowledge is required to know it -- only that a
// name means one thing.
//
// It is the rule that catches what a unit table cannot. `alpha_per_f` is
// `T^-1` in one function and `dimensionless` in five: the MAJORITY was the
// wrong side, so a vote would have propagated the error. `tpi` (threads per
// inch, `L^-1`) was declared `T^-1` in four places and `dimensionless` in
// three -- wrong in all seven, and only visible because they disagreed.
//
// Two allowlists, both of which must stay honest.
// ---------------------------------------------------------------------------

// Names that genuinely denote different quantities in different trades. Each
// is a real collision, not a defect -- renaming them is the fix, and that is a
// bigger change than this gate.
const POLYMORPHIC_KEYS = new Map(Object.entries({
  a1: "a linear-system coefficient in calc-edu, a base-plate area in calc-steel",
  allowable: "an allowable area in calc-construction, an allowable depth in calc-lowvoltage",
  area: "a geometric area everywhere except computeHudFmr, where it is a metro area NAME",
  days: "a duration, except computeGrowingDegreeDays where it is a degree-day product",
  db: "a rebar diameter in concrete, a decibel in calc-stage (and dry-bulb elsewhere)",
  F: "degrees Fahrenheit in pure-math, magnetic field intensity in computeWMM",
  fv: "a future value (money) in accounting, an allowable shear stress in structural",
  governing: "which check governs (a label), except computePullBoxSizing where it is a length",
  gpa: "gallons per acre in agriculture, a grade point average in calc-edu",
  headroom: "a pressure headroom and a dimensionless margin",
  I: "electric current, and second moment of area in the beam tiles",
  j: "a polar moment of area, and a loop index",
  mo: "an overturning moment, and a month count",
  pa: "an active-earth-pressure resultant per unit width in geotech, an axial force in steel",
  rho: "a density in plumbing, Spearman's rho in calc-edu, a reinforcement ratio in masonry",
  slope: "a hydraulic gradient (dimensionless) in 12 uses, a capacity slope in computeHeatPumpColdCapacity",
  t_min: "a minimum wall thickness in pipefit, a minimum time in plumbing",
  target_fc: "a footcandle target; the luminous base J is dropped by every use",
  total_oz: "fluid ounces (volume) and weight ounces (mass)",
}));

// The pound is declared as a FORCE (`M L T^-2`) in some annotations and a MASS
// (`M`) in others, and `weight_lb` is split exactly 8 / 8. That is a repo-wide
// convention that has never been decided, not a typo: US customary `lb` is
// pounds-force for a load on a hook and pounds-mass in `lb_per_ft3`, and the
// corpus reflects both readings. `pcf` inherits the same split -- `density_pcf`
// is `M L^-3` while the geotech unit weight `gamma_pcf` is `M L^-2 T^-2`, and
// both are defensible.
//
// Deciding it means rewriting well over a hundred annotations one way, which is
// a maintainer's call, not this gate's. Until then these are named, counted and
// printed on every run rather than quietly waived.
const POUND_CONVENTION_UNSETTLED = new Set([
  "actual_weight_lb", "capacity_lb", "charge_weight_lb", "displacement_lb", "force_lb",
  "green_weight_lb", "guy_tension_lb", "gvw_lb", "load_lb", "margin_lb", "max_charge_lb",
  "payload_lb", "preload_lb", "reaction_lb", "required_wll_lb", "total_lb",
  "total_weight_lb", "tractive_effort_lb", "vehicle_weight_lb", "vs_fed_lb_day",
  "W_lb", "water_weight_lb", "wc_pcf", "weight_lb",
]);

// Single-letter and index-like names carry no quantity by themselves.
const UNQUALIFIED_KEYS = new Set([
  "a", "b", "c", "d", "e", "f", "g", "h", "k", "l", "m", "n", "p", "q", "r", "s", "t", "u",
  "v", "w", "x", "y", "z", "C", "n1", "n2", "v1", "v2", "x1", "x2", "y1", "y2", "c1", "c2",
  "d1", "d2", "t1", "t2", "p1", "p2", "r1", "r2", "w1", "w2", "e0", "mu", "nu", "gamma",
  "beta", "theta", "phi", "value", "load", "density", "temperature", "voltage", "size",
  "count", "total", "result", "nominal_size", "molecular_weight", "k_factor", "u_factor",
  "diametral_pitch", "pitch_rise",
]);

function checkKeyAgreement(keyDims, errors) {
  // keyDims: Map(key -> Map(canonical dimension -> [where, ...])).
  const stillSplit = [];
  for (const [key, byDim] of keyDims) {
    if (byDim.size < 2) continue;
    if (UNQUALIFIED_KEYS.has(key)) continue;
    if (POLYMORPHIC_KEYS.has(key)) { stillSplit.push(key + " (polymorphic)"); continue; }
    if (POUND_CONVENTION_UNSETTLED.has(key)) { stillSplit.push(key + " (pound convention)"); continue; }
    const variants = [...byDim.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([dim, where]) => where.length + "x `" + dim + "` (" + where.slice(0, 3).join(", ") + (where.length > 3 ? ", ..." : "") + ")");
    errors.push(
      "`" + key + "` is declared with " + byDim.size + " different dimensions: " + variants.join(" vs ") +
      ". One name means one quantity -- fix the wrong side, or rename the key. Do NOT take a vote: " +
      "`alpha_per_f` and `tpi` were both wrong on the majority side.",
    );
  }
  // An allowlist entry that no longer waives anything is a hole waiting for the
  // next collision, and this repo has shipped those before. Both lists ratchet:
  // once a key agrees with itself, its entry must go.
  const split = new Set([...keyDims.entries()].filter(([, d]) => d.size > 1).map(([k]) => k));
  for (const [key] of POLYMORPHIC_KEYS) {
    if (!split.has(key)) {
      errors.push("POLYMORPHIC_KEYS still lists `" + key + "`, but it now declares one dimension everywhere. Remove the entry.");
    }
  }
  for (const key of POUND_CONVENTION_UNSETTLED) {
    if (!split.has(key)) {
      errors.push("POUND_CONVENTION_UNSETTLED still lists `" + key + "`, but it now declares one dimension everywhere. Remove the entry.");
    }
  }
  return stillSplit;
}

// ---------------------------------------------------------------------------
// Stub annotations (added 2026-09-10).
//
// `// dims: in { args: dimensionless }` parses. It satisfies every rule above.
// It is also not an annotation: the function it sits on destructures a dozen
// named inputs, and the line declares none of them. 241 functions carried one,
// hiding roughly 1,960 named inputs, while this gate reported 100% coverage and
// the README's trust table said every function "declares each input's ... SI
// dimensions". For 241 of them that was false.
//
// These are NOT fixed here. Writing 1,960 dimensions in one pass is how the
// filler got in: the two rules above exist because 273 hand-written entries were
// wrong, and mass-producing another 1,960 unread would be the same mistake at
// six times the scale. The count is pinned instead and RATCHETS DOWN -- a new
// stub fails the build, and draining the list lowers the pin.
//
// 20 more functions take a single opaque argument and are not counted: there,
// `args` is the honest name of what the function receives.
// ---------------------------------------------------------------------------

const STUB_INPUT_NAMES = new Set(["args", "input", "opts", "options", "params", "o", "obj"]);

// Lower this as stubs are drained. It may never rise.
const STUB_BUDGET = 218;

function isStubAnnotation(fn) {
  if (!fn.parse || !fn.parse.ok) return false;
  if (fn.parse.inputs.length !== 1) return false;
  if (!STUB_INPUT_NAMES.has(fn.parse.inputs[0].name)) return false;
  // Only a stub if the function actually destructures named parameters. A
  // function whose parameter really is one opaque object is described correctly.
  return /^export\s+function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(\s*\{/.test(fn.signature || "");
}

function checkUnitTails(module, fnName, parse, errors, counters) {
  for (const [side, list] of [["input", parse.inputs], ["output", parse.outputs]]) {
    for (const entry of list) {
      const want = unitTailExpectation(entry.name);
      if (want === null) { counters.uncovered++; continue; }
      if (UNIT_TAIL_EXEMPT.has(module + ":" + fnName + ":" + entry.name)) { counters.exempt++; continue; }
      counters.covered++;
      const got = canonicalDimension(entry.expr);
      if (got !== want) {
        errors.push(
          module + ": " + fnName + ": " + side + " `" + entry.name + "` is named for a unit " +
          "whose dimension is `" + want + "`, but the annotation declares `" + entry.expr +
          "` (" + got + "). Fix the annotation, or rename the key if it is not that quantity.",
        );
      }
    }
  }
}

function extractFunctionsAndAnnotations(source, modulePath) {
  // Returns [{ name, hasAnnotation, annotationText?, parse? }, ...].
  // Each export `function NAME(` or `export const NAME =` is captured;
  // a preceding contiguous comment block is searched for a `// dims:`
  // line (multi-line `dims:` continuations on `//        out:` are
  // joined).
  const lines = source.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let nameMatch = line.match(/^export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (!nameMatch) {
      nameMatch = line.match(/^export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(/);
    }
    if (!nameMatch) continue;
    const name = nameMatch[1];
    // Walk back to find the contiguous comment block.
    let j = i - 1;
    const commentLines = [];
    while (j >= 0 && lines[j].match(/^\s*\/\//)) {
      commentLines.unshift(lines[j].replace(/^\s*\/\/\s?/, ""));
      j--;
    }
    // Locate the `dims:` line; the annotation runs from that line
    // through the line that closes `out:` (either single-output
    // `out: name: <expr>` or multi-output `out: { ... }`). Lines that
    // follow the annotation (e.g., parenthetical explanatory notes)
    // are excluded so the parser does not greedily consume them as
    // dimension tokens.
    let dimsLineIdx = -1;
    for (let k = 0; k < commentLines.length; k++) {
      if (commentLines[k].includes("dims:")) { dimsLineIdx = k; break; }
    }
    if (dimsLineIdx < 0) {
      out.push({ name, hasAnnotation: false, module: modulePath });
      continue;
    }
    // Walk forward from the dims line collecting annotation lines.
    // Stop at the first line that:
    //   - opens a parenthetical note (starts after whitespace with `(`),
    //   - is blank,
    //   - or follows a balanced `out: ...` line.
    const annotationLines = [];
    let sawOut = false;
    let braceDepth = 0;
    for (let k = dimsLineIdx; k < commentLines.length; k++) {
      const ln = commentLines[k];
      const stripped = ln.trim();
      if (stripped.startsWith("(")) break; // parenthetical note
      if (stripped === "") break;
      annotationLines.push(ln);
      for (const ch of ln) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
      }
      if (ln.includes("out:")) sawOut = true;
      if (sawOut && braceDepth === 0) break;
    }
    const annotation = annotationLines.join("\n");
    const parsed = parseDimsAnnotation(annotation);
    out.push({ name, hasAnnotation: true, annotationText: annotation, parse: parsed, module: modulePath, signature: line });
  }
  return out;
}

async function main() {
  // Append calc-*.js sources from the repo root.
  const entries = await readdir(ROOT);
  for (const f of entries.sort()) {
    if (f.startsWith("calc-") && f.endsWith(".js")) SOURCES.push(f);
  }

  let totalFunctions = 0;
  let annotated = 0;
  const tailCounters = { covered: 0, uncovered: 0, exempt: 0 };
  const keyDims = new Map();
  const stubs = [];
  const errors = [];
  const missing = [];
  for (const rel of SOURCES) {
    const path = resolve(ROOT, rel);
    const text = await readFile(path, "utf8");
    const fns = extractFunctionsAndAnnotations(text, rel);
    for (const fn of fns) {
      totalFunctions++;
      if (fn.hasAnnotation) {
        annotated++;
        if (!fn.parse.ok) {
          errors.push(rel + ": " + fn.name + ": " + fn.parse.message);
        } else {
          if (isStubAnnotation(fn)) stubs.push(rel + ": " + fn.name);
          checkUnitTails(rel, fn.name, fn.parse, errors, tailCounters);
          for (const [side, list] of [["in", fn.parse.inputs], ["out", fn.parse.outputs]]) {
            for (const entry of list) {
              const canon = canonicalDimension(entry.expr);
              if (canon === null) continue;
              if (!keyDims.has(entry.name)) keyDims.set(entry.name, new Map());
              const byDim = keyDims.get(entry.name);
              if (!byDim.has(canon)) byDim.set(canon, []);
              byDim.get(canon).push(rel + ":" + fn.name + "[" + side + "]");
            }
          }
        }
      } else {
        missing.push(rel + ": " + fn.name);
      }
    }
  }
  const pct = totalFunctions > 0 ? (annotated / totalFunctions) * 100 : 0;
  console.log(
    "dimensional-analysis: " + annotated + " / " + totalFunctions +
    " functions annotated (" + pct.toFixed(1) + "%) across " + SOURCES.length + " module(s).",
  );
  console.log(
    "unit-tail agreement: " + tailCounters.covered + " keys checked against the unit in " +
    "their own name, " + tailCounters.exempt + " exempt, " + tailCounters.uncovered +
    " NOT covered (time tails, lb/pcf, compound tails, money and rate keys -- see the " +
    "scope comment in this file for why each would return a wrong verdict).",
  );

  // Graduation is COMPLETE. pure-math.js went fail-on-missing at the
  // 2026-05-19 Phase C close and the calc-*.js modules followed one at a time,
  // each as its coverage closed, against a hand-listed GRADUATED_MODULES set.
  // On 2026-08-30 that set held 48 of the 58 modules while coverage stood at
  // 2,059 of 2,059 functions -- so ten modules (calc-rigging, calc-gas,
  // calc-pipefit, calc-motor, calc-shop, calc-fab, calc-earthwork,
  // calc-layout, calc-lowvoltage, calc-metalair) were fully annotated and
  // still exempt, and a new unannotated export in any of them would have
  // warned rather than failed. The list is gone rather than completed: an
  // allowlist that names every module is a hole waiting for module 59.
  for (const gm of missing) {
    errors.push(gm + " is missing its dims annotation (fail-on-missing for every module per spec-v14 §16.2 Phase C ratchet).");
  }

  // What this gate is FOR, held where a reader meets it. The README's trust
  // table promised "every formula is dimensionally consistent" -- a property of
  // the arithmetic that nothing here establishes. This lint parses the `// dims:`
  // annotation and fails a malformed one; a function may declare `out: L/T`,
  // compute something with dimensions of L/T^2, and pass. The docstring above has
  // always said so ("it does not verify floating-point math"); the README did not.
  console.log(
    "stub annotations: " + stubs.length + " function(s) declare a single opaque input " +
    "(`args`) while destructuring named parameters -- an annotation that parses and says " +
    "nothing. Budget " + STUB_BUDGET + "; this number may only go DOWN.",
  );
  if (stubs.length > STUB_BUDGET) {
    for (const st of stubs.slice(0, 10)) errors.push("stub `// dims: in { args: ... }` on " + st + ", which destructures named parameters.");
    errors.push(
      "stub-annotation count rose to " + stubs.length + " against a budget of " + STUB_BUDGET +
      ". Declare the function's real inputs; do not add another `args` stub.",
    );
  } else if (stubs.length < STUB_BUDGET) {
    errors.push(
      "stub-annotation count fell to " + stubs.length + " (budget " + STUB_BUDGET +
      "). Lower STUB_BUDGET in this file to " + stubs.length + " so the ratchet holds.",
    );
  }

  const stillSplit = checkKeyAgreement(keyDims, errors);
  console.log(
    "key agreement: " + keyDims.size + " distinct key names, " + stillSplit.length +
    " still declared two ways and named as such (" +
    stillSplit.filter((k) => k.endsWith("(pound convention)")).length +
    " of them the undecided pound convention, " +
    stillSplit.filter((k) => k.endsWith("(polymorphic)")).length +
    " genuine name collisions). Any name not on those lists must mean one quantity.",
  );

  const readmeText = await readFile(resolve(ROOT, "README.md"), "utf8");
  const row = readmeText.split("\n").find((l) => l.includes("`check-dimensions`"));
  if (row) {
    if (/every formula is dimensionally consistent/i.test(row)) {
      errors.push(
        "README.md says check-dimensions proves every formula is dimensionally " +
        "consistent. It parses the // dims: annotation and fails a malformed one; " +
        "it never checks an expression against its declared dimensions.",
      );
    }
    // The two counts in that row are live values, so they rot the moment a
    // module lands. Hold them here rather than trusting a future editor: this
    // repo has shipped a stale README count in this exact row before (it said
    // 2,059 functions against a live 2,337 for long enough that nobody knew).
    const stated = [...row.matchAll(/(\d[\d,]*)/g)].map((m) => Number(m[1].replace(/,/g, "")));
    if (!stated.includes(totalFunctions)) {
      errors.push(
        "README.md's check-dimensions row does not state the live function count (" +
        totalFunctions.toLocaleString("en-US") + "). Found: " +
        (stated.length ? stated.join(", ") : "no number at all") + ".",
      );
    }
    if (!stated.includes(tailCounters.covered)) {
      errors.push(
        "README.md's check-dimensions row does not state the live unit-tail count (" +
        tailCounters.covered.toLocaleString("en-US") + "). Found: " +
        (stated.length ? stated.join(", ") : "no number at all") + ".",
      );
    }
    if (!stated.includes(stubs.length)) {
      errors.push(
        "README.md's check-dimensions row does not state the live stub count (" +
        stubs.length + "). The row claims every function declares its inputs; " +
        stubs.length + " of them declare a single opaque `args` instead.",
      );
    }
    if (!stated.includes(stillSplit.length)) {
      errors.push(
        "README.md's check-dimensions row does not state the live count of names still " +
        "declared two ways (" + stillSplit.length + "). Found: " +
        (stated.length ? stated.join(", ") : "no number at all") + ".",
      );
    }
    if (!/annotat|declar/i.test(row)) {
      errors.push(
        "README.md's check-dimensions row does not say it checks a declaration. " +
        "Describe the annotation, not a property of the arithmetic nobody verifies.",
      );
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(
      "v14 dimensional-analysis lint FAILED with " + errors.length + " error(s).",
    );
    process.exit(1);
  }
  console.log(
    "v14 dimensional-analysis lint OK (fail-on-missing across all " + SOURCES.length +
    " modules per spec-v14 §16.2 Phase C ratchet; graduation complete 2026-08-30).",
  );
}

await main();
