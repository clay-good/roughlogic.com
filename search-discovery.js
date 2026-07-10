// v10 Phase D runtime helpers (spec-v10.md §6).
//
// Pure-functional resolvers over the data/search/aliases.json shard.
// The resolvers are deliberately allocation-light and DOM-free so they
// can be unit-tested under node:test and so the same code runs in any
// future Web Worker.
//
// Functions:
//   resolveQuery(query, aliases, toolIds)
//     -> { match: tileId, alias?: term, kind?: 'industry' | 'redirect'
//          | 'adjacent' } | null
//     Resolves a free-text query against the alias table. Exact tile-id
//     match wins over any alias. Match is case-insensitive and trims
//     leading / trailing whitespace. Returns null on no match.
//
//   matchAliasPrefix(prefix, aliases, limit)
//     -> [{ term, target, kind }, ...]
//     Returns alias rows whose `term` starts with the given prefix
//     (case-insensitive). Used by the home-view search index for
//     autocomplete suggestions; capped at `limit` (default 8).
//
// All inputs are validated; bad input returns the appropriate empty
// value rather than throwing.
//
// spec-v589 adds the deterministic natural-language ranking layer:
//
//   normalizeQuery(query) -> { tokens, raw }
//     Lowercase, strip punctuation, split, map unit spellings through
//     TOKEN_SYNONYMS, drop STOPWORDS. An empty `tokens` array tells the
//     caller to fall back to plain substring matching on `raw`.
//
//   rankTools(tokens, tools, aliases, { limit }) -> [{ tool, score, viaTypo }]
//     Deterministic per-token field-weighted ranking over each tool's
//     name / alias terms / trades / desc, with prefix stemming, a
//     plural-strip fallback, and a bounded edit-distance-1 typo
//     fallback. Same input, same order, on every device, offline.
//
//   editDistance1(a, b) -> boolean
//     Damerau-Levenshtein distance <= 1 (transposition included).
//
// spec-v591 adds the quantity slot parser feeding prefilled deep links:
//
//   extractQuantities(query) -> [{ value, unit }]
//     Deterministic number+unit extraction ("120v", "150 ft", "3/4 in",
//     "1,200"). `value` is a canonical decimal string; `unit` is the
//     lowercase unit token or null. Unitless numbers never map.
//
//   mapSlots(quantities, slotRow) -> { param: value, ... } | null
//     Fills a tile's hash-state params from a data/search/slots.json row.
//     A quantity maps only when exactly one yet-unfilled slot accepts its
//     unit token; any ambiguity drops that quantity.

export function resolveQuery(query, aliases, toolIds) {
  if (typeof query !== "string") return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const ids = toIdSet(toolIds);
  // Exact tile-id match (no alias indirection): the user typed the id.
  if (ids.has(q)) return { match: q };
  if (!Array.isArray(aliases)) return null;
  for (const row of aliases) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.term !== "string" || typeof row.target !== "string") continue;
    if (row.term.toLowerCase() !== q) continue;
    if (ids.size > 0 && !ids.has(row.target)) continue;
    return { match: row.target, alias: row.term, kind: row.kind || "redirect" };
  }
  return null;
}

export function matchAliasPrefix(prefix, aliases, limit) {
  if (typeof prefix !== "string") return [];
  const p = prefix.trim().toLowerCase();
  if (!p) return [];
  if (!Array.isArray(aliases)) return [];
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8;
  const out = [];
  for (const row of aliases) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.term !== "string" || typeof row.target !== "string") continue;
    if (!row.term.toLowerCase().startsWith(p)) continue;
    out.push({ term: row.term, target: row.target, kind: row.kind || "redirect" });
    if (out.length >= cap) break;
  }
  return out;
}

function toIdSet(toolIds) {
  if (toolIds instanceof Set) return toolIds;
  if (Array.isArray(toolIds)) return new Set(toolIds);
  return new Set();
}

// ---------------------------------------------------------------------------
// spec-v589: deterministic natural-language ranking.
// ---------------------------------------------------------------------------

// Question-frame words stripped from a query before ranking. Deliberately
// excludes trade vocabulary that appears in tile names ("drop", "load",
// "span", "fall", "grade", ...): only words that carry no catalog signal.
export const STOPWORDS = new Set([
  // question frames
  "how", "what", "whats", "when", "wheres", "where", "which", "who", "whom",
  "whose", "why", "whichever", "whatever",
  // auxiliaries / copulas
  "do", "does", "did", "doing", "done", "is", "are", "was", "were", "be",
  "been", "being", "am", "can", "cant", "could", "couldnt", "should",
  "shouldnt", "would", "wouldnt", "will", "wont", "shall", "may", "might",
  "must", "have", "has", "had", "having", "dont", "doesnt", "didnt", "isnt",
  "arent", "wasnt", "werent", "im", "ive", "id", "ill",
  // pronouns / determiners
  "i", "me", "my", "mine", "myself", "we", "us", "our", "ours", "you",
  "your", "yours", "he", "him", "his", "she", "her", "hers", "they", "them",
  "their", "theirs", "it", "its", "this", "that", "these", "those", "there",
  "here", "the", "a", "an", "each", "both", "either", "neither", "such",
  "own", "same", "another", "other", "others", "something", "anything",
  "everything", "someone", "anyone",
  // glue prepositions / conjunctions
  "to", "of", "in", "on", "at", "by", "for", "from", "with", "without",
  "into", "onto", "as", "if", "then", "than", "so", "but", "and", "or",
  "nor", "not", "no", "yes", "about", "around", "between", "through",
  "during", "before", "after", "again", "also", "too", "just", "only",
  "even", "still", "yet", "per", "via", "versus", "vs",
  // quantity / degree frames
  "much", "many", "more", "most", "less", "least", "few", "fewer", "lot",
  "lots", "some", "any", "all", "every", "enough", "approx",
  "approximately", "roughly", "exactly",
  // request verbs
  "need", "needs", "needed", "want", "wants", "wanted", "get", "gets",
  "getting", "got", "give", "gives", "figure", "figuring", "figured",
  "out", "tell", "show", "find", "know", "help", "trying", "try", "going",
  "make", "makes", "use", "used", "using", "work", "works", "way", "ways",
  "calculate", "calculating", "calculation", "calculator", "compute",
  "determine", "estimate", "estimating", "convert", "converting",
  // generic sizing frames (the unit / trade tokens carry the signal)
  "size", "sizes", "sized", "sizing", "big", "right", "correct", "proper",
  "good", "best", "kind", "type", "long", "does", "take", "takes",
]);

// Unit / vocabulary spellings mapped to the canonical token(s) the tile
// names, descriptions, and alias terms actually use. A value may be a
// single token or an array of tokens.
export const TOKEN_SYNONYMS = new Map([
  ["sqft", ["square", "feet"]],
  ["sf", ["square", "feet"]],
  ["sq", "square"],
  ["ft", "feet"],
  ["foot", "feet"],
  ["lf", ["linear", "feet"]],
  ["cuft", ["cubic", "feet"]],
  ["cf", ["cubic", "feet"]],
  ["cuyd", ["cubic", "yard"]],
  ["cy", ["cubic", "yard"]],
  ["yd", "yard"],
  ["yds", "yard"],
  ["gal", "gallon"],
  ["gals", "gallon"],
  ["lb", "pound"],
  ["lbs", "pound"],
  ["oz", "ounce"],
  ["amps", "amp"],
  ["ampere", "amp"],
  ["amperes", "amp"],
  ["volts", "volt"],
  ["watts", "watt"],
  ["hp", "horsepower"],
  ["btuh", "btu"],
  ["btus", "btu"],
  ["kwhr", "kwh"],
  ["hr", "hour"],
  ["hrs", "hour"],
  ["temp", "temperature"],
]);

// Tokenize free text: lowercase, keep [a-z0-9], hyphen, slash, dot; split
// on whitespace. Compound tokens ("three-phase", "kw/ton") also emit their
// separator-split parts. `keepCompound` keeps the unsplit compound in the
// output (used for the corpus side so both shapes are matchable).
function tokenize(text, keepCompound) {
  if (typeof text !== "string" || !text) return [];
  const rough = text.toLowerCase().replace(/[^a-z0-9\-/.]+/g, " ").split(" ");
  const out = [];
  for (const tok of rough) {
    const t = tok.replace(/^[-/.]+|[-/.]+$/g, "");
    if (!t) continue;
    if (/[-/.]/.test(t)) {
      if (keepCompound) out.push(t);
      for (const part of t.split(/[-/.]+/)) if (part) out.push(part);
    } else {
      out.push(t);
    }
  }
  return out;
}

export function normalizeQuery(query) {
  if (typeof query !== "string") return { tokens: [], raw: "" };
  const raw = query.trim().toLowerCase();
  const tokens = [];
  const seen = new Set();
  for (const tok of tokenize(raw, false)) {
    const mapped = TOKEN_SYNONYMS.get(tok);
    const expanded = mapped == null ? [tok] : Array.isArray(mapped) ? mapped : [mapped];
    for (const t of expanded) {
      if (STOPWORDS.has(t) || seen.has(t)) continue;
      seen.add(t);
      tokens.push(t);
    }
  }
  return { tokens, raw };
}

// Damerau-Levenshtein distance <= 1: equal, one substitution, one
// insertion / deletion, or one adjacent transposition.
export function editDistance1(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let i = 0;
    while (i < la && a[i] === b[i]) i++;
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // substitution
    return (
      a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2)
    ); // transposition
  }
  const short = la < lb ? a : b;
  const long = la < lb ? b : a;
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.slice(i) === long.slice(i + 1); // insertion / deletion
}

// Field weights per matched query token (spec-v589 §2).
const FIELD_WEIGHTS = { name: 3, alias: 2, trade: 2, desc: 1 };
const FIELD_ORDER = ["name", "alias", "trade", "desc"];

// Per-tool tokenized corpus, cached on the tool object. The cache entry
// remembers the aliases array (identity + length) it was built against so
// a late-loaded or swapped alias shard rebuilds instead of going stale.
const _corpusCache = new WeakMap();
const _aliasIndexCache = new WeakMap();

function aliasIndex(aliases) {
  if (!Array.isArray(aliases)) return null;
  let entry = _aliasIndexCache.get(aliases);
  if (!entry || entry.len !== aliases.length) {
    const byTarget = new Map();
    for (const row of aliases) {
      if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
      const list = byTarget.get(row.target);
      if (list) list.push(row.term);
      else byTarget.set(row.target, [row.term]);
    }
    entry = { len: aliases.length, byTarget };
    _aliasIndexCache.set(aliases, entry);
  }
  return entry;
}

function corpusFor(tool, aliases, aliasEntry) {
  let c = _corpusCache.get(tool);
  const aliasLen = Array.isArray(aliases) ? aliases.length : 0;
  if (!c || c.aliasesRef !== aliases || c.aliasLen !== aliasLen) {
    const terms = aliasEntry ? aliasEntry.byTarget.get(tool.id) || [] : [];
    c = {
      aliasesRef: aliases,
      aliasLen,
      name: tokenize(tool.name, true),
      // Pure-number alias tokens are illustrative ("wire for 100 amp
      // subpanel 150 feet away"), not identifying: left in the corpus
      // they let any coincidental number in a query outrank the true
      // target. Compounds ("12/2", "220-61") stay.
      alias: tokenize(terms.join(" "), true).filter((t) => !/^\d+(\.\d+)?$/.test(t)),
      trade: tokenize(Array.isArray(tool.trades) ? tool.trades.join(" ") : "", true),
      desc: tokenize(tool.desc, true),
      nameLower: typeof tool.name === "string" ? tool.name.toLowerCase() : "",
      // Signal-bearing name parts for the covered-name bonus: split
      // compounds, drop question-frame words ("with", "for", "a").
      nameParts: tokenize(tool.name, false).filter((t) => !STOPWORDS.has(t)),
    };
    _corpusCache.set(tool, c);
  }
  return c;
}

// A query token matches a corpus token when equal, or when the query
// token (length >= 3) is a prefix of it: cheap stemming ("volt" ->
// "voltage", "amp" -> "ampacity"). Deliberately one-directional: letting
// short corpus tokens absorb longer query tokens would swallow typos
// ("con" would match "condiut") and defeat the edit-distance fallback.
// The longer-query-token direction ("voltages" -> "voltage") is handled
// by the plural-strip candidates instead.
function tokenMatches(qt, ct) {
  if (qt === ct) return true;
  return qt.length >= 3 && ct.length > qt.length && ct.startsWith(qt);
}

// Digit <-> word equivalence so "3 phase" meets "three-phase" (and the
// reverse) without rewriting the token, which would break fraction
// queries like "3/4".
const DIGIT_EQUIV = new Map([
  ["1", "one"], ["2", "two"], ["3", "three"], ["4", "four"], ["5", "five"],
  ["6", "six"], ["7", "seven"], ["8", "eight"], ["9", "nine"], ["10", "ten"],
  ["one", "1"], ["two", "2"], ["three", "3"], ["four", "4"], ["five", "5"],
  ["six", "6"], ["seven", "7"], ["eight", "8"], ["nine", "9"], ["ten", "10"],
]);

// Match candidates for a query token: the token itself, its
// plural-stripped forms (only useful when the unstripped token matches
// nothing, since the unstripped form is tried first), and its digit /
// word twin.
function candidatesOf(token) {
  const out = [token];
  if (token.length >= 4) {
    if (token.endsWith("es")) out.push(token.slice(0, -2));
    if (token.endsWith("s")) out.push(token.slice(0, -1));
  }
  const twin = DIGIT_EQUIV.get(token);
  if (twin) out.push(twin);
  return out;
}

// Best field weight for one query token against one tool corpus.
function bestFieldWeight(token, corpus) {
  for (const cand of candidatesOf(token)) {
    for (const field of FIELD_ORDER) {
      for (const ct of corpus[field]) {
        if (tokenMatches(cand, ct)) return FIELD_WEIGHTS[field];
      }
    }
  }
  return 0;
}

// Half-weight edit-distance-1 fallback for one query token. Returns the
// corrected corpus token alongside the weight so callers can surface
// "showing matches for ..." (spec-v592 did-you-mean).
function typoFieldWeight(token, corpus) {
  for (const field of FIELD_ORDER) {
    for (const ct of corpus[field]) {
      if (editDistance1(token, ct)) return { w: FIELD_WEIGHTS[field] / 2, ct };
    }
  }
  return null;
}

// One query token covers one name token when any candidate matches it
// exactly / by prefix, or (for a typo-eligible token) at edit distance 1.
function coversNamePart(token, namePart, typoEligible) {
  for (const cand of candidatesOf(token)) {
    if (tokenMatches(cand, namePart)) return true;
  }
  return typoEligible && editDistance1(token, namePart);
}

export function rankTools(tokens, tools, aliases, opts) {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  if (!Array.isArray(tools) || tools.length === 0) return [];
  const limit =
    opts && Number.isFinite(opts.limit) && opts.limit > 0
      ? Math.floor(opts.limit)
      : 12;
  const aliasEntry = aliasIndex(aliases);
  const joined = tokens.join(" ");

  // Pass 1: exact / prefix / plural scoring. Track which query tokens
  // matched at least one tool anywhere (typo eligibility is global).
  // Digit-led tokens ("150", "120v", "12/2" parts) are VALUES, not
  // content words: they add score when they happen to match, but never
  // count toward coverage -- otherwise a number quoted in some tile's
  // alias ("...150 feet away") outranks the true target whenever the
  // user's quantity coincides with it.
  const soft = tokens.map((t) => /^\d/.test(t));
  const scored = [];
  const matchedAnywhere = new Array(tokens.length).fill(false);
  for (const tool of tools) {
    if (!tool || typeof tool !== "object" || typeof tool.id !== "string") continue;
    const corpus = corpusFor(tool, aliases, aliasEntry);
    const weights = new Array(tokens.length);
    let score = 0;
    let coverage = 0;
    for (let i = 0; i < tokens.length; i++) {
      const w = bestFieldWeight(tokens[i], corpus);
      weights[i] = w;
      if (w > 0) {
        score += w;
        if (!soft[i]) coverage++;
        matchedAnywhere[i] = true;
      }
    }
    if (corpus.nameLower.startsWith(joined)) score += 2;
    scored.push({ tool, corpus, weights, score, coverage, viaTypo: false });
  }

  // Pass 2: bounded typo fallback, only for query tokens of length >= 3
  // that matched nothing exactly in any tool. (Three, not four: a
  // dropped-vowel token like "drp" is exactly the gloves-on-a-phone case
  // this pass exists for, and the global matched-nothing gate keeps it
  // from firing on tokens that already carry signal.)
  const typoEligible = new Array(tokens.length).fill(false);
  for (let i = 0; i < tokens.length; i++) {
    if (matchedAnywhere[i] || tokens[i].length < 3 || soft[i]) continue;
    typoEligible[i] = true;
    for (const row of scored) {
      const hit = typoFieldWeight(tokens[i], row.corpus);
      if (hit) {
        row.weights[i] = hit.w;
        row.score += hit.w;
        row.coverage++;
        row.viaTypo = true;
        if (!row.typoFixes) row.typoFixes = {};
        row.typoFixes[tokens[i]] = hit.ct;
      }
    }
  }

  // Covered-name bonus: when every signal-bearing name token is matched
  // by some query token, the tile IS what was asked (plus qualifiers), so
  // "voltage drop 3 phase" prefers Voltage Drop over wordier siblings.
  for (const row of scored) {
    if (row.coverage === 0) continue;
    const parts = row.corpus.nameParts;
    if (!parts.length) continue;
    let covered = true;
    for (const part of parts) {
      let hit = false;
      for (let i = 0; i < tokens.length && !hit; i++) {
        if (row.weights[i] > 0 && coversNamePart(tokens[i], part, typoEligible[i])) hit = true;
      }
      if (!hit) { covered = false; break; }
    }
    if (covered) row.score += 2;
  }

  const out = scored.filter((r) => r.coverage > 0);
  // Full-coverage candidates first, then best token coverage; ties break
  // by score desc, then name: a total, deterministic order.
  out.sort(
    (a, b) =>
      b.coverage - a.coverage ||
      b.score - a.score ||
      String(a.tool.name).localeCompare(String(b.tool.name)),
  );
  return out
    .slice(0, limit)
    .map((r) => ({
      tool: r.tool,
      score: r.score,
      viaTypo: r.viaTypo,
      typoFixes: r.typoFixes || null,
    }));
}

// ---------------------------------------------------------------------------
// spec-v591: quantity slot parsing for prefilled deep links.
// ---------------------------------------------------------------------------

// Number grammar: a simple fraction ("3/4"), a thousands-comma group
// ("1,200"), or a plain decimal. The match must not sit inside a longer
// number-ish token ("62.2", "6-3-2" never yield partial quantities).
const QUANTITY_RE = /(\d+\s*\/\s*\d+|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

export function extractQuantities(query) {
  if (typeof query !== "string" || !query) return [];
  const q = query.toLowerCase();
  const out = [];
  QUANTITY_RE.lastIndex = 0;
  let m;
  while ((m = QUANTITY_RE.exec(q)) !== null) {
    const before = m.index === 0 ? "" : q[m.index - 1];
    const afterIdx = m.index + m[0].length;
    // Anchored: a digit run glued to a preceding letter / number
    // punctuation is part of an identifier ("m3", "62.2" tail), not a
    // quantity.
    if (before && /[a-z0-9.,/-]/.test(before)) continue;
    let value;
    const frac = m[0].match(/^(\d+)\s*\/\s*(\d+)$/);
    if (frac) {
      const denom = Number(frac[2]);
      if (denom === 0) continue;
      value = String(parseFloat((Number(frac[1]) / denom).toFixed(6)));
    } else {
      value = m[0].replace(/,/g, "");
    }
    // Unit token: glued ("120v") or exactly one space away ("150 ft").
    // Single-letter units are accepted glued only, so an article ("a")
    // or a dimension separator ("x") never reads as a unit.
    let unit = null;
    const rest = q.slice(afterIdx);
    const glued = rest.match(/^([a-z%][a-z%/]{0,7})(?![a-z0-9])/);
    const spaced = rest.match(/^ ([a-z][a-z/]{1,7})(?![a-z0-9])/);
    if (glued) unit = glued[1];
    else if (spaced) unit = spaced[1];
    out.push({ value, unit });
  }
  return out;
}

export function mapSlots(quantities, slotRow) {
  if (!Array.isArray(quantities)) return null;
  if (!slotRow || !Array.isArray(slotRow.slots)) return null;
  const filled = {};
  for (const qty of quantities) {
    if (!qty || typeof qty.value !== "string") continue;
    if (typeof qty.unit !== "string" || !qty.unit) continue; // unitless never maps
    const candidates = slotRow.slots.filter(
      (s) =>
        s &&
        typeof s.param === "string" &&
        Array.isArray(s.units) &&
        s.units.includes(qty.unit) &&
        !(s.param in filled),
    );
    if (candidates.length === 1) filled[candidates[0].param] = qty.value;
  }
  return Object.keys(filled).length > 0 ? filled : null;
}
