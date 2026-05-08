// Unit tests for clipboard.js. Uses a minimal DOM stub.

import { test } from "node:test";
import assert from "node:assert/strict";

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.id = "";
    this.className = "";
    this.children = [];
    this.attributes = {};
    this.style = { cssText: "" };
    this.textContent = "";
    this.hidden = false;
    this._listeners = {};
  }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  setAttribute(k, v) { this.attributes[k] = v; }
  addEventListener(name, fn) {
    if (!this._listeners[name]) this._listeners[name] = [];
    this._listeners[name].push(fn);
  }
  fire(name) { for (const fn of (this._listeners[name] || [])) fn({ type: name }); }
  querySelector(sel) {
    const list = this.querySelectorAll(sel);
    return list[0] || null;
  }
  querySelectorAll(sel) {
    const out = [];
    const want = sel.toUpperCase();
    const wantClass = sel.startsWith(".") ? sel.slice(1) : null;
    const walk = (n) => {
      for (const c of n.children) {
        if (wantClass) {
          if ((c.className || "").split(/\s+/).includes(wantClass)) out.push(c);
        } else if (c.tagName === want) {
          out.push(c);
        }
        walk(c);
      }
    };
    walk(this);
    return out;
  }
}

function setupGlobals() {
  const main = new FakeElement("main"); main.id = "main";
  const body = new FakeElement("body");
  body.appendChild(main);
  const lastWrites = [];
  globalThis.document = {
    body,
    elements: { main },
    getElementById(id) { return this.elements[id] || null; },
    createElement(tag) { return new FakeElement(tag); },
  };
  if (!globalThis.navigator || !globalThis.navigator.clipboard) {
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText: (t) => { lastWrites.push(t); return Promise.resolve(); } } },
      configurable: true,
      writable: true,
    });
  } else {
    globalThis.navigator.clipboard = { writeText: (t) => { lastWrites.push(t); return Promise.resolve(); } };
  }
  // requestIdleCallback shim used elsewhere; not needed here.
  globalThis.MutationObserver = class { constructor() {} observe() {} disconnect() {} };
  globalThis.setTimeout = (fn) => fn();
  return { lastWrites };
}

function makeOutputRegionWithRows(rows) {
  const region = new FakeElement("section");
  for (const [label, value] of rows) {
    const p = new FakeElement("p");
    const strong = new FakeElement("strong"); strong.textContent = label + ": ";
    const span = new FakeElement("span"); span.className = "out-value"; span.textContent = value;
    const btn = new FakeElement("button"); btn.textContent = "Copy";
    p.appendChild(strong); p.appendChild(span); p.appendChild(btn);
    region.appendChild(p);
  }
  return region;
}

test("collectOutputs walks output rows and returns label/value pairs", async () => {
  setupGlobals();
  const mod = await import("../../clipboard.js?case=collect");
  const region = makeOutputRegionWithRows([["Voltage", "120 V"], ["Current", "10 A"], ["Power", "1200 W"]]);
  const rows = mod.collectOutputs(region);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { label: "Voltage", value: "120 V" });
  assert.deepEqual(rows[2], { label: "Power", value: "1200 W" });
});

test("addCopyAllButton hides when fewer than 2 rows", async () => {
  setupGlobals();
  const mod = await import("../../clipboard.js?case=hide");
  const region = makeOutputRegionWithRows([["Result", "42"]]);
  const btn = mod.addCopyAllButton(region);
  assert.ok(btn);
  assert.equal(btn.hidden, true);
});

test("addCopyAllButton visible with multiple rows and copies a labeled summary", async () => {
  const { lastWrites } = setupGlobals();
  const mod = await import("../../clipboard.js?case=copyall");
  const region = makeOutputRegionWithRows([["Voltage", "120 V"], ["Current", "10 A"]]);
  const btn = mod.addCopyAllButton(region, { title: "Ohm's Law" });
  assert.equal(btn.hidden, false);
  btn.fire("click");
  assert.equal(lastWrites.length, 1);
  assert.ok(lastWrites[0].startsWith("Ohm's Law\n"));
  assert.ok(lastWrites[0].includes("Voltage: 120 V"));
  assert.ok(lastWrites[0].includes("Current: 10 A"));
});

test("addCopyAllButton is idempotent", async () => {
  setupGlobals();
  const mod = await import("../../clipboard.js?case=idem");
  const region = makeOutputRegionWithRows([["A", "1"], ["B", "2"]]);
  const a = mod.addCopyAllButton(region);
  const b = mod.addCopyAllButton(region);
  assert.equal(a, b);
});
