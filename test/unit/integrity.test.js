// Unit tests for integrity.js. Uses a fetch + DOM stub so the module can run
// under Node's built-in runner without a browser. Node 20 ships
// crypto.subtle; the SHA-256 path is exercised end-to-end.

import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createHash } from "node:crypto";

class FakeElement {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.id = ""; this.children = []; this.textContent = ""; this.className = ""; this.attributes = {}; }
  appendChild(c) { this.children.push(c); return c; }
  insertBefore(c, ref) { this.children.unshift(c); return c; }
  setAttribute(k, v) { this.attributes[k] = v; }
  get firstChild() { return this.children[0] || null; }
}

function setupGlobals(integrityJson, manifests, opts = {}) {
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  globalThis.TextEncoder = TextEncoder;
  globalThis.URLSearchParams = URLSearchParams;
  const main = new FakeElement("main"); main.id = "main";
  globalThis.document = {
    body: main,
    elements: { main },
    getElementById(id) { return this.elements[id] || null; },
    createElement(tag) { return new FakeElement(tag); },
  };
  // Track banner insertion.
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url === "data/integrity.json") {
      if (opts.failIntegrity) return { ok: false };
      return { ok: true, json: async () => integrityJson, text: async () => JSON.stringify(integrityJson) };
    }
    const m = url.match(/^data\/([^/]+)\/manifest\.json$/);
    if (m) {
      const folder = m[1];
      if (manifests[folder] !== undefined) {
        return { ok: true, text: async () => manifests[folder] };
      }
      return { ok: false };
    }
    return { ok: false };
  };
  return { calls, main };
}

function sha256Hex(s) { return createHash("sha256").update(s).digest("hex"); }

test("verifyManifestIntegrity returns no mismatches when hashes match", async () => {
  const manifestText = JSON.stringify({ name: "physical-constants", version: "2026-05-04", shards: [], hashes: {} }) + "\n";
  const integrity = { manifests: { "physical-constants": sha256Hex(manifestText) } };
  setupGlobals(integrity, { "physical-constants": manifestText });
  const mod = await import("../../integrity.js?case=ok");
  const r = await mod.verifyManifestIntegrity();
  assert.equal(r.skipped, false);
  assert.equal(r.mismatches.length, 0);
});

test("verifyManifestIntegrity flags mismatched manifest", async () => {
  const manifestText = JSON.stringify({ name: "electrical" }) + "\n";
  const integrity = { manifests: { electrical: "deadbeef" } };
  const { main } = setupGlobals(integrity, { electrical: manifestText });
  const mod = await import("../../integrity.js?case=mismatch");
  const r = await mod.verifyManifestIntegrity();
  const flagged = r.mismatches.find((m) => m.folder === "electrical");
  assert.ok(flagged);
  assert.equal(flagged.reason, "hash-mismatch");
  // Banner inserted into main.
  assert.ok(main.children.length >= 1);
  assert.ok(main.children[0].textContent.includes("electrical"));
});

test("verifyManifestIntegrity skips when integrity.json is missing", async () => {
  setupGlobals(null, {}, { failIntegrity: true });
  const mod = await import("../../integrity.js?case=missing");
  const r = await mod.verifyManifestIntegrity();
  assert.equal(r.skipped, true);
});

test("verifyManifestIntegrity flags missing manifest", async () => {
  const integrity = { manifests: { hvac: sha256Hex("anything") } };
  setupGlobals(integrity, {});
  const mod = await import("../../integrity.js?case=missing-manifest");
  const r = await mod.verifyManifestIntegrity();
  const flagged = r.mismatches.find((m) => m.folder === "hvac");
  assert.ok(flagged);
  assert.equal(flagged.reason, "missing");
});
