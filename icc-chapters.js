// spec-v1975: the free ICC chapter pages a code citation links to.
//
// codes.iccsafe.org serves each chapter of the current printing at
// /content/<printing>/<slug>; the section is one find-in-page away (the
// reader renders sections lazily, so a #section anchor does not land). The
// slug is the chapter title, and a short or guessed slug redirects to the
// book's front page, so each slug here was opened and its title read on the
// date in checked_on. A chapter not listed is simply not linked.
export const ICC_CHAPTERS = {
  IRC: { printing: "IRC2024V2.1", edition: 2024, checked_on: "2026-10-20", chapters: {
    3: "chapter-3-building-planning", 4: "chapter-4-foundations", 5: "chapter-5-floors", 6: "chapter-6-wall-construction",
    7: "chapter-7-wall-covering", 8: "chapter-8-roof-ceiling-construction", 9: "chapter-9-roof-assemblies",
    10: "chapter-10-chimneys-and-fireplaces", 14: "chapter-14-heating-and-cooling-equipment-and-appliances",
    15: "chapter-15-exhaust-systems", 31: "chapter-31-vents",
  } },
  IBC: { printing: "IBC2027V1.0", edition: 2027, checked_on: "2026-10-20", chapters: {
    5: "chapter-5-general-building-heights-and-areas", 7: "chapter-7-fire-and-smoke-protection-features",
    10: "chapter-10-means-of-egress", 14: "chapter-14-exterior-walls", 16: "chapter-16-structural-design",
    18: "chapter-18-soils-and-foundations", 21: "chapter-21-masonry", 30: "chapter-30-elevators-and-conveying-systems",
  } },
  IPC: { printing: "IPC2027V1.0", edition: 2027, checked_on: "2026-10-20", chapters: {
    3: "chapter-3-general-regulations", 4: "chapter-4-fixtures-faucets-and-fixture-fittings", 5: "chapter-5-water-heaters",
    6: "chapter-6-water-supply-and-distribution", 7: "chapter-7-sanitary-drainage", 9: "chapter-9-vents",
    10: "chapter-10-traps-interceptors-and-separators", 11: "chapter-11-storm-drainage",
  } },
  IMC: { printing: "IMC2027V1.0", edition: 2027, checked_on: "2026-10-20", chapters: {
    3: "chapter-3-general-regulations",
    5: "chapter-5-exhaust-systems-smoke-control-systems-and-energy-recovery-ventilation-systems",
  } },
  IFGC: { printing: "IFGC2027V1.0", edition: 2027, checked_on: "2026-10-20", chapters: {
    4: "chapter-4-gas-piping-installations",
  } },
};

// The Residential Code numbers its sections with a letter (R311, M1505, P3103);
// a bare "IRC 179" is the Internal Revenue Code and is never linked.
const IRC_PREFIX = /^[RMGPEN]$/;

// The chapter URL for a code section, or null when it should not be linked:
// a citation naming another edition, a chapter not in the table, or a number
// that is really a year ("IBC 2027" alone).
export function iccHref(code, year, prefix, number, hasDot) {
  const book = ICC_CHAPTERS[code];
  if (!book) return null;
  if (year && Number(year) !== book.edition) return null;
  if (code === "IRC" ? !IRC_PREFIX.test(prefix || "") : prefix) return null;
  if (!prefix && !hasDot && /^(19|20)\d\d$/.test(number)) return null;
  const chapter = Number(number.length === 4 ? number.slice(0, 2) : number.slice(0, 1));
  const slug = book.chapters[chapter];
  return slug ? `https://codes.iccsafe.org/content/${book.printing}/${slug}` : null;
}

// NFPA's free-access reader for a document and edition (a free account opens it).
export function nfpaHref(doc, year) {
  return `https://link.nfpa.org/free-access/publications/${doc}/${year}`;
}
