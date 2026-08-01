// Catalog layer for the roughlogic MCP server.
//
// Loads the existing site data — TOOLS metadata (tools-data.js), the
// tile-id -> compute-function wiring (test/fixtures/compute-map.js), and the
// publisher-verified worked examples (test/fixtures/worked-examples.json) —
// and exposes three operations the server surfaces as MCP tools:
//   search(query, trade, limit)  -> matching tile metadata
//   describe(id)                 -> inputs, example, outputs for one tile
//   run(id, inputs)              -> calls the tile's compute function
//
// No new data is authored here: the compute functions, their input shapes,
// and the example values are read straight from the repo, so the MCP surface
// can never drift from the site. Compute modules are lazy-imported on first
// run() of a tile in that module, exactly as the worked-example runner does.

import { readFile } from "node:fs/promises";
import { normalizeQuery, rankTools } from "../search-discovery.js";

const COMPUTE_MAP_URL = new URL("../test/fixtures/compute-map.js", import.meta.url);
const RENDERER_MAP_URL = new URL("../test/fixtures/renderer-map.js", import.meta.url);
const EXAMPLES_URL = new URL("../test/fixtures/worked-examples.json", import.meta.url);
const ALIASES_URL = new URL("../data/search/aliases.json", import.meta.url);

let _state = null;

async function load() {
  if (_state) return _state;
  const [{ TOOLS }, { COMPUTE_MAP }, { RENDERER_MAP }, examplesRaw, aliasesRaw] = await Promise.all([
    import(new URL("../tools-data.js", import.meta.url).href),
    import(COMPUTE_MAP_URL.href),
    // Renderer registry map (spec-v1184): the mirror of compute-map, resolving
    // a tile to the module/export whose render fn carries `render.schema`.
    // A missing map degrades every tile to compute-param introspection.
    import(RENDERER_MAP_URL.href).catch(() => ({ RENDERER_MAP: {} })),
    readFile(EXAMPLES_URL, "utf8"),
    // Alias shard for search parity with the browser combobox
    // (spec-v589); a missing or unreadable shard degrades to no aliases.
    readFile(ALIASES_URL, "utf8").catch(() => "{}"),
  ]);

  // First worked example per tile id (a tile can have several rows; the first
  // is a representative, runnable input set).
  const examples = new Map();
  for (const row of JSON.parse(examplesRaw).rows) {
    if (!examples.has(row.tile_id)) examples.set(row.tile_id, row);
  }

  const byId = new Map(TOOLS.map((t) => [t.id, t]));
  const modCache = new Map();

  let aliases = [];
  try {
    const parsed = JSON.parse(aliasesRaw);
    if (parsed && Array.isArray(parsed.aliases)) {
      aliases = parsed.aliases.filter(
        (row) =>
          row &&
          typeof row.term === "string" &&
          typeof row.target === "string" &&
          byId.has(row.target),
      );
    }
  } catch { /* degrade to no aliases */ }

  _state = { TOOLS, COMPUTE_MAP, RENDERER_MAP, examples, byId, modCache, aliases };
  return _state;
}

// Read the retained `render.schema` (spec-v1184) for a tile, or null when the
// tile's renderer is bespoke and carries none (the schema is added by the
// declarative renderer factories; hand-written renderers do not yet have it).
// Reuses the same lazy, cached module import as compute — the renderer and the
// compute function live in the same calc-*.js file.
async function readSchema(id, rendererMap, modCache) {
  const rreg = rendererMap[id];
  if (!rreg) return null;
  const url = new URL(rreg.module, RENDERER_MAP_URL).href;
  let mod = modCache.get(url);
  if (!mod) {
    mod = await import(url);
    modCache.set(url, mod);
  }
  const registry = mod[rreg.exportName];
  const renderFn = registry && registry[id];
  const schema = renderFn && renderFn.schema;
  return schema && Array.isArray(schema.inputs) ? schema : null;
}

// Expose a renderer schema only when every field key it advertises is an
// actual parameter of the tile's runnable compute function (spec-v1184). A few
// tiles wrap compute in a unit-converting closure whose field keys differ from
// the raw compute params the MCP layer calls; advertising those keys would let
// an agent build a `run` call the compute silently ignores. When the schema is
// inconsistent, the caller degrades to compute-param introspection instead, so
// `describe` never advertises an input `run` cannot honor.
function schemaIfConsistent(schema, fn) {
  if (!schema) return null;
  const params = new Set(introspectInputs(fn).map((p) => p.name));
  return schema.inputs.every((f) => params.has(f.key)) ? schema : null;
}

// The allowed values of a select field, tolerating both the {value,label}
// option shape the factories use and a bare-string option.
function selectValues(field) {
  if (!field || !Array.isArray(field.options)) return null;
  return field.options.map((o) => (o && typeof o === "object" ? o.value : o));
}

// Validate any input whose field is a `select` against that field's options
// (spec-v1184). A bad enum throws with the allowed values named, instead of
// silently coercing to a wrong answer. Numbers and free fields are untouched.
function validateSelects(schema, inputs) {
  if (!schema || !inputs) return;
  const byKey = new Map(schema.inputs.map((f) => [f.key, f]));
  for (const [key, value] of Object.entries(inputs)) {
    const field = byKey.get(key);
    if (!field || field.kind !== "select") continue;
    const allowed = selectValues(field);
    if (allowed && !allowed.includes(value)) {
      throw new Error(
        `invalid value for "${key}": ${JSON.stringify(value)}. Allowed: ${allowed.map((v) => JSON.stringify(v)).join(", ")}.`,
      );
    }
  }
}

// Resolve and import the calc module for a wired tile, caching by URL.
async function importCompute(reg, modCache) {
  const url = new URL(reg.module, COMPUTE_MAP_URL).href;
  let mod = modCache.get(url);
  if (!mod) {
    mod = await import(url);
    modCache.set(url, mod);
  }
  const fn = mod[reg.fn];
  if (typeof fn !== "function") {
    throw new Error(`compute export not found: ${reg.fn} in ${reg.module}`);
  }
  return fn;
}

// Parse the leading object-destructure of a compute function to recover its
// input parameter names and defaults. Handles every signature shape in the
// codebase: `({ a, b })`, `({ a = 1, b = "x" } = {})`, nested defaults.
function introspectInputs(fn) {
  const src = fn.toString();
  const open = src.indexOf("(");
  if (open === -1) return [];
  const brace = src.indexOf("{", open);
  if (brace === -1 || src.slice(open, brace).includes(")")) return [];
  // Brace-scan from the first `{` to its match.
  let depth = 0, end = -1;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return [];
  const inner = src.slice(brace + 1, end);

  const out = [];
  // Split on top-level commas only (object/array defaults can contain commas).
  depth = 0;
  let cur = "";
  for (const ch of inner) {
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out
    .map((part) => {
      const eq = part.indexOf("=");
      const name = (eq === -1 ? part : part.slice(0, eq)).trim();
      if (!name || name.startsWith("...")) return null;
      let def;
      if (eq !== -1) {
        const raw = part.slice(eq + 1).trim();
        try { def = JSON.parse(raw.replace(/'/g, '"')); } catch { def = raw; }
      }
      return { name, default: def };
    })
    .filter(Boolean);
}

export async function search({ query = "", trade = "", limit = 30 } = {}) {
  const { TOOLS, aliases } = await load();
  const q = String(query).toLowerCase().trim();
  const tr = String(trade).toLowerCase().trim();

  // No filters: return a trade overview instead of dumping the whole catalog.
  if (!q && !tr) {
    const counts = new Map();
    for (const t of TOOLS) for (const x of t.trades) counts.set(x, (counts.get(x) || 0) + 1);
    return {
      total: TOOLS.length,
      hint: "Pass `query` (keyword) and/or `trade` to filter. Trades below.",
      trades: [...counts].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ trade: name, count })),
    };
  }

  const pool = tr
    ? TOOLS.filter((t) => t.trades.some((x) => x.toLowerCase().includes(tr)))
    : TOOLS;

  // spec-v589: the browser combobox's deterministic NL ranker, shared via
  // search-discovery.js so agent and browser recall cannot drift. If the
  // query normalizes to nothing (stopwords only) or ranks nothing, fall
  // back to the original AND-of-substrings pass.
  let matches = null;
  if (q) {
    const { tokens } = normalizeQuery(q);
    if (tokens.length) {
      const ranked = rankTools(tokens, pool, aliases, { limit: pool.length });
      if (ranked.length) matches = ranked.map((r) => r.tool);
    }
  }
  if (!matches) {
    const terms = q.split(/\s+/).filter(Boolean);
    matches = pool.filter((t) => {
      if (!terms.length) return true;
      const hay = `${t.id} ${t.name} ${t.desc}`.toLowerCase();
      return terms.every((term) => hay.includes(term));
    });
  }

  return {
    total: matches.length,
    returned: Math.min(matches.length, limit),
    results: matches.slice(0, limit).map((t) => ({
      id: t.id, name: t.name, group: t.group, trades: t.trades, desc: t.desc,
    })),
  };
}

export async function describe({ id } = {}) {
  const { COMPUTE_MAP, RENDERER_MAP, examples, byId, modCache } = await load();
  const meta = byId.get(id);
  if (!meta) throw new Error(`unknown calculator id: ${id}`);

  const reg = COMPUTE_MAP[id];
  const ex = examples.get(id);
  const out = {
    id, name: meta.name, group: meta.group, trades: meta.trades, desc: meta.desc,
    runnable: Boolean(reg),
  };

  if (reg) {
    const fn = await importCompute(reg, modCache);
    // Prefer the renderer's field descriptor (labels, select options, units in
    // the label, min/max in attrs); fall back to compute-param introspection
    // (names + defaults only) for tiles whose renderer is still bespoke.
    const schema = schemaIfConsistent(await readSchema(id, RENDERER_MAP, modCache), fn);
    if (schema) {
      out.inputs = schema.inputs;
      out.outputs = schema.outputs;
      out.inputs_source = "renderer";
    } else {
      out.inputs = introspectInputs(fn);
      out.inputs_source = "compute";
    }
  }
  if (ex) {
    out.example = { inputs: ex.inputs, outputs: Object.fromEntries(Object.entries(ex.outputs).map(([k, v]) => [k, v.value])) };
    out.source = [ex.source_publisher, ex.source_title, ex.source_section_or_page].filter((s) => s && s !== "n/a").join(" — ");
  }
  return out;
}

export async function run({ id, inputs } = {}) {
  const { COMPUTE_MAP, RENDERER_MAP, examples, modCache, byId } = await load();
  if (!byId.has(id)) throw new Error(`unknown calculator id: ${id}`);
  const reg = COMPUTE_MAP[id];
  if (!reg) throw new Error(`calculator "${id}" has no compute function wired (reference/lookup tile)`);

  const fn = await importCompute(reg, modCache);
  // If the caller passes no inputs, fall back to the worked example so a bare
  // run still demonstrates the tile.
  let usedExample = false;
  let args = inputs;
  if (args == null || (typeof args === "object" && Object.keys(args).length === 0)) {
    const ex = examples.get(id);
    if (ex) { args = ex.inputs; usedExample = true; }
  }
  // spec-v1184: reject an out-of-set select value with the allowed values
  // named, rather than coercing a bad enum into a wrong number. Only enforced
  // for caller-supplied inputs (the worked example is already valid) and only
  // where the tile's renderer exposes a schema.
  if (!usedExample) {
    const schema = schemaIfConsistent(await readSchema(id, RENDERER_MAP, modCache), fn);
    validateSelects(schema, args);
  }
  const result = fn({ ...(args || {}) });
  return { id, inputs: args || {}, usedExample, result };
}
