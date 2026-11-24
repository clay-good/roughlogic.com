// spec-v1340: turn a typed question into filled calculator inputs.
//
//   queryFill(query, rows) -> { filled, missing, unmatched }
//
// `rows` is one tile's entry from the spec-v1339 field index. `filled` is
// keyed by field key -- which in this catalog is ALSO the DOM input id and the
// hash-state param, so one object serves the form, the URL, and the MCP call.
//
// This module never routes and never computes. spec-v1341 and spec-v1342 own
// those. It is pure string work over a table: no model, no network beyond
// fetching the shard, no storage, and nothing about a query is recorded.
//
// THE GOVERNING RULE IS THAT A WRONG PREFILL IS WORSE THAN NO PREFILL.
// A tradesperson who sees an empty field fills it in. One who sees a plausible
// wrong number in the right-looking field may not. So every ambiguity here
// resolves to silence:
//
//   - one fragment that two fields could claim fills neither
//   - one field that two fragments could fill takes neither
//   - a number whose unit disagrees with the field's is refused, not converted
//   - a negated phrase never asserts the positive
//
// spec-v591's data/search/slots.json keeps its 49 hand-verified tiles and
// still wins where it fires. This is the fallback for the other 1,282 the
// field index describes.

import { extractQuantities } from "./search-discovery.js";
import { canonicalUnit, unitsCompatible, convertUnit, unitFamily } from "./field-units.js";
import { bucketFor } from "./field-bucket.js";
import { verifyShard } from "./integrity.js";

// ---------------------------------------------------------------------------
// Query rewrites.
//
// The compound forms a tradesperson writes as one token, expanded into the
// long form the matcher reads. These run BEFORE extractQuantities, as a query
// rewrite, rather than by reaching into the shared number parser -- the parser
// is used by the browser dropdown and the MCP server and must keep behaving
// exactly as it does.
//
// Each entry is a real spelling people type. Order matters: the more specific
// patterns run first so `8'6"` is not first mangled by the `3/4"` rule.
const REWRITES = [
  // A rainfall or infiltration rate: "3 in per hour" is 3 in/hr (2026-11-23).
  [/\b(\d+(?:\.\d+)?)\s*(?:in|inch|inches)\s*(?:per|an|a|\/)\s*(?:hour|hr|h)\b/g, (m, n) => `${n} in/hr`],
  // An electricity price is quoted in cents: "$0.15 per kwh" is 15 cents
  // per kWh (2026-11-23). Only a per-kWh price; other per-unit prices stay out.
  [/\$\s*(\d*\.?\d+)\s*(?:\/|per\s+)\s*kwh\b/g, (m, n) => `${Number((Number(n) * 100).toPrecision(12))} cents per kwh`],
  // "$250,000" is 250000 dollars. A leading $ hid the number's unit, so a money
  // field (usd) could not take it by unit (2026-11-15). Only a bare amount: "$3.50
  // per gallon" and "$/ft" stay as written, since a rate is not a sum of money.
  [/\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![\d.,]|\s*(?:\/|per\b|a\b|an\b|each\b|usd\b|dollars?\b))/g, (m, n) => `${n.replace(/,/g, "")} usd`],
  // Feet-and-inches, in both the tick and the spelled form. Collapsed to a
  // single decimal feet value rather than two quantities, because two
  // quantities would look like two separate answers to two separate fields.
  // The inches part may be whole (6), fractional (1/2), or mixed (6 1/2) --
  // all three are how a carpenter writes it on a stud.
  [/(\d+)\s*'\s*(\d+[\s-]+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+)\s*"?/g,
    (m, ft, inch) => `${Number(ft) + frac(inch) / 12} ft`],
  // ...but ONLY when the inches part could really be one: the inches in a
  // feet-and-inches measurement are always under 12. Spelled out, this pattern
  // also matches a question naming two DIFFERENT fields -- "joist hanger 16 ft
  // 16 in oc" is a 16 ft run at 16 in on-centre, and merging it produced a
  // 17.33 ft run and threw the spacing away. Sixteen inches is not the inches
  // part of anything. The tick form (8'6") is left alone: a tick pair is one
  // measurement by construction, however it is written.
  [/(\d+)\s*(?:ft|foot|feet)\s+(\d+[\s-]+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+)\s*(?:in|inch|inches)\b/g,
    (m, ft, inch) => (frac(inch) < 12 ? `${Number(ft) + frac(inch) / 12} ft` : m), "spelled-feet-inches"],
  // Mixed number with a fraction: 3-1/2" or 3 1/2 in.
  [/(\d+)[\s-](\d+)\s*\/\s*(\d+)\s*("|in\b|inch(?:es)?\b)/g,
    (m, whole, n, d) => `${Number(whole) + Number(n) / Number(d)} in`],
  // A bare tick pair is inches: 3/4" and 12".
  [/(\d+)\s*\/\s*(\d+)\s*"/g, (m, n, d) => `${Number(n) / Number(d)} in`],
  [/(\d+(?:\.\d+)?)\s*"/g, (m, n) => `${n} in`],
  [/(\d+(?:\.\d+)?)\s*'/g, (m, n) => `${n} ft`],
  // "sq ft" / "cubic yards" and friends. extractQuantities reads the next word
  // as the unit, so "2400 sq ft" hands back a unit of `sq`, which is not a
  // unit at all -- and an unreadable unit now correctly REFUSES to fill an
  // area field. Fold the two words into the one canonical token first.
  [/\b(\d+(?:\.\d+)?)\s*(?:sq|square)\s*(ft|foot|feet|in|inch(?:es)?|yd|yards?|m|meters?)\b/g,
    (m, n, u) => `${n} sq ${u.replace(/^(foot|feet)$/, "ft").replace(/^inch(es)?$/, "in").replace(/^yards?$/, "yd").replace(/^meters?$/, "m")}`],
  [/\b(\d+(?:\.\d+)?)\s*(?:cu|cubic)\s*(ft|foot|feet|in|inch(?:es)?|yd|yards?)\b/g,
    (m, n, u) => `${n} cu ${u.replace(/^(foot|feet)$/, "ft").replace(/^inch(es)?$/, "in").replace(/^yards?$/, "yd")}`],
  // Wire gauge, in all three spellings people use. The `#12` rule deliberately
  // emits only `12 awg` and lets the rule below add the name, so a query
  // containing `#12` does not come out as `wire size wire size 12 awg`.
  [/#\s*(\d+)\b/g, (m, n) => `${n} awg`],
  // spec-v1976: Spanish names the gauge first ("calibre 12").
  [/\bcalibre\s*(\d+)\b/g, (m, n) => `${n} awg`],
  [/\b(\d+)\s*(?:awg|ga|gauge)\b/g, (m, n) => `wire size ${n} awg`],
  // A dual voltage names the higher leg, which is the one a calculation wants.
  [/\b(\d+)\s*\/\s*(\d+)\s*v(?:ac|olts?)?\b/g,
    (m, a, b) => `voltage ${Math.max(Number(a), Number(b))} v`],
  // Temperature. The degree-marked and spelled forms are unambiguous and are
  // always rewritten. A BARE trailing `c` or `f` is only rewritten when the
  // query is talking about temperature, because `c` is also Hazen-Williams C
  // and Manning's C -- the same reason field-units.js refuses a bare `(C)` in
  // a label. Without this, `ambient 100 c` silently dropped the `c` and put
  // 100 into a field measured in degrees F.
  [/(-?\d+(?:\.\d+)?)\s*(?:°|deg(?:rees)?)\s*c\b/g, (m, n) => `${n} degc`],
  [/(-?\d+(?:\.\d+)?)\s*(?:°|deg(?:rees)?)\s*f\b/g, (m, n) => `${n} degf`],
  // Nominal lumber. Not converted to actual dimensions -- the tiles that care
  // about the difference ask for the nominal size and do that themselves.
  //
  // Bounded to 12, because nominal lumber is not sold larger and the pattern
  // was reading every AxB in the language as a stick of wood. `20x30 slab 4
  // inches thick` became "nominal width 20 in nominal depth 30 in slab 4
  // inches thick", which handed the 20 a unit of inches the reader never
  // wrote -- and an invented inch then beats a real one, so the 20 took the
  // Slab thickness field and the reader's four inches went unused. A slab, a
  // room and a floor are written in feet; only the lumber is in inches.
  // ...and not when a surface follows: "a 4x4 slab" is four feet by four.
  [/\b(\d+)\s*x\s*(\d+)\b(?!\s+(?:slab|patio|pad|deck|floor|room|area|shed|porch|landing|paver|tile|brick)s?\b)/g, (m, w, d) =>
    (Number(w) <= NOMINAL_LUMBER_MAX_IN && Number(d) <= NOMINAL_LUMBER_MAX_IN
      ? `nominal width ${w} in nominal depth ${d} in`
      : m)],
];

// "6", "1/2", and "6 1/2" all have to come back as a number.
function frac(s) {
  const t = String(s).trim();
  const mixed = t.match(/^(\d+)[\s-]+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[3]) === 0 ? Number(mixed[1]) : Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) === 0 ? 0 : Number(m[1]) / Number(m[2]);
  return Number(t) || 0;
}

// `12/2` is a roof pitch, a plain fraction, and a cable spec (12/2 NM-B),
// and nothing in the string says which. It is left ALONE by the rewrites and
// vetoed at fill time unless the tile's own fields disambiguate it, because a
// misread pitch is a wrong rafter length.
// The largest nominal dimension US lumber is sold in. A 2x12 is a joist; a
// 20x30 is a slab, and reading it as a stick of wood invents an inch.
const NOMINAL_LUMBER_MAX_IN = 12;

// No word boundary after the second number: "265/70r17" (a tire size) is a
// pair too, and was read as 3.79 (2026-11-23).
const AMBIGUOUS_PAIR = /\b\d+\s*\/\s*\d+(?![\d.])/;

// Words that put a query in a temperature context, licensing the bare-letter
// rewrite below.
// Refrigeration service words joined these 2026-11-16: "subcooling 300 psig liquid
// 95 f" read the 95 as a vertical lift in feet.
const TEMP_CONTEXT = /\b(temp|temperature|ambient|outdoor|indoor|db|wb|dry\s*bulb|wet\s*bulb|setpoint|supply\s*air|return\s*air|degrees?|superheat|subcool(?:ing)?|suction|liquid\s*line|condensing|evaporator|saturation|heat\s*index|wind\s*chill|dew\s*point|humidity|rh)\b/;

// `protect` is a set of literal strings a rewrite must not touch -- in
// practice, the option values of the tile's own selects. `lumber-spans` has a
// nominal_size select whose options are literally "2x4", "2x6", "2x10", and
// the nominal-lumber rewrite was shredding "2x10" into
// "nominal width 2 in nominal depth 10 in". The injected 2 then filled the
// tile's tributary-width field, which is a wrong number reaching a real form.
// A tile that names a value verbatim always outranks a rewrite of it.
export function rewriteQuery(query, protect, skip) {
  let q = String(query || "").toLowerCase();
  const guard = protect instanceof Set ? protect : null;
  const skipped = skip instanceof Set ? skip : null;
  for (const [re, fn, name] of REWRITES) {
    if (name && skipped && skipped.has(name)) continue;
    q = q.replace(re, (...args) => {
      const whole = String(args[0]).toLowerCase().replace(/\s+/g, "");
      if (guard && guard.has(whole)) return args[0];
      return fn(...args);
    });
  }
  if (TEMP_CONTEXT.test(q)) {
    q = q.replace(/(-?\d+(?:\.\d+)?)\s+c\b/g, (m, n) => `${n} degc`)
         .replace(/(-?\d+(?:\.\d+)?)\s+f\b/g, (m, n) => `${n} degf`);
  }
  return q.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Terms.

// Words that carry no field identity. Matching on them would let one fragment
// claim half the tile.
const TERM_STOPWORDS = new Set([
  "the", "and", "for", "from", "with", "into", "over", "per", "each", "your",
  "this", "that", "when", "what", "which", "only", "also", "any", "all",
  "value", "values", "total", "input", "enter", "using", "used", "use",
  "optional", "leave", "skip", "none", "default", "above", "below", "between",
  "size", "type", "kind", "mode", "option", "select", "choose", "number",
]);

// Query shorthand -> the word a label is likely to use. Kept small and
// trade-specific on purpose; a large synonym table is how a matcher starts
// guessing.
// The label words that name what a unit measures, for a dropdown that lists
// values with no unit of its own ("Horsepower": 0.5, 1, 2, 5 ...).
const UNIT_QUANTITY_WORDS = {
  hp: ["horsepower", "hp"], v: ["voltage", "volts", "volt"], a: ["current", "amps", "amperage", "ampacity"],
  kw: ["kilowatts", "kw"], kva: ["kva"], w: ["watts", "wattage"], awg: ["awg", "gauge"],
};

// A dimension word written after a length, and the label word it means.
// "4 inches deep" on a slab is its thickness, so deep and thick name both.
const POST_WORDS = new Map([["tall", ["height"]], ["high", ["height"]], ["deep", ["depth", "thickness"]], ["wide", ["width"]], ["long", ["length"]], ["thick", ["thickness", "depth"]], ["apart", ["spacing"]],
  // "2 ft rise over 50 ft" (2026-11-16): the rise is not the run.
  ["rise", ["rise", "height"]], ["drop", ["drop", "fall"]], ["fall", ["fall", "drop"]], ["run", ["run"]],
  // "4 ft shallow 8 ft deep", "an 18 ft round pool" (2026-11-23).
  ["shallow", ["shallow"]], ["round", ["diameter"]]]);
const DIMENSION_WORDS = new Set(["height", "depth", "thickness", "width", "length", "spacing", "rise", "run", "fall", "drop"]);

const SHORTHAND = new Map([
  ["amps", "current"], ["amperage", "current"], ["amp", "current"],
  ["volts", "voltage"], ["volt", "voltage"],
  ["watts", "power"], ["watt", "power"], ["kw", "power"],
  ["awg", "wire"], ["gauge", "wire"],
  ["temp", "temperature"],
  ["dia", "diameter"], ["od", "diameter"], ["id", "diameter"],
  ["len", "length"], ["ht", "height"], ["wt", "weight"],
  ["psi", "pressure"], ["gpm", "flow"], ["cfm", "airflow"],
  ["rise", "rise"], ["run", "run"],
]);

// The matchable terms of a field label.
//
// Digits are stripped first. Labels double as guidance and the guidance is
// full of the SOURCE's numbers -- "Bolt strength (psi, A307 = 36000)" would
// otherwise contribute `36000` as a search term and match any query mentioning
// it. A 4-character floor then drops the connective words, with the shorthand
// table above restoring the short trade words that actually identify a field.
export function labelTerms(labelLead) {
  const out = new Set();
  const cleaned = String(labelLead || "").toLowerCase().replace(/[0-9]+/g, " ");
  // A label that IS a short word or acronym -- "AWG", "GPM", "Run", "Rise" --
  // would be erased entirely by the 4-character floor below, leaving the field
  // with no terms and therefore unfillable by name. Keep it whole.
  const whole = cleaned.trim();
  if (whole && whole.length >= 2 && whole.length <= 5 && !/\s/.test(whole)) out.add(whole);
  for (const raw of cleaned.split(/[^a-z]+/)) {
    // "Horizontal run" lost its "run" to the floor, so "14 ft run" had no
    // field to name (2026-11-23). The one three-letter dimension word stays.
    if (raw === "run") { out.add(raw); continue; }
    if (!raw || raw.length < 4) continue;
    if (TERM_STOPWORDS.has(raw)) continue;
    out.add(raw);
    // Fold a trailing plural so "studs" in a query reaches "stud" in a label.
    if (raw.endsWith("s") && raw.length > 4) out.add(raw.slice(0, -1));
  }
  // A label the rules above erase entirely can never be filled by name. 21 were:
  // "Bar size" is three letters plus a stopword, and a parenthetical unit hides
  // "APR (%)" from the whole-label escape hatch, which needs a single token.
  // Fall back to the lead word at a 3-character floor, stopwords still applied.
  // Runs only for a label that had no terms at all.
  if (out.size === 0) {
    const lead = cleaned.replace(/\([^)]*\)/g, " ");
    for (const raw of lead.split(/[^a-z]+/)) {
      if (raw.length < 3 || TERM_STOPWORDS.has(raw)) continue;
      out.add(raw);
      break;
    }
  }
  return out;
}

// Expand a window of query text into the terms it could be naming.
function windowTerms(text) {
  const out = new Set();
  for (const raw of String(text || "").toLowerCase().split(/[^a-z]+/)) {
    if (!raw) continue;
    const mapped = SHORTHAND.get(raw);
    if (mapped) out.add(mapped);
    if (raw.length < 4) continue;
    out.add(raw);
    if (raw.endsWith("s") && raw.length > 4) out.add(raw.slice(0, -1));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Negation.
//
// "no insulation", "without a vent", "not heated". A negated phrase must never
// assert the positive. The window is deliberately short: a long one starts
// suppressing legitimate fills several words later.
const NEGATORS = new Set(["no", "not", "without", "none", "never", "neither", "nor", "un"]);
const NEGATION_WINDOW = 3;

function isNegated(text, termIndex) {
  const before = String(text).slice(0, termIndex).split(/[^a-z]+/i).filter(Boolean);
  const tail = before.slice(-NEGATION_WINDOW);
  return tail.some((w) => NEGATORS.has(w.toLowerCase()));
}

// ---------------------------------------------------------------------------
// The fill.

function rowUnit(row) {
  return row && typeof row.u === "string" ? row.u : null;
}

// Does this quantity's unit permit it to fill this field? Returns the value to
// write, or null when it may not.
// Words extractQuantities may pick up as a "unit" that are really prose.
// Treated as no unit at all, rather than as an unreadable one.
const NON_UNIT_WORDS = new Set([
  "of", "at", "on", "to", "by", "and", "or", "the", "a", "is", "was", "with",
  "from", "for", "long", "wide", "tall", "deep", "high", "thick", "each",
  "total", "about", "over", "under", "per",
]);

// extractQuantities stops the unit at the first word, so the rewritten
// "2400 sq ft" hands back `sq`. Re-read the text just past the number to
// recover the two-word unit before deciding anything.
function rawUnitOf(qty, text) {
  const raw = qty.unit ? String(qty.unit).toLowerCase() : null;
  if (raw !== "sq" && raw !== "cu") return raw;
  const after = text.slice(qty.index).match(/^[\d.,/]+\s*(sq|cu)\s+([a-z]+)/);
  return after ? `${after[1]} ${after[2]}` : raw;
}

// A number written bare takes the NEXT WORD OF THE SENTENCE as its unit: "asset
// cost 2000000 business use 100" hands back 2000000 with the "unit" `business`.
// That reaches the refusal below looking exactly like a unit we cannot read, so
// the value is thrown away -- section-179 recovered nothing from a query naming
// every one of its fields. NON_UNIT_WORDS catches the commonest, but it is a
// 25-word hand-list and English is not.
//
// The tile settles it: a word that is a term of one of this tile's OWN labels is
// a field name, not a unit ("business" from "Business-use percent"). Checked
// only AFTER canonicalUnit fails, so a readable unit stays a unit; the result is
// merely "no unit", which by the rule below never wins on its own.
function isLabelWord(raw, labelWords) {
  return Boolean(raw) && labelWords instanceof Set && labelWords.has(raw);
}

function valueFor(qty, row, text, labelWords) {
  const fieldUnit = rowUnit(row);
  // ...unless the field is itself that rate: "8 hours a day" is "Hours used
  // per day" (2026-11-23).
  if (qty.offset && !/\b(from|distance|offset|away|setback|base|clearance|spacing)\b/i.test(String(row.l || "") + " " + row.d.replace(/_/g, " "))) return null;
  if (qty.delta && !/\b(rise|difference|delta|split|increase|differential|dt|drop|change)\b/i.test(String(row.l || "") + " " + row.d.replace(/_/g, " "))) return null;
  if (qty.rate && fieldUnit && !new RegExp("\\bper " + qty.rate + "\\b").test(String(row.l || "").toLowerCase())) return null;
  const raw = rawUnitOf(qty, String(text || ""));
  const prose =
    raw !== null &&
    (NON_UNIT_WORDS.has(raw) || (canonicalUnit(raw) === null && isLabelWord(raw, labelWords)));
  const qtyUnit = raw && !prose ? canonicalUnit(raw) : null;
  // The reader attached a unit we cannot read, to a field that declares one.
  // Refuse: we do not know whether it agrees, and guessing here is exactly
  // how a temperature ends up in a pressure field.
  if (fieldUnit && raw && !prose && !qtyUnit) return null;
  // Neither side declares a unit, or only one does: a plain number. Allowed,
  // but it never wins on its own -- see the phases below.
  if (!fieldUnit || !qtyUnit) return String(qty.value);
  if (!unitsCompatible(qtyUnit, fieldUnit)) return null;
  // Same unit: hand back the reader's own string. Round-tripping it through a
  // float would silently truncate precision they deliberately typed --
  // 0.015452412 came back as 0.015452 before this early return existed.
  if (qtyUnit === fieldUnit) return String(qty.value);
  const converted = convertUnit(qty.value, qtyUnit, fieldUnit);
  if (converted === null) return null;
  // Trim the float noise a conversion introduces (144.00000009216 for 1 psi in
  // psf) without discarding real precision: 12 significant digits is well
  // inside a double and far past any field's meaningful resolution.
  return String(Number(converted.toPrecision(12)));
}

export function queryFill(query, rows, opts) {
  const empty = { filled: {}, missing: [], unmatched: [] };
  if (!Array.isArray(rows) || !rows.length) return empty;

  // A `text` field is not a numeric field. `tire-gearing` wants a tire size
  // written `P265/70R17` and `tphc-window` wants a clock time `10:30`; both were
  // in this list, so the extractor handed them the first bare number it found
  // and wrote "33" and "10" into them. Neither is a quantity, and no conversion
  // makes it one -- the governing rule at the top of this file says a wrong
  // prefill is worse than no prefill. They are still named in the ask card.
  const numberRows = rows.filter(
    (r) => r.k !== "select" && r.k !== "checkbox" && r.k !== "text" && r.k !== "textarea",
  );
  const selectRows = rows.filter((r) => r.k === "select" && Array.isArray(r.o));

  // Literal option values are protected from the rewrites. See rewriteQuery.
  const protect = new Set();
  for (const r of selectRows) for (const o of r.o) protect.add(String(o).toLowerCase().replace(/\s+/g, ""));

  // "20 ft 18 in" is never one measurement, and the rule above already refuses
  // it. "40 ft 6 in" genuinely might be -- 40'6" is how a carpenter writes it.
  // What settles it is the TILE: when it measures one field in feet and
  // another in inches, a question carrying both is far more likely answering
  // both than writing one of them the long way, and merging destroys a value
  // outright rather than merely mis-homing it. The unambiguous tick form
  // (40'6") is untouched and still means one measurement.
  const skip = new Set();
  if (numberRows.some((r) => rowUnit(r) === "ft") && numberRows.some((r) => rowUnit(r) === "in")) {
    skip.add("spelled-feet-inches");
  }
  let text = rewriteQuery(query, protect, skip);
  // "heat index 95 degrees 50 percent": on a tile with a temperature field
  // and no angle field, bare "degrees" are degrees F (2026-11-16: read as an
  // angle and refused).
  if (text && !numberRows.some((r) => rowUnit(r) === "deg") && numberRows.some((r) => rowUnit(r) === "degf")) {
    text = text.replace(/(-?\d+(?:\.\d+)?)\s*degrees?\b(?!\s*(?:f|c|fahrenheit|celsius)\b)/g, "$1 degf");
  }
  // A P-metric tire size, "265/70r17", is a diameter: 2 x 265 mm x 70% /
  // 25.4 + 17 = 31.6 in. On a tile that asks for a tire diameter in inches it
  // fills that (2026-11-23); anywhere else the fraction veto drops it.
  const tireRow = numberRows.find((r) => rowUnit(r) === "in" && /\btire\b/i.test(r.l) && /\bdiameter\b/i.test(r.l));
  if (text && tireRow) {
    text = text.replace(/\b(\d{3})\s*\/\s*(\d{2,3})\s*-?\s*z?r\s*(\d{2})\b/g, (m, w, a, rim) =>
      `${Math.round((2 * Number(w) * Number(a) / 100 / 25.4 + Number(rim)) * 100) / 100} in tire diameter`);
  }
  // "a 150000 btu furnace" is an input RATE: appliance ratings are written in
  // Btu and mean Btu/h. On a tile with a Btu/h field and no Btu field, read
  // them so (2026-11-23: gas pipe sizing dropped the load).
  if (text && numberRows.some((r) => rowUnit(r) === "btuh") && !numberRows.some((r) => rowUnit(r) === "btu")) {
    text = text.replace(/(\d)\s*btus?\b(?!\s*(?:\/|per\b))/g, "$1 btuh");
  }
  if (!text) return { filled: {}, missing: rows.map((r) => r.d), unmatched: [] };
  const termsByRow = new Map(rows.map((r) => [r.d, labelTerms(r.l)]));
  // Every word that names a field on THIS tile. valueFor uses it to tell a
  // field name the reader typed from a unit it cannot read.
  const labelWords = new Set();
  for (const terms of termsByRow.values()) for (const w of terms) labelWords.add(w);

  // Words from the tile's OWN NAME are not field names, and reading them as
  // field names loses the reader's first value: "joist hanger 20 ft 16 in"
  // filled only the spacing, while the bare "20 ft 16 in" filled both. Phase A
  // burns a quantity whose preceding window names two fields, and "joist" is a
  // term of both "Joist-run width" and "Ends per joist" -- so the tool name the
  // reader typed to FIND the calculator vetoed the number they typed to use it.
  // That is the phrasing this site teaches, so the name is dropped from the
  // window before it can name anything.
  const nameWords = new Set(
    opts && typeof opts.name === "string" ? labelTerms(opts.name) : [],
  );

  // A select's own option value can carry a number inside a larger token --
  // `16in_box`, `20p5in_ladder`. The token is protected from the rewrites and
  // fills its select correctly, but the quantity scanner still reads `16 in`
  // out of the middle of it and lets that compete for a NUMBER field. On
  // `truss-capacity` the option outbid the reader: `16in_box 40 ft` put 1.33 ft
  // -- 16 inches converted -- into the span and left the real `40 ft`
  // unmatched. Reversing the word order gave the right answer, which is the
  // signature of a value winning on position rather than on meaning.
  //
  // Only options that are more than a bare number are masked. An all-numeric
  // option ("80", "95") is a VALUE the reader may well be typing, and Phase B0
  // exists precisely to let a quantity fill that kind of select.
  const optionSpans = [];
  const hay = text.toLowerCase();
  for (const r of selectRows) {
    for (const o of r.o) {
      const needle = String(o).toLowerCase();
      if (!/\d/.test(needle) || /^\d+(\.\d+)?$/.test(needle)) continue;
      for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + needle.length)) {
        optionSpans.push([at, at + needle.length]);
      }
    }
  }
  // Vetoed, NOT removed. Phase A reads the words BETWEEN consecutive numbers to
  // find a field name, so dropping one from the list widens the next window and
  // re-homes values that had nothing to do with the option: deleting the `410`
  // inside `R_410A` cost `head-pressure-control` its evaporator pressure. The
  // quantity stays where it is and is simply spent before any phase can use it.
  const quantities = extractQuantities(text, { withIndex: true });
  // "900 kwh per month" is a rate, not 900 kwh: it never fills a field
  // measured in the bare unit (a battery's nameplate kWh, 2026-11-16).
  // The inches the nominal-lumber rewrite writes ("2x4" -> "nominal width 2 in
  // nominal depth 4 in") are its own, not the reader's: they may fill a field
  // that the word "nominal"/"width"/"depth" names, never one their unit alone
  // fits. "2x4 studs 16 on center" put 2 in into the stud spacing (2026-11-16).
  // "1200 sq ft" comes back with unit `sq` and a span that stops before "ft",
  // so every rule reading the words AFTER the number saw "ft" and not "walls"
  // or "of walls" (2026-11-23). The span takes the unit's second word.
  for (const q of quantities) {
    const u = q.unit ? String(q.unit).toLowerCase() : "";
    const w = (u === "sq" || u === "cu") && text.slice(q.end).match(/^\s+[a-z]+\b/);
    if (w) q.end += w[0].length;
  }
  for (const q of quantities) {
    if (/nominal (?:width|depth)\s*$/.test(text.slice(0, q.index))) q.lumber = true;
  }
  // "5 ft from the wall" is an offset: it fills only a field about a distance,
  // offset or setback, never a ladder's length (2026-11-23).
  for (const q of quantities) {
    if (unitFamily(canonicalUnit(rawUnitOf(q, text)) || "") === "length" && /^\s+(?:from|away|off)\b/.test(text.slice(q.end))) q.offset = true;
  }
  // "70 degree rise" is a temperature DIFFERENCE: it fills only a field that
  // is one, never a setpoint or outlet temperature (2026-11-23).
  for (const q of quantities) {
    if (unitFamily(canonicalUnit(rawUnitOf(q, text)) || "") === "temperature" &&
        /^\s+(?:rise|difference|delta|split|increase|differential|dt)\b/.test(text.slice(q.end))) q.delta = true;
  }
  for (const q of quantities) {
    const per = text.slice(q.end).match(/^\s*(?:per|\/|a)\s*(month|mo|year|yr|day|week|wk|hour|hr|h|minute|min|second|sec)\b/);
    if (per) q.rate = { mo: "month", yr: "year", wk: "week", hr: "hour", h: "hour", min: "minute", sec: "second" }[per[1]] || per[1];
  }
  const suppressed = new Set();
  quantities.forEach((qty, qi) => {
    if (optionSpans.some(([s, e]) => qty.index >= s && qty.end <= e)) suppressed.add(qi);
  });
  const filled = {};
  const claimed = new Set();       // quantity indexes already spent
  const unmatched = [];
  // Fields filled ONLY by unit agreement after a conversion ("40 ft" into an
  // inch field nobody named). Real fills, but too weak to say on their own
  // that this is the calculator being asked about; the door reads them so.
  const converted = new Set();
  // Sizes read from "3/4 pex": a fraction before a material word is a pipe
  // size, so the ambiguous-pair veto below leaves them alone.
  const optionSized = new Set();

  // --- Roof pitch: "6/12 pitch", "4 in 12" ----------------------------------
  // Rise per 12 of run, in the two ways roofers write it. It fills a unitless
  // Pitch field with the rise, or a Rise and a Run measured in inches with
  // the rise and 12, and nothing else: read as a fraction it is 0.5, and read
  // as "4 in" it is a length (2026-11-16: neither rafter nor roof-pitch filled).
  if (/\b(pitch|roof|rafter|slope)\b/.test(text)) {
    const pm = text.match(/(^|[^\d.])(\d+(?:\.\d+)?)\s*(?:\/|in|:|-in-)\s*12(?![\d.])/);
    if (pm) {
      const rise = Number(pm[2]);
      const start = pm.index + pm[1].length, end = pm.index + pm[0].length;
      const inSpan = quantities.map((q, i) => (q.index >= start && q.index < end ? i : -1)).filter((i) => i >= 0);
      const pitchRow = numberRows.filter((r) => !rowUnit(r) && termsByRow.get(r.d).has("pitch"));
      const riseRow = numberRows.filter((r) => rowUnit(r) === "in" && termsByRow.get(r.d).has("rise"));
      const runRow = numberRows.filter((r) => rowUnit(r) === "in" && termsByRow.get(r.d).has("run"));
      let done = false;
      if (rise > 0 && rise <= 24 && pitchRow.length === 1) { filled[pitchRow[0].d] = String(rise); done = true; }
      else if (rise > 0 && rise <= 24 && riseRow.length === 1 && runRow.length === 1) { filled[riseRow[0].d] = String(rise); filled[runRow[0].d] = "12"; done = true; }
      if (done) for (const i of inSpan) { suppressed.add(i); claimed.add(i); }
    }
  }

  // --- Plan dimensions: "a 10 by 12 floor", "20x30 slab" --------------------
  // Two bare numbers joined by "by" or "x" are a plan, written in feet, when a
  // surface word follows or a side is too big for lumber ("2 by 4 studs" is a
  // stud). They fill the tile's one length and one width in feet, or, failing
  // that pair, its one plan-area field with the product. An area labelled as
  // a sloped surface, a wall or a ceiling is not a plan area and is left alone
  // (2026-11-16: these questions filled nothing, or filled the wrong field).
  // An area that is one PIECE's, not the surface's: "Panel area (ft2, 32 for a
  // 4x8)" is the sheet a plan is divided into, and it sat beside "Area to
  // sheathe" so neither could be the plan's one area field (2026-11-23,
  // "how many sheets of plywood for a 24 by 40 floor" filled nothing).
  const ITEM_AREA = /\b(panel|sheet|board|tile|block|brick|paver|piece|unit|bag|roll|module|plank|course|mat)s?\b/i;
  {
    const PLAN = /(^|[^\d.])(\d+(?:\.\d+)?)\s*(?:by|x)\s*(\d+(?:\.\d+)?)(?![\d.]|\s*(?:in\b|inch|"|'|cm\b|mm\b|m\b))(?:\s*(?:ft|feet|foot)\b)?(\s+[a-z]+)?/;
    const SURFACES = /^\s+(floor|room|slab|patio|deck|yard|driveway|kitchen|bathroom|bedroom|garage|basement|lawn|garden|bed|pad|area|space|lot|walkway|sidewalk|shed|porch)s?$/;
    const m = text.match(PLAN);
    if (m) {
      const a = Number(m[2]), b = Number(m[3]);
      // ...or one just before it: "room 12 by 12" (2026-11-23).
      const surface = Boolean(m[4] && SURFACES.test(m[4])) ||
        // A planting bed is a surface too: "a raised bed 4 by 8 by 12 in" is
      // 32 ft2 of garden a yard of topsoil has to fill (2026-11-23). Matched
      // at a word boundary, so "bedroom" still reads as the room it is.
      /\b(?:floor|room|slab|patio|deck|kitchen|bathroom|bedroom|garage|basement|space|bed)s?\s*$/.test(text.slice(0, m.index + m[1].length));
      if (a > 0 && b > 0 && (surface || Math.max(a, b) > NOMINAL_LUMBER_MAX_IN)) {
        const start = m.index + m[1].length, end = start + m[0].length - m[1].length - (m[4] || "").length;
        const inPair = quantities.map((q, i) => (q.index >= start && q.index < end ? i : -1)).filter((i) => i >= 0);
        // A plan's length or width is the surface's own: "Length", "Room
        // length", "Slab width". Not an item's ("Trim stock length", "Total
        // door-opening width"), which took a room's 12 by 14 (2026-11-23).
        const PLAN_NOUNS = new Set(["length", "width", "room", "slab", "floor", "patio", "deck", "area", "pad", "overall", "plan", "building", "lot", "yard", "pool", "roof", "house", "garage", "footprint", "driveway", "lawn", "garden", "space", "bed", "shed", "porch", "kitchen", "bathroom", "bedroom", "basement", "walkway", "sidewalk", "surface"]);
        const ft = (word) => numberRows.filter((r) => rowUnit(r) === "ft" && termsByRow.get(r.d).has(word) &&
          String(r.l || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !TERM_STOPWORDS.has(w)).every((w) => PLAN_NOUNS.has(w) || PLAN_NOUNS.has(w.replace(/s$/, ""))));
        const len = ft("length"), wid = ft("width");
        const areas = numberRows.filter((r) => rowUnit(r) === "ft2" && !/slop|surface|wall|ceiling/i.test(r.l) && !ITEM_AREA.test(r.l));
        let done = false;
        if (len.length === 1 && wid.length === 1 && len[0].d !== wid[0].d) {
          filled[len[0].d] = String(a); filled[wid[0].d] = String(b); done = true;
        // A width with no length beside it ("Carpet roll width") is not a
        // plan side and does not stop the area filling (2026-11-23).
        } else if (!len.length && areas.length === 1 && m[4] &&
                   (/^\s+(floor|slab|patio|deck|yard|driveway|lawn|garden|bed|pad|area|lot|walkway|sidewalk)s?$/.test(m[4]) ||
                    termsByRow.get(areas[0].d).has(m[4].trim().replace(/s$/, "")) ||
                    // ...and so is a room's, when the question is about what
                    // covers its floor ("carpet for a 12 by 15 room", 2026-11-23).
                    (/^\s+rooms?$/.test(m[4]) && /\b(carpet|flooring|floor|laminate|vinyl|hardwood|underlayment)\b/.test(text))) &&
                   !/\b(walls?|ceilings?|paint|primer)\b/.test(text)) {
          // A room's plan is its floor, but a question about a room may be about
          // its walls ("paint for a 12 by 12 room"): only a work surface fills
          // a single area field.
          filled[areas[0].d] = String(Math.round(a * b * 1e6) / 1e6); done = true;
        }
        // "30 by 40 by 2 ft": the third side is the depth. A tile that takes
        // the plan as an area and asks for one depth or thickness gets both
        // (2026-11-23; the area was left empty and only the 2 ft filled).
        const third = text.slice(end).match(/^\s*(?:by|x)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|in\b|inch|inches)/);
        if (third) {
          const thirdQi = quantities.findIndex((q) => q.index >= end && q.index < end + third[0].length);
          const deep = numberRows.filter((r) => rowUnit(r) && unitFamily(rowUnit(r)) === "length" &&
            ["depth", "thickness"].some((w) => termsByRow.get(r.d).has(w)));
          const value = thirdQi >= 0 && deep.length === 1 ? valueFor(quantities[thirdQi], deep[0], text, labelWords) : null;
          if (value !== null && !done && !len.length && !wid.length && areas.length === 1) {
            filled[areas[0].d] = String(Math.round(a * b * 1e6) / 1e6); done = true;
          }
          if (value !== null && done) {
            filled[deep[0].d] = value;
            for (const i of [...inPair, thirdQi]) { suppressed.add(i); claimed.add(i); }
          }
        }
        // A room's perimeter, on a tile that takes one and no length or width:
        // trim and baseboard (2026-11-23: "crown molding for 12 by 14 room"
        // filled a 12 ft stock length and 14 ft of openings).
        const perim = numberRows.filter((r) => rowUnit(r) === "ft" && termsByRow.get(r.d).has("perimeter"));
        if (!done && surface && perim.length === 1 && !len.length && !wid.length) {
          filled[perim[0].d] = String(Math.round(2 * (a + b) * 1e6) / 1e6); done = true;
        }
        // A room's volume, on a tile that takes one and no length, width or
        // area: the plan times its ceiling height ("room 12 by 12, 8 ft
        // ceiling" is 1,152 cu ft; 2026-11-23 it read "room 12" as 12 cu ft).
        const vols = numberRows.filter((r) => rowUnit(r) === "ft3" && termsByRow.get(r.d).has("volume"));
        const hm = text.match(/\bceiling(?:\s+height)?\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\b/) ||
          text.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s+(?:high\s+)?ceilings?\b/);
        if (!done && hm && vols.length === 1 && !len.length && !wid.length) {
          filled[vols[0].d] = String(Math.round(a * b * Number(hm[1]) * 1e6) / 1e6); done = true;
          const hq = quantities.findIndex((q) => q.index >= hm.index && q.index < hm.index + hm[0].length);
          if (hq >= 0) { suppressed.add(hq); claimed.add(hq); }
        }
        if (done) for (const i of inPair) { suppressed.add(i); claimed.add(i); }
        // A surface's plan no rule here could use is still two sides of it,
        // never one field's value on its own ("room 12" is not a volume).
        else if (surface) for (const i of inPair) suppressed.add(i);
      }
    }
  }

  // --- A wall by its length and height: "40 ft wall 10 ft tall" ----------
  // On a tile that takes the wall as one area and asks for no length or
  // height, the two are its area (2026-11-23: siding filled nothing).
  {
    // ...or "a 10 by 8 wall", its length by its height.
    const m = text.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s+(?:long\s+)?walls?\s+(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s+(?:tall|high)\b/) ||
      text.match(/(\d+(?:\.\d+)?)\s*(?:by|x)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)?\s+walls?\b/);
    const wallArea = numberRows.filter((r) => rowUnit(r) === "ft2" && termsByRow.get(r.d).has("wall"));
    const sides = numberRows.filter((r) => rowUnit(r) && unitFamily(rowUnit(r)) === "length" && ["length", "height"].some((w) => termsByRow.get(r.d).has(w)));
    if (m && wallArea.length === 1 && !sides.length && !(wallArea[0].d in filled)) {
      filled[wallArea[0].d] = String(Math.round(Number(m[1]) * Number(m[2]) * 1e6) / 1e6);
      quantities.forEach((q, i) => { if (q.index >= m.index && q.index < m.index + m[0].length) { suppressed.add(i); claimed.add(i); } });
    }
  }

  // --- A surface by its length and width in words: "30 ft driveway 10 ft wide"
  // The same shape as the wall above, for a plan rather than an elevation. On
  // a tile that takes the plan as one area and asks for no length or width,
  // the two sides are that area (2026-11-23: "how much gravel for a 30 ft
  // driveway 10 ft wide 4 in deep" read only the depth, and the calculator
  // refused on a zero area).
  {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s+(?:long\s+)?(?:floor|room|slab|patio|deck|yard|driveway|lawn|garden|bed|pad|lot|walkway|sidewalk|shed|porch)s?\s+(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s+wide\b/);
    const plan = numberRows.filter((r) => rowUnit(r) === "ft2" && !/slop|surface|wall|ceiling/i.test(r.l) && !ITEM_AREA.test(r.l));
    const sides = numberRows.filter((r) => rowUnit(r) && unitFamily(rowUnit(r)) === "length" &&
      ["length", "width"].some((w) => termsByRow.get(r.d).has(w)));
    if (m && plan.length === 1 && !sides.length && !(plan[0].d in filled)) {
      filled[plan[0].d] = String(Math.round(Number(m[1]) * Number(m[2]) * 1e6) / 1e6);
      quantities.forEach((q, i) => { if (q.index >= m.index && q.index < m.index + m[0].length) { suppressed.add(i); claimed.add(i); } });
    }
  }

  // --- An item's two sides: "4 by 8 pavers", "6x24 tile" -------------------
  // A size pair followed by the name of an item whose two sides the tile asks
  // for in inches (length or height, and width) fills both, the larger as the
  // length (2026-11-23).
  for (const m of text.matchAll(/(^|[^\d.])(\d+(?:\.\d+)?)\s*(?:by|x)\s*(\d+(?:\.\d+)?)\s*(?:in\b|inch(?:es)?\b|")?\s+([a-z]+)/g)) {
    const noun = m[4].replace(/s$/, "");
    const side = (ws) => numberRows.filter((r) => rowUnit(r) === "in" && termsByRow.get(r.d).has(noun) && ws.some((w) => termsByRow.get(r.d).has(w)));
    const L = side(["length", "height"]), W = side(["width"]);
    const a = Number(m[2]), b = Number(m[3]);
    if (L.length !== 1 || W.length !== 1 || L[0].d === W[0].d || !(a > 0 && b > 0) || L[0].d in filled || W[0].d in filled) continue;
    filled[L[0].d] = String(Math.max(a, b)); filled[W[0].d] = String(Math.min(a, b));
    const start = m.index + m[1].length, end = start + m[0].length - m[1].length;
    quantities.forEach((q, i) => { if (q.index >= start && q.index < end) { suppressed.add(i); claimed.add(i); } });
  }

  // --- Nominal lumber on a tile that asks for thickness and width -----------
  // A 2x6 is 2 thick by 6 wide. The rewrite names the sides "width" and
  // "depth" (a joist's words), so on board-footage the 2 took Width and the 6
  // went nowhere (2026-11-23).
  {
    const lumber = quantities.map((q, i) => (q.lumber ? i : -1)).filter((i) => i >= 0);
    const inRow = (w) => numberRows.filter((r) => rowUnit(r) === "in" && termsByRow.get(r.d).has(w));
    const thick = inRow("thickness"), wide = inRow("width");
    if (lumber.length === 2 && thick.length === 1 && wide.length === 1 && !inRow("depth").length && thick[0].d !== wide[0].d) {
      filled[thick[0].d] = String(quantities[lumber[0]].value);
      filled[wide[0].d] = String(quantities[lumber[1]].value);
      for (const i of lumber) { suppressed.add(i); claimed.add(i); }
      // "100 2x4": the number before the size is how many sticks (2026-11-23).
      const before = lumber[0] - 1;
      const counts = numberRows.filter((r) => ["count", "quantity", "pieces"].some((w) => termsByRow.get(r.d).has(w)));
      if (before >= 0 && rawUnitOf(quantities[before], text) === "nominal" && counts.length === 1 && Number.isInteger(Number(quantities[before].value))) {
        filled[counts[0].d] = String(quantities[before].value);
        suppressed.add(before); claimed.add(before);
      }
    }
  }

  // --- Phase A: name-then-value -------------------------------------------
  // The text between the previous number and this one is where a field name
  // lives: "length 40 width 20". This wins outright, because in a run of
  // readings the reverse reading manufactures a false hit for every one.
  const proposals = new Map();     // row key -> [quantity index]
  const rowsFor = new Map();       // quantity index -> [row key]

  const optionWordsInText = new Set();
  for (const r of selectRows) for (const o of r.o) {
    const tok = String(o).toLowerCase();
    if (tok.length > 2 && /[a-z]/.test(tok) && text.includes(tok)) for (const w of tok.split(/[^a-z]+/)) if (w) optionWordsInText.add(w);
  }
  const nameTokCount = new Map();
  for (const t of String((opts && opts.name) || "").toLowerCase().split(/[^a-z]+/)) if (t) nameTokCount.set(t, (nameTokCount.get(t) || 0) + 1);
  const firstQi = quantities.findIndex((q, i) => !suppressed.has(i));
  let prevEnd = 0;
  // Value-then-name. "100 ft of fence 8 ft apart", "a 12 ft wall 8 ft tall":
  // the words right AFTER a measured quantity describe it -- an "of" phrase,
  // or a dimension word on a length -- and they are not the next number's
  // name. Reading them forward swapped the fence's length and post spacing,
  // and gave a 12 ft wall's length to its 8 ft height (2026-11-16). Such a
  // quantity takes the one field those words name, or no field here at all.
  const backOf = new Map();          // quantity index -> { cut, keys }
  // Which way the whole question names its numbers. "1200 sq ft walls 600 sq
  // ft ceiling" names each AFTER it, and reading forward swapped the two
  // areas (2026-11-23). Backward only when the last number is followed by a
  // field's name and the first is not preceded by one, so "walls 1200 sq ft
  // ceiling 600 sq ft" still reads forward.
  const live = quantities.map((q, i) => i).filter((i) => !suppressed.has(i));
  const namesRow = (word, qty) => {
    const unit = canonicalUnit(rawUnitOf(qty, text));
    if (!unit || !word) return [];
    const w = word.toLowerCase();
    return numberRows.filter((r) => rowUnit(r) && unitsCompatible(unit, rowUnit(r)) &&
      (termsByRow.get(r.d).has(w) || termsByRow.get(r.d).has(w.replace(/s$/, ""))));
  };
  let namesAfter = false;
  if (live.length >= 2) {
    const first = quantities[live[0]], last = quantities[live[live.length - 1]];
    const tail = text.slice(last.end).match(/^\s+([a-z]+)\b/i);
    const nameTok = new Set(String((opts && opts.name) || "").toLowerCase().split(/[^a-z]+/));
    const lead = text.slice(0, first.index).toLowerCase().split(/[^a-z]+/).filter((w) => w && !nameTok.has(w));
    namesAfter = Boolean(tail) && namesRow(tail[1], last).length === 1 && !lead.some((w) => namesRow(w, first).length);
  }
  quantities.forEach((qty, qi) => {
    if (suppressed.has(qi)) return;
    // "3.50 per gallon" fills the one field whose label says "per gallon"
    // (2026-11-23), with or without a unit on the number.
    {
      // The extractor hands back "per" as the unit of "3.50 per gallon".
      const said = /^per$/i.test(String(qty.unit || "")) ? text.slice(qty.end).match(/^\s+([a-z]+)\b/i)
        : text.slice(qty.end).match(/^\s*per\s+([a-z]+)\b/i);
      if (said) {
        const w = said[1].toLowerCase().replace(/s$/, "");
        const hit = numberRows.filter((r) => new RegExp("\\bper " + w + "s?\\b").test(String(r.l || "").toLowerCase()));
        if (hit.length === 1) { backOf.set(qi, { cut: 0, keys: [hit[0].d], dimension: false }); return; }
      }
    }
    const unit = canonicalUnit(rawUnitOf(qty, text));
    if (!unit) {
      // A count written with its noun -- "500 bricks", "10 post holes", "4
      // corners" -- fills the one count field (no unit, or "count") whose
      // label has that noun (2026-11-16).
      const raw = rawUnitOf(qty, text);
      if (!raw || !/^[a-z]{3,}$/.test(raw) || NON_UNIT_WORDS.has(raw)) return;
      const noun = raw.replace(/(?<=[a-z]{3})s$/, "");
      // The label's own words too: "6 air changes" names "Target air changes
      // per hour", though "air" is under the label-term floor (2026-11-23).
      let keys = numberRows.filter((r) => (!rowUnit(r) || rowUnit(r) === "count") &&
        (termsByRow.get(r.d).has(noun) || termsByRow.get(r.d).has(raw) ||
         (raw.length === 3 && String(r.l || "").toLowerCase().split(/[^a-z]+/).includes(raw)))).map((r) => r.d);
      // "20 pieces" names no label, but it is the tile's one Count/Quantity.
      if (!keys.length && /^(?:pieces?|pcs)$/.test(raw)) {
        keys = numberRows.filter((r) => ["count", "quantity"].some((w) => termsByRow.get(r.d).has(w))).map((r) => r.d);
      }
      // "Corners" beside "Extra studs per corner": the label using the word
      // exactly as typed is the count.
      if (keys.length > 1) {
        const literal = keys.filter((k) => String(rows.find((r) => r.d === k).l).toLowerCase().split(/[^a-z]+/).includes(raw));
        if (literal.length === 1) keys = literal;
        // "50 head" beside "Gallons/head at low temp": the field that is a
        // count (2026-11-23).
        const counted = keys.filter((k) => ["count", "number"].some((w) => termsByRow.get(k).has(w)));
        if (keys.length > 1 && counted.length === 1) keys = counted;
      }
      if (keys.length === 1 && Number.isInteger(Number(qty.value)) && Number(qty.value) >= 0) backOf.set(qi, { cut: 0, keys, count: true, dimension: false });
      return;
    }
    const next = quantities[qi + 1];
    const after = text.slice(qty.end, next ? next.index : text.length);
    let m = after.match(/^\s+of\s+([a-z][a-z -]*)/i);
    let terms = null;
    if (m) terms = windowTerms(m[1]);
    else if (unitFamily(unit) === "length" && (m = after.match(/^\s+(tall|high|deep|wide|long|thick|apart|rise|drop|fall|run|shallow|round)\b/i))) {
      terms = new Set([m[1].toLowerCase(), ...POST_WORDS.get(m[1].toLowerCase())]);
    }
    // "12 inches on center" is a spacing (2026-11-23: beside an edge
    // clearance in inches it went unread).
    else if (unitFamily(unit) === "length" && (m = after.match(/^\s+(?:on\s+cent(?:er|re)|o\.?c\.?)(?![a-z])/i))) {
      terms = new Set(["spacing", "center"]);
    }
    if (!terms && namesAfter) {
      const n = after.match(/^\s+([a-z]+)\b/i);
      const hit = n ? namesRow(n[1], qty) : [];
      if (hit.length === 1) { backOf.set(qi, { cut: n[0].length, keys: [hit[0].d], dimension: false }); return; }
    }
    if (!terms) {
      // "12 inch tile": a size followed by the name of an item whose two sides
      // the tile asks for (Tile width + Tile height) is a square item, and
      // fills both. Only that exact shape; any other trailing noun is left to
      // the usual rules.
      const n = after.match(/^\s+([a-z]+)\b/i);
      if (!n) return;
      const noun = n[1].toLowerCase().replace(/s$/, "");
      const pair = numberRows.filter((r) => rowUnit(r) && unitsCompatible(unit, rowUnit(r)) && termsByRow.get(r.d).has(noun) &&
        ["width", "height", "length"].some((w) => termsByRow.get(r.d).has(w)));
      const sides = pair.map((r) => ["width", "height", "length"].filter((w) => termsByRow.get(r.d).has(w)));
      if (pair.length === 2 && sides.every((x) => x.length === 1) && sides[0][0] !== sides[1][0]) {
        backOf.set(qi, { cut: n[0].length, keys: pair.map((r) => r.d), square: true, dimension: false });
      }
      return;
    }
    let keys = numberRows.filter((r) => rowUnit(r) && unitsCompatible(unit, rowUnit(r)) &&
      [...termsByRow.get(r.d)].some((t) => terms.has(t))).map((r) => r.d);
    // "9 ft rise" names "Total rise", not "Preferred riser height", which only
    // shares the synonym: the label using the written word itself wins
    // (2026-11-23; the tie dropped the rise and the stair tile filled nothing).
    if (keys.length > 1 && !/^\s+of\s/i.test(m[0])) {
      const word = m[1].toLowerCase();
      const literal = keys.filter((k) => termsByRow.get(k).has(word));
      if (literal.length === 1) keys = literal;
      // "50 ft long" beside a Wall length (ft) and a Block face length (in):
      // the field measured in the unit written (2026-11-23: 600 in of block).
      const exact = keys.filter((k) => rowUnit(numberRows.find((r) => r.d === k)) === unit);
      if (keys.length > 1 && exact.length === 1) keys = exact;
    }
    backOf.set(qi, { cut: m[0].length, keys, dimension: !/^\s+of\s/i.test(m[0]) });
  });
  quantities.forEach((qty, qi) => {
    let window = text.slice(prevEnd, qty.index);
    if (qi > 0 && backOf.has(qi - 1)) window = window.slice(backOf.get(qi - 1).cut);
    prevEnd = qty.end;
    if (suppressed.has(qi)) return;
    if (backOf.has(qi)) {
      const { keys, square, count } = backOf.get(qi);
      if (count) {
        if (keys[0] in filled) return;
        rowsFor.set(qi, keys);
        if (!proposals.has(keys[0])) proposals.set(keys[0], []);
        proposals.get(keys[0]).push(qi);
        return;
      }
      if (square) {
        if (keys.some((k) => k in filled)) return;
        const vals = keys.map((k) => valueFor(qty, numberRows.find((r) => r.d === k), text, labelWords));
        if (vals.some((v) => v === null)) return;
        keys.forEach((k, i) => { filled[k] = vals[i]; });
        claimed.add(qi);
        return;
      }
      if (keys.length !== 1) return;
      const row = numberRows.find((r) => r.d === keys[0]);
      if (valueFor(qty, row, text, labelWords) === null) return;
      rowsFor.set(qi, keys);
      if (!proposals.has(keys[0])) proposals.set(keys[0], []);
      proposals.get(keys[0]).push(qi);
      return;
    }
    const wanted = windowTerms(window);
    // labelTerms keeps a short label whole -- "AWG", "GPM", "Run", "APR" -- and
    // windowTerms dropped every query word under four characters, so the two
    // never met and "apr 6.5" left the rate empty. Admit a short window word
    // only when it names a field on THIS tile; the floor still drops
    // connectives everywhere else.
    for (const raw of String(window).toLowerCase().split(/[^a-z]+/)) {
      if (raw.length >= 2 && raw.length < 4 && labelWords.has(raw)) wanted.add(raw);
    }
    // A name word is the calculator's name only as many times as the name spells it, and
    // only in the first window, where the name is written. "ceiling speaker coverage,
    // ceiling height 9 ft" says "ceiling" twice: the second is the field (2026-11-15).
    const firstWindow = qi === firstQi;
    const toks = String(window).toLowerCase().split(/[^a-z]+/).filter(Boolean);
    for (const w of nameWords) {
      const inWindow = toks.filter((t) => t === w || t === w + "s").length;
      const inName = firstWindow ? (nameTokCount.get(w) || 0) : 0;
      if (inWindow <= inName) wanted.delete(w);
    }
    // A word the window holds ONLY as a select's whole option value is that
    // option, not a field name. "inch, 0.25, 20 tpi" chose the Inch thread
    // standard, and "inch" then named "Threads per inch", which took the 0.25
    // (2026-11-16). Written as part of a longer name ("threads per inch 20"),
    // the other words of that name still match.
    for (const r of selectRows) for (const o of r.o) {
      const tok = String(o).toLowerCase();
      if (!/^[a-z]+$/.test(tok) || !toks.includes(tok)) continue;
      // labelTerms also keeps a stem ("thickness" -> "thicknes"), so drop that too.
      for (const w of [...wanted]) if (tok.startsWith(w) && tok.length - w.length <= 2) wanted.delete(w);
    }
    if (!wanted.size) return;
    const hits = [];
    // Selects compete here even though only number rows get filled in this
    // phase. On `lv-dc-drop`, "System voltage 12" sits beside a
    // "Device min voltage" field: the select owns the words, but excluding it
    // from the contest left the number field as the sole match and it took the
    // 12. A fragment two fields can claim fills neither, and a select is a
    // field.
    for (const row of rows) {
      if (row.k === "select" || row.k === "checkbox") {
        // A select only competes for a number it could actually HOLD. On
        // `lv-dc-drop` the System-voltage select offers 12/24/48 and the query
        // says 12, so it is a genuine rival for that fragment and the nearby
        // "Device min voltage" field must not take it unopposed. On
        // `drainage-invert` the Slope-units select offers in_per_ft/percent
        // and the query says 2, which it can never hold -- treating it as a
        // rival there burned the fragment and cost 237 fills catalog-wide for
        // no safety gain.
        if (!Array.isArray(row.o)) continue;
        if (!row.o.some((o) => String(o) === String(qty.value))) continue;
        const terms = termsByRow.get(row.d);
        for (const t of terms) {
          const at = window.lastIndexOf(t);
          if (windowTerms(window).has(t) && at >= 0 && !isNegated(window, at)) { hits.push(row.d); break; }
        }
        continue;
      }
      const terms = termsByRow.get(row.d);
      let matched = false;
      for (const t of terms) {
        if (!wanted.has(t)) continue;
        const at = window.lastIndexOf(t);
        if (at >= 0 && isNegated(window, at)) continue;
        matched = true;
        break;
      }
      if (!matched) continue;
      // A number the lumber rewrite wrote only fills a field about the stick's size.
      if (qty.lumber && ![...termsByRow.get(row.d)].some((t) => ["nominal", "width", "depth", "thickness", "lumber"].includes(t))) continue;
      if (valueFor(qty, row, text, labelWords) === null) continue;   // unit disagreement
      // The same in the other direction: "a 40 ft wall 16 on center" names the
      // wall AFTER its 40 ft, and reading "wall" forward handed the bare 16 to
      // Wall length (2026-11-16); "40 ft wall 16 in" handed it 16 in as 1.33 ft.
      // When the words between two numbers are nothing but this field's name
      // (connectives of one or two letters aside), and the number BEFORE them
      // carries the field's own unit while this one does not carry it exactly,
      // the name belongs to the number before. "8 in sheets for a 24" is a
      // phrase, not a name, and is left alone.
      {
        const between = String(window).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
        const rowTerms = termsByRow.get(row.d);
        const ru = rowUnit(row);
        if (ru && qi > 0 && !suppressed.has(qi - 1) && between.length &&
            between.every((w) => rowTerms.has(w) || rowTerms.has(w.replace(/s$/, "")))) {
          const prevUnit = canonicalUnit(rawUnitOf(quantities[qi - 1], text));
          const thisUnit = canonicalUnit(rawUnitOf(qty, text));
          if (prevUnit === ru && thisUnit !== ru) continue;
          if (prevUnit && !thisUnit && unitsCompatible(prevUnit, ru)) continue;
        }
      }
      // A name beside the number is evidence; a unit ON the number is stronger,
      // and this phase weighed only the first. "310 lb worker and 6 ft free
      // fall" put the 6 into Workers attached -- a count -- because "worker"
      // sat in front of it, on a tile carrying a Free fall distance in feet.
      // So a unit-bearing quantity may not name a unitless field while some
      // other unfilled field is measured in a unit it fits. Narrow on purpose:
      // a unitless field still wins a unitless number, and still wins when
      // nothing else could hold this one.
      if (!rowUnit(row)) {
        const qtyUnit = canonicalUnit(rawUnitOf(qty, text));
        if (qtyUnit && rows.some((r) => !(r.d in filled) && rowUnit(r) && unitsCompatible(qtyUnit, rowUnit(r)))) continue;
      }
      hits.push(row.d);
    }
    if (!hits.length) return;
    // Two fields named by one fragment, where the words written are EXACTLY one
    // field's label: "principal 250000" beside Principal and "Extra principal
    // per month". The longer label's other words were not written, and every
    // word that was belongs to the short one, so it is that field (2026-11-15).
    // "extra principal 100" names neither exactly, and stays ambiguous.
    if (hits.length > 1) {
      // Literal words only: shorthand ("w" -> power) is a unit, not a name the reader wrote,
      // and a word inside a select option written in the query ("power-ratio") is that
      // option, not a field name.
      const literal = new Set(String(window).toLowerCase().split(/[^a-z]+/).filter((w) => w && !optionWordsInText.has(w)));
      const written = new Set([...wanted].filter((w) => labelWords.has(w) && literal.has(w)));
      // ...and EXACTLY means every word of the label, the short ones the term
      // floor drops included: "Inverter Vdc max" is not the word "inverter"
      // (2026-11-23: "inverter 49" filled it beside the MPPT limits).
      const fullWords = (k) => String((rows.find((r) => r.d === k) || {}).l || "").toLowerCase().split(/[^a-z]+/)
        .filter((w) => w.length > 2 && !TERM_STOPWORDS.has(w));
      const exact = hits.filter((k) => { const t = termsByRow.get(k); return t && t.size > 0 && [...t].every((w) => written.has(w)) && [...written].every((w) => t.has(w)) &&
        fullWords(k).every((w) => literal.has(w) || literal.has(w + "s")); });
      if (exact.length === 1) hits.splice(0, hits.length, exact[0]);
    }
    rowsFor.set(qi, hits);
    for (const key of hits) {
      if (!proposals.has(key)) proposals.set(key, []);
      proposals.get(key).push(qi);
    }
  });

  // A fragment that named TWO fields is ambiguous, and it stays ambiguous.
  // Burning it here is the point: without this, "slope 2 in per ft" -- where
  // "slope" names both the Slope field and its Slope-units select -- falls
  // through Phase A's veto into Phase B, which matches the bare `in` against
  // the tile's Pipe OD field and writes a 2 into it. A weaker rule must never
  // get to re-home a fragment a stronger rule already refused.
  const burned = new Set(suppressed);
  for (const [qi, hits] of rowsFor) if (hits.length > 1) burned.add(qi);
  // "8 ft tall" on a tile with no height is not this tile's spacing or length
  // either: a number its own words describe as a dimension the tile does not
  // take goes nowhere, rather than to whichever field its unit fits.
  // Only where the tile names its dimensions in these words at all: a stair's
  // "Total rise" is not refused a "9 ft high" just because no label says height.
  const namesDimensions = numberRows.some((r) => [...termsByRow.get(r.d)].some((t) => DIMENSION_WORDS.has(t)));
  for (const [qi, b] of backOf) if (b.dimension && b.keys.length !== 1 && namesDimensions) burned.add(qi);

  // A field wanted twice, once by the words AFTER a number ("8 ft apart") and
  // once by the words before another ("fence posts for 150 ft"), goes to the
  // value-then-name reading, which names its own number; the other number is
  // left for the later phases (2026-11-23: the tie dropped both).
  for (const [key, qis] of proposals) {
    if (qis.length < 2) continue;
    const back = qis.filter((qi) => backOf.has(qi) && !backOf.get(qi).count);
    if (back.length !== 1) continue;
    for (const qi of qis) if (qi !== back[0]) rowsFor.set(qi, (rowsFor.get(qi) || []).filter((k) => k !== key));
    proposals.set(key, back);
  }

  // Resolve only the unambiguous pairs: one field wanted by one fragment, and
  // that fragment wanting only that field. Everything else is dropped.
  for (const [qi, hits] of rowsFor) {
    if (hits.length !== 1) continue;                       // fragment claimed twice
    const key = hits[0];
    if ((proposals.get(key) || []).length !== 1) continue; // field wanted twice
    const row = numberRows.find((r) => r.d === key);
    if (!row) continue;                                   // a select won the name
    const value = backOf.has(qi) && backOf.get(qi).count ? String(quantities[qi].value) : valueFor(quantities[qi], row, text, labelWords);
    if (value === null) continue;
    filled[key] = value;
    claimed.add(qi);
  }

  // --- Phase B0: a size a dropdown holds -----------------------------------
  // A select whose options are all numbers is a list of VALUES -- pipe-volume's
  // nominal size ("1", "2", "4"), lumber spans' span table, a gauge list. Phase
  // C will not touch those without the field's own name beside the number,
  // which is right for a bare "40", and wrong for the way people actually
  // write: "pipe volume 4 in 50 ft" left the size sitting on its first option
  // and the tile answered 2.24 gal for a 1" pipe -- an answer to a question
  // nobody asked, with nothing on screen saying the 4 had been dropped.
  //
  // So a number that CARRIES A UNIT may fill one, under the same one-and-only
  // rule the rest of this file uses: the quantity is still unclaimed, exactly
  // one option equals it, and exactly one such select on the tile can take it.
  // A bare number never qualifies -- the unit is the corroboration.
  //
  // It runs BEFORE the unit-agreement fallback, and only for a quantity no
  // number field claims EXACTLY. That ordering is the whole point: on
  // `pipe-volume` the only field that accepts a length is Length (ft), so the
  // fallback read "4 in" as a pipe 0.33 ft long, wrote 4 inches into it, and
  // then had nothing left to put the reader's real 50 ft into. A field
  // measured in the unit the reader wrote still wins -- "50 ft" into Length
  // (ft) -- so this only takes the leftovers a same-family guess would have
  // mangled.
  const numericSelects = selectRows.filter(
    (r) => !(r.d in filled) && r.o.length > 1 && r.o.every((o) => /^[\d.]+$/.test(String(o).trim())),
  );
  if (numericSelects.length) {
    quantities.forEach((qty, qi) => {
      if (claimed.has(qi) || burned.has(qi)) return;
      const qtyUnit = canonicalUnit(rawUnitOf(qty, text));
      if (!qtyUnit) {
        // ...except one written right before an option word of another of the
        // tile's dropdowns: "3/4 pex", "2 pvc" is a size of that pipe
        // (2026-11-23). It fills the one numeric dropdown holding that value.
        const raw = rawUnitOf(qty, text);
        if (!raw || !selectRows.some((r) => !numericSelects.includes(r) && r.o.some((o) => String(o).toLowerCase() === raw))) return;
        const takers = numericSelects.filter((r) => !(r.d in filled) && r.o.filter((o) => Number(o) === Number(qty.value)).length === 1);
        if (takers.length !== 1) return;
        filled[takers[0].d] = String(takers[0].o.find((o) => Number(o) === Number(qty.value)));
        optionSized.add(takers[0].d);
        claimed.add(qi);
        return;
      }
      // A number field measured in exactly this unit is the better home.
      if (numberRows.some((r) => !(r.d in filled) && rowUnit(r) === qtyUnit)) return;
      // The unit corroborates that the number means something. It does not
      // corroborate that it means something HERE, and this phase never asked.
      // `wire size for a 50 amp circuit 90 feet away` put 90 into the
      // Insulation rating select, whose options are 60 / 75 / 90 -- because the
      // value matched an option and the reader had written a unit, any unit.
      // 90 C is a real rating, so nothing downstream looks wrong.
      //
      // A tile that measures nothing in this dimension has no home for the
      // quantity at all. pipe-volume does -- its Length is in feet, so a pipe
      // size in inches is a length among lengths and the case this phase was
      // written for still fills. wire-ampacity measures amps, degrees and
      // counts, and a distance in feet belongs to none of them.
      // A dropdown whose own label names the unit's quantity -- "Horsepower"
      // for 5 hp, "Voltage" for 230 v -- is corroborated by the unit itself,
      // though no field on the tile declares one: motor-fla read "a 5 hp motor
      // 230v single phase" as phase only until 2026-11-16.
      const unitWords = UNIT_QUANTITY_WORDS[qtyUnit];
      if (unitWords) {
        const named = numericSelects.filter((r) => !(r.d in filled) && [...termsByRow.get(r.d)].some((t) => unitWords.includes(t)) &&
          r.o.filter((o) => Number(o) === Number(qty.value)).length === 1);
        if (named.length === 1) {
          filled[named[0].d] = String(named[0].o.find((o) => Number(o) === Number(qty.value)));
          claimed.add(qi);
          return;
        }
      }
      if (!rows.some((r) => rowUnit(r) && unitsCompatible(qtyUnit, rowUnit(r)))) return;
      const takers = [];
      for (const row of numericSelects) {
        if (row.d in filled) continue;
        const opts = row.o.filter((o) => Number(o) === Number(qty.value));
        if (opts.length === 1) takers.push({ row, opt: String(opts[0]) });
      }
      if (takers.length !== 1) return;
      filled[takers[0].row.d] = takers[0].opt;
      claimed.add(qi);
    });
  }

  // --- Phase B: unit agreement --------------------------------------------
  // For what is left, fall back to spec-v591's proven rule: a quantity fills a
  // field when EXACTLY ONE unfilled field can accept its unit. A unitless
  // number never reaches here -- it would match everything.
  quantities.forEach((qty, qi) => {
    if (claimed.has(qi) || burned.has(qi) || qty.lumber) return;
    const qtyUnit = canonicalUnit(rawUnitOf(qty, text));
    if (!qtyUnit) return;
    const compatible = numberRows.filter(
      (r) => !(r.d in filled) && rowUnit(r) && unitsCompatible(qtyUnit, rowUnit(r)),
    );
    // An EXACT unit match is strictly better corroborated than a same-family
    // one, so it breaks what would otherwise be a tie. "3 in" against a tile
    // holding both a depth in inches and a width in feet is not genuinely
    // ambiguous: the reader wrote inches. Only when no field matches the unit
    // exactly do same-family fields compete, and then one must win alone.
    const exact = compatible.filter((r) => rowUnit(r) === qtyUnit);
    const candidates = exact.length ? exact : compatible;
    if (candidates.length !== 1) return;
    // A conversion is the weakest fill there is, so the words right beside the
    // number may veto it: "40 ft wall" is not a mortar joint and "span 12 ft"
    // is not a tributary width (2026-11-16). A neighbouring content word that
    // is not a term of the target field means the number is something else.
    // Even an exact unit: "11 hour driving" is driving time, which a "Weekly
    // on-duty already used (hr)" field does not hold (2026-11-23). Only an
    // activity word (-ing) right after the number, and only when the field
    // does not name it.
    // ...and "150 lb nitrogen" names the nitrogen field: when the word right
    // after the number is another field's term and not this one's, the unit
    // alone does not make it this field (2026-11-23: it became a bag weight).
    {
      const nxt = text.slice(qty.end).toLowerCase().match(/^\s+([a-z]{4,})\b/);
      const own = termsByRow.get(candidates[0].d);
      // Only where that field's key carries this unit ("n_lb_per_1000" for
      // "150 lb"): "310 lb worker" names a head count, which holds no pounds.
      if (nxt && !own.has(nxt[1]) && !own.has(nxt[1].replace(/s$/, "")) &&
          numberRows.some((r) => r.d !== candidates[0].d && termsByRow.get(r.d).has(nxt[1]) &&
            r.d.toLowerCase().split("_").includes(qtyUnit))) return;
    }
    {
      const act = text.slice(qty.end).toLowerCase().match(/^\s+([a-z]{3,}ing)\b/);
      const t = termsByRow.get(candidates[0].d);
      if (act && !t.has(act[1]) && !TERM_STOPWORDS.has(act[1]) && !String(candidates[0].l || "").toLowerCase().includes(act[1].slice(0, -3))) return;
    }
    if (rowUnit(candidates[0]) !== qtyUnit) {
      const before = text.slice(0, qty.index).toLowerCase().match(/([a-z]{3,})[^a-z0-9]*$/);
      const after = text.slice(qty.end).toLowerCase().match(/^[^a-z0-9]*([a-z]{3,})/);
      const t = termsByRow.get(candidates[0].d);
      const foreign = (w) => w && !TERM_STOPWORDS.has(w) && !NON_UNIT_WORDS.has(w) && canonicalUnit(w) === null &&
        !t.has(w) && !t.has(w.replace(/s$/, ""));
      if (foreign(before && before[1]) || foreign(after && after[1])) return;
    }
    const value = valueFor(qty, candidates[0], text, labelWords);
    if (value === null) return;
    filled[candidates[0].d] = value;
    if (rowUnit(candidates[0]) !== qtyUnit) converted.add(candidates[0].d);
    claimed.add(qi);
  });

  // --- Phase B2: a single-letter unit the reader typed with a space ---------
  //
  // `extractQuantities` takes a one-letter unit GLUED only -- "120V" is volts,
  // "120 v" is a bare number -- so an article ("a 50 amp circuit") and a
  // dimension separator ("20 x 30") can never read as units. Right rule, right
  // place: that function cannot see the tile. Its cost, measured 2026-09-02:
  // `ohms law 120 v, 10 a` filled NOTHING, the phrasing the home page's own
  // example chip advertised.
  //
  // Here there IS tile context. The letter is read back out of the reader's
  // text and fills only when it canonicalizes to a real unit AND exactly one
  // unfilled field declares that unit EXACTLY -- no same-family widening, since
  // the evidence is one character. `x` is not a unit, so "20 x 30" is
  // untouched; "50 amp" is three letters and Phase B already had it.
  const spacedLetterUnit = (qty) => {
    if (qty.unit || typeof qty.index !== "number") return null;
    const after = String(text).slice(qty.index).match(/^[\d.,/]+ ([a-z])(?![a-z0-9])/);
    return after ? canonicalUnit(after[1]) : null;
  };
  quantities.forEach((qty, qi) => {
    if (claimed.has(qi) || burned.has(qi)) return;
    const qtyUnit = spacedLetterUnit(qty);       // null when Phase B already had a real unit
    if (!qtyUnit) return;
    const exact = numberRows.filter((r) => !(r.d in filled) && rowUnit(r) === qtyUnit);
    if (exact.length !== 1) return;
    // Symmetric to the field test, and the fixture that caught it: "120 v 10 v"
    // on Ohm's Law is two candidate VALUES for one volts field, which is as
    // ambiguous as two fields for one value. One field and one value, or
    // nothing.
    const rivals = quantities.filter((other, oi) =>
      oi !== qi && !claimed.has(oi) && !burned.has(oi) && spacedLetterUnit(other) === qtyUnit);
    if (rivals.length) return;
    filled[exact[0].d] = String(qty.value);
    claimed.add(qi);
  });

  // --- Phase C: selects ----------------------------------------------------
  // A word-valued option matches on its own. A numeric or single-character
  // option needs the field's own name beside it, because a bare "40" is a
  // schedule, a percentage, and an ampacity all at once.
  const optionClaims = new Map();  // matched token -> [row key]
  const perRow = new Map();        // row key -> chosen option
  // A grouped number is one number: "1,250 ft" offered the AWG option "1" (and a
  // kcmil "250") as a second reading beside "12 awg", so the gauge filled neither
  // way until 2026-11-15. Options are searched with the thousands commas closed up.
  const optText = text.replace(/(^|[^\d.,])(\d{1,3}(?:,\d{3})+)(?![\d,])/g, (m, pre, n) => pre + n.replace(/,/g, ""));
  for (const row of selectRows) {
    const terms = termsByRow.get(row.d);
    const nameNear = [...terms].some((t) => text.includes(t));
    const matches = [];
    for (const opt of row.o) {
      const token = String(opt).toLowerCase().trim();
      if (!token) continue;
      const needsName = token.length < 3 || /^[\d.]+$/.test(token);
      // A hyphen in an option is also written as a space: "hazen williams" is
      // the option hazen-williams (2026-11-23). An underscore too ("natural
      // gas"), unless the spaced phrase is the tile's own wording: end_chill
      // and drag_chill sit in the label "End chill, or a drag chill", and
      // reading them there picked both.
      const spaced = token.replace(/_/g, " ");
      const ownWords = /_/.test(token) && (rows.some((r) => String(r.l || "").toLowerCase().includes(spaced)) || String((opts && opts.name) || "").toLowerCase().includes(spaced));
      const re = new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[- ]").replace(/_/g, ownWords ? "_" : "[_ ]")}([^a-z0-9]|$)`, "g");
      // An option written as the unit of a number that a field measured in that
      // unit can hold is that number's unit, not this select's choice: tank-mix
      // read "300 gal" (the tank) as Product unit = gal (2026-11-16).
      const asUnit = canonicalUnit(token);
      const ownsUnit = asUnit && numberRows.some((r) => rowUnit(r) && unitsCompatible(asUnit, rowUnit(r)));
      let at = -1;
      for (const m of optText.matchAll(re)) {
        const pos = m.index + m[1].length;
        if (ownsUnit && /\d\s*$/.test(optText.slice(0, pos))) continue;
        at = pos;
        break;
      }
      if (at < 0) continue;
      if (needsName && !nameNear) continue;
      if (isNegated(optText, at)) continue;
      matches.push(String(opt));
    }
    if (matches.length !== 1) continue;   // two readings of one field: neither
    perRow.set(row.d, matches[0]);
    const key = matches[0].toLowerCase();
    if (!optionClaims.has(key)) optionClaims.set(key, []);
    optionClaims.get(key).push(row.d);
  }
  for (const [key, choice] of perRow) {
    // One token claimed by two fields fills neither.
    if ((optionClaims.get(choice.toLowerCase()) || []).length !== 1) continue;
    filled[key] = choice;
  }

  // --- A mode dropdown named by what the question asks for -----------------
  // Options written "size-for-flow", "velocity-from-flow" lead with what the
  // mode computes. When exactly one option's leading word (4+ letters) is a
  // word of the question, that is the mode: "pipe size for 10 gpm" asks for
  // the size (2026-11-16).
  for (const r of selectRows) {
    if (r.d in filled || !/\bmode\b/i.test(r.l + " " + r.d)) continue;
    const words = new Set(text.split(/[^a-z]+/));
    const hits = r.o.filter((o) => {
      const lead = String(o).toLowerCase().split(/[-_ ]+/)[0];
      return lead.length >= 4 && /[-_]/.test(String(o)) && words.has(lead);
    });
    if (hits.length === 1) filled[r.d] = String(hits[0]);
  }

  // --- A "solve for" dropdown names the unknown ----------------------------
  // When its options name the tile's quantities and the question gives values
  // for all of them but one, that one is the unknown, whatever word the
  // question happened to use: "horsepower from torque 400 ft-lb at 5000 rpm"
  // chose "torque" (the word) and asked to solve for a torque it was handed
  // (2026-11-16).
  for (const r of selectRows) {
    if (!/\b(solve|find|unknown|calculate)\b/i.test(r.l)) continue;
    const map = r.o.map((o) => [o, numberRows.find((n) => n.d === o || n.d.startsWith(o + "_") || termsByRow.get(n.d).has(String(o).toLowerCase()))]);
    if (map.some(([, n]) => !n)) continue;
    const open = map.filter(([, n]) => !(n.d in filled));
    if (open.length === 1 && map.length - open.length >= 1) filled[r.d] = String(open[0][0]);
  }

  // --- The unit-select veto ------------------------------------------------
  // 22 tiles put the unit in a SELECT beside the number rather than in the
  // number's label -- drainage-invert's "Slope" with a `slope_units` of
  // in_per_ft|percent, refrigerant-charging's "Suction pressure" with
  // psig|psia. Those number fields correctly declare no unit of their own, so
  // nothing above can check one.
  //
  // That makes an unfilled unit select dangerous: "slope 2 in per ft" fills
  // slope=2 by name while the select sits on whatever it defaults to, and if
  // that default is `percent` the tile computes a slope forty times too steep
  // with no sign anything is wrong. So when a unit select is left unfilled,
  // every UNITLESS number this query filled is dropped. Fields that carry
  // their own unit are unaffected -- they were checked on the way in.
  const unitSelects = selectRows.filter((r) => /\bunits?\b/i.test(r.d) || /\bunits?\b/i.test(r.l));
  if (unitSelects.some((r) => !(r.d in filled))) {
    for (const r of numberRows) {
      if (!rowUnit(r) && r.d in filled) delete filled[r.d];
    }
  }

  // --- The ambiguous pair veto --------------------------------------------
  // `12/2` survives the rewrites untouched. If it is still in the text and the
  // fill leaned on it, we cannot tell a pitch from a cable spec, so nothing
  // that came from it is trustworthy.
  if (AMBIGUOUS_PAIR.test(String(query).toLowerCase()) && !/\bpitch|slope|rise|run\b/.test(text)) {
    for (const qi of claimed) {
      const q = quantities[qi];
      // A fraction with a length unit on it ("1/2 inch drill") is a measurement,
      // not a cable spec or a pitch (2026-11-23).
      if (q && /\//.test(text.slice(q.index, q.end)) && unitFamily(canonicalUnit(rawUnitOf(q, text)) || "") !== "length") {
        for (const [k, v] of Object.entries(filled)) {
          if (v === String(q.value) && !optionSized.has(k)) delete filled[k];
        }
      }
    }
  }

  quantities.forEach((qty, qi) => {
    if (!claimed.has(qi) && !suppressed.has(qi)) unmatched.push(String(qty.value) + (qty.unit ? " " + qty.unit : ""));
  });

  return {
    filled,
    converted: [...converted].filter((k) => k in filled),
    // Declaration order, so spec-v1342 can ask for the first one. NOTE this is
    // "unfilled", not "required" -- the registry carries no required flag and
    // spec-v1342 derives the real thing.
    missing: rows.filter((r) => !(r.d in filled)).map((r) => r.d),
    unmatched,
  };
}

// ---------------------------------------------------------------------------
// Shard loading.
//
// Lazy, cached per session, never at first paint. A failed fetch is a no-op:
// prefill is an enhancement and the tile's own form is always there.
const shardCache = new Map();

export async function loadFields(tileId, group) {
  const bucket = bucketFor(group, tileId);
  if (!bucket) return null;
  if (!shardCache.has(bucket)) {
    shardCache.set(bucket, (async () => {
      try {
        const r = await fetch(`data/fields/${bucket}.json`, { credentials: "omit" });
        if (!r.ok) return null;
        const text = await r.text();
        await verifyShard("fields", `${bucket}.json`, text);
        const json = JSON.parse(text);
        return json && json.tiles ? json.tiles : null;
      } catch {
        return null;
      }
    })());
  }
  const tiles = await shardCache.get(bucket);
  return tiles && tiles[tileId] ? tiles[tileId] : null;
}
