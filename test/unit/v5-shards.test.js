// Unit tests for the v5 data shards on disk.
// Verifies structural soundness of the bundled JSON: required fields,
// per-state verifiedOn, hash discipline.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadJson(rel) {
  return JSON.parse(await readFile(resolve(ROOT, rel), "utf8"));
}

function isIso(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }

// Manifests
for (const folder of ["accounting", "legal", "lab", "cross"]) {
  test("manifest " + folder + " has required v8 fields", async () => {
    const m = await loadJson("data/" + folder + "/manifest.json");
    assert.equal(m.name, folder);
    assert.ok(m.edition && m.edition.length > 10);
    assert.ok(isIso(m.asOf));
    assert.ok(isIso(m.fetched));
    assert.ok(Array.isArray(m.shards) && m.shards.length > 0);
    assert.ok(m.hashes && typeof m.hashes === "object");
    for (const s of m.shards) {
      assert.ok(s.file && s.name);
      assert.ok(m.hashes[s.file], "missing hash for " + s.file);
      assert.match(m.hashes[s.file], /^[0-9a-f]{64}$/);
    }
  });

  test("manifest " + folder + " hashes match shard contents", async () => {
    const m = await loadJson("data/" + folder + "/manifest.json");
    for (const s of m.shards) {
      const buf = await readFile(resolve(ROOT, "data/" + folder + "/" + s.file));
      const h = createHash("sha256").update(buf).digest("hex");
      assert.equal(h, m.hashes[s.file], "hash mismatch on " + folder + "/" + s.file);
    }
  });
}

// Accounting shards
test("accounting MACRS table has 6 class lives summing to 100%", async () => {
  const m = await loadJson("data/accounting/macrs-tables.json");
  for (const cls of ["3", "5", "7", "10", "15", "20"]) {
    const sum = m.tables[cls].reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 100) < 0.05, cls + "-yr sum was " + sum);
  }
});
test("accounting Section 179 covers 2023-2026", async () => {
  const m = await loadJson("data/accounting/section-179-limits.json");
  for (const yr of ["2023", "2024", "2025", "2026"]) {
    const r = m.by_year[yr];
    assert.ok(r.cap_usd > 1000000);
    assert.ok(r.phaseout_start_usd > r.cap_usd);
    assert.ok(r.bonus_pct >= 0 && r.bonus_pct <= 100);
  }
});
test("accounting SE-tax SS wage base monotonically increases", async () => {
  const m = await loadJson("data/accounting/se-tax-parameters.json");
  let prev = 0;
  for (const yr of ["2023", "2024", "2025", "2026"]) {
    const v = m.by_year[yr].ss_wage_base_usd;
    assert.ok(v > prev, yr + " (" + v + ") not greater than prev (" + prev + ")");
    prev = v;
  }
});
test("accounting due dates: 4 ISO entries per year", async () => {
  const m = await loadJson("data/accounting/estimated-tax-due-dates.json");
  for (const yr of Object.keys(m.by_year)) {
    assert.equal(m.by_year[yr].length, 4);
    for (const d of m.by_year[yr]) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d));
  }
});

// Legal shards
test("legal judgment-interest-rates: every state has rate, accrual, citation", async () => {
  const m = await loadJson("data/legal/judgment-interest-rates.json");
  assert.ok(isIso(m.by_state.verifiedOn));
  for (const [st, v] of Object.entries(m.by_state)) {
    if (st === "verifiedOn") continue;
    assert.ok(v.rate_pct > 0);
    assert.ok(["simple", "compound"].includes(v.accrual));
    assert.ok(v.citation);
  }
});
test("legal court-holidays cover 3 years with 10+ holidays each", async () => {
  const m = await loadJson("data/legal/court-holidays.json");
  for (const yr of ["2025", "2026", "2027"]) {
    assert.ok(m.federal[yr].length >= 10, yr + " has " + (m.federal[yr] || []).length + " holidays");
  }
});
test("legal statute-of-limitations: every state has 8 claim types", async () => {
  const m = await loadJson("data/legal/statute-of-limitations.json");
  const states = Object.keys(m.by_state).filter((k) => k !== "verifiedOn");
  assert.ok(states.length >= 5);
  for (const st of states) {
    assert.equal(Object.keys(m.by_state[st]).length, 8, st + " missing claim types");
  }
});
test("legal landlord-tenant-notice: every state has 4 notice types", async () => {
  const m = await loadJson("data/legal/landlord-tenant-notice.json");
  const states = Object.keys(m.by_state).filter((k) => k !== "verifiedOn");
  assert.ok(states.length >= 5);
  for (const st of states) {
    assert.equal(Object.keys(m.by_state[st]).length, 4);
  }
});
test("legal small-claims: every state has max_dollars + citation", async () => {
  const m = await loadJson("data/legal/small-claims.json");
  for (const [st, v] of Object.entries(m.by_state)) {
    if (st === "verifiedOn") continue;
    assert.ok(v.max_dollars > 0);
    assert.ok(v.citation);
    assert.ok(v.fee_range);
  }
});
test("legal state-minimum-wage: includes federal floor", async () => {
  const m = await loadJson("data/legal/state-minimum-wage.json");
  assert.ok(m.by_jurisdiction.FED);
  assert.equal(m.by_jurisdiction.FED.minimum_wage_usd, 7.25);
});
test("legal sales-tax-nexus: 10 starter states", async () => {
  const m = await loadJson("data/legal/sales-tax-nexus.json");
  const states = Object.keys(m.by_state).filter((k) => k !== "verifiedOn");
  assert.ok(states.length >= 10);
});

// Lab shards
test("lab IUPAC: H, C, N, O, S all present with positive weight", async () => {
  const m = await loadJson("data/lab/iupac-atomic-weights.json");
  for (const s of ["H", "C", "N", "O", "S", "Na", "Cl", "Fe", "Cu"]) {
    assert.ok(m.weights_g_per_mol[s] > 0, "missing " + s);
  }
});
test("lab buffer-pKa: 8 buffers with pKa + range + citation", async () => {
  const m = await loadJson("data/lab/buffer-pka.json");
  const buffers = Object.keys(m.buffers_at_25C);
  assert.ok(buffers.length >= 8);
  for (const b of buffers) {
    assert.ok(m.buffers_at_25C[b].pKa > 0);
    assert.ok(m.buffers_at_25C[b].citation);
  }
});
test("lab centrifuge-rotors: each rotor has manufacturer + radius", async () => {
  const m = await loadJson("data/lab/centrifuge-rotors.json");
  for (const v of Object.values(m.rotors)) {
    assert.ok(v.manufacturer);
    assert.ok(v.radius_mm > 0);
  }
});

// Cross
test("cross glossary covers all spec-required keys", async () => {
  const m = await loadJson("data/cross/glossary.json");
  for (const k of ["MACRS", "FICA", "Section_179", "molarity", "RCF", "pKa", "FLSA", "statute_of_limitations"]) {
    assert.ok(m.terms[k], "missing glossary key " + k);
  }
});
