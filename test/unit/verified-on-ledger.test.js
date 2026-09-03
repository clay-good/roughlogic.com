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
  // Five shards stamp a verified_on no ledger row backs, so the generator
  // still writes it from the build date -- that fact belongs in the gate's
  // own output, not only in docs/data-sources.md.
  const src = await readFile(resolve(ROOT, "scripts/check-verified-on-ledger.mjs"), "utf8");
  assert.match(src, /UNGOVERNED_BUDGET = 5/, "the ungoverned count is ratcheted");
  assert.match(src, /NOT governed here/, "the OK line must name the uncovered set");
  // The paths compared must be repo-relative on both sides; comparing an
  // absolute walk against sources-cycle.json's relative keys matched nothing
  // and reported every stamped shard as ungoverned.
  assert.match(src, /relative\(ROOT, full\)/);
});
