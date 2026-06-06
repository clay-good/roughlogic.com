// v18 §2/§5 tile-contract stress sweep (shared library).
//
// Asserts the universal output invariants from spec-v18 §2 over every
// registered compute function, seeded from its worked-example fixture so
// the sweep uses real, source-verified inputs (a blind sweep would feed
// "abc" into an enum slot and flag a legitimate domain throw as a defect;
// seeding from the fixture confines the sweep to the numeric slots that
// actually matter). Imported by the contract test (node --test surface)
// and by scripts/check-tile-contract.mjs (the standing gate). No runtime
// dependency beyond node: builtins, per spec-v13's deterministic limit.
//
// Violations are returned as structured records and split into two tiers:
//
//   Tier 1 (crasher - never acceptable, gate hard-fails on any):
//     a throw, a non-object return, an impurity (C-2), an input mutation
//     (D-9), or a non-finite field on the CANONICAL, source-verified
//     fixture input (C-1 with real data). These are real bugs reachable
//     with real inputs; the gate fails on the first one.
//
//   Tier 2 (robustness backlog - ratcheted down over time, v18 §6):
//     a numeric slot driven to 0 / -1 / NaN / Infinity that leaks a
//     non-finite output field instead of returning {error} (C-3 on
//     synthetic inputs). The gate grandfathers a recorded baseline of
//     these and fails only on a regression (a NEW leak), matching the
//     v14 §16 ratchet convention.
//
// Hangs and OOMs (an unbounded loop or array driven by a perturbed input)
// cannot be caught in-process - they crash or never return. The gate runs
// this sweep inside a worker with a heap cap and a wall-clock timeout so a
// future regression that reintroduces one surfaces as a gate failure
// rather than an infinite CI hang.

import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { COMPUTE_MAP, importCalc } from "./compute-map.js";

const FIXTURE = new URL("./worked-examples.json", import.meta.url);

// Bad values injected into each finite-numeric input slot. These are the
// inputs a real user can produce: a cleared field (0), a sign typo (-1),
// a non-numeric paste (NaN), and a runaway magnitude (Infinity, e.g. the
// 1e999 a user can paste into a number field).
const BAD_NUMERICS = [0, -1, NaN, Infinity];

function deepFreeze(obj) {
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) deepFreeze(v);
    Object.freeze(obj);
  }
  return obj;
}

// Walk a result and collect the dotted paths of every NON-finite *number*
// (NaN / ±Infinity). Strings, booleans, null, and undefined are left
// alone: a null "not-applicable" field or a string verdict is legitimate;
// only a number that came out non-finite is the C-1 defect class (D-1).
function nonFiniteFields(value, path = "") {
  const bad = [];
  if (typeof value === "number") {
    if (!Number.isFinite(value)) bad.push(path || "(root)");
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => bad.push(...nonFiniteFields(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      bad.push(...nonFiniteFields(v, path ? `${path}.${k}` : k));
    }
  }
  return bad;
}

export async function loadFixtures() {
  const json = JSON.parse(await readFile(FIXTURE, "utf8"));
  return json.rows;
}

// Run the contract sweep over one fixture row. Returns an array of
// structured violation records: { tile, fn, tier, sig, message }.
// Pure: imports the module, never mutates the row.
export async function sweepRow(row) {
  const reg = COMPUTE_MAP[row.tile_id];
  if (!reg) return []; // not wired into the runner yet; coverage gate owns that.
  const out = [];
  const tag = `${row.tile_id} (${reg.fn})`;
  const t1 = (sig, message) => out.push({ tile: row.tile_id, fn: reg.fn, tier: 1, sig, message: `${tag}: ${message}` });
  const t2 = (sig, message) => out.push({ tile: row.tile_id, fn: reg.fn, tier: 2, sig, message: `${tag}: ${message}` });

  const mod = await importCalc(reg.module);
  const fn = mod[reg.fn];
  if (typeof fn !== "function") {
    t1(`${row.tile_id}::missing-export`, "missing compute export");
    return out;
  }

  const input = { ...row.inputs };

  // C-2 + C-1 on the canonical, source-verified input.
  const frozen = deepFreeze(structuredClone(input));
  let r1, r2;
  try {
    r1 = fn(frozen);
    r2 = fn(frozen);
  } catch (e) {
    t1(`${row.tile_id}::throws-canonical`, `throws on canonical fixture input - ${e.message}`);
    return out;
  }
  if (!r1 || typeof r1 !== "object") {
    t1(`${row.tile_id}::non-object-canonical`, `canonical input returned a non-object (${typeof r1})`);
    return out;
  }
  if (!isDeepStrictEqual(r1, r2)) {
    t1(`${row.tile_id}::impure`, "impure - two identical calls returned different results (C-2)");
  }
  if (!isDeepStrictEqual(input, row.inputs)) {
    t1(`${row.tile_id}::mutates`, "mutated its input argument (C-2/D-9)");
  }
  if (!r1.error) {
    const bad = nonFiniteFields(r1);
    if (bad.length) t1(`${row.tile_id}::canonical-leak`, `canonical input leaked non-finite field(s): ${bad.join(", ")} (C-1/D-1)`);
  }

  // C-3 domain-honesty sweep: drive each finite-numeric slot to each bad
  // value; the result must reject ({error}) or stay all-finite, never
  // throw (Tier 1), never leak a NaN/Infinity (Tier 2).
  for (const [key, val] of Object.entries(input)) {
    if (typeof val !== "number" || !Number.isFinite(val)) continue;
    for (const bad of BAD_NUMERICS) {
      const perturbed = { ...input, [key]: bad };
      let rr;
      try {
        rr = fn(perturbed);
      } catch (e) {
        t1(`${row.tile_id}::${key}::${String(bad)}::throw`, `throws when ${key}=${String(bad)} (C-1/C-3) - ${e.message}`);
        continue;
      }
      if (!rr || typeof rr !== "object") {
        t1(`${row.tile_id}::${key}::${String(bad)}::non-object`, `${key}=${String(bad)} returned a non-object (${typeof rr})`);
        continue;
      }
      if (!rr.error) {
        const leaked = nonFiniteFields(rr);
        if (leaked.length) t2(`${row.tile_id}::${key}::${String(bad)}`, `${key}=${String(bad)} leaked non-finite field(s): ${leaked.join(", ")} (C-1/C-3)`);
      }
    }
  }

  return out;
}

// Run the full sweep over every registered tile. Returns
// { records, tier1, tier2, ran, skipped } where records is the flat list
// and tier1/tier2 are the records filtered by severity.
export async function runContractSweep() {
  const rows = await loadFixtures();
  const records = [];
  let ran = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!COMPUTE_MAP[row.tile_id]) { skipped += 1; continue; }
    records.push(...(await sweepRow(row)));
    ran += 1;
  }
  return {
    records,
    tier1: records.filter((r) => r.tier === 1),
    tier2: records.filter((r) => r.tier === 2),
    ran,
    skipped,
  };
}
