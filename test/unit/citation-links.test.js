// spec-v1966 (spec-v106 roadmap pillar 2): the static shells link the official
// free sources their citations name, through the same citationSegments matcher
// the live reference block uses. A linker that drops or rewrites a word, links
// a version number, or lets citation text through unescaped is worse than plain
// text, so this runs it over every tile's citation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CITATIONS } from "../../citations.js";
import { citationSegments, cfrHref } from "../../citation-block.js";
import { linkedCitationHtml } from "../../scripts/build-shells.mjs";

const FIELDS = ["formula", "edition", "freeAccess", "governance"];
const HOST = /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:gov|org|com|edu|net|mil|int)(?:\/|$)/i;

test("every citation line links only public sources and keeps its words", () => {
  const bad = [];
  let links = 0, tiles = 0, cfrLinks = 0;
  for (const [id, c] of Object.entries(CITATIONS)) {
    if (!c || typeof c !== "object") continue;
    let tileLinked = false;
    for (const f of FIELDS) {
      const v = c[f];
      if (typeof v !== "string" || !v) continue;
      const segs = citationSegments(v);
      if (segs.map((x) => x.text).join("") !== v) bad.push(`${id}.${f}: segments do not rebuild the text`);
      for (const x of segs.filter((s) => s.href)) {
        links++; tileLinked = true;
        if (!HOST.test(x.href)) bad.push(`${id}.${f}: "${x.href}" is not an https link to a public host`);
        // A CFR reference (spec-v1969) keeps its own words and links to the
        // eCFR section or part those words name; anything else links to itself.
        const cfr = /^(\d+) CFR (?:\u00a7\u00a7? ?|Parts? )?(\d+)(?:\.(\w+))?$/.exec(x.text);
        if (cfr) { cfrLinks++; if (x.href !== cfrHref(cfr[1], cfr[2], cfr[3])) bad.push(`${id}.${f}: "${x.text}" links to ${x.href}`); }
        else if (x.href !== "https://" + x.text) bad.push(`${id}.${f}: link text "${x.text}" differs from its target`);
        // A code section, a standard number or a version is never a link.
        if (/^\d+(\.\d+)+$/.test(x.text)) bad.push(`${id}.${f}: version-like "${x.text}" linked`);
      }
      const html = linkedCitationHtml(v);
      if (/<(?!a class="citation-link" href="https:\/\/|\/a>)/.test(html)) bad.push(`${id}.${f}: unescaped markup in shell HTML`);
    }
    if (tileLinked) tiles++;
  }
  assert.ok(tiles > 500 && links > 600, `only ${tiles} tiles / ${links} links: did the matcher or the citations change?`);
  assert.ok(cfrLinks > 100, `only ${cfrLinks} CFR links: did the CFR matcher change?`);
  assert.deepEqual(bad.slice(0, 20), [], `${bad.length} bad citation link(s)`);
});

test("the matcher leaves version numbers alone, links CFR sections to eCFR, and escapes the rest", () => {
  assert.deepEqual(citationSegments("29 CFR 1910.146 and IEEE 802.3, free at ecfr.gov."), [
    { text: "29 CFR 1910.146", href: "https://www.ecfr.gov/current/title-29/section-1910.146" },
    { text: " and IEEE 802.3, free at " },
    { text: "ecfr.gov", href: "https://ecfr.gov" },
    { text: "." },
  ]);
  assert.equal(linkedCitationHtml("A <b> & nfpa.org/freeaccess"),
    'A &lt;b&gt; &amp; <a class="citation-link" href="https://nfpa.org/freeaccess" rel="noopener noreferrer">nfpa.org/freeaccess</a>');
  assert.deepEqual(citationSegments("no link here"), [{ text: "no link here" }]);
  assert.deepEqual(citationSegments("29 CFR § 1926.502(d)(16); 49 CFR 213; 29 CFR Part 1926 Subpart P"), [
    { text: "29 CFR § 1926.502", href: "https://www.ecfr.gov/current/title-29/section-1926.502" },
    { text: "(d)(16); " },
    { text: "49 CFR 213", href: "https://www.ecfr.gov/current/title-49/part-213" },
    { text: "; " },
    { text: "29 CFR Part 1926", href: "https://www.ecfr.gov/current/title-29/part-1926" },
    { text: " Subpart P" },
  ], "a paragraph and a subpart stay text; a bare part links to the part");
  assert.deepEqual(citationSegments("51 CFR 3 and 129 CFR 4"), [{ text: "51 CFR 3 and 129 CFR 4" }], "CFR titles run 1 to 50");
});
