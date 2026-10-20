#!/usr/bin/env node
// spec-v1975: the ICC chapter table a citation links through.
//
// Every slug is a real chapter URL only because someone opened it; a slug is
// the chapter's title and a wrong one silently redirects to the book's front
// page. So: each slug is well formed and names its own chapter number, each
// book's checked_on is a real date within the past year (re-open the pages and
// restamp it after that), and every chapter a current citation actually needs
// is in the table -- a citation that names a chapter the table lacks would
// quietly stay unlinked.
import { ICC_CHAPTERS, iccHref } from "../icc-chapters.js";
import { CITATIONS } from "../citations.js";

const errors = [];
const today = new Date();
for (const [code, book] of Object.entries(ICC_CHAPTERS)) {
  if (!/^[A-Z]+\d{4}V\d+\.\d+$/.test(book.printing) || !book.printing.startsWith(code + book.edition)) errors.push(`${code}: printing ${book.printing} does not name ${code}${book.edition}`);
  const d = new Date(book.checked_on + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(book.checked_on) || Number.isNaN(d.getTime())) errors.push(`${code}: checked_on ${book.checked_on} is not a date`);
  else if (d > today) errors.push(`${code}: checked_on ${book.checked_on} is in the future`);
  else if ((today - d) / 86400000 > 366) errors.push(`${code}: chapter slugs last opened ${book.checked_on}; open each URL again and restamp checked_on`);
  for (const [n, slug] of Object.entries(book.chapters)) {
    if (!(Number(n) >= 1 && Number(n) <= 60)) errors.push(`${code}: chapter ${n} is outside 1 to 60`);
    if (!new RegExp(`^chapter-${n}-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(slug)) errors.push(`${code} chapter ${n}: slug ${slug} is not chapter-${n}-<title>`);
  }
}

// Every ICC section a citation names, in the edition the table holds, must have
// its chapter listed.
const RE = /\b(IRC|IBC|IPC|IMC|IFGC)(?:\s+((?:19|20)\d\d))?\s+(?:(?:Sections?|Tables?|Figure)\s+)?([A-Z]{0,2})(\d{3,4})((?:\.\d+)*)/g;
let linked = 0;
const missing = new Set();
for (const [id, c] of Object.entries(CITATIONS)) {
  for (const k of ["formula", "edition", "freeAccess", "editionNote"]) {
    const s = c[k];
    if (typeof s !== "string") continue;
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(s)) !== null) {
      const [, code, year, prefix, number, dot] = m;
      const book = ICC_CHAPTERS[code];
      if (year && Number(year) !== book.edition) continue;
      if (code === "IRC" ? !/^[RMGPEN]$/.test(prefix) : prefix) continue;
      if (!prefix && !dot && /^(19|20)\d\d$/.test(number)) continue;
      if (iccHref(code, year, prefix, number, Boolean(dot))) { linked++; continue; }
      missing.add(`${code} chapter ${Number(number.length === 4 ? number.slice(0, 2) : number.slice(0, 1))} (${id}: "${m[0]}")`);
    }
  }
}
for (const x of missing) errors.push(`no chapter slug for ${x}: open the chapter on codes.iccsafe.org and add it to icc-chapters.js`);

if (errors.length) {
  for (const e of errors) console.error("ERROR: " + e);
  console.error(`check-citation-links FAILED with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`check-citation-links OK: ${Object.values(ICC_CHAPTERS).reduce((n, b) => n + Object.keys(b.chapters).length, 0)} ICC chapter slugs across ${Object.keys(ICC_CHAPTERS).length} codes, all opened within a year; ${linked} citation references link to their chapter.`);
