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
  // The other 31 rows deliberately keep 2025-01-15: they were not re-checked,
  // and the folder's staleness warning should keep firing until they are.
  // Ten of the sixteen were read and found CORRECT -- OH, VA, MN, NE, WV, VT,
  // HI, DC, RI and NV -- which is still a verification, and the only kind that
  // lets a stamp move.
  //
  // This is a ledger, not a loose check: each stamp names the day that row was
  // actually read, so a row cannot join the re-verified set without someone
  // adding it here.
  const LEDGER = {
    CT: "2026-09-03", DC: "2026-09-03", HI: "2026-09-03", IL: "2026-09-03",
    KY: "2026-09-03", LA: "2026-09-03", MN: "2026-09-03", NE: "2026-09-03",
    NY: "2026-09-03", OH: "2026-09-03", UT: "2026-09-03", VA: "2026-09-03",
    VT: "2026-09-03", WV: "2026-09-03",
    // Read 2026-09-04 against the state's own published text.
    NV: "2026-09-04", RI: "2026-09-04", MD: "2026-09-04", NJ: "2026-09-04",
    CA: "2026-09-04", TX: "2026-09-04", AL: "2026-09-04", MS: "2026-09-04",
    FL: "2026-09-04", WA: "2026-09-04",
  };
  const rechecked = Object.entries(SALES_TAX_NEXUS).filter(([, v]) => v.verified_on !== "2025-01-15");
  assert.deepEqual(rechecked.map(([st]) => st).sort(), Object.keys(LEDGER).sort());
  for (const [st, v] of rechecked) assert.equal(v.verified_on, LEDGER[st], st + " stamp");
});

test("a row read and found correct still cites the provision that was read", () => {
  // OH, VA, MN, NE, WV and VT were checked against the state's own code text
  // and needed no change. The citation was tightened to the subsection that
  // actually carries the two thresholds, so the next reader lands on it.
  const cites = {
    OH: /5741\.01\(I\)\(2\)\(g\)-\(h\)/,
    VA: /58\.1-612\(C\)\(10\)-\(11\)/,
    NE: /77-2701\.13\(2\)\(a\)-\(b\)/,
    WV: /11-15A-6b\(a\)\(1\)-\(2\)/,
    // Read 2026-09-04. Rhode Island states the test inside the "remote seller"
    // definition, so the subsection is the useful pointer.
    RI: /44-18\.2-3\(E\)/,
    // Nevada's citation was WRONG, not merely loose: it named NAC 372.030,
    // which is titled '"Retail sale" defined' and carries no threshold. The
    // test comes from the Tax Commission's approved regulation, read from the
    // enrolled PDF where new matter is italicised and deletions bracketed.
    NV: /R189-18/,
    // Maryland's citation was wrong the same way Nevada's was: Tax-Gen
    // 11-701(b)(2)(iii) is about entering the State to service or repair.
    MD: /COMAR 03\.06\.01\.33/,
    NJ: /54:32B-3\.5/,
  };
  for (const [st, re] of Object.entries(cites)) {
    assert.match(SALES_TAX_NEXUS[st].citation, re, st + " must cite the subsection read");
    assert.equal(SALES_TAX_NEXUS[st].combine, "or", st + " is disjunctive");
    assert.equal(SALES_TAX_NEXUS[st].sales_threshold_usd, 100000);
    assert.equal(SALES_TAX_NEXUS[st].transactions_threshold, 200);
  }
});
