// v10 Phase G.2 hash-schema regression suite (spec-v10.md §G.2).
//
// An append-only registry of known hashes (collected from CHANGELOG
// examples, docs/launch-checklist.md worked examples, and the canonical
// shapes documented in docs/hash-state.md). Every fixture must continue
// to resolve to the same view, the same tool id, and the same parameter
// set in every release.
//
// Add new fixtures to FIXTURES; do not modify or remove existing rows.
// A breaking change to the encoding requires a `v=2` migration with its
// own fixture stanza, per spec-v10 §G migration policy.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHashRoute, decodeIdList } from "../../routing.js";

// The full TOOLS id-set isn't important here; we just need the parser to
// accept the ids that appear in fixtures. parseHashRoute treats unknown
// ids as home, so a fixture with a real tool id requires that id to be
// present in the set. We curate a fixed set of ids that appear in the
// fixture rows below; the registry is intentionally NOT coupled to the
// live TOOLS list so a future tile rename does not silently break an old
// shared link's regression test.
const FIXTURE_TOOL_IDS = new Set([
  "ohms-law",
  "wire-ampacity",
  "voltage-drop",
  "conduit-fill",
  "breaker-sizing",
  "service-load",
  "manual-j-cooling",
  "manual-j-heating",
  "duct-sizing",
  "pipe-sizing",
  "friction-loss",
  "septic-drainfield",
  "bridge-formula",
  "lightning-countdown",
  "wind-chill",
  "concrete-volume",
  "stair-stringer",
  "psychrometric",
  "drying-log",
  "pump-sizing",
  "pf-correction",
]);

// Fixture rows. APPEND ONLY. Each row:
//   { hash, expect: { view, id?, params?, pinned?, recents?, bundle? } }
//
// For tool views, params is the exact decoded object. For home-view
// multi-key forms (p=, r=, b=), the decoded fields are asserted.
//
// The `v=1` schema version key (spec-v10 §G.1) is preserved in params
// so the round-trip stays exact. Pre-v10 hashes (no `v=`) are kept here
// as backward-compatibility fixtures and resolve identically.
const FIXTURES = [
  // -------- Empty / home shapes --------
  { hash: "", expect: { view: "home" } },
  { hash: "#", expect: { view: "home" } },
  { hash: "#home", expect: { view: "home" } },

  // -------- Pinned / recents / bundle (home-view multi-key) --------
  { hash: "#p=ohms-law", expect: { view: "home", pinned: ["ohms-law"] } },
  {
    hash: "#p=ohms-law,wire-ampacity,conduit-fill",
    expect: { view: "home", pinned: ["ohms-law", "wire-ampacity", "conduit-fill"] },
  },
  { hash: "#r=ohms-law", expect: { view: "home", recents: ["ohms-law"] } },
  {
    hash: "#p=ohms-law&r=wire-ampacity,voltage-drop",
    expect: {
      view: "home",
      pinned: ["ohms-law"],
      recents: ["wire-ampacity", "voltage-drop"],
    },
  },
  // Bundle hash (decoded payload validated by application layer).
  { hash: "#b=eyJ2IjoxfQ", expect: { view: "home", bundle: "eyJ2IjoxfQ" } },

  // -------- Bare tool views (no inputs) --------
  { hash: "#ohms-law", expect: { view: "tool", id: "ohms-law", params: {} } },
  { hash: "#voltage-drop", expect: { view: "tool", id: "voltage-drop", params: {} } },
  { hash: "#conduit-fill", expect: { view: "tool", id: "conduit-fill", params: {} } },
  { hash: "#manual-j-cooling", expect: { view: "tool", id: "manual-j-cooling", params: {} } },
  { hash: "#duct-sizing", expect: { view: "tool", id: "duct-sizing", params: {} } },
  { hash: "#pipe-sizing", expect: { view: "tool", id: "pipe-sizing", params: {} } },
  { hash: "#friction-loss", expect: { view: "tool", id: "friction-loss", params: {} } },
  { hash: "#septic-drainfield", expect: { view: "tool", id: "septic-drainfield", params: {} } },
  { hash: "#bridge-formula", expect: { view: "tool", id: "bridge-formula", params: {} } },
  { hash: "#concrete-volume", expect: { view: "tool", id: "concrete-volume", params: {} } },
  { hash: "#stair-stringer", expect: { view: "tool", id: "stair-stringer", params: {} } },
  { hash: "#wind-chill", expect: { view: "tool", id: "wind-chill", params: {} } },
  { hash: "#lightning-countdown", expect: { view: "tool", id: "lightning-countdown", params: {} } },
  { hash: "#psychrometric", expect: { view: "tool", id: "psychrometric", params: {} } },
  { hash: "#pump-sizing", expect: { view: "tool", id: "pump-sizing", params: {} } },
  { hash: "#pf-correction", expect: { view: "tool", id: "pf-correction", params: {} } },

  // -------- v=1 hashes (post-v10) --------
  {
    hash: "#ohms-law?v=1&ol-v=120&ol-i=10",
    expect: { view: "tool", id: "ohms-law", params: { v: "1", "ol-v": "120", "ol-i": "10" } },
  },
  {
    hash: "#voltage-drop?v=1&vd-amps=20&vd-len=150&vd-awg=10&vd-mat=copper",
    expect: {
      view: "tool",
      id: "voltage-drop",
      params: { v: "1", "vd-amps": "20", "vd-len": "150", "vd-awg": "10", "vd-mat": "copper" },
    },
  },
  {
    hash: "#conduit-fill?v=1&cf-type=emt&cf-size=0.75&cf-count=4&cf-awg=12",
    expect: {
      view: "tool",
      id: "conduit-fill",
      params: { v: "1", "cf-type": "emt", "cf-size": "0.75", "cf-count": "4", "cf-awg": "12" },
    },
  },
  {
    hash: "#breaker-sizing?v=1&bs-load=20&bs-continuous=1",
    expect: {
      view: "tool",
      id: "breaker-sizing",
      params: { v: "1", "bs-load": "20", "bs-continuous": "1" },
    },
  },
  {
    hash: "#manual-j-cooling?v=1&mjc-area=1800&mjc-climate=4A&mjc-window-area=300",
    expect: {
      view: "tool",
      id: "manual-j-cooling",
      params: { v: "1", "mjc-area": "1800", "mjc-climate": "4A", "mjc-window-area": "300" },
    },
  },
  {
    hash: "#duct-sizing?v=1&ds-cfm=400&ds-fpm=700&ds-shape=round",
    expect: {
      view: "tool",
      id: "duct-sizing",
      params: { v: "1", "ds-cfm": "400", "ds-fpm": "700", "ds-shape": "round" },
    },
  },
  {
    hash: "#pipe-sizing?v=1&ps-fu=18&ps-type=copper-l",
    expect: {
      view: "tool",
      id: "pipe-sizing",
      params: { v: "1", "ps-fu": "18", "ps-type": "copper-l" },
    },
  },
  {
    hash: "#friction-loss?v=1&fl-gpm=10&fl-len=80&fl-id=0.811&fl-c=140",
    expect: {
      view: "tool",
      id: "friction-loss",
      params: { v: "1", "fl-gpm": "10", "fl-len": "80", "fl-id": "0.811", "fl-c": "140" },
    },
  },
  {
    hash: "#wind-chill?v=1&wc-tF=10&wc-mph=20",
    expect: { view: "tool", id: "wind-chill", params: { v: "1", "wc-tF": "10", "wc-mph": "20" } },
  },

  // -------- Multi-row inputs (v9 noise-dose, drying-log shape) --------
  {
    hash: "#drying-log?v=1&dl-row-1=70,45&dl-row-2=68,42&dl-row-3=65,40",
    expect: {
      view: "tool",
      id: "drying-log",
      params: {
        v: "1",
        "dl-row-1": "70,45",
        "dl-row-2": "68,42",
        "dl-row-3": "65,40",
      },
    },
  },

  // -------- Pre-v10 (legacy, no v= key) backward-compat --------
  {
    hash: "#ohms-law?ol-v=120&ol-i=10",
    expect: { view: "tool", id: "ohms-law", params: { "ol-v": "120", "ol-i": "10" } },
  },
  {
    hash: "#voltage-drop?vd-amps=20&vd-len=150&vd-awg=10&vd-mat=copper",
    expect: {
      view: "tool",
      id: "voltage-drop",
      params: { "vd-amps": "20", "vd-len": "150", "vd-awg": "10", "vd-mat": "copper" },
    },
  },
  {
    hash: "#manual-j-cooling?mjc-area=1800&mjc-climate=4A",
    expect: {
      view: "tool",
      id: "manual-j-cooling",
      params: { "mjc-area": "1800", "mjc-climate": "4A" },
    },
  },
  {
    hash: "#pump-sizing?ps-gpm=50&ps-tdh=80",
    expect: { view: "tool", id: "pump-sizing", params: { "ps-gpm": "50", "ps-tdh": "80" } },
  },
  {
    hash: "#wind-chill?wc-tF=0&wc-mph=15",
    expect: { view: "tool", id: "wind-chill", params: { "wc-tF": "0", "wc-mph": "15" } },
  },

  // -------- Edge cases --------
  // Decimal values preserve precision verbatim.
  {
    hash: "#friction-loss?v=1&fl-gpm=12.5&fl-len=100.0",
    expect: {
      view: "tool",
      id: "friction-loss",
      params: { v: "1", "fl-gpm": "12.5", "fl-len": "100.0" },
    },
  },
  // Negative numbers (wind-chill subzero).
  {
    hash: "#wind-chill?v=1&wc-tF=-20&wc-mph=30",
    expect: {
      view: "tool",
      id: "wind-chill",
      params: { v: "1", "wc-tF": "-20", "wc-mph": "30" },
    },
  },
  // Checkbox encoded as 0 / 1.
  {
    hash: "#breaker-sizing?v=1&bs-load=15&bs-continuous=0",
    expect: {
      view: "tool",
      id: "breaker-sizing",
      params: { v: "1", "bs-load": "15", "bs-continuous": "0" },
    },
  },
  // Unknown tool id falls back to home (parser contract).
  { hash: "#not-a-real-tile", expect: { view: "home" } },
  { hash: "#not-a-real-tile?foo=bar", expect: { view: "home" } },
  // Empty value parameter is preserved as "" by URLSearchParams.
  {
    hash: "#ohms-law?v=1&ol-v=&ol-i=5",
    expect: {
      view: "tool",
      id: "ohms-law",
      params: { v: "1", "ol-v": "", "ol-i": "5" },
    },
  },
  // Three-phase angle / additional electrical inputs.
  {
    hash: "#pf-correction?v=1&pf-existing=0.78&pf-target=0.95&pf-kw=125&pf-v=480",
    expect: {
      view: "tool",
      id: "pf-correction",
      params: {
        v: "1",
        "pf-existing": "0.78",
        "pf-target": "0.95",
        "pf-kw": "125",
        "pf-v": "480",
      },
    },
  },
  // Service-load with multiple appliance keys.
  {
    hash: "#service-load?v=1&sl-area=2400&sl-range=12000&sl-dryer=5000&sl-hvac=8500&sl-method=optional",
    expect: {
      view: "tool",
      id: "service-load",
      params: {
        v: "1",
        "sl-area": "2400",
        "sl-range": "12000",
        "sl-dryer": "5000",
        "sl-hvac": "8500",
        "sl-method": "optional",
      },
    },
  },
  // Stair-stringer with three select inputs.
  {
    hash: "#stair-stringer?v=1&ss-rise=108&ss-run=120&ss-tread=10.5&ss-units=in",
    expect: {
      view: "tool",
      id: "stair-stringer",
      params: {
        v: "1",
        "ss-rise": "108",
        "ss-run": "120",
        "ss-tread": "10.5",
        "ss-units": "in",
      },
    },
  },
  // Concrete volume with units select.
  {
    hash: "#concrete-volume?v=1&cv-l=20&cv-w=10&cv-d=4&cv-units=ft-in",
    expect: {
      view: "tool",
      id: "concrete-volume",
      params: { v: "1", "cv-l": "20", "cv-w": "10", "cv-d": "4", "cv-units": "ft-in" },
    },
  },
  // Bridge formula with axle-spacing.
  {
    hash: "#bridge-formula?v=1&bf-axles=5&bf-base-ft=51&bf-weight=80000",
    expect: {
      view: "tool",
      id: "bridge-formula",
      params: { v: "1", "bf-axles": "5", "bf-base-ft": "51", "bf-weight": "80000" },
    },
  },
  // Lightning-countdown with flash/thunder seconds.
  {
    hash: "#lightning-countdown?v=1&lc-sec=15",
    expect: { view: "tool", id: "lightning-countdown", params: { v: "1", "lc-sec": "15" } },
  },
  // Psychrometric multi-input.
  {
    hash: "#psychrometric?v=1&px-tdb=75&px-rh=50&px-pressure=14.696",
    expect: {
      view: "tool",
      id: "psychrometric",
      params: {
        v: "1",
        "px-tdb": "75",
        "px-rh": "50",
        "px-pressure": "14.696",
      },
    },
  },
  // Septic-drainfield perc/loading.
  {
    hash: "#septic-drainfield?v=1&sd-perc=30&sd-bedrooms=3&sd-soil=sandyloam",
    expect: {
      view: "tool",
      id: "septic-drainfield",
      params: {
        v: "1",
        "sd-perc": "30",
        "sd-bedrooms": "3",
        "sd-soil": "sandyloam",
      },
    },
  },
];

test("hash-schema regression suite has at least 50 fixtures", () => {
  // spec-v10 §G.2 requires "at least 50 known hashes." Keep this assertion
  // as a guardrail so future fixture pruning is caught at test time.
  assert.ok(
    FIXTURES.length >= 50,
    "expected >= 50 fixtures, got " + FIXTURES.length,
  );
});

test("every fixture parses to its expected route", () => {
  for (const fx of FIXTURES) {
    const r = parseHashRoute(fx.hash, FIXTURE_TOOL_IDS);
    const exp = fx.expect;
    assert.equal(r.route.view, exp.view, "view mismatch for hash: " + fx.hash);
    if (exp.view === "tool") {
      assert.equal(r.route.id, exp.id, "id mismatch for hash: " + fx.hash);
      assert.deepEqual(
        r.route.params,
        exp.params,
        "params mismatch for hash: " + fx.hash,
      );
    } else {
      // Home view. Optional pinned / recents / bundle assertions.
      if (exp.pinned) {
        assert.deepEqual(r.pinned, exp.pinned, "pinned mismatch for hash: " + fx.hash);
      }
      if (exp.recents) {
        assert.deepEqual(r.recents, exp.recents, "recents mismatch for hash: " + fx.hash);
      }
      if (exp.bundle) {
        assert.equal(r.bundle, exp.bundle, "bundle mismatch for hash: " + fx.hash);
      }
    }
  }
});

test("decodeIdList drops ids not in the valid set", () => {
  // Sanity check that the parser does not allow a stale fixture's tile-id
  // to be smuggled into pinned/recents past a tile rename.
  const ids = decodeIdList("ohms-law,renamed-tile,wire-ampacity", FIXTURE_TOOL_IDS);
  assert.deepEqual(ids, ["ohms-law", "wire-ampacity"]);
});

test("v=1 fixtures preserve schema-version key in params", () => {
  // spec-v10 §G.1 says applyHashState skips v=, but the parser must keep
  // it so a future v=2 path can route on it. Assert at least one v=1
  // fixture and confirm v stays in params.
  const v1Fixtures = FIXTURES.filter(
    (fx) => fx.expect.view === "tool" && fx.expect.params && fx.expect.params.v === "1",
  );
  assert.ok(v1Fixtures.length > 0, "expected at least one v=1 fixture");
  for (const fx of v1Fixtures) {
    const r = parseHashRoute(fx.hash, FIXTURE_TOOL_IDS);
    assert.equal(r.route.params.v, "1", "v=1 stripped for hash: " + fx.hash);
  }
});
