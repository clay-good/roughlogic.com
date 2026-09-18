import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { stampHorizon, findFutureStamps } from "../../scripts/check-future-stamps.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");

test("the horizon is tomorrow in UTC, whatever the local clock says", () => {
  assert.equal(stampHorizon(new Date("2026-09-18T00:00:00Z")), "2026-09-19");
  assert.equal(stampHorizon(new Date("2026-09-18T23:59:59Z")), "2026-09-19");
  // Month and year rollover.
  assert.equal(stampHorizon(new Date("2026-09-30T12:00:00Z")), "2026-10-01");
  assert.equal(stampHorizon(new Date("2026-12-31T12:00:00Z")), "2027-01-01");
});

test("a stamp past the horizon is found at its pointer; today and tomorrow pass", () => {
  // The shape that shipped on 2026-09-18: a worked-example row verified on
  // 2026-09-22 and an `_updated` to match.
  const fixture = {
    _updated: "2026-09-22",
    rows: [
      { tile_id: "fermenter-glycol-load", verified_on: "2026-09-22" },
      { tile_id: "today", verified_on: "2026-09-18" },
      { tile_id: "tomorrow", verified_on: "2026-09-19" },
    ],
  };
  assert.deepEqual(findFutureStamps(fixture, "2026-09-19"), [
    ["/_updated", "2026-09-22"],
    ["/rows/0/verified_on", "2026-09-22"],
  ]);
});

test("content dates are facts about the world and may lie ahead", () => {
  const row = { id: "icc-ifc", next_expected: "2027-01", effective_from: "2027-01-01", last_verified: "2026-09-10" };
  assert.deepEqual(findFutureStamps(row, "2026-09-19"), []);
});

test("the gate passes on the tree as committed", () => {
  const out = execFileSync("node", ["scripts/check-future-stamps.mjs"], { cwd: ROOT, encoding: "utf8" });
  assert.match(out, /check-future-stamps OK/);
});
