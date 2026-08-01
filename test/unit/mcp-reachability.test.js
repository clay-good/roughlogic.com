// spec-v1191: every tool a person can use in the browser is reachable by an
// agent over MCP. Walk the whole catalog through the catalog layer and assert
// each tile describes without throwing and carries the structured surfaces
// (inputs, citation, related), and that the id sets never drift apart.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe as describeTile, run as runTile } from "../../mcp/catalog.mjs";

const load = async () => {
  const { TOOLS } = await import("../../tools-data.js");
  const { COMPUTE_MAP } = await import("../../test/fixtures/compute-map.js");
  const { RENDERER_MAP } = await import("../../test/fixtures/renderer-map.js");
  return { TOOLS, COMPUTE_MAP, RENDERER_MAP };
};

test("the tool, compute, and renderer id sets are identical (no tile hidden from agents)", async () => {
  const { TOOLS, COMPUTE_MAP, RENDERER_MAP } = await load();
  const toolIds = new Set(TOOLS.map((t) => t.id));
  const computeIds = new Set(Object.keys(COMPUTE_MAP));
  const rendererIds = new Set(Object.keys(RENDERER_MAP));
  assert.equal(computeIds.size, toolIds.size, "compute-map covers every tile");
  assert.equal(rendererIds.size, toolIds.size, "renderer-map covers every tile");
  for (const id of toolIds) {
    assert.ok(computeIds.has(id), `${id} missing from compute-map`);
    assert.ok(rendererIds.has(id), `${id} missing from renderer-map`);
  }
});

test("every tile describes over MCP without throwing and carries the structured surfaces", async () => {
  const { TOOLS } = await load();
  const failures = [];
  for (const t of TOOLS) {
    try {
      const d = await describeTile({ id: t.id });
      if (!d.runnable) { failures.push(`${t.id}: not runnable`); continue; }
      if (!Array.isArray(d.inputs)) failures.push(`${t.id}: no inputs array`);
      if (!d.citation || typeof d.citation !== "object") failures.push(`${t.id}: no citation object`);
      if (!Array.isArray(d.related)) failures.push(`${t.id}: no related array`);
      if (!("limitation" in d)) failures.push(`${t.id}: no limitation field`);
    } catch (e) {
      failures.push(`${t.id}: threw ${e.message}`);
    }
  }
  assert.deepEqual(failures.slice(0, 20), [], `${failures.length} tile(s) failed to describe`);
});

test("every schema-covered tile runs over MCP and renders its outputs (spec-v1189 end-to-end)", async () => {
  // Drive the full run() path — schema consistency, enum handling, and output
  // formatting — for every covered tile against its worked example. Catches a
  // hand-authored or factory schema whose keys or formatters break run(), which
  // the describe-only sweep and the compute-only worked-example runner miss.
  const covered = JSON.parse(readFileSync(fileURLToPath(new URL("../fixtures/renderer-schema-coverage.json", import.meta.url)), "utf8")).covered;
  const failures = [];
  for (const id of covered) {
    try {
      const r = await runTile({ id }); // no inputs → worked-example fallback
      if (r.result && r.result.error) { failures.push(`${id}: result.error ${r.result.error}`); continue; }
      // Rendered outputs are present for factory/hand-authored schemas (which
      // retain output formatters) and absent for the inputs-only bespoke
      // extractions — both are valid, but when present they must be well-formed.
      if (r.outputs !== undefined) {
        if (!Array.isArray(r.outputs)) failures.push(`${id}: outputs is not an array`);
        else if (r.outputs.some((o) => o.display === undefined)) failures.push(`${id}: an output has no display field`);
      }
    } catch (e) {
      failures.push(`${id}: threw ${e.message}`);
    }
  }
  assert.deepEqual(failures.slice(0, 20), [], `${failures.length} covered tile(s) failed to run over MCP`);
});
