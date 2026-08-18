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

export function firstSentence(desc) {
  const s = String(desc).trim();
  const re = /\.\s+(?=[A-Z0-9])/g;
  let m;
  while ((m = re.exec(s))) {
    const end = m.index + 1;
    if (end < MIN_LEAD) continue;
    const before = s.slice(0, m.index);
    const word = (before.match(/([A-Za-z.]+)$/) || ["", ""])[1].toLowerCase();
    if (ABBREV.has(word)) continue;
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
const LEAD_CAP = 160;
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
  for (let i = LEAD_CAP - 3; i >= MIN_LEAD; i--) {
    if (s[i] === " " && balanced(s.slice(0, i))) return i;
  }
  return -1;
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
    if (cut > 0) return { sentence, lead: sentence.slice(0, cut).replace(/[,;:\s-]+$/, "") + "...", at: cut };
    if (at < 0) return { sentence, lead: sentence, at: -1 };
  }
  return { sentence, lead: sentence.slice(0, at).replace(/[,;:\s-]+$/, "") + ".", at };
}

export function leadSentence(desc) {
  return leadCut(desc).lead;
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
  const { sentence, at } = leadCut(s);
  const tail = s.slice(sentence.length).trim();
  if (at < 0) return tail;
  if (s.slice(at, at + 2) !== ": ") return s;
  const rest = (sentence.slice(at + 2).trim() + (tail ? " " + tail : "")).trim();
  return rest ? openAsSentence(rest) : s;
}
