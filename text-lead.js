// Splitting a tile description into its opening sentence and the rest.
//
// Descriptions run to a 401-character median and a 1,457-character max. Every
// surface that shows one leads with the first sentence and puts the remainder
// somewhere the reader reaches after the answer: the static shell (Details
// section), the live view (detail paragraph under the output), the group hub
// (one scannable row). Shared here so those surfaces cannot drift apart.
//
// A period only ends a sentence when it is followed by whitespace and then an
// uppercase letter or a digit, and when the word before it is not a known
// abbreviation -- so "0.75", "e.g. the", and "3 in. of head" all stay put.
// A candidate shorter than MIN_LEAD keeps extending, so a description opening
// with a short clause does not collapse to three words.

// Abbreviations that end in a period mid-sentence. Splitting after one of
// these would cut a description in half at "Rev. Proc." or "approx. 3 in.".
const ABBREV = new Set([
  "e.g", "i.e", "vs", "etc", "approx", "no", "fig", "ref", "sec", "ch", "vol",
  "rev", "proc", "pub", "std", "ed", "min", "max", "avg", "est", "dia", "temp",
  "eq", "eqs", "tbl", "art", "sects", "para", "cl",
  "in", "ft", "yd", "lb", "oz", "gal", "qt", "pt", "hr", "wt", "st", "mt",
  "dr", "mr", "ms", "jr", "sr", "inc", "co", "corp", "u.s", "u.k",
]);

const MIN_LEAD = 40;
// Floor for the bracket-cut last resort (see wordCut).
const BRACKET_MIN = 24;

// A sentence can also end in front of a lower-case symbol, because the next
// sentence is a formula and its subject is a variable name: "...the azimuth of
// the line between them. distance = sqrt(dN^2 + dE^2)". Upper-casing is the
// only signal the base rule has, so without this the plain-English opening
// gets welded to the equation and the lead the reader sees is half algebra.
// Narrow on purpose: the token must be an identifier followed by "=", or a
// named function call, so "3 in. of head" and "e.g. the" still stay put.
const FORMULA_OPENER = /^(?:%?[A-Za-z][A-Za-z0-9_,]*(?:\([^)]*\))?\s*=\s|(?:sqrt|sin|cos|tan|ln|log|exp|atan2)\s*\()/;

export function firstSentence(desc) {
  const s = String(desc).trim();
  const re = /\.\s+(?=[A-Za-z0-9%])/g;
  let m;
  while ((m = re.exec(s))) {
    const end = m.index + 1;
    if (end < MIN_LEAD) continue;
    const before = s.slice(0, m.index);
    const word = (before.match(/([A-Za-z.]+)$/) || ["", ""])[1].toLowerCase();
    if (ABBREV.has(word)) continue;
    const after = s.slice(m.index + m[0].length);
    if (!/^[A-Z0-9]/.test(after) && !FORMULA_OPENER.test(after)) continue;
    return s.slice(0, end);
  }
  return s;
}

// An opening sentence is not automatically a short one: 530 of them run past
// 200 characters and the longest is 615, because these descriptions pack the
// whole scope into one sentence behind a colon or a dash ("The bathroom
// rough-in check, in four numbers: 15 in from a fixture centerline to ...").
// A lead like that is the wall of text the one-sentence rule was meant to
// avoid. So when the sentence runs long, cut it at its first real clause
// boundary and let the full text carry the rest below the answer.
const LEAD_CAP = 120;
const CLAUSE = /(: | -- |; )/g;
const COMMA = /, /g;

// Every boundary at or past MIN_LEAD, so a lead never collapses to a
// three-word fragment.
function seams(s, re) {
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(s))) {
    if (m.index >= MIN_LEAD && balanced(s.slice(0, m.index))) out.push(m.index);
  }
  return out;
}

// A seam inside a parenthetical is not a seam. Cutting at the comma in
// "(100% of the first 10 kVA, 50% above)" leaves a lead that ends on an
// unclosed bracket, which reads as a truncation bug rather than a summary.
function balanced(prefix) {
  let depth = 0;
  for (const ch of prefix) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
  }
  return depth === 0;
}

// The fullest seam that still fits the cap, or -1.
function widest(list) {
  const fits = list.filter((i) => i <= LEAD_CAP);
  return fits.length ? Math.max(...fits) : -1;
}

// The last word boundary that fits the cap and does not leave an open bracket.
// Returns -1 when the first word already overruns the cap, which no
// description does today but a future one could.
function wordCut(s) {
  // Budget for the ellipsis, so the string the reader sees honors the cap
  // rather than the slice that precedes it.
  const limit = LEAD_CAP - 3;
  for (let i = limit; i >= MIN_LEAD; i--) {
    if (s[i] === " " && balanced(s.slice(0, i))) return i;
  }
  // Every word boundary in range sits inside a parenthetical -- one aside can
  // span the whole window ("The feeder conductor ampacity (125% of the largest
  // motor full-load current plus the sum of the rest, NEC 430.24) and ..."), so
  // there is no balanced space to cut on. Cut at the aside's opening bracket
  // instead: still inside the cap, still balanced, and it ends on the clause
  // the aside was about to qualify.
  // A lower floor than MIN_LEAD here on purpose: this is the last step before
  // shipping the entire sentence, and "Turns the wetted-surface field read..."
  // at 34 characters serves a reader better than the same thought at 239.
  const open = lastUnclosed(s.slice(0, limit + 1));
  return open >= BRACKET_MIN ? open : -1;
}

// A word cut lands wherever the cap falls, which is often just after the word
// that was about to introduce the next thought ("... NEC 430.24) and..."). The
// dangling conjunction adds nothing but a stumble, so drop it along with any
// trailing punctuation.
const DANGLING = /(?:^|\s)(?:and|or|plus|with|for|the|a|an|of|to|in|on|by|from|at|as|into|than|that|which|when|per|is|are|its|their|but|if|so)$/i;
function trimDangling(s) {
  let out = s.replace(/[,;:\s-]+$/, "");
  // One pass is enough in practice ("of the" is two words but the first trim
  // leaves "of", which the second catches), so loop until stable but bounded.
  for (let i = 0; i < 3; i++) {
    const next = out.replace(DANGLING, "").replace(/[,;:\s-]+$/, "");
    if (next === out || next.length < BRACKET_MIN) break;
    out = next;
  }
  return out;
}

// Index of the last "(" that the prefix never closes, or -1.
function lastUnclosed(prefix) {
  const stack = [];
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] === "(") stack.push(i);
    else if (prefix[i] === ")") stack.pop();
  }
  return stack.length ? stack[stack.length - 1] : -1;
}

// Where the lead was cut out of the opening sentence, and on what. The seam
// kind decides what the Details block can start from, so both callers read it
// from one place: { sentence, lead, at } with at = -1 when the whole opening
// sentence is the lead.
function leadCut(desc) {
  const sentence = firstSentence(desc);
  if (sentence.length <= LEAD_CAP) return { sentence, lead: sentence, at: -1 };
  const clause = seams(sentence, CLAUSE);
  const comma = seams(sentence, COMMA);
  // A clause boundary is the best cut: it ends a complete thought. Take the
  // last one that fits, so the lead says as much as it can within the cap.
  let at = widest(clause);
  // Sentences that open "Bluff-body aerodynamic drag: F = 1/2 rho V^2 Cd A,
  // the reason ..." put their only colon before MIN_LEAD and their next
  // clause seam 340 characters out. Neither fits, so fall back to a comma,
  // which is still a real grammatical seam.
  if (at < 0) at = widest(comma);
  // Nothing fits the cap: take the earliest seam of any kind rather than
  // shipping the whole sentence, which is what the cap exists to prevent.
  if (at < 0) {
    const all = clause.concat(comma);
    at = all.length ? Math.min(...all) : -1;
  }
  // Both fallbacks above can still miss: 8 opening sentences carry no seam at
  // all, and for 29 more the earliest seam sits past the cap (one runs 250
  // characters to its first comma). Either way the reader gets the wall of
  // text the cap exists to prevent, on the one line the page is built around.
  // So the last resort is the cap itself, at the nearest word boundary, with
  // an ellipsis because the sentence really is cut mid-thought -- the full
  // text is one tap away in Details, which repeats the whole sentence.
  if (at < 0 || at > LEAD_CAP) {
    const cut = wordCut(sentence);
    if (cut > 0) return { sentence, lead: trimDangling(sentence.slice(0, cut)) + "...", at: cut };
    if (at < 0) return { sentence, lead: sentence, at: -1 };
  }
  return { sentence, lead: sentence.slice(0, at).replace(/[,;:\s-]+$/, "") + ".", at };
}

// A lead that has already said what the calculator gives you, in words, and
// then appends the equation ("The rise (sagitta) of an arc from a known radius
// and chord, rise = R - sqrt(R^2 - (chord/2)^2)") carries the formula twice
// over: the collapsed block below prints it with its source, and Details
// prints the sentence whole. On the one line the page is built around, the
// algebra is the half a reader cannot act on. So when the words come first and
// the equation trails them after a real seam, the lead stops at that seam and
// Details picks up from the equation.
const EQUATION = /[A-Za-z0-9_)\]]\s*(?:=|~)\s*[A-Za-z0-9(\u221a.-]/;
const TAIL_SEAM = /(?:, | -- | - |: |; )/g;

// The seam a trailing formula hangs off, or -1.
function formulaTailAt(lead) {
  const eq = lead.search(EQUATION);
  if (eq < 0) return -1;
  TAIL_SEAM.lastIndex = 0;
  let at = -1;
  let m;
  while ((m = TAIL_SEAM.exec(lead)) && m.index < eq) {
    if (m.index >= MIN_LEAD && balanced(lead.slice(0, m.index))) at = m.index;
  }
  if (at < 0) return -1;
  // The words in front have to stand on their own, and carry no equation of
  // their own -- otherwise this would cut a lead that was always algebra
  // ("Q = C i A peak runoff, in cfs and gpm") down to more algebra.
  if (EQUATION.test(lead.slice(0, at))) return -1;
  // And the seam has to introduce the formula, not continue a list. "across
  // HP, torque, and RPM via HP = Torque x RPM / 5252" puts its last seam in
  // the middle of the list, and cutting there drops RPM from a lead that names
  // the other two. A tail opening on a coordinator is the sentence still
  // talking, so leave that lead whole rather than truncate the list.
  if (/^(?:and|or|plus|then|but|as well as)\b/i.test(lead.slice(at).replace(/^[,;:\s-]+/, ""))) return -1;
  return at;
}

export function leadSentence(desc) {
  const { lead } = leadCut(desc);
  const at = formulaTailAt(lead);
  return at < 0 ? lead : trimDangling(lead.slice(0, at)) + ".";
}

// Upper-case the opening letter so the block reads as prose -- unless it opens
// on a symbol the reader is meant to match against the formula below it
// ("d = 0.005 x 92^((36 - n)/39) inches"), where re-casing renames the
// variable, or on a token too short to be an ordinary word.
function openAsSentence(t) {
  if (/^[A-Za-z_][\w.]*\s*=/.test(t)) return t;
  const first = (t.match(/^[a-z]+/) || [""])[0];
  if (first.length < 3) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// The prose that belongs below the answer.
//
// When the lead is the whole opening sentence, that is everything after it.
// When the lead is a clause-cut summary, what follows depends on the seam. A
// COLON splits a sentence into a summary and a self-contained explanation, so
// Details starts after the colon and the page states its opening line once.
// Every other seam leaves a fragment behind ("plus per-set load adequacy",
// "-- and those are not independent numbers"), so there the whole sentence
// repeats rather than ship a Details block that opens mid-thought.
export function restOfDescription(desc) {
  const s = String(desc).trim();
  const { sentence, lead, at } = leadCut(s);
  const tail = s.slice(sentence.length).trim();
  // When the formula trim fired, Details opens on the equation the lead
  // dropped -- a complete statement on its own, and the one thing the reader
  // opened the disclosure for.
  const cut = formulaTailAt(lead);
  if (cut >= 0) {
    const rest = (s.slice(cut).replace(/^[,;:\s-]+/, "") + "").trim();
    if (rest) return rest;
  }
  if (at < 0) return tail;
  if (s.slice(at, at + 2) !== ": ") return s;
  const rest = (sentence.slice(at + 2).trim() + (tail ? " " + tail : "")).trim();
  return rest ? openAsSentence(rest) : s;
}
