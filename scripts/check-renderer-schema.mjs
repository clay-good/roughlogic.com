#!/usr/bin/env node
// spec-v1184 gate: keep the MCP field-schema surface honest as the catalog grows.
//
// Three assertions:
//   1. renderer-map.js is fresh — it equals a rebuild from app.js's declare()
//      table, so the fixture the MCP layer trusts cannot drift from app.js.
//   2. Schema/compute parity — every tile whose renderer carries a `render.schema`
//      exposes only field keys that are real parameters of its runnable compute
//      function. A schema key the compute never destructures is drift (an agent
//      would build a `run` call the compute silently ignores). Such tiles are
//      reported; the MCP layer degrades them to compute-param introspection.
//   3. Coverage ratchet — the set of consistently-covered tiles may only grow.
//      A checked-in baseline (renderer-schema-coverage.json) is the floor; a
//      tile dropping out of coverage fails the build. Run with `--write` to
//      record new coverage into the baseline after intentionally adding schema.
//
// Zero dependencies. `node scripts/check-renderer-schema.mjs [--write]`.

import { readFileSync, writeFileSync } from "node:fs";
import { parseDeclares } from "./build-renderer-map.mjs";

const ROOT = new URL("../", import.meta.url);
const RMAP_URL = new URL("test/fixtures/renderer-map.js", ROOT);
const CMAP_URL = new URL("test/fixtures/compute-map.js", ROOT);
const BASELINE_URL = new URL("test/fixtures/renderer-schema-coverage.json", ROOT);

const write = process.argv.includes("--write");
const fail = (msg) => { console.error(`✗ check-renderer-schema: ${msg}`); process.exit(1); };

// Recover a compute function's destructured parameter names (mirror of the
// parser in mcp/catalog.mjs, kept local so the gate has no import cycle).
function introspect(fn) {
  const s = fn.toString();
  const o = s.indexOf("("); if (o < 0) return [];
  const b = s.indexOf("{", o); if (b < 0 || s.slice(o, b).includes(")")) return [];
  let d = 0, e = -1;
  for (let i = b; i < s.length; i++) { if (s[i] === "{") d++; else if (s[i] === "}") { d--; if (!d) { e = i; break; } } }
  if (e < 0) return [];
  const out = []; d = 0; let cur = "";
  for (const ch of s.slice(b + 1, e)) {
    if ("([{".includes(ch)) d++; else if (")]}".includes(ch)) d--;
    if (ch === "," && !d) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((p) => { const eq = p.indexOf("="); const n = (eq < 0 ? p : p.slice(0, eq)).trim(); return n.startsWith("...") ? null : n; }).filter(Boolean);
}

async function main() {
  // --- 1. renderer-map freshness ---
  const appSrc = readFileSync(new URL("app.js", ROOT), "utf8");
  const { map: fresh, order } = parseDeclares(appSrc);
  const { RENDERER_MAP } = await import(RMAP_URL.href);
  const checkedIds = Object.keys(RENDERER_MAP);
  if (checkedIds.length !== order.length) {
    fail(`renderer-map is stale: fixture has ${checkedIds.length} ids, app.js declares ${order.length}. Run \`node scripts/build-renderer-map.mjs\`.`);
  }
  for (const id of order) {
    const a = RENDERER_MAP[id], b = fresh[id];
    if (!a || a.module !== b.module || a.exportName !== b.exportName) {
      fail(`renderer-map is stale for "${id}". Run \`node scripts/build-renderer-map.mjs\`.`);
    }
  }

  // --- 2. parity + build the consistently-covered set ---
  const { COMPUTE_MAP } = await import(CMAP_URL.href);
  const modCache = new Map();
  const imp = async (rel) => { const u = new URL(rel, CMAP_URL).href; let m = modCache.get(u); if (!m) { m = await import(u); modCache.set(u, m); } return m; };

  const covered = [];
  const inconsistent = [];
  for (const id of order) {
    const rreg = RENDERER_MAP[id];
    const rmod = await imp(rreg.module);
    const rf = rmod[rreg.exportName] && rmod[rreg.exportName][id];
    const schema = rf && rf.schema;
    if (!schema || !Array.isArray(schema.inputs)) continue;
    const creg = COMPUTE_MAP[id];
    if (!creg) { inconsistent.push(id); continue; }
    const cmod = await imp(creg.module);
    const fn = cmod[creg.fn];
    if (typeof fn !== "function") { inconsistent.push(id); continue; }
    const params = new Set(introspect(fn));
    if (schema.inputs.every((f) => params.has(f.key))) covered.push(id);
    else inconsistent.push(id);
  }
  covered.sort();

  // --- 3. coverage ratchet ---
  let baseline = { covered: [] };
  try { baseline = JSON.parse(readFileSync(BASELINE_URL, "utf8")); } catch { /* first run */ }
  const baseSet = new Set(baseline.covered || []);
  const curSet = new Set(covered);
  const regressed = [...baseSet].filter((id) => !curSet.has(id));
  const added = covered.filter((id) => !baseSet.has(id));

  if (write) {
    writeFileSync(BASELINE_URL, JSON.stringify({
      note: "spec-v1184 coverage ratchet. Tiles whose renderer exposes a render.schema consistent with the compute function. Grow with `node scripts/check-renderer-schema.mjs --write`; regeneration is intentional.",
      total_tiles: order.length,
      covered_count: covered.length,
      covered,
    }, null, 2) + "\n");
    console.log(`✓ wrote baseline: ${covered.length}/${order.length} tiles covered.`);
    if (inconsistent.length) console.log(`  (${inconsistent.length} tiles carry a schema inconsistent with compute; degraded, not exposed: ${inconsistent.join(", ")})`);
    return;
  }

  if (regressed.length) {
    fail(`coverage regressed — these tiles lost their field schema: ${regressed.join(", ")}. If intentional, run \`--write\`.`);
  }
  console.log(`✓ check-renderer-schema: ${covered.length}/${order.length} tiles expose a field schema (baseline ${baseSet.size}, +${added.length} new).`);
  if (added.length && !write) {
    console.log(`  ${added.length} newly-covered tiles not yet in the baseline; run \`node scripts/check-renderer-schema.mjs --write\` to record them.`);
  }
  if (inconsistent.length) {
    console.log(`  note: ${inconsistent.length} tiles carry a schema whose keys diverge from their compute params (a unit-converting renderer wrapper); the MCP layer degrades them to compute introspection. Follow-up: ${inconsistent.join(", ")}.`);
  }
}

main().catch((e) => fail(e.message));
