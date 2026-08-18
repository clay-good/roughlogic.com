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

export function leadSentence(desc) {
  const s = firstSentence(desc);
  if (s.length <= LEAD_CAP) return s;
  CLAUSE.lastIndex = 0;
  let m;
  while ((m = CLAUSE.exec(s))) {
    if (m.index >= MIN_LEAD) return s.slice(0, m.index).replace(/[,;:\s-]+$/, "") + ".";
  }
  return s;
}

// The prose that belongs below the answer. When the lead is the whole opening
// sentence, that is everything after it. When the lead is a clause-cut summary
// of a longer sentence, it is the whole description: a Details block has to
// read as prose, and starting one mid-sentence in lower case reads as a bug.
export function restOfDescription(desc) {
  const s = String(desc).trim();
  const sentence = firstSentence(s);
  if (leadSentence(s) !== sentence) return s;
  return s.slice(sentence.length).trim();
}
