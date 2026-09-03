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
