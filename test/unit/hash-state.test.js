// Unit tests for hash-state.js. Uses a minimal DOM stub so these can run
// under Node's built-in test runner without a browser.

import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal DOM stub. Only the methods used by hash-state.js are implemented.
class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.id = "";
    this.value = "";
    this.checked = false;
    this.type = "";
    this.children = [];
    this.listeners = {};
  }
  appendChild(c) { this.children.push(c); return c; }
  querySelector(sel) {
    if (!sel.startsWith("#")) return null;
    const id = sel.slice(1);
    return this._findById(id);
  }
  querySelectorAll(sel) {
    const out = [];
    this._collect((el) => {
      if (sel === "input, select, textarea") {
        if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) out.push(el);
      }
    });
    return out;
  }
  _findById(id) {
    if (this.id === id) return this;
    for (const c of this.children) {
      const r = c._findById(id);
      if (r) return r;
    }
    return null;
  }
  _collect(fn) {
    fn(this);
    for (const c of this.children) c._collect(fn);
  }
  addEventListener(name, fn) {
    if (!this.listeners[name]) this.listeners[name] = [];
    this.listeners[name].push(fn);
  }
  dispatchEvent(ev) {
    const ls = this.listeners[ev.type] || [];
    for (const fn of ls) fn(ev);
    return true;
  }
}

class FakeEvent {
  constructor(type, opts = {}) { this.type = type; this.bubbles = opts.bubbles || false; }
}

function setupGlobals() {
  globalThis.Event = FakeEvent;
  globalThis.URLSearchParams = URLSearchParams;
  globalThis.CSS = { escape: (s) => s };
  // Track replaceState calls.
  const calls = [];
  globalThis.window = {
    location: { hash: "" },
    history: { replaceState: (s, t, hash) => { globalThis.window.location.hash = hash; calls.push(hash); } },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
  };
  return calls;
}

function makeRegion() {
  const region = new FakeElement("section");
  const inputV = new FakeElement("input"); inputV.id = "ol-v"; inputV.type = "number";
  const inputI = new FakeElement("input"); inputI.id = "ol-i"; inputI.type = "number";
  const select = new FakeElement("select"); select.id = "ol-mode";
  const cb = new FakeElement("input"); cb.id = "ol-flag"; cb.type = "checkbox";
  region.appendChild(inputV);
  region.appendChild(inputI);
  region.appendChild(select);
  region.appendChild(cb);
  return { region, inputV, inputI, select, cb };
}

test("applyHashState populates inputs from params", async () => {
  setupGlobals();
  const mod = await import("../../hash-state.js");
  const { region, inputV, inputI, select, cb } = makeRegion();
  mod.applyHashState(region, { "ol-v": "12", "ol-i": "2", "ol-mode": "auto", "ol-flag": "1" });
  assert.equal(inputV.value, "12");
  assert.equal(inputI.value, "2");
  assert.equal(select.value, "auto");
  assert.equal(cb.checked, true);
});

test("applyHashState ignores unknown ids", async () => {
  setupGlobals();
  const mod = await import("../../hash-state.js");
  const { region, inputV } = makeRegion();
  mod.applyHashState(region, { "ol-v": "5", "unknown-key": "x" });
  assert.equal(inputV.value, "5");
});

test("applyHashState sets checkbox false when value is 0", async () => {
  setupGlobals();
  const mod = await import("../../hash-state.js");
  const { region, cb } = makeRegion();
  cb.checked = true;
  mod.applyHashState(region, { "ol-flag": "0" });
  assert.equal(cb.checked, false);
});

test("wireHashState writes input state to URL on input event", async () => {
  const calls = setupGlobals();
  const mod = await import("../../hash-state.js");
  const { region, inputV, inputI } = makeRegion();
  mod.wireHashState(region, "ohms-law");
  inputV.value = "120";
  inputI.value = "10";
  region.dispatchEvent(new FakeEvent("input", { bubbles: true }));
  // Should have called replaceState with ohms-law and the params.
  assert.ok(calls.length > 0, "no replaceState calls");
  const last = calls[calls.length - 1];
  assert.ok(last.startsWith("#ohms-law?"), "got " + last);
  assert.ok(last.includes("ol-v=120"), "missing ol-v");
  assert.ok(last.includes("ol-i=10"), "missing ol-i");
});

test("v10 §G.1: wireHashState prepends v=1 schema-version segment", async () => {
  const calls = setupGlobals();
  const mod = await import("../../hash-state.js");
  assert.equal(mod.HASH_SCHEMA_VERSION, 1);
  const { region, inputV } = makeRegion();
  mod.wireHashState(region, "ohms-law");
  inputV.value = "120";
  region.dispatchEvent(new FakeEvent("input", { bubbles: true }));
  const last = calls[calls.length - 1];
  // v=1 must be the first parameter so a future v=2 parser can route on it
  // before reading any tile-specific keys.
  assert.match(last, /^#ohms-law\?v=1(?:&|$)/, "got " + last);
});

test("v10 §G.1: applyHashState ignores 'v' schema-version key", async () => {
  setupGlobals();
  const mod = await import("../../hash-state.js");
  const { region, inputV } = makeRegion();
  // A v=1 hash from wireHashState round-trips: the version key is skipped
  // (no input has id="v") and tile inputs populate normally.
  mod.applyHashState(region, { v: "1", "ol-v": "9" });
  assert.equal(inputV.value, "9");
});

test("v10 §G.1: legacy hashes without v= still resolve (backward-compat)", async () => {
  setupGlobals();
  const mod = await import("../../hash-state.js");
  const { region, inputV, inputI } = makeRegion();
  // Pre-v10 link shape: no v= key. Must continue to populate inputs.
  mod.applyHashState(region, { "ol-v": "240", "ol-i": "20" });
  assert.equal(inputV.value, "240");
  assert.equal(inputI.value, "20");
});

test("wireHashState skips empty values", async () => {
  const calls = setupGlobals();
  const mod = await import("../../hash-state.js");
  const { region, inputV } = makeRegion();
  mod.wireHashState(region, "ohms-law");
  inputV.value = "";
  region.dispatchEvent(new FakeEvent("input", { bubbles: true }));
  const last = calls[calls.length - 1];
  assert.ok(!last.includes("ol-v="), "should not include empty value: " + last);
});
