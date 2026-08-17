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

// The description minus its first sentence, or "" when there is only one.
export function restOfDescription(desc) {
  const s = String(desc).trim();
  const lead = firstSentence(s);
  return s.slice(lead.length).trim();
}
