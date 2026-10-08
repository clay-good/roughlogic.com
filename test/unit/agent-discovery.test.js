// spec-v1188: the static agent-discovery files (llms.txt, .well-known/mcp.json)
// state the catalog size and the MCP tool set. Assert they track the live
// catalog and cannot drift from the server's actual surface.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderLlmsTxt, renderMcpManifest, MCP_TOOLS } from "../../scripts/agent-discovery.mjs";

const ROOT = new URL("../../", import.meta.url);
const liveTiles = () => (readFileSync(fileURLToPath(new URL("tools-data.js", ROOT)), "utf8").match(/^\s*\{ id: "/gm) || []).length;

test("llms.txt states the live tile count and every MCP tool", () => {
  const tiles = liveTiles();
  const txt = renderLlmsTxt({ tiles, modules: 57 });
  assert.ok(txt.includes(tiles.toLocaleString("en-US")), "states the comma-grouped tile count");
  for (const tool of MCP_TOOLS) assert.ok(txt.includes(tool), `names ${tool}`);
  assert.ok(txt.includes("/AGENTS.md"), "links AGENTS.md");
});

test("llms.txt names every curated collection with its landed count", async () => {
  const { COLLECTIONS } = await import("../../collections.js");
  const txt = renderLlmsTxt({ tiles: 10, modules: 1, collections: COLLECTIONS.map((c) => ({ slug: c.slug, title: c.title, count: 47 })) });
  for (const c of COLLECTIONS) assert.ok(txt.includes(`/collections/${c.slug}/ — ${c.title} (47 calculators`), "lists " + c.slug);
  assert.ok(!renderLlmsTxt({ tiles: 10, modules: 1 }).includes("## Collections"), "no empty section");
});

test(".well-known/mcp.json parses and lists the current tool set", () => {
  const tiles = liveTiles();
  const manifest = JSON.parse(renderMcpManifest({ version: "9.9.9", tiles }));
  assert.equal(manifest.transport, "stdio");
  assert.equal(manifest.version, "9.9.9");
  assert.deepEqual(manifest.tools, MCP_TOOLS);
  assert.ok(String(manifest.description).includes(String(tiles)));
});

test("the discovery tool list matches the golden surface manifest (no drift)", () => {
  const golden = JSON.parse(readFileSync(fileURLToPath(new URL("fixtures/mcp-surface.json", new URL("../", import.meta.url))), "utf8"));
  const goldenNames = golden.tools.map((t) => t.name).sort();
  assert.deepEqual([...MCP_TOOLS].sort(), goldenNames);
});
