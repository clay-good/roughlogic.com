import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES_TAX_NEXUS, computeSalesTaxNexus } from "../../calc-references.js";

test("every row says how its two thresholds combine", () => {
  // The tile used to tell every reader that crossing the sales "or" the
  // transaction threshold creates nexus. That is wrong in New York and
  // Connecticut, where both are required.
  for (const [st, v] of Object.entries(SALES_TAX_NEXUS)) {
    assert.ok("combine" in v, st + " carries no combine rule");
    if (v.transactions_threshold == null) {
      assert.equal(v.combine, null, st + " has no transaction threshold, so combine must be null");
    } else {
      assert.ok(["and", "or"].includes(v.combine), st + " combine must be 'and' or 'or', got " + v.combine);
    }
  }
});

test("New York and Connecticut require BOTH thresholds", () => {
  // NYS DTF: a business over the receipts threshold with 100 or fewer sales is
  // not required to register. CT DRS: both $100,000 and 200 retail sales.
  for (const st of ["NY", "CT"]) {
    const r = computeSalesTaxNexus({ state: st });
    assert.equal(r.combine, "and", st + " is conjunctive");
    assert.ok(r.transactions_threshold > 0);
    assert.match(r.combine_note, /both/i, st + " must explain the conjunctive rule to the reader");
  }
  assert.equal(SALES_TAX_NEXUS.NY.sales_threshold_usd, 500000);
  assert.equal(SALES_TAX_NEXUS.NY.transactions_threshold, 100);
  assert.equal(SALES_TAX_NEXUS.CT.sales_threshold_usd, 100000);
  assert.equal(SALES_TAX_NEXUS.CT.transactions_threshold, 200);
});

test("the three states that repealed their transaction prong carry no count", () => {
  // LA: 2023 Acts 375 eff. 2023-08-01 -- the shard was already wrong when it
  // was stamped verified on 2025-01-15. UT: S.B. 47 eff. 2025-07-01.
  // IL: P.A. 104-0006 eff. 2026-01-01. KY: 2026 Ky. Acts ch. 161 (H.B. 757)
  // eff. 2026-08-01, five weeks before this pass.
  for (const [st, act] of [["LA", /Acts 375/], ["UT", /S\.B\. 47/], ["IL", /104-0006/], ["KY", /ch\. 161/]]) {
    const r = SALES_TAX_NEXUS[st];
    assert.equal(r.transactions_threshold, null, st + " no longer has a transaction threshold");
    assert.equal(r.combine, null);
    assert.match(r.combine_note, act, st + " must name the act that repealed it");
    assert.equal(r.verified_on, "2026-09-03", st + " was re-verified against the primary source");
  }
});

test("a row re-verified today is not left claiming the old stamp", () => {
  // The other 41 rows deliberately keep 2025-01-15: they were not re-checked,
  // and the folder's staleness warning should keep firing until they are.
  const rechecked = Object.entries(SALES_TAX_NEXUS).filter(([, v]) => v.verified_on !== "2025-01-15");
  assert.deepEqual(rechecked.map(([st]) => st).sort(), ["CT", "IL", "KY", "LA", "NY", "UT"]);
  for (const [, v] of rechecked) assert.equal(v.verified_on, "2026-09-03");
});
