// Unit tests for ui-validity.js. Uses a minimal DOM stub.

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
    this.parent = null;
    this.required = false;
    this.type = "";
    this.min = "";
    this.max = "";
    this.step = "";
    this.pattern = "";
    this.minLength = 0;
    this.maxLength = 0;
    this.value = "";
    this._valid = true;
    this._listeners = {};
    this.classList = {
      _set: new Set(),
      add: (c) => this.classList._set.add(c),
      remove: (c) => this.classList._set.delete(c),
      contains: (c) => this.classList._set.has(c),
      toggle: (c, on) => { if (on) this.classList._set.add(c); else this.classList._set.delete(c); },
    };
  }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); }
  setAttribute(k, v) { this.attributes[k] = v; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(name, fn) { (this._listeners[name] ||= []).push(fn); }
  removeEventListener(name, fn) { this._listeners[name] = (this._listeners[name] || []).filter((f) => f !== fn); }
  fire(name) { for (const fn of (this._listeners[name] || [])) fn({ type: name, target: this }); }
  closest(sel) {
    const want = sel.startsWith(".") ? sel.slice(1) : null;
    let n = this;
    while (n) {
      if (want && (n.className || "").split(/\s+/).includes(want)) return n;
      n = n.parent;
    }
    return null;
  }
  querySelector(sel) {
    const list = this.querySelectorAll(sel);
    return list[0] || null;
  }
  querySelectorAll(sel) {
    const out = [];
    const targets = sel.split(",").map((s) => s.trim());
    const isClass = (s) => s.startsWith(".");
    const walk = (n) => {
      for (const c of n.children) {
        for (const t of targets) {
          if (isClass(t)) {
            if ((c.className || "").split(/\s+/).includes(t.slice(1))) out.push(c);
          } else if (c.tagName === t.toUpperCase()) {
            out.push(c);
          }
        }
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  checkValidity() { return this._valid; }
  get validationMessage() { return this._valid ? "" : "Out of range"; }
}

function setupDoc() {
  globalThis.document = {
    createElement(tag) { return new FakeElement(tag); },
  };
}

function makeField(input) {
  const wrap = new FakeElement("div"); wrap.className = "field";
  wrap.appendChild(input);
  return wrap;
}

function makeNumber({ min = "", max = "", step = "any", value = "" } = {}) {
  const el = new FakeElement("input");
  el.type = "number"; el.min = min; el.max = max; el.step = step; el.value = value;
  return el;
}

test("wireValidity adds output-stale and a reason when an input is invalid", async () => {
  setupDoc();
  const mod = await import("../../ui-validity.js?case=invalid");
  const inputRegion = new FakeElement("section");
  const outputRegion = new FakeElement("section"); outputRegion.className = "output-region";
  const a = makeNumber({ min: "0" }); a._valid = false;
  inputRegion.appendChild(makeField(a));
  mod.wireValidity(inputRegion, outputRegion);
  inputRegion.fire("input");
  assert.equal(outputRegion.classList.contains("output-stale"), true);
  assert.equal(a.attributes["aria-invalid"], "true");
  const reason = inputRegion.querySelector(".validity-reason");
  assert.ok(reason);
  assert.equal(reason.textContent, "Out of range");
});

test("wireValidity clears reason and stale class when input becomes valid", async () => {
  setupDoc();
  const mod = await import("../../ui-validity.js?case=valid");
  const inputRegion = new FakeElement("section");
  const outputRegion = new FakeElement("section"); outputRegion.className = "output-region";
  const a = makeNumber({ min: "0" }); a._valid = false;
  inputRegion.appendChild(makeField(a));
  mod.wireValidity(inputRegion, outputRegion);
  inputRegion.fire("input");
  assert.equal(outputRegion.classList.contains("output-stale"), true);
  a._valid = true;
  inputRegion.fire("input");
  assert.equal(outputRegion.classList.contains("output-stale"), false);
  assert.equal(a.attributes["aria-invalid"], undefined);
  assert.equal(inputRegion.querySelector(".validity-reason"), null);
});

test("wireValidity skips inputs without constraints", async () => {
  setupDoc();
  const mod = await import("../../ui-validity.js?case=skip");
  const inputRegion = new FakeElement("section");
  const outputRegion = new FakeElement("section"); outputRegion.className = "output-region";
  const a = makeNumber(); a._valid = false; // no min/max/step/required - should be ignored
  inputRegion.appendChild(makeField(a));
  mod.wireValidity(inputRegion, outputRegion);
  inputRegion.fire("input");
  assert.equal(outputRegion.classList.contains("output-stale"), false);
});

test("wireValidity any-invalid wins across multiple inputs", async () => {
  setupDoc();
  const mod = await import("../../ui-validity.js?case=mixed");
  const inputRegion = new FakeElement("section");
  const outputRegion = new FakeElement("section"); outputRegion.className = "output-region";
  const a = makeNumber({ min: "0" }); a._valid = true;
  const b = makeNumber({ min: "0" }); b._valid = false;
  inputRegion.appendChild(makeField(a));
  inputRegion.appendChild(makeField(b));
  mod.wireValidity(inputRegion, outputRegion);
  inputRegion.fire("input");
  assert.equal(outputRegion.classList.contains("output-stale"), true);
});
