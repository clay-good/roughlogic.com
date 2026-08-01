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
import { getLimitationCopy } from "../limitation-banner.js";

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

  // All worked-example rows per tile id (spec-v1193). A tile can demonstrate
  // several cases — a straight pull and an angle pull, copper and aluminum —
  // and each is a publisher-verified, runnable input set. Row order is
  // preserved; rows[0] is the representative example used as the run fallback.
  const examples = new Map();
  for (const row of JSON.parse(examplesRaw).rows) {
    const rows = examples.get(row.tile_id);
    if (rows) rows.push(row);
    else examples.set(row.tile_id, [row]);
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

// Render the outputs the way the browser does (spec-v1189): each output's pure
// `format` closure turns the compute result into the exact display string a
// person sees ("24.0 in (straight pull)"), carrying the unit the raw number
// lacks. The closures are pure (no DOM); a throwing or non-string one degrades
// to display: null with the raw `result` still authoritative.
function renderOutputs(schema, result) {
  if (!schema || !Array.isArray(schema.outputs)) return undefined;
  return schema.outputs.map((o) => {
    let display = null;
    if (typeof o.format === "function") {
      try {
        const s = o.format(result);
        if (typeof s === "string" || typeof s === "number") display = String(s);
      } catch { display = null; }
    }
    return { key: o.key, label: o.label, unit: o.unit ?? null, display };
  });
}

// The output descriptors as exposed by `describe` — labels and units, without
// the (non-serializable) format closure `run` uses to build display strings.
function describeOutputs(schema) {
  if (!schema || !Array.isArray(schema.outputs)) return undefined;
  return schema.outputs.map((o) => ({ key: o.key, label: o.label, unit: o.unit ?? null }));
}

// The allowed values of a select field, tolerating both the {value,label}
// option shape the factories use and a bare-string option.
function selectValues(field) {
  if (!field || !Array.isArray(field.options)) return null;
  return field.options.map((o) => (o && typeof o === "object" ? o.value : o));
}

// Numeric range guardrails (spec-v1190): warn when a caller's number falls
// outside the field's min/max — the same bounds the browser enforces via
// HTML5 validity — instead of computing silently on an out-of-range value.
// Advisory, never fatal: the compute functions are total, and a deliberate
// sensitivity sweep past a nominal bound is legitimate; the warning just tells
// the agent where a person would see the field flag red.
function validateNumbers(schema, inputs) {
  const warnings = [];
  if (!schema || !inputs) return warnings;
  const byKey = new Map(schema.inputs.map((f) => [f.key, f]));
  for (const [key, raw] of Object.entries(inputs)) {
    const field = byKey.get(key);
    if (!field || field.kind === "select") continue;
    const attrs = field.attrs;
    if (!attrs) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (attrs.min != null && attrs.min !== "" && value < Number(attrs.min)) {
      warnings.push({ key, value, rule: "min", limit: Number(attrs.min), message: `${key} is below the field minimum (${attrs.min}).` });
    }
    if (attrs.max != null && attrs.max !== "" && value > Number(attrs.max)) {
      warnings.push({ key, value, rule: "max", limit: Number(attrs.max), message: `${key} is above the field maximum (${attrs.max}).` });
    }
  }
  return warnings;
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
  const exRows = examples.get(id) || [];
  const ex = exRows[0];
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
      out.outputs = describeOutputs(schema);
      out.inputs_source = "renderer";
    } else {
      out.inputs = introspectInputs(fn);
      out.inputs_source = "compute";
    }
  }
  const exView = (row) => ({
    inputs: row.inputs,
    outputs: Object.fromEntries(Object.entries(row.outputs).map(([k, v]) => [k, v.value])),
    source: [row.source_publisher, row.source_title, row.source_section_or_page].filter((s) => s && s !== "n/a").join(" — "),
  });
  if (ex) {
    // spec-v1193: the full example gallery — every case the tile's authors
    // demonstrate — with the first row kept as `example`/`source` aliases.
    out.examples = exRows.map(exView);
    out.example = { inputs: ex.inputs, outputs: exView(ex).outputs };
    out.source = exView(ex).source;
  }
  // spec-v1190: the simplified-screening banner a person sees above the inputs
  // ("Not a Manual J load calculation"), when this tile has one.
  out.limitation = getLimitationCopy(id) || null;
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
    const rows = examples.get(id);
    if (rows && rows[0]) { args = rows[0].inputs; usedExample = true; }
  }
  // spec-v1184: reject an out-of-set select value with the allowed values
  // named, rather than coercing a bad enum into a wrong number. Only enforced
  // for caller-supplied inputs (the worked example is already valid) and only
  // where the tile's renderer exposes a schema.
  const schema = schemaIfConsistent(await readSchema(id, RENDERER_MAP, modCache), fn);
  if (!usedExample) validateSelects(schema, args);
  const result = fn({ ...(args || {}) });
  const out = { id, inputs: args || {}, usedExample, result };
  // spec-v1189: alongside the raw result, the rendered outputs a person sees —
  // each with its unit and the formatted display string.
  const outputs = renderOutputs(schema, result);
  if (outputs) out.outputs = outputs;
  // spec-v1190: advisory range warnings for caller-supplied numbers, and the
  // tile's limitation banner. A verified worked example is in-range by
  // construction, so only caller inputs are checked.
  out.warnings = usedExample ? [] : validateNumbers(schema, args);
  out.limitation = getLimitationCopy(id) || null;
  return out;
}

// spec-v1187: bounded batch evaluation. The real agent tasks are plural — sweep
// a voltage drop across wire gauges, compare two layouts, re-run at three
// occupancy counts — each of which is a separate round-trip today. One call
// collapses them. Total and bounded: a bad item fails that item, not the batch,
// and the module cache is shared so a same-module sweep imports once.
const RUN_MANY_CAP = 50;
// --- MCP resources (spec-v1186) -----------------------------------------
// Views of the same catalog, addressable under a `roughlogic://` scheme, so a
// client can browse or attach content without knowing the tool names. A small,
// stable set (overview + one per trade) plus a per-tile URI template — the same
// restraint that made the tool surface meta-tools, not 1,567 tools.

function jsonResource(uri, data) {
  return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
}

export async function listResources() {
  const overview = await search({});
  const resources = [
    { uri: "roughlogic://catalog", name: "roughlogic catalog overview", description: "Trade overview with calculator counts.", mimeType: "application/json" },
  ];
  for (const t of overview.trades) {
    resources.push({
      uri: `roughlogic://trade/${encodeURIComponent(t.trade)}`,
      name: `${t.trade} calculators (${t.count})`,
      description: `Every calculator in the ${t.trade} trade.`,
      mimeType: "application/json",
    });
  }
  return { resources };
}

export function listResourceTemplates() {
  return {
    resourceTemplates: [{
      uriTemplate: "roughlogic://calculator/{id}",
      name: "Calculator card",
      description: "Inputs (with options and units), outputs, worked examples, citation, and limitation for one calculator id.",
      mimeType: "application/json",
    }],
  };
}

export async function readResource(uri) {
  const u = String(uri || "");
  let m;
  if (u === "roughlogic://catalog") return jsonResource(u, await search({}));
  if ((m = u.match(/^roughlogic:\/\/trade\/(.+)$/))) return jsonResource(u, await search({ trade: decodeURIComponent(m[1]) }));
  if ((m = u.match(/^roughlogic:\/\/calculator\/(.+)$/))) return jsonResource(u, await describe({ id: decodeURIComponent(m[1]) }));
  throw new Error(`unknown resource uri: ${uri}`);
}

export async function runMany({ calls } = {}) {
  if (!Array.isArray(calls)) throw new Error("`calls` must be an array of { id, inputs } objects.");
  if (calls.length > RUN_MANY_CAP) {
    throw new Error(`too many calls: ${calls.length} (max ${RUN_MANY_CAP} per run_calculators).`);
  }
  const results = [];
  for (const call of calls) {
    try {
      results.push(await run(call || {}));
    } catch (e) {
      results.push({ id: call && call.id, error: e && e.message ? e.message : String(e) });
    }
  }
  return { count: results.length, results };
}
