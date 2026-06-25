// v10 Phase B.1 unit tests for limitation-banner.js (spec-v10 §13.2).
//
// Runs under Node's built-in test runner with a minimal DOM stub. Assert:
//   - renderLimitationBanner inserts an <aside> at the top of the host.
//   - Headline / replacement / governs text are set verbatim via
//     textContent (no innerHTML, no markup interpolation).
//   - The optional link renders as an <a> with rel="noopener".
//   - Missing required fields return null and insert nothing.
//   - getLimitationCopy returns the canonical entry for known ids and
//     null for unknown ids.
//   - The canonical registry covers every tile spec-v10 §4.3 names
//     explicitly.

import { test } from "node:test";
import assert from "node:assert/strict";

class FakeNode {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.attrs = {};
    this.classList = new Set();
    this._textContent = "";
    this.parentNode = null;
    this.ownerDocument = null;
  }
  set className(v) {
    this.classList = new Set(String(v).split(/\s+/).filter(Boolean));
    this.attrs.class = String(v);
  }
  get className() {
    return this.attrs.class || "";
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  getAttribute(k) {
    return this.attrs[k] ?? null;
  }
  appendChild(c) {
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  insertBefore(c, ref) {
    c.parentNode = this;
    if (!ref) {
      this.children.push(c);
    } else {
      const idx = this.children.indexOf(ref);
      if (idx < 0) this.children.unshift(c);
      else this.children.splice(idx, 0, c);
    }
    return c;
  }
  get firstChild() {
    return this.children[0] || null;
  }
  set textContent(v) {
    this._textContent = String(v);
    this.children = [];
  }
  get textContent() {
    if (this.children.length === 0) return this._textContent;
    return this.children.map((c) => c.textContent).join("");
  }
  set href(v) {
    this.attrs.href = String(v);
  }
  get href() {
    return this.attrs.href || "";
  }
  set rel(v) {
    this.attrs.rel = String(v);
  }
  get rel() {
    return this.attrs.rel || "";
  }
}

function makeDoc() {
  const doc = {
    createElement(tag) {
      const n = new FakeNode(tag);
      n.ownerDocument = doc;
      return n;
    },
  };
  return doc;
}

function makeHost() {
  const doc = makeDoc();
  const host = doc.createElement("section");
  return { doc, host };
}

test("renderLimitationBanner inserts an aside with the expected text", async () => {
  const mod = await import("../../limitation-banner.js");
  const { host } = makeHost();
  const aside = mod.renderLimitationBanner(host, {
    headline: "Not a Manual J load calculation.",
    replacement: "A code-compliant load calculation requires ACCA Manual J 8th ed.",
    who_governs: "The AHJ governs.",
  });
  assert.ok(aside, "expected an aside to be returned");
  assert.equal(host.children[0], aside);
  assert.equal(aside.tagName, "ASIDE");
  assert.equal(aside.getAttribute("role"), "note");
  assert.equal(aside.getAttribute("aria-label"), "Tool limitations");
  assert.ok(aside.classList.has("inline-notice"));
  assert.ok(aside.classList.has("limitation-banner"));

  const h = aside.children.find((c) => c.classList.has("limitation-headline"));
  const r = aside.children.find((c) => c.classList.has("limitation-replacement"));
  const g = aside.children.find((c) => c.classList.has("limitation-governs"));
  assert.equal(h.tagName, "STRONG");
  assert.equal(r.tagName, "P");
  assert.equal(g.tagName, "P");
  assert.equal(h._textContent, "Not a Manual J load calculation.");
  assert.equal(r._textContent, "A code-compliant load calculation requires ACCA Manual J 8th ed.");
  assert.equal(g._textContent, "The AHJ governs.");
});

test("renderLimitationBanner adds an <a rel=noopener> when link is supplied", async () => {
  const mod = await import("../../limitation-banner.js");
  const { host } = makeHost();
  const aside = mod.renderLimitationBanner(host, {
    headline: "Not a Manual J load calculation.",
    replacement: "Replacement text here.",
    who_governs: "AHJ governs.",
    link: "acca.org",
  });
  const linkP = aside.children.find((c) => c.classList.has("limitation-link"));
  assert.ok(linkP, "expected limitation-link paragraph");
  const a = linkP.children[0];
  assert.equal(a.tagName, "A");
  assert.equal(a.href, "acca.org");
  assert.equal(a.rel, "noopener");
  assert.match(a._textContent, /Free access: /);
});

test("renderLimitationBanner returns null when required fields are missing", async () => {
  const mod = await import("../../limitation-banner.js");
  const { host } = makeHost();
  // missing replacement
  let aside = mod.renderLimitationBanner(host, {
    headline: "X",
    who_governs: "Y",
  });
  assert.equal(aside, null);
  assert.equal(host.children.length, 0);
  // missing headline
  aside = mod.renderLimitationBanner(host, {
    replacement: "X",
    who_governs: "Y",
  });
  assert.equal(aside, null);
  // missing host
  aside = mod.renderLimitationBanner(null, {
    headline: "H",
    replacement: "R",
    who_governs: "G",
  });
  assert.equal(aside, null);
});

test("renderLimitationBanner inserts before existing children (banner appears above inputs)", async () => {
  const mod = await import("../../limitation-banner.js");
  const { doc, host } = makeHost();
  const existing = doc.createElement("div");
  existing.className = "input-region";
  host.appendChild(existing);
  const aside = mod.renderLimitationBanner(host, {
    headline: "H",
    replacement: "R",
    who_governs: "G",
  });
  assert.equal(host.children[0], aside, "banner must be the first child");
  assert.equal(host.children[1], existing);
});

test("getLimitationCopy returns the canonical entry for spec-v10 §4.3 tiles", async () => {
  const mod = await import("../../limitation-banner.js");
  // The tile ids spec-v10 §4.3 names explicitly:
  // Canonical copy is keyed by live tile id (post-Phase B.3 wiring).
  // arc-flash-screen and sous-vide-pasteurization are still in the
  // CANONICAL registry but are not (yet) live tile ids; they remain as
  // forward-compatible copy for when those tiles ship.
  const required = [
    "manual-j-cooling",
    "manual-j-heating",
    "arc-flash-screen",
    "outdoor-air-mix",
    "outdoor-air-ventilation",
    "stair-stringer",
    "slope-avalanche",
    "sous-vide-pasteurization",
    "septic-drainfield",
    "service-load",
  ];
  for (const id of required) {
    const copy = mod.getLimitationCopy(id);
    assert.ok(copy, "expected canonical copy for " + id);
    assert.ok(copy.headline.length > 0);
    assert.ok(copy.replacement.length > 0);
    assert.ok(copy.who_governs.length > 0);
  }
  // Unknown id returns null.
  assert.equal(mod.getLimitationCopy("not-a-real-tile"), null);
  assert.equal(mod.getLimitationCopy(null), null);
  // The full registry list is sorted.
  const ids = mod.listLimitationCopyIds();
  const sorted = [...ids].sort();
  assert.deepEqual(ids, sorted);
  // Every required id appears in the list.
  for (const id of required) assert.ok(ids.includes(id), id + " missing from list");
});

test("renderLimitationBanner clips overlong text rather than dropping it", async () => {
  const mod = await import("../../limitation-banner.js");
  const { host } = makeHost();
  const long = "x".repeat(500);
  const aside = mod.renderLimitationBanner(host, {
    headline: long,
    replacement: long,
    who_governs: long,
  });
  assert.ok(aside);
  const h = aside.children.find((c) => c.classList.has("limitation-headline"));
  // The clip rule is "<= max" preserved; over-max gets ellipsized.
  assert.ok(h._textContent.length <= 80, "headline should clip to <= 80 chars");
  assert.ok(h._textContent.endsWith("…"));
});
