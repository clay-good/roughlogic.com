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
import { normalizeQuery, rankTools, fallbackSearch } from "../search-discovery.js";
import { getLimitationCopy } from "../limitation-banner.js";
// The shared result-key humanizer: the same fallback the static pages use, so
// a tile that captions nothing still names its answers on both doors.
import { humanizeKey } from "../key-labels.js";
// spec-v1185: the curated per-tile cross-links the browser shows as "related
// tiles". Build-time data; a missing/unreadable module degrades to no related.
let RELATED = {};
try { ({ RELATED } = await import("../scripts/related-tiles.mjs")); } catch { RELATED = {}; }
// Hand-authored captions for the worked-example rows the extractor cannot name
// (a line that shows three numbers under one caption, a compute-side key the
// renderer never prints alone). Display-only, and the FLOOR: an extracted label
// or a renderer schema overrides them. See scripts/curated-labels.mjs.
let CURATED_INPUT_LABELS = {};
let CURATED_OUTPUT_LABELS = {};
try {
  ({ CURATED_INPUT_LABELS, CURATED_OUTPUT_LABELS } = await import("../scripts/curated-labels.mjs"));
} catch { CURATED_INPUT_LABELS = {}; CURATED_OUTPUT_LABELS = {}; }
// spec-v1184 coverage growth: statically-extracted field schemas for bespoke
// (hand-written) renderers that carry no in-source render.schema. Read as a
// fallback; schemaIfConsistent still degrades any entry whose keys diverge.
let BESPOKE_SCHEMAS = {};
let BESPOKE_OUTPUT_UNITS = {};
try { ({ BESPOKE_OUTPUT_UNITS } = await import("../test/fixtures/bespoke-output-units.js")); } catch { BESPOKE_OUTPUT_UNITS = {}; }
let BESPOKE_OUTPUT_BOOLS = {};
try { ({ BESPOKE_OUTPUT_BOOLS } = await import("../test/fixtures/bespoke-output-bools.js")); } catch { BESPOKE_OUTPUT_BOOLS = {}; }
try { ({ BESPOKE_SCHEMAS } = await import("../test/fixtures/bespoke-schemas.js")); } catch { BESPOKE_SCHEMAS = {}; }
// Display-only field labels for renderers that earn no schema. Read by
// inputLabels() alone -- never by describe(), which must keep advertising only
// the input set run() can honor.
let BESPOKE_LABELS = {};
try { ({ BESPOKE_LABELS } = await import("../test/fixtures/bespoke-labels.js")); } catch { BESPOKE_LABELS = {}; }
let BESPOKE_OUTPUT_LABELS = {};
try { ({ BESPOKE_OUTPUT_LABELS } = await import("../test/fixtures/bespoke-output-labels.js")); } catch { BESPOKE_OUTPUT_LABELS = {}; }
// spec-v1185: literal citation strings extracted from bespoke renderers, so
// describe can attribute a result even when the tile carries no schema citation.
let RENDERER_CITATIONS = {};
try { ({ RENDERER_CITATIONS } = await import("../test/fixtures/renderer-citations.js")); } catch { RENDERER_CITATIONS = {}; }

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
  const schema = (renderFn && renderFn.schema) || BESPOKE_SCHEMAS[id];
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

// Answer captions for a tile whose renderer earns no schema (375 of them, most
// of the hand-written renderers). The caption the calculator prints above each
// number on its own page is already extracted for the website's tile shells;
// `outputLabels` merges that with the curated floor. Without it `describe` and
// `run` returned no outputs at all for those tiles, so an agent got a result
// object of bare keys -- `needed_pct` -- while the page beside it said "Needed
// final score".
//
// Unlike the input side, reading the extracted captions here is safe: an output
// key is read, never sent, so a caption can never advertise something `run`
// cannot honor. (That is why BESPOKE_LABELS must still stay out of the input
// list -- see inputLabels.)
//
// No unit and no display string: a bespoke renderer carries no format closure,
// and the extracted affixes are display wrapping ("eta^2 = ", " $"), not units.
// Reporting one as a unit would be a guess; `outputUnits(id)` exposes them as
// what they are for a caller that wants them.
//
// `result` is the evidence that a captioned key is a number this tile really
// produces. The captions are extracted from display code, and ten of them
// across the catalog name something no result carries -- a caption read off an
// input element, or a key from a mode the extractor blended in. On a shell page
// such a caption is a harmless no-op with nothing to label; advertised here it
// would be a claim about an answer that does not exist. So a caption is
// reported only for a key the tile is observed to produce: the caller's own
// result for `run`, and the worked example's result for `describe`.
function captionedOutputs(captions, result) {
  if (!result) return undefined;
  const keys = Object.keys(captions)
    .filter((k) => Object.prototype.hasOwnProperty.call(result, k));
  if (keys.length) return keys.map((k) => ({ key: k, label: captions[k] }));

  // Nothing captioned. 36 tiles landed here and came back with an EMPTY outputs
  // list -- an agent calling describe_calculator on the EGC sizer, the UTM
  // converter or the square-footage tile was told the calculator names nothing,
  // while those tiles' own static pages had been printing "Egc AWG", "Zone",
  // "Easting" and "Area (ft²)" the whole time, from key-labels.js, which the
  // page could reach and this could not. `check-both-doors` counted the gap
  // ("1,768 name their answers") while both doors are meant to answer alike.
  //
  // ONLY when the captioned set is empty. Humanizing every uncaptioned key on
  // every tile was measured first and rejected: it would add 5,460 keys across
  // 1,562 tiles, most of them intermediates the curated layers leave out on
  // purpose (`pass_flag`, `at_step_cap`, `divided_ocpd_A`), and reorder 146
  // tiles' existing answers. A weaker label where there was none is a fix; a
  // flood of intermediates where the labels were deliberate is a regression.
  const fallback = Object.keys(result).filter((k) => k !== "note" && k !== "error");
  // humanizeKey declines a short symbol-like key on purpose -- its own comment
  // says a symbol "says more as itself" -- and it returns null there. The key
  // is then the best label available, so use it rather than advertise a null.
  return fallback.length ? fallback.map((k) => ({ key: k, label: humanizeKey(k) || k })) : undefined;
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
//
// A select's options are always strings (a <select> has no other kind of
// value), but plenty of them are strings that *spell* numbers: "4" inches of
// pan depth, "95" percent confidence, "60" ksi. An agent reading a field named
// `pan_depth_in` and an allowed value of "4" naturally sends the number 4, and
// a strict `includes` rejected it -- as it rejected seven tiles' own published
// worked examples, whose fixtures record those inputs as numbers. So a value
// that matches an option in string form is accepted and normalized TO that
// option, because the compute behind a select is written against the string the
// browser's <select> hands it. Returns the inputs to use.
function validateSelects(schema, inputs) {
  if (!schema || !inputs) return inputs;
  const byKey = new Map(schema.inputs.map((f) => [f.key, f]));
  let normalized = inputs;
  for (const [key, value] of Object.entries(inputs)) {
    const field = byKey.get(key);
    if (!field || field.kind !== "select") continue;
    const allowed = selectValues(field);
    if (!allowed) continue;
    if (allowed.includes(value)) continue;
    const match = allowed.find((v) => String(v) === String(value));
    if (match === undefined) {
      throw new Error(
        `invalid value for "${key}": ${JSON.stringify(value)}. Allowed: ${allowed.map((v) => JSON.stringify(v)).join(", ")}.`,
      );
    }
    if (normalized === inputs) normalized = { ...inputs };
    normalized[key] = match;
  }
  return normalized;
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

// Strip `//` and `/* */` comments, leaving string literals alone. A compute's
// destructure may carry a maintainer note between two parameters, and a
// comment is not a parameter: without this, `npsh-a` advertised an input named
// "// positive if source above pump\n  friction_loss_ft", which no caller can
// spell and the compute therefore never received.
function stripComments(src) {
  let out = "";
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      out += ch;
      if (ch === "\\") { out += src[++i] ?? ""; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; out += ch; continue; }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i++;
      out += " ";
      continue;
    }
    out += ch;
  }
  return out;
}

const PARAM_NAME = /^[A-Za-z_$][\w$]*$/;

// Parse the leading object-destructure of a compute function to recover its
// input parameter names and defaults. Handles every signature shape in the
// codebase: `({ a, b })`, `({ a = 1, b = "x" } = {})`, nested defaults,
// interleaved comments, and the renamed form `({ protected: prot })` — where
// the key a caller must send is `protected`, not the local alias.
function introspectInputs(fn) {
  const src = stripComments(fn.toString());
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
      let name = (eq === -1 ? part : part.slice(0, eq)).trim();
      if (!name || name.startsWith("...")) return null;
      // `protected: prot` renames the key on the way in; the caller still
      // sends `protected`. Slicing at the colon also yields the right key for
      // a nested pattern (`opts: { a }` -> `opts`).
      const colon = name.indexOf(":");
      if (colon !== -1) name = name.slice(0, colon).trim();
      if (!PARAM_NAME.test(name)) return null;
      let def;
      if (eq !== -1) {
        const raw = part.slice(eq + 1).trim();
        try { def = JSON.parse(raw.replace(/'/g, '"')); } catch { def = raw; }
      }
      return { name, default: def };
    })
    .filter(Boolean);
}

// Whether a compute's parameter list is CLOSED -- a plain object destructure
// with no rest element, so the keys it accepts are exactly the ones named.
//
// `computeGeometry({ shape, ...args })` is not closed: it reads a different set
// of keys per shape, and every one of them is legitimate. `computeRentVsBuy(inp)`
// takes a bare object and is not closed either. Neither can be checked against a
// key list, so neither is.
function acceptsOnlyNamedKeys(fn) {
  const src = stripComments(fn.toString());
  const open = src.indexOf("(");
  if (open === -1) return false;
  const brace = src.indexOf("{", open);
  if (brace === -1 || src.slice(open, brace).includes(")")) return false;
  let depth = 0, end = -1;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return false;
  return !src.slice(brace + 1, end).includes("...");
}

// spec-v1190 companion: an input key the compute cannot receive.
//
// `run` spreads the caller's object into the compute, so a key the destructure
// does not name is dropped without a word and the tile answers from its
// defaults -- a confident number built on a value the caller believes it
// supplied. A misspelled `Rr` for `R`, or the key the tile's own PAGE shows for
// one of the four calculators whose renderer converts units at the boundary
// (`ambient_F` where the compute takes `ambient_C`), both landed that way.
//
// Advisory, like the range warnings beside it: the compute is total and still
// returns, but the caller is told which of its values never arrived.
function validateKnownKeys(fn, inputs, advertised) {
  const warnings = [];
  if (!inputs || !advertised || !advertised.size) return warnings;
  if (!acceptsOnlyNamedKeys(fn)) return warnings;
  for (const key of Object.keys(inputs)) {
    if (advertised.has(key)) continue;
    warnings.push({
      key, rule: "unknown",
      message: `"${key}" is not an input of this calculator; it was ignored and the ` +
        `default was used. Call describe_calculator for the keys it accepts.`,
    });
  }
  return warnings;
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
  // query normalizes to nothing (stopwords only) or ranks nothing, fall back
  // to the shared pass the combobox uses in the same situation.
  let matches = null;
  if (q) {
    const { tokens } = normalizeQuery(q);
    if (tokens.length) {
      const ranked = rankTools(tokens, pool, aliases, { limit: pool.length });
      if (ranked.length) matches = ranked.map((r) => r.tool);
    }
  }
  if (!matches) {
    // One shared pass, in search-discovery.js, so the two doors cannot answer
    // a digit-led query differently -- which they did, on 287 of the 500 such
    // queries the alias file implies, for as long as each door wrote its own.
    // Uncapped here so `total` still counts every match; the slice below is
    // what limits the reply, and the shared order makes that slice a prefix of
    // what the browser shows.
    // A trade filter with no query is a browse, not a search: the whole pool.
    matches = q ? fallbackSearch(q, pool, aliases, pool.length) : pool;
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
  if (!meta) throw new Error(`unknown calculator id: ${JSON.stringify(id)}. Call search_calculators to find one.`);

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
    const rawSchema = await readSchema(id, RENDERER_MAP, modCache);
    const schema = schemaIfConsistent(rawSchema, fn);
    if (schema) {
      // A partially-mapped renderer schema (e.g. a select tile whose other
      // inputs the extractor could not resolve) is completed from the compute
      // function's parameters, so `describe` advertises the full input set --
      // rich descriptors where known, plain param entries for the rest -- and
      // never under-reports an input an agent must supply.
      const known = new Set(schema.inputs.map((f) => f.key));
      const extra = introspectInputs(fn)
        .filter((p) => !known.has(p.name))
        .map((p) => ({ key: p.name, label: null, kind: null, options: null, default: p.default ?? null, attrs: null }));
      out.inputs = extra.length ? [...schema.inputs, ...extra] : schema.inputs;
      out.outputs = describeOutputs(schema);
      out.inputs_source = "renderer";
    } else {
      out.inputs = introspectInputs(fn);
      out.inputs_source = "compute";
    }
    if (!out.outputs) {
      // The worked example is this tile's own verified input set, so the keys
      // it produces are the keys the tile answers with.
      let exResult = null;
      if (ex && ex.inputs) { try { exResult = fn({ ...ex.inputs }); } catch { exResult = null; } }
      const captioned = captionedOutputs(await outputLabels(id), exResult);
      if (captioned) out.outputs = captioned.map((o) => ({ ...o, unit: null }));
      out.outputs_source = captioned ? "captions" : null;
    } else {
      out.outputs_source = "renderer";
    }
    // Some computes cannot be read from their signature at all: a few take a
    // bare object (`computeRentVsBuy(inp)`) and a few collect a shape-dependent
    // key set through a rest element (`{ shape, ...args }`). Introspection
    // returns nothing or almost nothing for these, and the door was advertising
    // an empty input list for tiles that need thirteen values.
    //
    // The publisher-verified worked example is a complete, valid input set for
    // exactly this tile, authored separately from the signature. Any key it
    // sets that nothing else advertises is added, so `describe` still names
    // every value a caller must supply. These carry no label or default --
    // the example itself, returned alongside, is what shows their shape.
    if (ex && ex.inputs) {
      const rich = out.inputs_source === "renderer";
      const known = new Set((out.inputs || []).map((f) => f.name ?? f.key));
      const fromExample = Object.keys(ex.inputs)
        .filter((k) => !known.has(k))
        .map((k) => (rich
          ? { key: k, label: null, kind: null, options: null, default: null, attrs: null }
          : { name: k, default: undefined }));
      if (fromExample.length) out.inputs = [...(out.inputs || []), ...fromExample];
    }
    // spec-v1185: the cited section + formula shown in the browser, retained on
    // the schema even for the unit-wrapper tiles whose inputs degrade.
    out._citationText = (rawSchema && rawSchema.citation) || RENDERER_CITATIONS[id] || null;
    out._scope = rawSchema && rawSchema.scope ? rawSchema.scope : null;
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
  // spec-v1185: structured attribution and navigation. The citation names the
  // source and locator the site already shows (never the copyrighted table
  // contents); related resolves the curated cross-links to names, dropping any
  // dangling id (a spec's related list can point at a never-landed tile).
  out.citation = {
    text: out._citationText || null,
    publisher: ex ? ex.source_publisher : null,
    title: ex ? ex.source_title : null,
    locator: ex ? ex.source_section_or_page : null,
  };
  out.scope_note = out._scope || null;
  out.related = (RELATED[id] || [])
    .map((rid) => (byId.get(rid) ? { id: rid, name: byId.get(rid).name } : null))
    .filter(Boolean);
  delete out._citationText;
  delete out._scope;
  // spec-v1190: the simplified-screening banner a person sees above the inputs
  // ("Not a Manual J load calculation"), when this tile has one.
  out.limitation = getLimitationCopy(id) || null;
  return out;
}

// The human field labels the browser prints above each input ("Length one-way
// (ft)"), keyed by the field name `run` takes. The static tile shells read this
// so the worked example on a page names its inputs the way the calculator does,
// instead of showing only the machine key. Tiles whose renderer carries no
// schema -- or whose schema keys diverge from the compute params, the same
// consistency rule `describe` applies -- return {} and the shell falls back to
// the key. Never throws: a shell build must not fail on an unknown id.
export async function inputLabels(id) {
  const { COMPUTE_MAP, RENDERER_MAP, modCache } = await load();
  const reg = COMPUTE_MAP[id];
  if (!reg) return {};
  // The statically-extracted labels are the floor; a consistent renderer schema
  // overrides them, since it is the renderer's own descriptor rather than a
  // parse of it.
  const out = { ...(CURATED_INPUT_LABELS[id] || {}), ...(BESPOKE_LABELS[id] || {}) };
  try {
    const fn = await importCompute(reg, modCache);
    const schema = schemaIfConsistent(await readSchema(id, RENDERER_MAP, modCache), fn);
    if (schema) {
      for (const f of schema.inputs) {
        if (f && f.key && typeof f.label === "string" && f.label.trim()) out[f.key] = f.label.trim();
      }
    }
  } catch { /* keep whatever the extracted labels gave us */ }
  return out;
}

// Which compute result key a schema output descriptor actually captions.
//
// A declarative renderer describes each output line by its DISPLAY id ("v",
// "cf"), not by a result key, so taking that id at face value names almost
// nothing -- and once named the wrong number. The honest source is the line's
// own formatter, `value: (r) => fmt(r.tank_volume_gal, 0) + " gal"`, which says
// which result the caption sits above.
//
// A key the formatter only TESTS -- `r.heating ? "heating: " : ""` -- picks the
// wording rather than reporting a number, so it is not one of the line's
// answers. Dropping those is what lets "Total coil load" reach `q_btuh` instead
// of stopping at the `heating` flag in front of it.
const COND_REF = /(!\s*)?\br\.([A-Za-z_$][\w$]*)\s*(\?|===|!==|==|!=|>=|<=|>|<|&&|\|\|)?/g;

// A caption that is a bare judgment ("Verdict", "Check") or a question is the
// name of a conclusion. Where the line reports one thing that IS the
// conclusion, that is exactly right -- "Verdict PASS". Where the line states
// the conclusion in words and carries a number along inside the sentence
// ("FAILS: area by 3 sq in"), the caption belongs to the sentence, and putting
// it over the 3 names something the reader cannot see.
const NOT_A_QUANTITY = new Set(["verdict", "status", "check", "result", "count", "note"]);

function schemaOutputKey(o, label) {
  if (typeof o.format !== "function") return o.key || null;
  const src = o.format.toString();
  const all = [], shown = [];
  for (const m of src.matchAll(COND_REF)) {
    const [, negated, key, operator] = m;
    // `r.error` / `r.message` is the failure branch borrowing a line whose
    // caption belongs to the value it shows when things go right.
    if (key === "error" || key === "message") continue;
    if (!all.includes(key)) all.push(key);
    if (negated || operator) continue;
    if (!shown.includes(key)) shown.push(key);
  }
  // A conclusion-caption is only trustworthy when the line has one subject.
  if (all.length > 1 && (label.endsWith("?") || NOT_A_QUANTITY.has(label.toLowerCase()))) return null;
  // One number, one caption. A line that reports a single key as words
  // (`r.pass ? "PASS" : "FAIL"`) tests it and shows nothing else, so that key
  // is still what the caption is about.
  if (shown.length === 1) return shown[0];
  if (shown.length === 0) return all.length === 1 ? all[0] : null;
  // Several answers on one line ("12 x 8 = 96 panels"): the caption belongs to
  // the whole line unless the author's own display id repeats the value it
  // leads with, which is them naming it.
  return o.key === shown[0] ? shown[0] : null;
}

// The answer-side counterpart of inputLabels: the caption the calculator prints
// above each output, keyed by the compute result key. A renderer schema's own
// output descriptors win where they name a real result key; the extracted
// captions cover the hand-written renderers, which are most of the catalog.
export async function outputLabels(id) {
  const { COMPUTE_MAP, RENDERER_MAP, modCache } = await load();
  const reg = COMPUTE_MAP[id];
  if (!reg) return {};
  const out = { ...(CURATED_OUTPUT_LABELS[id] || {}), ...(BESPOKE_OUTPUT_LABELS[id] || {}) };
  try {
    const fn = await importCompute(reg, modCache);
    const schema = schemaIfConsistent(await readSchema(id, RENDERER_MAP, modCache), fn);
    if (schema && Array.isArray(schema.outputs)) {
      const claimed = new Map();
      for (const o of schema.outputs) {
        if (!o || typeof o.label !== "string" || !o.label.trim()) continue;
        const label = o.label.trim();
        const key = schemaOutputKey(o, label);
        if (!key) continue;
        // Two lines writing the same result disagree about what it is called;
        // the bare key says less than a coin flip between them.
        if (claimed.has(key)) { if (claimed.get(key) !== label) claimed.set(key, null); continue; }
        claimed.set(key, label);
      }
      // One caption over two different numbers names neither of them.
      const uses = new Map();
      for (const label of claimed.values()) if (label) uses.set(label, (uses.get(label) || 0) + 1);
      for (const [key, label] of claimed) {
        if (label && uses.get(label) === 1) out[key] = label;
      }
    }
  } catch { /* keep whatever the extracted captions gave us */ }
  return out;
}

// The answer STRING the calculator prints for each result key -- the number
// with the unit and any wording attached to it ("24.4 A", "$1,200/yr", "PASS").
// `outputLabels` names an answer; this says what the answer reads like once the
// renderer has formatted it. Only lines the schema resolves to exactly one
// result key are reported, so a display can never be attributed to a number it
// is not about. Bespoke (hand-written) renderers have no format closure and
// return nothing here; their answers stay bare.
// The text a hand-written renderer wraps around an answer -- `{ prefix, suffix }`
// per result key, statically extracted from the renderer's own display
// expression. `outputDisplays` covers the renderers that carry a format
// closure; this covers the rest, for a caller that has the number already.
export function outputUnits(id) {
  return BESPOKE_OUTPUT_UNITS[id] || {};
}

// The two words a hand-written renderer prints for a BOOLEAN answer, keyed by
// result key: `{ t, f }`. A worked example records a boolean as 0 or 1, so the
// tile page printed `PMI required? 0` where the calculator says "No".
export function outputBooleans(id) {
  return BESPOKE_OUTPUT_BOOLS[id] || {};
}

// Assemble the answer STRING a hand-written renderer prints, from the affixes
// `outputUnits` extracted: prefix + number + suffix, at the tile's own
// precision. This is the one implementation -- `scripts/build-shells.mjs`
// prints the tile pages with it and `run` returns it -- so an agent and a
// reader cannot be shown a differently-formatted answer for the same number.
//
// `val` is the caller's default rendering of `raw`, used when the tile states
// no digit count. Returns null when there is nothing to add, so the caller can
// fall back rather than print a bare number dressed as a formatted one.
export function formatWithUnit(unit, raw, val, caption) {
  if (!unit || (!unit.prefix && !unit.suffix)) return null;
  // `scale` is the factor the renderer applies before printing -- the x100 that
  // turns a 0.6 ratio into the 60% its page shows. Applying it here is what
  // lets the unit be kept at all: without it the choice was a wrong number
  // ("0.6%") or a bare one ("0.6").
  let body;
  if (typeof raw === "number" && typeof unit.scale === "number") {
    const v = raw * unit.scale;
    body = atToolPrecision(v, String(v), unit.digits);
  } else if (typeof raw === "number") {
    body = atToolPrecision(raw, val, unit.digits);
  } else {
    body = val;
  }
  if (body === "" || body == null) return null;
  return (unit.prefix || "") + body + withoutRepeat(unit.suffix, caption);
}

// A suffix the caption already says would stutter: "Total loss db" then "3 db".
// "cal/cm²" and "cal/cm^2" are the same unit spelled two ways. Exported because
// the tile pages apply the same guard to a renderer's own formatted string.
export function withoutRepeat(suffix, label) {
  if (!suffix || !label) return suffix || "";
  const flat = (x) => String(x).replace(/\u00b2/g, "^2").replace(/\u00b3/g, "^3").toLowerCase();
  const token = flat(suffix.trim().replace(/^[^A-Za-z0-9\u00b2\u00b3]+|[^A-Za-z0-9^/%\u00b2\u00b3-]+$/g, ""));
  if (!token) return suffix;
  const hay = flat(label);
  const re = new RegExp("(^|[^a-z0-9])" + token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)");
  return re.test(hay) ? "" : suffix;
}

// A raw number carries full precision; the calculator rounds before showing it.
// "Simple payback 1.52625" where the tool says "1.5" quotes a precision the
// tool never claimed. Only ever rounds DOWN to the tool's decimals -- padding a
// clean 5 out to 5.0000 would read worse, not better.
function atToolPrecision(raw, val, digits) {
  if (typeof digits !== "number" || !Number.isFinite(raw) || Math.abs(raw) >= 1e15) return val;
  const shownDecimals = (String(raw).split(".")[1] || "").length;
  if (shownDecimals <= digits) return val;
  return raw.toFixed(digits);
}

export async function outputDisplays(id, inputs) {
  const { COMPUTE_MAP, RENDERER_MAP, modCache } = await load();
  const reg = COMPUTE_MAP[id];
  if (!reg) return {};
  const out = {};
  try {
    const fn = await importCompute(reg, modCache);
    const schema = schemaIfConsistent(await readSchema(id, RENDERER_MAP, modCache), fn);
    if (!schema || !Array.isArray(schema.outputs)) return out;
    const result = fn({ ...(inputs || {}) });
    if (!result || result.error) return out;
    for (const o of schema.outputs) {
      if (!o || typeof o.format !== "function") continue;
      const label = typeof o.label === "string" ? o.label.trim() : "";
      const key = schemaOutputKey(o, label);
      if (!key || key in out) continue;
      let display = null;
      try { const s = o.format(result); if (typeof s === "string" || typeof s === "number") display = String(s); } catch { display = null; }
      if (display) out[key] = display;
    }
  } catch { /* a tile whose renderer will not import keeps its bare answers */ }
  return out;
}

export async function run({ id, inputs } = {}) {
  const { COMPUTE_MAP, RENDERER_MAP, examples, modCache, byId } = await load();
  if (!byId.has(id)) throw new Error(`unknown calculator id: ${JSON.stringify(id)}. Call search_calculators to find one.`);
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
  if (!usedExample) args = validateSelects(schema, args);
  const result = fn({ ...(args || {}) });
  const out = { id, inputs: args || {}, usedExample, result };
  // spec-v1189: alongside the raw result, the rendered outputs a person sees —
  // each with its unit and the formatted display string.
  const outputs = renderOutputs(schema, result);
  if (outputs) out.outputs = outputs;
  else {
    // A bespoke renderer has no schema and no format closure, but its printed
    // captions name the numbers. Only keys this result actually carries are
    // reported, so a caption is never attached to an absent value.
    const captioned = captionedOutputs(await outputLabels(id), result);
    // A BOOLEAN answer is the exception, and it is not a reconstruction: the
    // renderer states both words as literals (`flag ? "PASS" : "FAIL"`), so the
    // string for the state this result is in is exactly what the page prints --
    // verified against the rendered pages, 15 of 15 identical. Numbers are the
    // ones that cannot be rebuilt.
    //
    // Deliberately no `display` for anything else. Rebuilding one as prefix + raw + suffix was
    // measured against the tile pages twice. The first attempt matched 892 of
    // 980 rows, and the misses were real defects -- an affix sitting around a
    // display expression that SCALES the value first, which is now recorded and
    // fixed. Re-measured after that fix it is 1,061 of 1,151, and the remaining
    // 90 are a different, duller problem: the renderers' own `fmt` groups
    // thousands ("$81,939.67" against a rebuilt "$81939.67") and plenty of
    // lines print two numbers at once ("0.500 ft (6.00 in)"). Neither is
    // recoverable from an affix, so the door states what it knows -- the
    // caption names the number, `result` is the number -- and invents nothing
    // in between. `outputUnits(id)` exposes the affixes for a caller that wants
    // to format its own.
    if (captioned) {
      const words = outputBooleans(id);
      out.outputs = captioned.map((o) => {
        const v = result[o.key];
        const w = words[o.key];
        const display = (typeof v === "boolean" && w) ? (v ? w.t : w.f) : null;
        return { ...o, unit: null, display };
      });
    }
  }
  // spec-v1190: advisory range warnings for caller-supplied numbers, and the
  // tile's limitation banner. A verified worked example is in-range by
  // construction, so only caller inputs are checked.
  // The keys the door advertises are the keys `run` can honor: schema fields
  // where the tile has a consistent one, the compute's own parameters
  // otherwise, plus anything the worked example names for a signature that
  // cannot be read. A verified example is correct by construction, so only
  // caller-supplied inputs are checked.
  out.warnings = usedExample
    ? []
    : validateNumbers(schema, args).concat(
      validateKnownKeys(
        fn,
        args,
        new Set((await describe({ id })).inputs?.map((f) => f.name ?? f.key) || []),
      ),
    );
  out.limitation = getLimitationCopy(id) || null;
  return out;
}

// spec-v1344: answer a plain-language question in ONE call.
//
// An agent that already knows the values -- because the user's question
// contained them -- still needed three round trips: search to pick a tile,
// describe to learn its input keys, run to compute, re-typing values it had
// written out itself. If a large share of this site's traffic is agents, that
// is the highest-leverage thing in the whole one-box program.
//
// The field descriptors come from data/fields/<bucket>.json -- the SAME shards
// the browser reads, including the spec-v1342 `r` (required) flags. Reading
// them rather than re-projecting describe()'s output means an agent and a
// person cannot disagree about what a tile needs. A missing shard degrades to
// a projection of describe(), minus requiredness.
// A value a numeric extractor can be trusted to recover from a typed question:
// a number, or a string that is entirely one. A list, a date, a coded token or
// a paragraph is not, however numeric it looks at the front.
function isPlainNumber(v) {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t !== "" && Number.isFinite(Number(t));
}

async function fieldRowsFor(id, group) {
  const { bucketFor } = await import(new URL("../field-bucket.js", import.meta.url).href);
  try {
    const url = new URL(`../data/fields/${bucketFor(group, id)}.json`, import.meta.url);
    const shard = JSON.parse(await readFile(url, "utf8"));
    if (shard && shard.tiles && shard.tiles[id]) return shard.tiles[id];
  } catch { /* fall through to the projection below */ }
  try {
    const described = await describe({ id });
    const { unitFromLabel, labelLead } = await import(new URL("../field-units.js", import.meta.url).href);
    // 379 tiles have no shard, because only a tile with a renderer schema gets
    // one. Their inputs come back from compute introspection instead: a `name`
    // and nothing else. This projection used to require `key` AND `label`, so
    // it dropped every one of them and returned an empty row list -- and a
    // question about any of those tiles could only ever answer NO_VALUES.
    //
    // The calculator's own field captions are already recovered for exactly
    // this shape (they are what the static shells print), so they supply the
    // label the introspected input lacks. An input that stays unlabelled is
    // dropped as before: those are the list-valued inputs (`loads`,
    // `conductors_by_size`) that a typed question cannot fill anyway.
    const labels = await inputLabels(id);
    const example = (described.example && described.example.inputs) || {};
    return (described.inputs || [])
      .map((f) => {
        if (!f) return null;
        const key = f.key ?? f.name;
        if (typeof key !== "string" || !key) return null;
        const label = (typeof f.label === "string" && f.label.trim()) ? f.label : labels[key];
        if (typeof label !== "string" || !label.trim()) return null;
        const row = { d: key, l: labelLead(label) };
        if (f.kind) row.k = f.kind;
        const unit = unitFromLabel(label);
        if (unit) row.u = unit;
        if (f.kind === "select" && Array.isArray(f.options)) {
          row.o = f.options.map((o) => (o && typeof o === "object" ? o.value : o)).filter((v) => v != null).map(String);
          return row;
        }
        // An introspected input carries no kind and no options, so nothing here
        // says whether it holds a plain number or something a numeric extractor
        // must not guess at. Its worked-example value does: where the tile's own
        // verified example holds a list, a multi-line block, an ISO date, or a
        // coded token ("wingwall_30_75", "1.5_inch_solid", "4:1"), the extractor
        // scrapes the first number out of the question and fills the field with
        // it. That produced 21 confidently wrong values across these tiles --
        // and a wrong value is worse than no value, because it answers.
        //
        // Such a field is kept but marked unfillable: a `select` with no options
        // is in neither of query-fill's two buckets (numberRows excludes every
        // select; selectRows requires an options array), so nothing can fill it,
        // and it surfaces by name in MISSING_INPUTS instead.
        if (!row.k && key in example && !isPlainNumber(example[key])) row.k = "select";
        // The example is a publisher-verified statement of what the tile needs,
        // so a field it sets is required. Without this, a projected tile has no
        // required fields at all and answer_query would run on whatever the
        // question happened to mention, letting the rest fall to compute
        // defaults and returning a confident number built partly from them.
        if (key in example) row.r = true;
        return row;
      })
      .filter(Boolean);
  } catch { return []; }
}

// The connective vocabulary a trade catalog shares everywhere. A match on one
// of these is not evidence that THIS tile is the one the caller meant.
const TILE_NAME_NOISE = new Set([
  "calculator", "calculators", "sizing", "size", "load", "loads", "flow",
  "drop", "rate", "factor", "index", "chart", "table", "length", "weight",
  "total", "check", "tool", "from", "with", "and", "for", "the", "per",
]);

// The ranker returns its best guess however weak, so a tile is only NAMED when
// something corroborates it: either the query yielded values for it, or the
// query contains a distinctive word from its name. Without this, "what is the
// meaning of life" comes back as a confident pointer at a calculator the
// caller never asked about.
// A curated alias IS corroboration, and a stronger one than a word match.
//
// The guard below wanted the question to name the calculator, checked against
// the tile's NAME. But the alias corpus exists precisely because people do not
// use the name: someone deliberately mapped "romex ampacity" to the tile it
// answers. Measured over a 300-term sample of that corpus, 70 questions came
// back NO_MATCH -- and in 65 of them the ranker's top hit was already the
// alias's own target. The door was telling an agent "no calculator matched"
// about a phrase the catalog itself maps to that calculator.
//
// Checked against the TOP tile only, so this widens what counts as
// corroboration without widening what gets answered: a question that reaches
// the wrong tile is still refused.
function queryIsCuratedAliasFor(query, id, aliases) {
  if (!id || !Array.isArray(aliases)) return false;
  const q = String(query || "").toLowerCase().trim();
  if (!q) return false;
  for (const row of aliases) {
    if (!row || row.target !== id || typeof row.term !== "string") continue;
    const term = row.term.toLowerCase().trim();
    if (term && (q === term || q.includes(term))) return true;
  }
  return false;
}

// A tile whose name carries no word of four characters or more. Three do:
// Ohm's Law, CFM per Ton, Tip Out. The four-character floor above left them
// with an empty distinctive set, so queryNamesTile returned false for every
// question -- including the tile's own name typed exactly. `answer_query
// ("ohms law")` came back "No calculator matched." while `search_calculators`
// ranked ohms-law first for the same string.
//
// The floor exists so one incidental short word cannot corroborate a
// question. Requiring EVERY word of a short name is stricter than that, not
// looser, so the guard survives. Matched at a token boundary rather than by
// substring, because "out" is inside "output" and "about" while "tip out" is
// not; a trailing plural is allowed so "ohms" answers for "ohm".
function everyShortWordPresent(q, words) {
  const short = words.filter((w) => w.length >= 2 && !TILE_NAME_NOISE.has(w));
  if (!short.length) return false;
  const tokens = new Set(q.split(/[^a-z0-9]+/).filter(Boolean));
  return short.every((w) => tokens.has(w) || tokens.has(w + "s"));
}

function queryNamesTile(query, name) {
  const q = String(query || "").toLowerCase();
  const words = String(name || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const distinctive = words.filter((w) => w.length >= 4 && !TILE_NAME_NOISE.has(w));
  if (!distinctive.length) return everyShortWordPresent(q, words);
  const hit = distinctive.filter((w) => q.includes(w)).length;
  // One incidental word out of several is not a reader naming a calculator.
  // "what is the meaning of life" shares "life" with HEPA Filter Life and
  // nothing else, and that was enough to call the question corroborated and
  // hand back a confident pointer. Half the tile's distinctive words, rounded
  // up, is: Voltage Drop needs "voltage" ("drop" is noise), Concrete Volume
  // needs one of two, HEPA Filter Life needs two of three.
  return hit >= Math.ceil(distinctive.length / 2);
}

// queryFill returns strings, because it also feeds the DOM and the URL hash.
// The computes want numbers: ohms-law counts how many of V/I/R/P it was given
// and a stringified "120" failed its check, so a query that plainly supplied
// two values came back "Provide any two of V, I, R, P." The browser never
// meets this because it reads fields through Number(input.value); this is the
// same coercion, applied at the same boundary.
//
// Selects are left alone: their values ARE strings, and validateSelects
// already normalizes a number-shaped option back to the string the compute
// expects.
function coerceForCompute(filled, rows) {
  const out = {};
  for (const row of rows) {
    const has = Object.prototype.hasOwnProperty.call(filled, row.d);
    if (!has) {
      // An unfilled NUMERIC field is passed as an explicit null, which is how
      // this catalog spells "absent" -- ohms-law derives the values it was not
      // given by testing `out.V === null`, so an undefined key derives
      // nothing and the tile answers with only what it was handed. Every
      // worked example in the repo uses the same convention (`R: null`).
      // Selects and checkboxes are OMITTED instead, so their own defaults
      // apply and validateSelects is never handed a null to reject.
      if (row.k === "select" || row.k === "checkbox") continue;
      out[row.d] = null;
      continue;
    }
    const value = filled[row.d];
    if (row.k === "select" || row.k === "text" || row.k === "textarea") { out[row.d] = value; continue; }
    if (row.k === "checkbox") { out[row.d] = value === "1" || value === "true"; continue; }
    const n = Number(value);
    out[row.d] = Number.isFinite(n) ? n : value;
  }
  return out;
}

// Does this tile take any inputs at all? Read from the tile's own describe()
// contract, which is what an agent would be told to call, rather than from the
// field index -- see the note in answerQuery for why the two differ.
const noInputCache = new Map();
async function tileTakesNoInputs(id) {
  if (noInputCache.has(id)) return noInputCache.get(id);
  let answer = false;
  try {
    const described = await describe({ id });
    answer = !((described && described.inputs) || []).length;
  } catch {
    answer = false;
  }
  noInputCache.set(id, answer);
  return answer;
}

// Is this query the tile's own full name, token for token? Normalized through
// the same pipeline the ranker uses, so punctuation, case and stopwords cannot
// make an exact name look inexact. See its one caller in answerQuery.
function sameTokens(query, tool) {
  if (!tool || !tool.name) return false;
  const a = normalizeQuery(String(query)).tokens;
  const b = normalizeQuery(String(tool.name)).tokens;
  return a.length > 0 && a.length === b.length && a.every((t, i) => t === b[i]);
}

export async function answerQuery({ query } = {}) {
  const q = String(query || "").trim();
  if (!q) return { status: "NO_MATCH", query: q, message: "Pass a plain-language question." };

  const { byId, aliases: aliasRows } = await load();
  const ranked = await search({ query: q, limit: 3 });
  const results = (ranked && ranked.results) || [];
  // Corroboration is only ever asked of ONE tile, so which one it asks about
  // decides the answer. Asking only rank 0 meant a curated phrase whose tile
  // came second returned NO_MATCH with the right calculator sitting right
  // there: "240.21" ranks transformer-conductor-protection above the
  // feeder-tap-rule a human mapped it to, and "62.2" ranks blower-door-ach50
  // above ashrae-622-ventilation, because a digit-led token is a VALUE to the
  // ranker and carries no coverage, so the tiles tie on everything else.
  //
  // Only the CURATED form gets to promote a lower rank. The naming heuristic
  // does not: it is a guess, and consulting it three times instead of once
  // would be three chances for a nonsense question to find a pointer.
  //
  // ...unless the query IS the top tile's own full name. The promotion is meant
  // to rescue a curated phrase whose tile ranks second; it was also firing when
  // the reader typed a calculator's PUBLISHED NAME and a shorter curated alias
  // happened to sit inside it. Asking for "Water Loss Class and Category"
  // returned the class-of-loss SCREEN, because "water loss class" is a curated
  // alias for that one -- and the reference tile was sitting at rank 1.
  // Measured 2026-09-02: 79 tiles answered as a DIFFERENT calculator when asked
  // for by their own exact name while ranking first for it. An agent that reads
  // the catalog and asks for a tile by the name the catalog gave it should get
  // that tile.
  //
  // Exact and whole: same normalized tokens, same order, nothing left over. A
  // partial name still defers to curation, which is the case a human curated.
  const namesTopExactly = results.length && sameTokens(q, byId.get(results[0].id));
  const top = namesTopExactly
    ? results[0]
    : results.find((r) => queryIsCuratedAliasFor(q, r.id, aliasRows)) || results[0];
  if (!top) return { status: "NO_MATCH", query: q, message: "No calculator matched." };

  const tool = byId.get(top.id);
  const rows = await fieldRowsFor(top.id, tool ? tool.group : "");
  const { queryFill } = await import(new URL("../query-fill.js", import.meta.url).href);
  // The tile's own name goes in so the words the agent used to NAME the
  // calculator are not mistaken for the names of its fields.
  const { filled } = rows.length ? queryFill(q, rows, { name: top.name }) : { filled: {} };
  const recovered = Object.keys(filled);

  // Corroboration, in any of three forms: the question carried values, it names
  // the calculator, or the catalog's own alias corpus maps it to this one.
  const { aliases } = await load();
  if (!recovered.length && !queryNamesTile(q, top.name) && !queryIsCuratedAliasFor(q, top.id, aliases)) {
    return { status: "NO_MATCH", query: q, message: "No calculator matched." };
  }
  // 21 tiles have no inputs at all: OSHA Top-10, the knot and hand-signal
  // references, the WMM model stamp. Their content IS the answer. Sending an
  // agent NO_VALUES with "call describe_calculator for its inputs" points it at
  // an empty list, so a question the catalog can answer completely came back as
  // a dead end. Corroboration has already been established above -- the query
  // names this tile or a curated alias maps to it -- so running it on no inputs
  // is not a guess.
  //
  // THE TEST IS THE TILE'S INPUT LIST, not its field-index rows. It used to be
  // `!rows.length`, and those are not the same set: a tile with no renderer
  // shard, or one whose inputs are list-valued, projects no rows while having
  // plenty of inputs. Measured 2026-09-02, that proxy fired for 42 tiles when
  // only 21 qualify. The 22 wrong ones got their OWN DEFAULTS run and returned
  // as `status: "OK"` -- "Rent vs Buy NPV Comparison" answered a question
  // carrying no numbers with a $400,000 purchase price, $80,000 down and 6.5%,
  // none of which the agent supplied and none of which it can tell are
  // invented. That is the exact failure this module's governing rule forbids: a
  // wrong answer is worse than no answer, and NO_VALUES is the true one. In the
  // other direction it missed `water-classes`, a genuine reference tile left
  // with the dead end this branch exists to remove.
  const hasNoInputs = await tileTakesNoInputs(top.id);
  if (!recovered.length && hasNoInputs) {
    try {
      const out = await run({ id: top.id, inputs: {} });
      return { ...out, status: "OK", query: q, name: top.name, via: "reference" };
    } catch {
      // Fall through to NO_VALUES rather than inventing an error status: a
      // reference tile that cannot run on nothing is a tile with inputs the
      // field index failed to project, which is what NO_VALUES already says.
    }
  }
  if (!recovered.length) {
    return {
      status: "NO_VALUES", query: q, id: top.id, name: top.name,
      message: `"${top.name}" looks like the calculator, but the question carried no values to compute with. Call describe_calculator for its inputs.`,
    };
  }

  // Name what it still needs, in one round trip instead of three.
  const missingRequired = rows.filter((r) => r.r && !(r.d in filled)).map((r) => ({ key: r.d, label: r.l, unit: r.u || null }));
  if (missingRequired.length) {
    return {
      status: "MISSING_INPUTS", query: q, id: top.id, name: top.name,
      inputs: filled, missing: missingRequired,
      message: `"${top.name}" needs ${missingRequired.map((m) => m.label).join(", ")}.`,
    };
  }

  try {
    const out = await run({ id: top.id, inputs: coerceForCompute(filled, rows) });
    return { ...out, status: "OK", query: q, name: top.name, via: "registry" };
  } catch (e) {
    return {
      status: "MISSING_INPUTS", query: q, id: top.id, name: top.name, inputs: filled,
      missing: [], message: e && e.message ? e.message : "The calculator could not run on those values.",
    };
  }
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
  // Report what was actually READ, not the raw argument: a caller that passed
  // an object got "unknown resource uri: [object Object]", which names
  // neither the mistake nor the fix. Name the forms that exist instead.
  throw new Error(
    `unknown resource uri: ${JSON.stringify(u)}. Valid forms are "roughlogic://catalog", ` +
    `"roughlogic://trade/<trade>", and "roughlogic://calculator/<id>". Call resources/list for the first two.`,
  );
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
