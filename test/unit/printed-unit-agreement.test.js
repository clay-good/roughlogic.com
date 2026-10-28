// A bespoke output key states its unit in its own name -- `lift_ft`,
// `flow_gpm`, `time_to_80_hr` -- and BESPOKE_OUTPUT_UNITS states a unit a
// second time as the suffix the shell prints beside the answer. The two are
// allowed to differ: ev-dcfc-time holds hours and prints minutes. What makes
// that honest is the `scale` the fixture carries with it.
//
// check-dimensions holds the key name against the `// dims:` annotation, and
// so catches a key named for the wrong QUANTITY. Nothing held the printed
// suffix against the key, so a key could read `_hr`, print " min" and carry no
// scale -- the same number under a label sixty times too small, with every
// gate green.
//
// The sweep that proposed this test compared 627 output lines and found no
// unscaled mismatch; the two it flagged are its own misreadings of a key (see
// EXEMPT). It is a ratchet, not a repair.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BESPOKE_OUTPUT_UNITS } from "../fixtures/bespoke-output-units.js";

// A key's trailing token -> the unit it names.
const NAMED = Object.freeze({
  ft: "ft", feet: "ft", in: "in", inch: "in", inches: "in", mm: "mm", cm: "cm", mi: "mi", yd: "yd",
  sqft: "ft^2", sf: "ft^2", ft2: "ft^2", in2: "in^2", sqin: "in^2", m2: "m^2", mm2: "mm^2", acres: "acres", acre: "acres",
  cuft: "ft^3", cf: "ft^3", ft3: "ft^3", in3: "in^3", cuin: "in^3", cy: "yd^3", yd3: "yd^3", gal: "gal",
  lb: "lb", lbs: "lb", kg: "kg", tons: "tons", ton: "tons", oz: "oz",
  psi: "psi", ksi: "ksi", psf: "psf", kpa: "kPa", bar: "bar",
  gpm: "gpm", cfm: "cfm", gph: "gph", cfs: "cfs", mgd: "mgd", lpm: "lpm", scfm: "scfm",
  a: "A", amps: "A", ma: "mA", v: "V", kv: "kV", mv: "mV",
  w: "W", kw: "kW", hp: "hp", mw: "MW", btu: "Btu", kwh: "kWh",
  f: "F", c: "C", k: "K", db: "dB",
  min: "min", sec: "s", hr: "hr", hours: "hr", hrs: "hr", days: "days", yr: "yr", years: "yr",
});
// A printed suffix -> the same vocabulary.
const PRINTED = Object.freeze({
  "ft": "ft", "feet": "ft", "in": "in", "inch": "in", "inches": "in", "mm": "mm", "cm": "cm", "mi": "mi", "yd": "yd",
  "ft^2": "ft^2", "sq ft": "ft^2", "sf": "ft^2", "in^2": "in^2", "sq in": "in^2", "m^2": "m^2", "mm^2": "mm^2", "acres": "acres", "ac": "acres",
  "ft^3": "ft^3", "cu ft": "ft^3", "cf": "ft^3", "in^3": "in^3", "cu in": "in^3", "cy": "yd^3", "cu yd": "yd^3", "yd^3": "yd^3", "gal": "gal",
  "lb": "lb", "lbs": "lb", "kg": "kg", "tons": "tons", "ton": "tons", "oz": "oz",
  "psi": "psi", "ksi": "ksi", "psf": "psf", "kpa": "kPa", "bar": "bar",
  "gpm": "gpm", "cfm": "cfm", "gph": "gph", "cfs": "cfs", "mgd": "mgd", "lpm": "lpm", "scfm": "scfm",
  "a": "A", "amps": "A", "ma": "mA", "v": "V", "kv": "kV", "mv": "mV",
  "w": "W", "kw": "kW", "hp": "hp", "mw": "MW", "btu": "Btu", "kwh": "kWh",
  "f": "F", "c": "C", "k": "K", "db": "dB",
  "min": "min", "sec": "s", "s": "s", "hr": "hr", "h": "hr", "hours": "hr", "days": "days", "yr": "yr", "years": "yr",
});

// Keys whose trailing token is a word, not a unit. Both print correctly; the
// heuristic is what is wrong about them.
const EXEMPT = new Set([
  "pipe-pressure-rating.t_min",   // minimum wall thickness, not minutes
  "standing-water.cubic_feet",    // "cubic feet" is the volume, read whole
]);

export function unscaledMismatches(table) {
  const out = [];
  let compared = 0;
  for (const [tile, keys] of Object.entries(table)) {
    for (const [key, spec] of Object.entries(keys)) {
      if (EXEMPT.has(tile + "." + key)) continue;
      const named = NAMED[(key.split("_").pop() || "").toLowerCase()];
      if (!named) continue;
      // Judge only a suffix that is a bare unit; one carrying prose
      // ("A (1.25x load)", "oz concentrate") says more than a unit does.
      const suffix = String(spec.suffix || "").trim();
      const printed = PRINTED[suffix.toLowerCase()];
      if (!printed) continue;
      compared++;
      if (printed === named) continue;
      // Differing is fine when the fixture says the number is converted.
      if (Number.isFinite(spec.scale) && spec.scale !== 1) continue;
      out.push(`${tile} ${key}: named ${named}, prints "${suffix}" (${printed}), no scale`);
    }
  }
  return { compared, out };
}

test("a bespoke output prints its key's unit, or declares the scale that converts it", () => {
  const { compared, out } = unscaledMismatches(BESPOKE_OUTPUT_UNITS);
  assert.ok(compared > 600, "only " + compared + " output lines were comparable; the fixture did not load");
  assert.deepEqual(out, []);
});

test("the check is seeded red", () => {
  const bare = (suffix, extra) => ({ "seed-tile": { time_to_80_hr: { prefix: "", suffix, digits: 1, ...extra } } });
  // The failure it exists for: hours printed as minutes with nothing converting them.
  assert.equal(unscaledMismatches(bare(" min")).out.length, 1);
  // The same line with the conversion declared is what the catalog actually does.
  assert.equal(unscaledMismatches(bare(" min", { scale: 60 })).out.length, 0);
  // scale: 1 converts nothing, so it does not excuse the mismatch.
  assert.equal(unscaledMismatches(bare(" min", { scale: 1 })).out.length, 1);
  // Agreeing units pass, and a suffix carrying prose is deliberately not judged.
  assert.equal(unscaledMismatches(bare(" hr")).out.length, 0);
  assert.equal(unscaledMismatches(bare(" min of charging")).out.length, 0);
});

// The same two-surface question on the other side of the key. The check above
// compares the printed suffix with the KEY NAME, so it is blind to a key whose
// name carries no unit -- and that is where `half_life_hr` hid, printing "hr"
// while declaring `dimensionless`. This compares the printed suffix with the
// `// dims:` annotation instead, which has no such blind spot.
import { declaredDimensions, canonicalDim as canon } from "../fixtures/declared-dims.js";

const PRINTED_DIM = Object.freeze({
  ft: "L", in: "L", mm: "L", cm: "L", mi: "L", yd: "L",
  "ft^2": "L^2", "sq ft": "L^2", "in^2": "L^2", "m^2": "L^2", acres: "L^2",
  "ft^3": "L^3", "cu ft": "L^3", "in^3": "L^3", "cu yd": "L^3", "yd^3": "L^3", gal: "L^3", ml: "L^3", cy: "L^3",
  psi: "M L^-1 T^-2", psig: "M L^-1 T^-2", psf: "M L^-1 T^-2", ksi: "M L^-1 T^-2", kpa: "M L^-1 T^-2", atm: "M L^-1 T^-2",
  gpm: "L^3 T^-1", cfm: "L^3 T^-1", cfs: "L^3 T^-1", gph: "L^3 T^-1", gpd: "L^3 T^-1", mgd: "L^3 T^-1", scfm: "L^3 T^-1",
  a: "I", amps: "I", v: "M L^2 T^-3 I^-1", kv: "M L^2 T^-3 I^-1",
  w: "M L^2 T^-3", kw: "M L^2 T^-3", hp: "M L^2 T^-3", "btu/h": "M L^2 T^-3",
  btu: "M L^2 T^-2", kwh: "M L^2 T^-2",
  hr: "T", hours: "T", min: "T", minutes: "T", sec: "T", days: "T", yr: "T", years: "T",
  mph: "L T^-1", fpm: "L T^-1", fps: "L T^-1", rpm: "T^-1", hz: "T^-1", "mg/l": "M L^-3",
});

// Each is the printed line reading correctly for a reason the comparison
// cannot see.
const DIM_EXEMPT = new Map([
  ["drying-times.typical_days", "a STRING range -- \"2-4\", \"5-10+\" -- not a number with a unit"],
  ["septic-dose-tank.pumped_per_day", "the per-day is in the output's label, \"Pumped per day\", so \"gal\" reads right"],
]);


export function printedVsDims(table, dims) {
  const bad = [];
  let compared = 0;
  for (const [tile, keys] of Object.entries(table)) {
    for (const [key, spec] of Object.entries(keys)) {
      if (DIM_EXEMPT.has(tile + "." + key)) continue;
      // A declared scale means the printed unit is deliberately not the key's.
      if (Number.isFinite(spec.scale) && spec.scale !== 1) continue;
      const want = PRINTED_DIM[String(spec.suffix || "").trim().toLowerCase()];
      if (!want) continue;
      const declared = dims.get(key);
      if (!declared || declared.size !== 1) continue;
      compared++;
      const got = [...declared][0];
      if (got !== canon(want)) bad.push(`${tile} ${key}: prints "${String(spec.suffix).trim()}", dims says ${got}`);
    }
  }
  return { compared, bad };
}

test("a bespoke output's printed unit agrees with its declared dimension", () => {
  const { compared, bad } = printedVsDims(BESPOKE_OUTPUT_UNITS, declaredDimensions());
  assert.ok(compared > 350, "only " + compared + " output lines were comparable; a fixture did not load");
  assert.deepEqual(bad, []);
});

test("the dimension check is seeded red", () => {
  const dims = new Map([["k", new Set(["1"])], ["ok", new Set(["T^1"])], ["split", new Set(["1", "T^1"])]]);
  assert.equal(printedVsDims({ t: { k: { suffix: " hr" } } }, dims).bad.length, 1);
  assert.equal(printedVsDims({ t: { ok: { suffix: " hr" } } }, dims).bad.length, 0);
  // A declared scale, and a key declared two ways, are both deliberately skipped.
  assert.equal(printedVsDims({ t: { k: { suffix: " hr", scale: 60 } } }, dims).bad.length, 0);
  assert.equal(printedVsDims({ t: { split: { suffix: " hr" } } }, dims).bad.length, 0);
});
