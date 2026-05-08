// Unit tests for calc-historical.js (v4 utility 233).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMMODITIES, quantile, computePercentileBands, computeHistorical,
  historicalExample, HISTORICAL_RENDERERS,
} from "../../calc-historical.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Catalog ---

test("catalog has the 14 commodities listed in the spec", () => {
  const ids = COMMODITIES.map((c) => c.id);
  for (const expected of [
    "copper", "aluminum", "structural-steel", "rebar", "framing-lumber",
    "osb", "drywall", "asphalt", "diesel", "gasoline", "natural-gas",
    "wheat", "corn", "soybeans",
  ]) assert.ok(ids.includes(expected), "missing " + expected);
  assert.equal(COMMODITIES.length, 14);
});

test("every commodity entry carries a series ID, agency, units, and file", () => {
  for (const c of COMMODITIES) {
    assert.ok(c.series_id && c.series_id.length > 0, c.id);
    assert.ok(c.agency && c.agency.length > 0, c.id);
    assert.ok(c.units && c.units.length > 0, c.id);
    assert.ok(c.file && c.file.endsWith(".json"), c.id);
  }
});

// --- quantile ---

test("quantile returns null for empty input", () => { assert.equal(quantile([], 0.5), null); });
test("quantile p=0 returns minimum", () => { assert.equal(quantile([3, 1, 2, 5, 4], 0), 1); });
test("quantile p=1 returns maximum", () => { assert.equal(quantile([3, 1, 2, 5, 4], 1), 5); });
test("quantile p=0.5 of 1..5 returns 3 (median)", () => { assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3); });
test("quantile interpolates between order statistics", () => {
  // Sorted [10, 20, 30, 40]. p=0.25 -> idx 0.75 -> 0.25*10 + 0.75*20 - wait,
  // formula uses lo*(1-frac) + hi*frac so 10*0.25 + 20*0.75 = 17.5.
  assert.ok(close(quantile([40, 10, 20, 30], 0.25), 17.5, 0.001));
});
test("quantile rejects out-of-range p", () => { assert.equal(quantile([1, 2, 3], 1.2), null); });
test("quantile filters non-finite values", () => { assert.equal(quantile([1, 2, NaN, 3], 0.5), 2); });

// --- computePercentileBands ---

const fixture = (() => {
  // 36 monthly points 100..135 inclusive so percentiles are exactly known.
  const points = [];
  for (let i = 0; i < 36; i++) {
    const m = (i % 12) + 1;
    const y = 2023 + Math.floor(i / 12);
    points.push({ date: y + "-" + String(m).padStart(2, "0"), value: 100 + i });
  }
  return points;
})();

test("bands: errors on empty points", () => { assert.ok(computePercentileBands({ points: [] }).error); });
test("bands: errors on lookback < 2", () => { assert.ok(computePercentileBands({ points: fixture, lookback_months: 1 }).error); });
test("bands: 12-month window slices the trailing 12 points", () => {
  const r = computePercentileBands({ points: fixture, lookback_months: 12 });
  assert.equal(r.points_in_window, 12);
  assert.equal(r.window[0].value, 124);
  assert.equal(r.window[11].value, 135);
});
test("bands: median of 124..135 is 129.5", () => {
  const r = computePercentileBands({ points: fixture, lookback_months: 12 });
  assert.ok(close(r.p50, 129.5, 0.001));
});
test("bands: latest equals last value, latest_date matches", () => {
  const r = computePercentileBands({ points: fixture, lookback_months: 12 });
  assert.equal(r.latest, 135);
  assert.equal(r.latest_date, "2025-12");
});
test("bands: latest = max -> placement 'high'", () => {
  const r = computePercentileBands({ points: fixture, lookback_months: 12 });
  assert.equal(r.placement, "high");
});
test("bands: a window where latest equals p25 places 'low'", () => {
  const points = fixture.slice(0, 12).concat([{ date: "2024-01", value: 100 }]);
  const r = computePercentileBands({ points, lookback_months: 13 });
  assert.equal(r.latest, 100);
  assert.ok(["low", "normal-low"].includes(r.placement));
});
test("bands: window respects lookback bigger than series", () => {
  const r = computePercentileBands({ points: fixture, lookback_months: 9999 });
  assert.equal(r.points_in_window, fixture.length);
});

// --- computeHistorical ---

test("computeHistorical: unknown commodity errors", () => {
  const r = computeHistorical({ commodity: "platinum", shard: { points: fixture } });
  assert.ok(r.error);
});

test("computeHistorical: missing shard errors", () => {
  const r = computeHistorical({ commodity: "copper", shard: null });
  assert.ok(r.error);
});

test("computeHistorical: returns commodity, source, series, units", () => {
  const shard = { points: fixture, source: "src", series_id: "WPU0", units: "Index", fetched: "2026-05-07" };
  const r = computeHistorical({ commodity: "copper", lookback_months: 12, shard });
  assert.equal(r.commodity.id, "copper");
  assert.equal(r.series_id, "WPU0");
  assert.equal(r.units, "Index");
  assert.equal(r.fetched, "2026-05-07");
});

// --- HISTORICAL_RENDERERS registration ---

test("HISTORICAL_RENDERERS exposes historical-pricing", () => {
  assert.ok(typeof HISTORICAL_RENDERERS["historical-pricing"] === "function");
});

test("historicalExample uses a real commodity id", () => {
  const ids = COMMODITIES.map((c) => c.id);
  assert.ok(ids.includes(historicalExample.inputs.commodity));
});

// --- Bundled-shard integration: every catalog entry has a real file with
//     >= 24 monthly points, a fetched date, and a matching series_id ---

test("every catalog entry has a bundled commodity shard with >= 24 monthly points", async () => {
  for (const c of COMMODITIES) {
    const path = resolve(ROOT, "data", "historical", "commodities", c.file);
    const text = await readFile(path, "utf8");
    const j = JSON.parse(text);
    assert.equal(j.series_id, c.series_id, c.id + " series_id mismatch");
    assert.ok(j.points && j.points.length >= 24, c.id + " has " + (j.points && j.points.length) + " points");
    assert.ok(j.fetched && /^\d{4}-\d{2}-\d{2}$/.test(j.fetched), c.id + " fetched " + j.fetched);
    assert.ok(j.units, c.id + " missing units");
  }
});

test("bundled-shard percentile pipeline yields finite p25/p50/p75/p90 for copper", async () => {
  const path = resolve(ROOT, "data", "historical", "commodities", "copper.json");
  const j = JSON.parse(await readFile(path, "utf8"));
  const r = computeHistorical({ commodity: "copper", lookback_months: 12, shard: j });
  assert.ok(Number.isFinite(r.p25));
  assert.ok(Number.isFinite(r.p50));
  assert.ok(Number.isFinite(r.p75));
  assert.ok(Number.isFinite(r.p90));
  assert.ok(r.p25 <= r.p50 && r.p50 <= r.p75 && r.p75 <= r.p90);
});

test("bundled-shard latest point is fresh (within 60 days of fetched)", async () => {
  for (const c of COMMODITIES) {
    const path = resolve(ROOT, "data", "historical", "commodities", c.file);
    const j = JSON.parse(await readFile(path, "utf8"));
    const last = j.points[j.points.length - 1].date + "-15";
    const lastT = new Date(last + "T00:00:00Z").getTime();
    const fetchT = new Date(j.fetched + "T00:00:00Z").getTime();
    const daysBehind = (fetchT - lastT) / (24 * 3600 * 1000);
    assert.ok(daysBehind <= 60, c.id + " last point " + j.points[j.points.length - 1].date + " is " + daysBehind + " days behind " + j.fetched);
  }
});
