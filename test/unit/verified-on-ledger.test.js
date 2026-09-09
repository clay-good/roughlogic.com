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
  // It read "Verified <build date>" while every shard beneath carried an older
  // date -- contradicting a staleness warning the project already prints.
  //
  // The assertion is the INVARIANT, not a literal date: it used to pin
  // "2025-01-15", which made a genuine re-verification pass look like a
  // regression. The rollup must equal the oldest row beneath it, and the
  // manifest edition must name that, whatever it currently is.
  const manifest = await readJson("data/legal/manifest.json");
  const shard = await readJson("data/legal/sales-tax-nexus.json");
  const oldest = shard.by_state.verifiedOn;
  const rowStamps = Object.values(shard.by_state)
    .filter((v) => v && typeof v === "object")
    .map((v) => v.verified_on)
    .sort();
  assert.match(oldest, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(oldest, rowStamps[0], "the rollup must be the oldest row stamp");
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
  assert.match(src, /UNGOVERNED_BUDGET = 0/, "the ungoverned count is ratcheted");
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
// The free-access probe used to read only citations.js -- the surface a READER
// follows. The cycle file's `free_access_url` is the surface a MAINTAINER
// follows to re-verify, and nothing looked at it: the NEC row pointed at
// nfpa.org/free-access, which 404s, while all 44 reader-facing NEC citations
// used nfpa.org/freeaccess, which resolves. The one URL nobody could see was
// the broken one.
test("every ledger free_access_url is an absolute http(s) URL the probe can reach", async () => {
  const cycle = await readJson("scripts/sources-cycle.json");
  const rows = [...(cycle.standards || []), ...(cycle.annual_figures || [])];
  let probed = 0;
  for (const row of rows) {
    const u = row.free_access_url;
    if (u === undefined) continue;
    assert.equal(typeof u, "string", (row.id || row.name) + ": free_access_url is not a string");
    // The probe only takes absolute http(s) values; a bare host or a relative
    // path would be skipped in silence, which is worse than not being there.
    assert.match(u, /^https?:\/\/[^\s"]+$/, (row.id || row.name) + ": free_access_url is not absolute");
    // The NFPA row's dead hyphenated variant must not come back.
    assert.ok(!u.includes("nfpa.org/free-access"), (row.id || row.name) + ": nfpa.org/free-access 404s; use /freeaccess");
    probed += 1;
  }
  assert.ok(probed >= 15, "expected most rows to carry a free_access_url, got " + probed);
});

// The probe is opt-in and hits the network, so this pins its shape rather than
// running it: it must still read both surfaces, and it must still judge a
// redirect's destination rather than only its status code.
test("check-free-access reads the cycle file and catches a soft 404", async () => {
  const src = await readFile(resolve(ROOT, "scripts/check-free-access.mjs"), "utf8");
  assert.match(src, /sources-cycle\.json/, "the probe no longer reads the ledger's URLs");
  assert.match(src, /free_access_url/, "the probe no longer collects free_access_url");
  assert.match(src, /SOFT_404/, "soft-404 detection is gone");
  assert.match(src, /notfound/i, "the soft-404 pattern no longer matches a not-found path");
});

// CF-05. `last_verified` is the field the machine reads -- CF-03 measures the
// recheck cadence from it and every shard's `verified_on` must equal it --
// while `verification_note` is the field a person reads. When somebody
// rechecks a source, writes the date in the note, and does not move the stamp,
// the machine keeps reading the older date and the note becomes the only
// record of the work. Five rows had drifted that way by 2026-09-09, the IBC
// and IFC each claiming a 2026-09-09 re-confirmation over a 2026-09-03 stamp.
//
// This asserts the invariant independently of the gate, so the two have to
// drift together to go unnoticed.
test("no ledger row claims a verification later than its own last_verified", async () => {
  const cycle = await readJson("scripts/sources-cycle.json");
  const rows = [...(cycle.standards || []), ...(cycle.annual_figures || [])];
  assert.ok(rows.length > 0);
  const verifyDate = /\b(?:re-?verified|re-?confirmed|verified|confirmed|re-?checked|checked|reviewed)\b[^.]{0,40}?\b(20\d{2}-\d{2}-\d{2})\b/gi;
  for (const row of rows) {
    const note = row.verification_note || "";
    const stamp = row.last_verified || "";
    if (!note || !stamp) continue;
    // A pass that reached something short of a verification says so in these
    // words; the phrase has to name the stamp it is defending, so a stale
    // opt-out left behind by a later re-stamp cannot silence anything.
    if (note.includes("last_verified stays " + stamp)) continue;
    const later = [...note.matchAll(verifyDate)].map((m) => m[1]).filter((d) => d > stamp);
    assert.deepEqual(
      later, [],
      (row.id || row.name) + ": note claims a check on " + later.join(", ") +
        " over last_verified " + stamp,
    );
  }
});

// The gate that enforces it must still be wired in, and its opt-out must still
// be the phrase the notes use.
test("check-citation-freshness carries the CF-05 note-versus-stamp check", async () => {
  const src = await readFile(resolve(ROOT, "scripts/check-citation-freshness.mjs"), "utf8");
  assert.match(src, /CF-05/, "the check is gone");
  assert.match(src, /last_verified stays/, "the opt-out phrase is gone");
});

// Every inventory-turnover benchmark was wrong at once: the year could not
// exist (ARTS's last data year is 2022, and the ASM has none for 2022 or 2023),
// the key called an industry AGGREGATE a median, the values did not reproduce,
// and two rows cited publishers that publish no such figure. Verified
// 2026-09-09 by recomputing turnover = COGS / average inventory from Census's
// own 2022 benchmarked tables, with COGS derived two independent ways.
test("each inventory-turnover benchmark is what Census's own 2022 tables compute", async () => {
  const shard = await readJson("data/accounting/inventory-benchmarks.json");
  const { INVENTORY_BENCHMARKS } = await import("../../calc-accounting.js");

  // [gross margin $M, gross margin % of sales, purchases $M, 2021 EOY inv $M,
  //  2022 EOY inv $M, bundled turnover]
  const arts2022 = {
    retail_general: [2169450, 31.1, 4887440, 644675, 726873, 7.0],
    grocery: [236421, 28.0, 613014, 44787, 49198, 12.9],
    apparel: [139400, 49.6, 147093, 44711, 50215, 3.0],
    auto_parts: [58144, 48.1, 65749, 21983, 24960, 2.7],
  };
  assert.deepEqual(Object.keys(arts2022).sort(), Object.keys(shard.benchmarks).sort());

  for (const [key, [gm, gmPct, purchases, inv2021, inv2022, bundled]] of Object.entries(arts2022)) {
    const row = shard.benchmarks[key];
    assert.equal(row.turnover_aggregate, bundled, key + " in the shard");
    assert.equal(row.year, 2022, key + " year");
    assert.equal(INVENTORY_BENCHMARKS[key].turnover_aggregate, bundled, key + " in calc-accounting.js");

    const avgInventory = (inv2021 + inv2022) / 2;
    // Route 1: COGS is sales less gross margin, and sales is the gross margin
    // over its own published percentage of sales.
    const cogsFromMargin = gm / (gmPct / 100) - gm;
    // Route 2: COGS is what was bought plus what came off the shelf.
    const cogsFromPurchases = purchases + inv2021 - inv2022;
    // The two routes are independent tables; they must agree closely.
    assert.ok(
      Math.abs(cogsFromMargin - cogsFromPurchases) / cogsFromMargin < 0.005,
      key + ": COGS routes disagree, " + cogsFromMargin.toFixed(0) + " vs " + cogsFromPurchases.toFixed(0),
    );
    for (const cogs of [cogsFromMargin, cogsFromPurchases]) {
      assert.ok(
        Math.abs(cogs / avgInventory - bundled) < 0.06,
        key + ": Census computes " + (cogs / avgInventory).toFixed(2) + ", bundled " + bundled,
      );
    }
  }

  // The two rows that cited a publisher publishing no such figure must not
  // come back: ARTS never covered food services, and the ASM has no 2023.
  for (const gone of ["restaurant_food", "manufacturing_general"]) {
    assert.equal(shard.benchmarks[gone], undefined, gone + " has no publisher to check");
    assert.equal(INVENTORY_BENCHMARKS[gone], undefined, gone + " in calc-accounting.js");
  }
});

// A buffer's pKa without its temperature is not a constant. The shard is keyed
// buffers_at_25C, but two of the four Good's buffers carried Good's own 20 C
// values (HEPES 7.55, MOPS 7.20) while the other two had already been carried
// across to 25 C. Verified 2026-09-09 against the 25 C column of PanReac
// AppliChem's Biological buffers IP-022EN, cross-checked by carrying Good's
// 20 C values over with the d(pKa)/dT that same table publishes.
test("the bundled buffer pKa values are 25 C values, in both copies", async () => {
  const shard = await readJson("data/lab/buffer-pka.json");
  const { BUFFER_PKA } = await import("../../calc-lab.js");

  // [pKa at 25 C, Good's 20 C pKa or null, d(pKa)/dT or null]
  const at25 = {
    Tris: [8.06, null, null],
    HEPES: [7.48, 7.55, -0.014],
    MES: [6.10, 6.15, -0.011],
    MOPS: [7.14, 7.20, -0.011],
    PIPES: [6.76, 6.80, -0.0085],
    phosphate: [7.20, null, null],
    acetate: [4.76, null, null],
    bicarbonate: [6.35, null, null],
  };
  assert.deepEqual(Object.keys(at25).sort(), Object.keys(shard.buffers_at_25C).sort());

  for (const [name, [pKa, good20, dpKadT]] of Object.entries(at25)) {
    assert.equal(shard.buffers_at_25C[name].pKa, pKa, name + " in the shard");
    assert.ok(BUFFER_PKA[name], name + " missing from calc-lab.js");
    assert.equal(BUFFER_PKA[name].pKa, pKa, name + " in calc-lab.js");
    assert.equal(BUFFER_PKA[name].useful_range, shard.buffers_at_25C[name].useful_range, name + " range");
    if (good20 === null) continue;
    // Good's own 20 C value, carried five degrees, must land on the bundled one.
    const carried = good20 + 5 * dpKadT;
    assert.ok(
      Math.abs(carried - pKa) < 0.01,
      name + ": Good's 20 C " + good20 + " carried by " + dpKadT + "/C gives "
        + carried.toFixed(3) + ", bundled " + pKa,
    );
  }
});

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
  // All six rows now, read 2026-09-09: three of them carried a radius that
  // belonged to a different rotor or a different bucket. The FA-45-6-30 read
  // 95 mm (the FA-45-30-11's), the A-4-81 read 162 mm (its MTP/Flex plate
  // bucket, not the buckets it ships with), and the Fiberlite read 137 mm
  // against a published 10.4 cm.
  const published = {
    eppendorf_5424_FA452411: { rpm: 15000, rcf: 21130 },
    eppendorf_5810_FA45630: { rpm: 12100, rcf: 20133 },
    eppendorf_5810_A48140: { rpm: 4000, rcf: 3220 },
    beckman_JA10: { rpm: 10000, rcf: 17700 },
    beckman_JA20: { rpm: 20000, rcf: 48400 },
    thermo_F15_8x50c: { rpm: 14500, rcf: 24446 },
  };
  // Every row is covered: an unchecked row must not be able to slip in.
  assert.deepEqual(Object.keys(published).sort(), Object.keys(shard.rotors).sort());
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

// The ledger's "not in the cycle table" section is where a reader looks to find
// what NOTHING watches. It listed seven sources; four of them had since become
// tracked rows -- FDA Food Code and the WMM in `standards`, the FHFA/HUD limits
// and the IRS current-year publications in `annual_figures` -- so the genuinely
// unwatched three were buried among four that were fine. Rows were added to
// sources-cycle.json without anyone editing the prose that claimed they were
// absent: the same update-one-surface-not-its-twin failure as the table above.
test("the untracked section does not name a source the cycle file tracks", async () => {
  const cycle = await readJson("scripts/sources-cycle.json");
  const ledger = await readFile(resolve(ROOT, "docs/citation-freshness-ledger.md"), "utf8");
  const heading = "## Verified current / well-disclosed, not in the cycle table";
  const start = ledger.indexOf(heading);
  assert.ok(start !== -1, "the untracked section is gone; update this test with it");
  // The claim itself is the first paragraph after the heading; the explanation
  // that follows deliberately names the four that graduated out of it.
  const body = ledger.slice(start + heading.length);
  const claim = body.split("\n\n").slice(0, 2).join("\n\n");

  // A distinctive token per tracked source. If the claim paragraph names one,
  // it is asserting that nothing watches something that is watched.
  const tracked = [
    ["fda-food-code", "FDA Food Code"],
    ["wmm", "WMM"],
    ["fhfa-conforming-loan-limit", "FHFA"],
    ["irs-standard-mileage", "IRS current-year"],
  ];
  const ids = new Set([...cycle.standards, ...(cycle.annual_figures || [])].map((r) => r.id));
  for (const [id, token] of tracked) {
    assert.ok(ids.has(id), id + " should still be a tracked row");
    assert.ok(
      !claim.includes(token),
      "the untracked section names \"" + token + "\", but " + id + " IS tracked in sources-cycle.json",
    );
  }

  // The three that genuinely are not tracked must still be listed, or the
  // section has quietly stopped telling anyone what is unwatched.
  for (const token of ["NFPA 14", "NFPA 70E", "IICRC S520"]) {
    assert.ok(claim.includes(token), "the untracked section no longer lists " + token);
  }
});

// The "disclosed-lag" mechanism only works if the disclosure actually DISCLOSES
// the lag. IRC and IPC named the newer edition; IBC and IFGC named only OLDER
// ones ("Older IBC editions reference ASCE 7-16 / 7-10", "Jurisdictions on
// earlier editions"), which tells a reader the bundled 2021 is the newest there
// is. The ledger's Dispositions section meanwhile claimed all four "already
// name 2024 as the newer adopted edition" -- true for two of them.
//
// A disclosure is a third surface on the same fact, so pin it to the edition
// sources-cycle.json records.
test("each I-code disclosure names the current published edition", async () => {
  const cycle = await readJson("scripts/sources-cycle.json");
  const citations = await readFile(resolve(ROOT, "citations.js"), "utf8");
  const disclosure = (name) => {
    const m = citations.match(new RegExp("^const " + name + "_DISCLOSURE = \"([^\"]+)\"", "m"));
    return m ? m[1] : null;
  };
  const byId = Object.fromEntries(cycle.standards.map((r) => [r.id, r]));

  for (const [id, constName] of [["irc", "IRC"], ["ibc", "IBC"], ["ipc", "IPC"], ["ifgc", "IFGC"], ["nec", "NEC"]]) {
    const text = disclosure(constName);
    assert.ok(text, constName + "_DISCLOSURE not found");
    const current = String(byId[id].current_edition);
    assert.ok(
      text.includes(current),
      constName + "_DISCLOSURE never names the current edition " + current +
        ", so a reader cannot tell how far behind the bundled values are: \"" + text + "\"",
    );
    // ...and it must still say what IS bundled, or the disclosure is only half of one.
    assert.match(text, /bundled values follow/, constName + "_DISCLOSURE must say what is bundled");
  }

  // The two that were wrong, pinned by name so they cannot regress quietly.
  assert.match(disclosure("IBC"), /IBC 2024 is the current published edition/);
  assert.match(disclosure("IFGC"), /IFGC 2027 is the current published edition/);
});

// docs/data-sources.md described the sales-tax nexus re-verification in two
// adjacent bullets. The 2026-09-03 bullet said "the remaining 33 rows keep
// verified_on: 2025-01-15" and pointed the next maintainer at seven rows. A
// second pass on 2026-09-04 read 29 more, leaving four -- the cadence bullet
// below and the manifest's GENERATED staleness_note were both updated, the
// hand-written sentence above them was not. Four of the seven it sent you to
// had already been read, and CO, which had not, was missing from the list.
//
// The prose that tells a maintainer where to look must match the stamps.
test("the nexus doc's stale-row claim matches the shard", async () => {
  const shard = await readJson("data/legal/sales-tax-nexus.json");
  const rows = Object.entries(shard.by_state).filter(([, v]) => v && typeof v === "object");
  const stale = rows.filter(([, v]) => v.verified_on === "2025-01-15").map(([k]) => k).sort();

  // 47 state rows (46 sales-tax states plus DC), which is what the docs claim.
  assert.equal(rows.length, 47);
  assert.deepEqual(stale, []);

  const doc = await readFile(resolve(ROOT, "docs/data-sources.md"), "utf8");
  // The live count and the live list, both stated.
  // The doc must keep stating the staleness in the shape check-manifests parses,
  // pointed at whatever the OLDEST cohort now is -- the gate fails rather than
  // going blind if that sentence disappears.
  const m = doc.match(/(\d+) of the (\d+) rows still carry `verified_on` (\d{4}-\d{2}-\d{2})/);
  assert.ok(m, "the doc no longer states staleness in the parseable form");
  const oldest = rows.map(([, v]) => v.verified_on).sort()[0];
  assert.equal(m[3], oldest, "the doc names a cohort that is not the oldest");
  assert.equal(Number(m[2]), rows.length);
  assert.equal(Number(m[1]), rows.filter(([, v]) => v.verified_on === oldest).length);
  // The superseded count must not be stated in the present tense again.
  assert.ok(
    !/The remaining 33 rows keep `verified_on: 2025-01-15`/.test(doc),
    "the doc states the superseded 33-row count as current",
  );

  // The manifest's generated note is the surface that cannot drift; it must
  // agree with the same stamps.
  const manifest = await readJson("data/legal/manifest.json");
  assert.match(
    manifest.staleness_note,
    new RegExp("^" + Number(m[1]) + " of " + rows.length + " rows still carry verified_on " + oldest),
    "the generated note must name the same oldest cohort the doc does",
  );
});

// Every HUD FMR row, read 2026-09-09 from HUD's own FY2026 Fair Market Rent
// Documentation System in a browser (huduser.gov serves no automated fetch).
// The bundled figures had never been checked: 18 of the 19 rows carried numbers
// matching neither HUD's FY2026 nor its FY2025 table -- Dallas's efficiency FMR
// read $1,273 against HUD's $1,582 -- and four rows used an area name HUD does
// not publish. These are dollar amounts a reader acts on.
//
// Columns: FIPS, HUD's FMR area name, [0BR, 1BR, 2BR, 3BR, 4BR], SAFMR status,
// and the cbsasub code that addresses the row on huduser.gov:
//   .../fmr/fmrs/FY2026_code/2026summary.odn?year=2026&fmrtype=Final
//     &cbsasub=<code>&selection_type=cbsa
// A Small Area FMR area's page shows only the ZIP table; the metro-wide figure
// is behind &dallas_sa_override=TRUE&selection_type=hmfa.
const HUD_FY2026_FMR = [
  ["06075", "San Francisco, CA HUD Metro FMR Area", [2485, 2977, 3604, 4604, 4772], "", "METRO41860MM7360"],
  ["06037", "Los Angeles-Long Beach-Glendale, CA HUD Metro FMR Area", [2079, 2328, 2903, 3681, 4098], "all", "METRO31080MM4480"],
  ["06073", "San Diego-Chula Vista-Carlsbad, CA MSA", [2288, 2459, 3001, 3998, 4845], "all", "METRO41740M41740"],
  ["06085", "San Jose-Sunnyvale-Santa Clara, CA HUD Metro FMR Area", [2621, 2982, 3483, 4602, 5010], "all", "METRO41940M41940"],
  ["36061", "New York, NY HUD Metro FMR Area", [2529, 2655, 2910, 3644, 3959], "", "METRO35620MM5600"],
  ["25025", "Boston-Cambridge-Quincy, MA-NH HUD Metro FMR Area", [2359, 2476, 2941, 3526, 3894], "", "METRO14460MM1120"],
  ["11001", "Washington-Arlington-Alexandria, DC-VA-MD HUD Metro FMR Area", [1953, 2015, 2246, 2835, 3332], "all", "METRO47900M47900"],
  ["53033", "Seattle-Bellevue, WA HUD Metro FMR Area", [2074, 2146, 2501, 3272, 3847], "all", "METRO42660MM7600"],
  ["17031", "Chicago-Joliet-Naperville, IL HUD Metro FMR Area", [1480, 1581, 1781, 2294, 2653], "all", "METRO16980M16980"],
  ["08031", "Denver-Aurora-Centennial, CO MSA", [1643, 1754, 2089, 2734, 3049], "", "METRO19740M19740"],
  ["48453", "Austin-Round Rock-San Marcos, TX MSA", [1474, 1562, 1852, 2347, 2760], "", "METRO12420M12420"],
  ["48113", "Dallas, TX HUD Metro FMR Area", [1582, 1648, 1931, 2431, 3091], "all", "METRO19100M19100"],
  ["48201", "Houston-The Woodlands-Sugar Land, TX HUD Metro FMR Area", [1280, 1323, 1573, 2116, 2639], "partial", "METRO26420M26420"],
  ["12086", "Miami-Miami Beach-Kendall, FL HUD Metro FMR Area", [1828, 1995, 2436, 3127, 3613], "all", "METRO33100MM5000"],
  ["13121", "Atlanta-Sandy Springs-Roswell, GA HUD Metro FMR Area", [1585, 1660, 1820, 2182, 2605], "all", "METRO12060M12060"],
  ["04013", "Phoenix-Mesa-Chandler, AZ MSA", [1457, 1583, 1839, 2452, 2720], "all", "METRO38060M38060"],
  ["15003", "Urban Honolulu, HI MSA", [1877, 2016, 2642, 3674, 4432], "all", "METRO46520M46520"],
  ["41051", "Portland-Vancouver-Hillsboro, OR-WA MSA", [1570, 1677, 1922, 2619, 3109], "", "METRO38900M38900"],
  ["27053", "Minneapolis-St. Paul-Bloomington, MN-WI HUD Metro FMR Area", [1242, 1405, 1709, 2262, 2531], "", "METRO33460M33460"],
];

test("every HUD FMR row is HUD's published FY2026 figure", async () => {
  const shard = await readJson("data/realestate/hud-fmr.json");
  assert.equal(shard.areas.length, HUD_FY2026_FMR.length);
  for (const [fips, name, rents, safmr] of HUD_FY2026_FMR) {
    const row = shard.areas.find((a) => a.fips === fips);
    assert.ok(row, `the ${fips} row is gone`);
    assert.equal(row.name, name, `${fips} name`);
    assert.deepEqual(
      [row.fmr_0br, row.fmr_1br, row.fmr_2br, row.fmr_3br, row.fmr_4br],
      rents,
      `${fips} rents`,
    );
    assert.equal(row.safmr || "", safmr, `${fips} SAFMR status`);
  }
  // The OMB CBSA name must not come back: HUD does not use it as an FMR area.
  for (const a of shard.areas) {
    assert.ok(
      !a.name.startsWith("San Francisco-Oakland-Berkeley"),
      "the OMB CBSA name is not a HUD FMR area",
    );
  }
  // All 19 rows were read, so the shard's stamp may say so.
  assert.equal(shard.verified_on, "2026-09-09");
});

// A metro-wide FMR is not what a Housing Choice Voucher payment standard uses
// in a Small Area FMR area, and 12 of these 19 rows are one. The shard must
// carry the advisory text the renderer prints, or the flag says nothing.
test("Small Area FMR rows carry the advisory the renderer prints", async () => {
  const shard = await readJson("data/realestate/hud-fmr.json");
  const flagged = shard.areas.filter((a) => a.safmr);
  assert.equal(flagged.length, 12);
  for (const a of flagged) assert.ok(["all", "partial"].includes(a.safmr), a.fips);
  assert.match(shard.safmr_message, /per ZIP Code/);
  assert.match(shard.safmr_partial_message, /opted into Small Area FMRs/);
});
