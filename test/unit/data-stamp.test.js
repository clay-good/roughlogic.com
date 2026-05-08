// Unit tests for data-stamp.js. Uses fetch + DOM stubs.

import { test } from "node:test";
import assert from "node:assert/strict";

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.id = "";
    this.className = "";
    this.children = [];
    this.attributes = {};
    this.textContent = "";
    this.parent = null;
    this._listeners = {};
  }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  setAttribute(k, v) { this.attributes[k] = v; }
}

function setupDoc() {
  const main = new FakeElement("main"); main.id = "main";
  const dataVersion = new FakeElement("p"); dataVersion.id = "data-version";
  globalThis.document = {
    body: main,
    elements: { main, "data-version": dataVersion },
    getElementById(id) { return this.elements[id] || null; },
    createElement(tag) { return new FakeElement(tag); },
  };
  return { dataVersion };
}

function fakeFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (routes[url] === undefined) return { ok: false };
    const v = routes[url];
    return { ok: true, json: async () => v, text: async () => JSON.stringify(v) };
  };
  return calls;
}

test("fetchManifest returns parsed manifest and caches by folder", async () => {
  setupDoc();
  const calls = fakeFetch({
    "data/electrical/manifest.json": { name: "electrical", version: "2026-05-04", shards: [] },
  });
  const mod = await import("../../data-stamp.js?case=fetch");
  const a = await mod.fetchManifest("electrical");
  const b = await mod.fetchManifest("electrical");
  assert.equal(a.name, "electrical");
  assert.equal(a.version, "2026-05-04");
  assert.equal(b, a, "manifest cache should return same promise result");
  assert.equal(calls.filter((c) => c === "data/electrical/manifest.json").length, 1);
});

test("fetchManifest returns null on fetch failure (no cache poisoning)", async () => {
  setupDoc();
  fakeFetch({});
  const mod = await import("../../data-stamp.js?case=fail");
  const a = await mod.fetchManifest("hvac");
  assert.equal(a, null);
});

test("stampDataSource appends a Source: line built from the manifest", async () => {
  setupDoc();
  fakeFetch({
    "data/hvac/manifest.json": {
      name: "hvac", version: "2026-05-04", fetched: "2026-05-04",
      shards: [
        { file: "refrigerants.json", name: "Refrigerant P-T tables" },
        { file: "duct-friction.json", name: "Duct friction inputs" },
      ],
    },
  });
  const mod = await import("../../data-stamp.js?case=stamp");
  const region = new FakeElement("section");
  await mod.stampDataSource(region, { folder: "hvac", shard: "refrigerants.json" });
  assert.equal(region.children.length, 1);
  const line = region.children[0];
  assert.equal(line.className, "data-source-stamp");
  assert.equal(
    line.textContent,
    "Source: Refrigerant P-T tables, version 2026-05-04, fetched 2026-05-04."
  );
});

test("stampDataSource uses caller-supplied label when provided", async () => {
  setupDoc();
  fakeFetch({
    "data/electrical/manifest.json": { name: "electrical", version: "2026-05-04", shards: [{ file: "motor-fla.json", name: "Motor FLA" }] },
  });
  const mod = await import("../../data-stamp.js?case=label");
  const region = new FakeElement("section");
  await mod.stampDataSource(region, { folder: "electrical", shard: "motor-fla.json", label: "Motor full-load amps (manufacturer-attributed)" });
  assert.equal(
    region.children[0].textContent,
    "Source: Motor full-load amps (manufacturer-attributed), version 2026-05-04, fetched 2026-05-04."
  );
});

test("stampDataSource falls back gracefully when manifest is missing", async () => {
  setupDoc();
  fakeFetch({});
  const mod = await import("../../data-stamp.js?case=missing");
  const region = new FakeElement("section");
  await mod.stampDataSource(region, { folder: "ghost", shard: "x.json", label: "Ghost data" });
  assert.equal(region.children.length, 1);
  assert.ok(region.children[0].textContent.includes("Ghost data"));
  assert.ok(region.children[0].textContent.toLowerCase().includes("manifest unavailable"));
});

test("stampFooterVersion prefers build-info.json timestamp", async () => {
  const { dataVersion } = setupDoc();
  fakeFetch({
    "build-info.json": { built: "2026-05-04T15:00:00.000Z" },
  });
  const mod = await import("../../data-stamp.js?case=footer-build");
  await mod.stampFooterVersion();
  assert.equal(dataVersion.textContent, "Data version: 2026-05-04");
});

test("stampFooterVersion falls back to physical-constants manifest version", async () => {
  const { dataVersion } = setupDoc();
  fakeFetch({
    "data/physical-constants/manifest.json": { name: "physical-constants", version: "2026-05-04", shards: [] },
  });
  const mod = await import("../../data-stamp.js?case=footer-fallback");
  await mod.stampFooterVersion();
  assert.equal(dataVersion.textContent, "Data version: 2026-05-04");
});

test("stampFooterVersion writes 'dev' when nothing is available", async () => {
  const { dataVersion } = setupDoc();
  fakeFetch({});
  const mod = await import("../../data-stamp.js?case=footer-dev");
  await mod.stampFooterVersion();
  assert.equal(dataVersion.textContent, "Data version: dev");
});
