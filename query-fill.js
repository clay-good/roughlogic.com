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
import { canonicalUnit, unitsCompatible, convertUnit } from "./field-units.js";
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
  [/\b(\d+)\s*x\s*(\d+)\b/g, (m, w, d) =>
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

const AMBIGUOUS_PAIR = /\b\d+\s*\/\s*\d+\b/;

// Words that put a query in a temperature context, licensing the bare-letter
// rewrite below.
const TEMP_CONTEXT = /\b(temp|temperature|ambient|outdoor|indoor|db|wb|dry\s*bulb|wet\s*bulb|setpoint|supply\s*air|return\s*air|degrees?)\b/;

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
  const text = rewriteQuery(query, protect, skip);
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
  const suppressed = new Set();
  quantities.forEach((qty, qi) => {
    if (optionSpans.some(([s, e]) => qty.index >= s && qty.end <= e)) suppressed.add(qi);
  });
  const filled = {};
  const claimed = new Set();       // quantity indexes already spent
  const unmatched = [];

  // --- Phase A: name-then-value -------------------------------------------
  // The text between the previous number and this one is where a field name
  // lives: "length 40 width 20". This wins outright, because in a run of
  // readings the reverse reading manufactures a false hit for every one.
  const proposals = new Map();     // row key -> [quantity index]
  const rowsFor = new Map();       // quantity index -> [row key]

  let prevEnd = 0;
  quantities.forEach((qty, qi) => {
    const window = text.slice(prevEnd, qty.index);
    prevEnd = qty.end;
    if (suppressed.has(qi)) return;
    const wanted = windowTerms(window);
    // labelTerms keeps a short label whole -- "AWG", "GPM", "Run", "APR" -- and
    // windowTerms dropped every query word under four characters, so the two
    // never met and "apr 6.5" left the rate empty. Admit a short window word
    // only when it names a field on THIS tile; the floor still drops
    // connectives everywhere else.
    for (const raw of String(window).toLowerCase().split(/[^a-z]+/)) {
      if (raw.length >= 2 && raw.length < 4 && labelWords.has(raw)) wanted.add(raw);
    }
    for (const w of nameWords) wanted.delete(w);
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
      if (valueFor(qty, row, text, labelWords) === null) continue;   // unit disagreement
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

  // Resolve only the unambiguous pairs: one field wanted by one fragment, and
  // that fragment wanting only that field. Everything else is dropped.
  for (const [qi, hits] of rowsFor) {
    if (hits.length !== 1) continue;                       // fragment claimed twice
    const key = hits[0];
    if ((proposals.get(key) || []).length !== 1) continue; // field wanted twice
    const row = numberRows.find((r) => r.d === key);
    if (!row) continue;                                   // a select won the name
    const value = valueFor(quantities[qi], row, text, labelWords);
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
      if (!qtyUnit) return;                                // a bare number is not evidence
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
    if (claimed.has(qi) || burned.has(qi)) return;
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
    const value = valueFor(qty, candidates[0], text, labelWords);
    if (value === null) return;
    filled[candidates[0].d] = value;
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
  for (const row of selectRows) {
    const terms = termsByRow.get(row.d);
    const nameNear = [...terms].some((t) => text.includes(t));
    const matches = [];
    for (const opt of row.o) {
      const token = String(opt).toLowerCase().trim();
      if (!token) continue;
      const needsName = token.length < 3 || /^[\d.]+$/.test(token);
      const re = new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
      const at = text.search(re);
      if (at < 0) continue;
      if (needsName && !nameNear) continue;
      if (isNegated(text, at)) continue;
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
      if (q && /\//.test(text.slice(q.index, q.end))) {
        for (const [k, v] of Object.entries(filled)) {
          if (v === String(q.value)) delete filled[k];
        }
      }
    }
  }

  quantities.forEach((qty, qi) => {
    if (!claimed.has(qi) && !suppressed.has(qi)) unmatched.push(String(qty.value) + (qty.unit ? " " + qty.unit : ""));
  });

  return {
    filled,
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
