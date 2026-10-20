// spec-v1975: ICC sections link to their chapter of the free current text, NFPA
// documents with an edition to NFPA's free-access reader.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { citationSegments } from "../../citation-block.js";
import { ICC_CHAPTERS, iccHref, nfpaHref } from "../../icc-chapters.js";
import { CITATIONS } from "../../citations.js";

const links = (t) => citationSegments(t).filter((s) => s.href).map((s) => [s.text, s.href]);

test("citation links: the spec's examples link where they should, and only there", () => {
  assert.deepEqual(links("IRC 2024 R1001.10 and R1001.9.2"), [["IRC 2024 R1001.10", "https://codes.iccsafe.org/content/IRC2024V2.1/chapter-10-chimneys-and-fireplaces"]]);
  assert.deepEqual(links("IPC 2027 Table 709.1"), [["IPC 2027 Table 709.1", "https://codes.iccsafe.org/content/IPC2027V1.0/chapter-7-sanitary-drainage"]]);
  assert.deepEqual(links("IMC 2027 507.3"), [["IMC 2027 507.3", "https://codes.iccsafe.org/content/IMC2027V1.0/chapter-5-exhaust-systems-smoke-control-systems-and-energy-recovery-ventilation-systems"]]);
  assert.deepEqual(links("NEC 2023 (NFPA 70)."), [["NEC 2023", "https://link.nfpa.org/free-access/publications/70/2023"]]);
  assert.deepEqual(links("NFPA 13-2025"), [["NFPA 13-2025", "https://link.nfpa.org/free-access/publications/13/2025"]]);
  for (const t of ["IRC 179 expensing (Internal Revenue Code)", "IBC 2021 Table 506.3", "IBC 2027 alone", "NFPA 70 alone", "NEC alone", "IECC 2024 Table R403.3", "IRC 2021 R311.7.5", "IPC Table E103.3"]) {
    assert.deepEqual(links(t), [], t);
  }
});

test("citation links: every ICC link in the catalog rebuilds from its own text and lands in a listed chapter", () => {
  let icc = 0, nfpa = 0;
  for (const c of Object.values(CITATIONS)) {
    for (const k of ["formula", "edition", "freeAccess", "governance", "editionNote"]) {
      for (const seg of citationSegments(c[k])) {
        if (!seg.href) continue;
        let m = seg.href.match(/^https:\/\/codes\.iccsafe\.org\/content\/([A-Z]+)(\d{4})V[\d.]+\/(chapter-(\d+)-[a-z0-9-]+)$/);
        if (m) {
          icc++;
          const t = seg.text.match(/^(IRC|IBC|IPC|IMC|IFGC)(?:\s+(\d{4}))?\s+(?:(?:Sections?|Tables?|Figure)\s+)?([A-Z]{0,2})(\d{3,4})((?:\.\d+)*)$/);
          assert.ok(t, seg.text);
          assert.equal(iccHref(t[1], t[2], t[3], t[4], Boolean(t[5])), seg.href);
          assert.ok(Number(m[4]) >= 1 && Number(m[4]) <= 60);
          assert.equal(ICC_CHAPTERS[m[1]].chapters[m[4]], m[3]);
          continue;
        }
        m = seg.href.match(/^https:\/\/link\.nfpa\.org\/free-access\/publications\/(\w+)\/(\d{4})$/);
        if (m) { nfpa++; assert.equal(seg.href, nfpaHref(m[1], m[2])); }
      }
    }
  }
  assert.ok(icc >= 100, `only ${icc} ICC links: the matcher may be broken`);
  assert.ok(nfpa >= 50, `only ${nfpa} NFPA links`);
});

test("citation links: the lint passes on the shipped table (seeded red by hand on landing: stale stamp, dropped chapter)", () => {
  const script = fileURLToPath(new URL("../../scripts/check-citation-links.mjs", import.meta.url));
  assert.match(execFileSync(process.execPath, [script], { encoding: "utf8" }), /check-citation-links OK/);
});
