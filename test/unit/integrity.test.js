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

test("verifyManifestIntegrity checks every folder recorded in integrity.json", async () => {
  // Regression: integrity.js previously iterated a hardcoded FOLDERS list
  // that fell behind data/integrity.json as v4 / v5 / v9 added shards
  // (trucking, historical, accounting, legal, lab, cross, field) which
  // were silently un-verified at runtime. The loop now reads keys from
  // expected.manifests so any folder added to integrity.json is covered.
  const manifests = {
    accounting: "{}\n",
    legal: "{}\n",
    lab: "{}\n",
    cross: "{}\n",
    field: "{}\n",
  };
  const integrity = {
    manifests: {
      accounting: sha256Hex(manifests.accounting),
      legal: sha256Hex(manifests.legal),
      lab: sha256Hex(manifests.lab),
      cross: sha256Hex(manifests.cross),
      field: sha256Hex(manifests.field),
    },
  };
  const { calls } = setupGlobals(integrity, manifests);
  const mod = await import("../../integrity.js?case=all-folders");
  const r = await mod.verifyManifestIntegrity();
  assert.equal(r.skipped, false);
  assert.equal(r.mismatches.length, 0);
  for (const folder of ["accounting", "legal", "lab", "cross", "field"]) {
    assert.ok(
      calls.includes("data/" + folder + "/manifest.json"),
      "expected fetch of data/" + folder + "/manifest.json",
    );
  }
});

// --- verifyShard: the shards themselves, not just the manifest ---
//
// The startup pass above only ever proved a manifest was the build's own. A
// tampered shard with an untouched manifest produced no banner, which is not
// what docs/threat-model.md says happens. These three cases pin the fix: a
// good shard is silent, a flipped byte banners, and a shard the manifest does
// not list is skipped rather than falsely accused.

test("verifyShard passes a shard whose bytes match the manifest hash", async () => {
  const shard = JSON.stringify({ rows: [1, 2, 3] }) + "\n";
  const manifestText = JSON.stringify({ name: "realestate", hashes: { "loan-limits.json": sha256Hex(shard) } });
  const { main } = setupGlobals({ manifests: {} }, { realestate: manifestText });
  const mod = await import("../../integrity.js?case=shard-ok");
  const r = await mod.verifyShard("realestate", "loan-limits.json", shard);
  assert.equal(r.ok, true);
  assert.equal(r.skipped, false);
  assert.equal(main.children.length, 0, "a good shard must not banner");
});

test("verifyShard flags a shard with a flipped byte and banners", async () => {
  const shard = JSON.stringify({ rows: [1, 2, 3] }) + "\n";
  const tampered = shard.replace("3", "9");
  assert.notEqual(tampered, shard, "seed must actually change the shard");
  const manifestText = JSON.stringify({ name: "realestate", hashes: { "loan-limits.json": sha256Hex(shard) } });
  const { main } = setupGlobals({ manifests: {} }, { realestate: manifestText });
  const mod = await import("../../integrity.js?case=shard-bad");
  const r = await mod.verifyShard("realestate", "loan-limits.json", tampered);
  assert.equal(r.ok, false);
  assert.equal(r.mismatch.reason, "shard-hash-mismatch");
  assert.equal(r.mismatch.expected, sha256Hex(shard));
  assert.ok(main.children[0].textContent.includes("loan-limits.json"));
});

test("verifyShard skips a shard the manifest does not record", async () => {
  const manifestText = JSON.stringify({ name: "realestate", hashes: {} });
  const { main } = setupGlobals({ manifests: {} }, { realestate: manifestText });
  const mod = await import("../../integrity.js?case=shard-unlisted");
  const r = await mod.verifyShard("realestate", "not-in-manifest.json", "anything");
  assert.equal(r.skipped, true);
  assert.equal(r.ok, true);
  assert.equal(main.children.length, 0, "an unrecorded shard must not banner");
});
