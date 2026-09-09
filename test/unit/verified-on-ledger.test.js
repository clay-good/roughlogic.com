import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ledgerVerifiedOn } from "../../scripts/check-verified-on-ledger.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");
const readJson = async (f) => JSON.parse(await readFile(resolve(ROOT, f), "utf8"));

test("the ledger, not the clock, stamps every tracked shard", async () => {
  const cycle = await readJson("scripts/sources-cycle.json");
  const tracked = ledgerVerifiedOn(cycle);
  assert.ok(tracked.size >= 8, "sources-cycle.json should name at least 8 shard files");
  for (const [file, { date }] of tracked) {
    const shard = await readJson(file);
    const stamp = shard.verified_on || shard.verifiedOn;
    assert.equal(stamp, date, file + " must carry the ledger's last_verified, not a build date");
  }
});

test("IRS Pub 15-T does not claim a verification it never had", async () => {
  // The shard stamped verified_on 2026-09-02 -- the day a refresh ran -- over
  // brackets it labels edition 2025, while the ledger recorded 2025-12-01.
  const shard = await readJson("data/accounting/pub-15-t-tables.json");
  const cycle = await readJson("scripts/sources-cycle.json");
  const row = cycle.annual_figures.find((r) => r.id === "irs-pub-15-t");
  assert.equal(shard.verified_on, row.last_verified);
  assert.equal(shard.verified_on, "2025-12-01");
  // `fetched` is a fact about the build and may move freely; the point of the
  // fix is that the two are allowed to differ.
  assert.match(shard.fetched, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(shard.fetched >= shard.verified_on);
});

test("the oldest verification wins when two ledger rows name one file", async () => {
  // loan-limits.json is named by both the FHFA and the HUD FHA rows. A file is
  // only as verified as its least-verified part.
  const tracked = ledgerVerifiedOn({
    annual_figures: [
      { id: "newer", where: "data/x/shared.json baseline.a_*", last_verified: "2026-09-02" },
      { id: "older", where: "data/x/shared.json baseline.b_*", last_verified: "2026-01-05" },
    ],
  });
  assert.deepEqual(tracked.get("data/x/shared.json"), { date: "2026-01-05", id: "older" });
});

test("where-parsing takes shard paths and ignores runtime constant names", () => {
  const tracked = ledgerVerifiedOn({
    annual_figures: [
      {
        id: "mileage",
        where: "data/crosswalks/irs-mileage.json; data/accounting/rates.json; IRS_RATE and MORE",
        last_verified: "2026-09-02",
      },
    ],
  });
  assert.deepEqual(
    [...tracked.keys()].sort(),
    ["data/accounting/rates.json", "data/crosswalks/irs-mileage.json"],
  );
});

test("the generator reads verified_on from the ledger and never from TODAY", async () => {
  const src = await readFile(resolve(ROOT, "scripts/build-data.mjs"), "utf8");
  assert.match(src, /const LEDGER_VERIFIED_ON = /, "generator must load the ledger");
  assert.match(
    src,
    /shard\.body\.verified_on = LEDGER_VERIFIED_ON\[ledgerKey\]/,
    "the write loop must override the body's stamp from the ledger",
  );
});

test("no manifest edition claims it was verified on the build date", async () => {
  // A prose claim that re-dates itself every refresh cannot be audited. The
  // twelve folder editions that interpolated TODAY now read from a committed
  // EDITION_VERIFIED map, so a build cannot advance them.
  const src = await readFile(resolve(ROOT, "scripts/build-data.mjs"), "utf8");
  const editionLines = src
    .split("\n")
    .filter((line) => /^\s*\{ folder: "[a-z-]+", edition: /.test(line));
  assert.ok(editionLines.length >= 12, "expected the DATASETS edition lines");
  for (const line of editionLines) {
    if (!/\+\s*TODAY\s*\+/.test(line)) continue;
    // One folder may: data/historical is genuinely materialized at build time,
    // and it says "built", which is a fact about the build. What must never be
    // clock-written is a claim that someone LOOKED -- "verified", "as of",
    // "Last revision".
    assert.match(
      line,
      /built " \+ TODAY/,
      "a manifest edition interpolates the build date into a verification claim: " +
        line.slice(0, 110),
    );
    assert.doesNotMatch(line, /(verified|Verified|as of|Last revision)[^"]*" \+ TODAY/, line.slice(0, 110));
  }
});

test("data/legal's manifest agrees with the stamps under it", async () => {
  // It read "Verified <build date>" while every shard beneath carried
  // 2025-01-15 -- contradicting a staleness warning the project already prints.
  const manifest = await readJson("data/legal/manifest.json");
  const shard = await readJson("data/legal/sales-tax-nexus.json");
  const oldest = shard.by_state.verifiedOn;
  assert.equal(oldest, "2025-01-15");
  assert.ok(
    manifest.edition.includes(oldest),
    "the legal manifest must name the date its shards actually carry, got: " + manifest.edition,
  );
});

test("the MACRS Table A-1 percentages are the published table", async () => {
  // Verified 2026-09-03 against Publication 946 (2025) page 70, half-year
  // convention. Statutory since 1986; these rows pin the exact table so a
  // regenerated shard cannot quietly differ from what was read.
  const shard = await readJson("data/accounting/macrs-tables.json");
  assert.equal(shard.convention, "half_year");
  assert.deepEqual(shard.tables["3"], [33.33, 44.45, 14.81, 7.41]);
  assert.deepEqual(shard.tables["5"], [20, 32, 19.2, 11.52, 11.52, 5.76]);
  assert.deepEqual(shard.tables["7"], [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46]);
  assert.deepEqual(shard.tables["10"], [10, 18, 14.4, 11.52, 9.22, 7.37, 6.55, 6.55, 6.56, 6.55, 3.28]);
  // The 15- and 20-year rows alternate on the last digit; a "tidied" table is
  // the failure mode these two assertions exist to catch.
  assert.deepEqual(shard.tables["15"].slice(6), [5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 2.95]);
  assert.equal(shard.tables["20"].at(-1), 2.231);
  assert.equal(shard.tables["20"].length, 21);
  // Each column sums to 100% of basis; a dropped or duplicated year shows here.
  for (const [life, rows] of Object.entries(shard.tables)) {
    const total = rows.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 100) < 0.02, life + "-year column sums to " + total + ", not 100");
  }
});

test("the estimated-tax due dates are the published 1040-ES schedule", async () => {
  // Verified 2026-09-03 against the 2026 Form 1040-ES.
  const shard = await readJson("data/accounting/estimated-tax-due-dates.json");
  assert.deepEqual(shard.by_year["2026"], ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"]);
  for (const [year, dates] of Object.entries(shard.by_year)) {
    assert.equal(dates.length, 4, year + " must carry four dates");
    // The fourth payment falls in January of the following year, and no
    // published due date lands on a weekend -- rollover is already applied.
    assert.ok(dates[3].startsWith(String(Number(year) + 1)), year + " 4th payment is next January");
    for (const d of dates) {
      const day = new Date(d + "T00:00:00Z").getUTCDay();
      assert.ok(day !== 0 && day !== 6, d + " is a weekend; IRS rollover was not applied");
    }
    assert.deepEqual([...dates].sort(), dates, year + " dates must be in order");
  }
});

test("the gate names the shards it does not govern", async () => {
  // A green summary that does not say what it skipped reads as full coverage.
  // Three shards stamp a verified_on no ledger row backs -- that fact belongs in
  // the gate's own output, not only in docs/data-sources.md. The stamps no
  // longer come from the build date (build-data.mjs carries the committed value
  // forward when content is unchanged); what is still missing is a ledger row
  // recording what a human actually checked.
  const src = await readFile(resolve(ROOT, "scripts/check-verified-on-ledger.mjs"), "utf8");
  assert.match(src, /UNGOVERNED_BUDGET = 3/, "the ungoverned count is ratcheted");
  assert.match(src, /NOT governed here/, "the OK line must name the uncovered set");
  // Author-original content is reported separately: it has no publisher, so a
  // ledger row cannot exist and counting it as unbacked is a category error.
  assert.match(src, /author-original/, "the OK line must separate author-original shards");
  // The paths compared must be repo-relative on both sides; comparing an
  // absolute walk against sources-cycle.json's relative keys matched nothing
  // and reported every stamped shard as ungoverned.
  assert.match(src, /relative\(ROOT, full\)/);
});

// The seven shards no ledger row covers -- the accounting trio, the cross
// glossary, and the three under lab/ -- stamped `verified_on: TODAY` on every
// `data:refresh`. A stamp written from the clock asserts a verification nobody
// performed, and one that moves on every run can never age into a recheck,
// which is the entire purpose of the field. build-data.mjs now carries the
// COMMITTED stamp forward whenever a shard's content is unchanged.
//
// This test exercises the carry-forward directly rather than re-running the
// generator, so it stays fast and does not write to the tree.
test("an unchanged shard carries its committed verification date forward", async () => {
  const { carryStamps } = await import("../../scripts/build-data.mjs");
  const file = resolve(ROOT, "data/lab/iupac-atomic-weights.json");
  const onDisk = await readJson("data/lab/iupac-atomic-weights.json");

  // Same content, but the generator stamped today's date on every run stamp.
  const regenerated = { ...onDisk, verified_on: "2099-01-01", fetched: "2099-01-01" };
  const carried = await carryStamps(file, regenerated);
  assert.ok(carried, "an unchanged shard must carry its stamp forward");
  assert.equal(carried.verified_on, onDisk.verified_on);
  // Only verified_on carries. `fetched` says when the generator ran, and on the
  // historical series calc-historical.test.js measures data staleness against
  // it -- freezing that would make a working detector vacuous.
  assert.equal(carried.fetched, undefined);

  // A shard whose DATA really changed must NOT keep the old date: it earns
  // today's, because the content was genuinely touched.
  const changed = {
    ...onDisk,
    verified_on: "2099-01-01",
    weights_g_per_mol: { ...onDisk.weights_g_per_mol, He: 4.0027 },
  };
  assert.equal(await carryStamps(file, changed), null);

  // A shard with no file on disk yet has nothing to carry.
  assert.equal(await carryStamps(resolve(ROOT, "data/lab/does-not-exist.json"), regenerated), null);
});

// data/cross/glossary.json has no publisher: its source is the project author's
// own plain-English definitions. "Add a ledger row recording what was actually
// checked" is therefore advice nobody can act on, yet it sat in the unbacked
// budget as though it were open maintainer work. Its six author-original
// siblings carry no date stamp at all; the glossary is the outlier.
//
// Deleting the stamp was the wrong fix -- data/cross holds only this shard, and
// check-manifests measures a folder's cadence from the verified_on stamps its
// shards carry, so removing it would have traded a false stamp for no annual
// review check at all. Instead the shard declares its provenance, the gate
// counts it separately, and the date is an explicit constant so the build clock
// cannot certify a review nobody performed.
test("author-original content is not counted as an unbacked publisher claim", async () => {
  const glossary = await readJson("data/cross/glossary.json");
  assert.equal(glossary.provenance, "author-original");
  // The date is the author's stated review date, NOT the build date. Adding the
  // provenance marker changed the shard's content, so the carry-forward could
  // not preserve it -- an explicit constant is what keeps it honest.
  assert.equal(glossary.verified_on, "2026-09-04");
  assert.match(glossary.source, /project author/i);

  // The stamp is still there, so data/cross still gets its cadence check.
  const manifest = await readJson("data/cross/manifest.json");
  assert.equal(manifest.refresh_cadence, "annual");
  assert.match(glossary.verified_on, /^\d{4}-\d{2}-\d{2}$/);

  // Every shard still in the unbacked budget has a real external publisher, so
  // the gate's advice is actionable for all of them.
  for (const f of [
    "data/accounting/inventory-benchmarks.json",
    "data/lab/buffer-pka.json",
    "data/lab/centrifuge-rotors.json",
  ]) {
    const shard = await readJson(f);
    assert.ok(shard.verified_on, f + " should still carry a stamp");
    assert.notEqual(shard.provenance, "author-original", f + " has a real publisher");
  }
});

// CIAAW publishes "Standard Atomic Weights 2024" -- the Atomic Weights 2021
// report with 2024 revisions to gadolinium, lutetium and zirconium. The shard
// declared edition 2021, and of the three revised elements the catalog bundles
// only zirconium, which was stale: 91.224 against the 2024 abridged value of
// 91.222(3). Verified 2026-09-09 on both ciaaw.org/atomic-weights.htm and
// ciaaw.org/abridged-atomic-weights.htm, and corrected in the shard and in the
// runtime copy in calc-lab.js, which must not drift from each other.
test("the bundled atomic weights are the 2024 edition, in both copies", async () => {
  const shard = await readJson("data/lab/iupac-atomic-weights.json");
  assert.equal(shard.edition, "2024");
  assert.equal(shard.weights_g_per_mol.Zr, 91.222);

  // The runtime module carries its own copy. Two copies of a constant is two
  // chances to be stale, so pin them together.
  const { IUPAC_ATOMIC_WEIGHTS } = await import("../../calc-lab.js");
  assert.equal(IUPAC_ATOMIC_WEIGHTS.Zr, shard.weights_g_per_mol.Zr);
  for (const [el, w] of Object.entries(shard.weights_g_per_mol)) {
    assert.equal(IUPAC_ATOMIC_WEIGHTS[el], w, el + " differs between the shard and calc-lab.js");
  }

  // Values the 2024 revision did NOT touch must be unchanged, at the
  // conventional value where the published figure is an interval.
  for (const [el, w] of Object.entries({ H: 1.008, C: 12.011, N: 14.007, O: 15.999, Cl: 35.45, Ar: 39.948, Pb: 207.2 })) {
    assert.equal(shard.weights_g_per_mol[el], w);
  }
});

// The centrifuge rotor table named the FA-45-30-11 as the 5424's rotor. That is
// the 5430's rotor; the 5424/5424R takes the FA-45-24-11. The radius was right
// and only the part number was wrong, so every answer was correct while the
// label pointed at a part that does not exist for that centrifuge.
//
// Each published speed/RCF pair implies its own radius through
// RCF = 1.118e-6 x r(mm) x rpm^2, which is what identifies whose radius 84 mm
// is: the FA-45-24-11 at 15,000 rpm and 21,130 x g gives 84.0 mm, while the
// FA-45-30-11 at 14,000 and 20,817 gives 95.0 mm.
test("the bundled rotor radii agree with each manufacturer's published RCF", async () => {
  const shard = await readJson("data/lab/centrifuge-rotors.json");
  const { CENTRIFUGE_ROTORS } = await import("../../calc-lab.js");

  // The 5424 row names the right part now.
  assert.equal(shard.rotors.eppendorf_5424_FA452411.part, "FA-45-24-11 (5424/5424R)");
  assert.equal(shard.rotors.eppendorf_5424_FA452411.radius_mm, 84);
  assert.equal(shard.rotors.eppendorf_5424_FA453011, undefined, "the 5430 part number is gone");

  // Two copies again: the shard and the runtime table must not drift.
  for (const [key, row] of Object.entries(shard.rotors)) {
    assert.ok(CENTRIFUGE_ROTORS[key], key + " missing from calc-lab.js");
    assert.equal(CENTRIFUGE_ROTORS[key].radius_mm, row.radius_mm, key + " radius differs");
    assert.equal(CENTRIFUGE_ROTORS[key].part, row.part, key + " part differs");
  }

  // Radii cross-checked against each manufacturer's published maximum speed and
  // RCF, verified 2026-09-09. Within 0.5 mm, which is the rounding the published
  // RCF figures themselves carry.
  const published = {
    eppendorf_5424_FA452411: { rpm: 15000, rcf: 21130 },
    beckman_JA10: { rpm: 10000, rcf: 17700 },
    beckman_JA20: { rpm: 20000, rcf: 48400 },
  };
  for (const [key, { rpm, rcf }] of Object.entries(published)) {
    const implied = rcf / (1.118e-6 * rpm * rpm);
    assert.ok(
      Math.abs(implied - shard.rotors[key].radius_mm) < 0.5,
      key + ": published " + rpm + " rpm / " + rcf + " x g implies " + implied.toFixed(1)
        + " mm, shard carries " + shard.rotors[key].radius_mm,
    );
  }
});

// docs/citation-freshness-ledger.md is the table a reader trusts, and nothing
// compared it to scripts/sources-cycle.json. The gate only asserted a row
// EXISTS. So the doc sat at "2024 (2027 voted, not published)" for the IMC and
// IFGC while the cycle file recorded both 2027 editions as published, and at a
// stale last-verified date for all four ICC rows.
//
// The edition comparison must LEAD, not merely contain: the offending row
// literally contains "2027" while asserting the opposite, so a substring test
// passes it. That hole was in the first version of this gate.
test("the human ledger table agrees with the cycle file", async () => {
  const cycle = await readJson("scripts/sources-cycle.json");
  const ledger = await readFile(resolve(ROOT, "docs/citation-freshness-ledger.md"), "utf8");
  const row = (id) => {
    const m = ledger.match(new RegExp("^\\|\\s*`" + id + "`\\s*\\|(.*)$", "m"));
    if (!m) return null;
    const cells = m[1].split("|").map((c) => c.trim());
    return { currentEdition: cells[2].replace(/\*/g, "").trim(), lastVerified: cells[3] };
  };
  for (const s of cycle.standards) {
    const r = row(s.id);
    assert.ok(r, s.id + " has no ledger row");
    if (s.current_edition) {
      assert.ok(
        r.currentEdition.startsWith(String(s.current_edition)),
        s.id + ": ledger says \"" + r.currentEdition + "\", cycle file says \"" + s.current_edition + "\"",
      );
    }
    if (s.last_verified) assert.equal(r.lastVerified, String(s.last_verified), s.id + " last-verified");
  }

  // The two editions that had actually published, pinned so the doc cannot
  // silently revert to claiming they had not.
  assert.ok(row("imc").currentEdition.startsWith("2027"));
  assert.ok(row("ifgc").currentEdition.startsWith("2027"));
  // ...and the two that genuinely had not, as of 2026-09-09.
  assert.ok(row("ibc").currentEdition.startsWith("2024"));
  assert.ok(row("ifc").currentEdition.startsWith("2024"));

  // A substring test would pass this string. startsWith must not.
  assert.ok(!"2024 (2027 voted, not published)".startsWith("2027"));

  // Every tracked standard carries a verification date. `wmm` was the one row
  // of fourteen without one, which is why the doc could print a date the cycle
  // file never recorded and no comparison above could run on it.
  for (const s of cycle.standards) {
    assert.ok(s.last_verified, s.id + " has no last_verified; nothing can measure that row");
  }
});
