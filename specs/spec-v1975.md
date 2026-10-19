# spec-v1975.md -- Code citations link to the free chapter text

> **Status: PROPOSED (2026-10-19). Platform spec, no tile added. Part of [scope-product-expansion](scope-product-expansion.md). Extends roadmap pillar 2 of [spec-v106](spec-v106.md) section 7 past the CFR ([spec-v1969](spec-v1969.md)) to the ICC codes and NFPA documents.** Catalog stays at **2,267**.

## What it does for you

A citation that names an ICC code section ("IRC R311.7.5", "IPC Table 1003.3.8") links to that chapter of the free, current ICC text, where the section is one find-in-page away. A citation that names an NFPA document and edition ("NFPA 70 2023", "NFPA 13-2025") links to that edition in NFPA's free-access reader. Before, the reader got a bare domain at best.

| Citation text | Links to |
|---|---|
| `IRC R308.4` | `https://codes.iccsafe.org/content/IRC2024V2.1/chapter-3-building-planning` |
| `IPC 1003.3.8`, `IPC Table 1003.3.8` | `https://codes.iccsafe.org/content/IPC2027V1.0/chapter-10-traps-interceptors-and-separators` |
| `IMC 507.2.10` | `.../IMC2027V1.0/chapter-5-exhaust-systems-...` (the long slug, from the table) |
| `NFPA 70 2023`, `NEC 2023` | `https://link.nfpa.org/free-access/publications/70/2023` |
| `NFPA 13-2025` | `https://link.nfpa.org/free-access/publications/13/2025` |

It would land on 588 I-code section references (125 distinct) and 86 NEC-with-year plus 28 other NFPA-with-year mentions across the citation text, on the live block and the static page alike, through the one `citationSegments` matcher.

## What was checked on 2026-10-19, and why it is chapter links

- ICC chapter pages are free to read and their URLs are stable: `/content/<CODE><YEAR>V<printing>/chapter-<n>-<slug>`. They return 403 to scripts and must be opened in a browser, like the eCFR reader.
- The chapter page carries a DOM id per section (`IRC2024V2.1_Vo1_Ch03_SecR308.4`), but the page renders sections lazily, so a URL with that id in the hash opened the chapter and scrolled to the footer, not to the section. A section anchor is therefore not a promise this site can make today; a chapter link is.
- The chapter number is the section number's leading digits: R308 is chapter 3, R1003 chapter 10, M1505 chapter 15, IBC 2406 chapter 24, IPC 1003 chapter 10. Four-digit sections take two leading digits; three-digit take one.
- The slug is not derivable (IMC chapter 5 is `chapter-5-exhaust-systems-smoke-control-systems-and-energy-recovery-ventilation-systems`, and a short slug redirects to the table of contents), so slugs are table data.
- NFPA's reader at `link.nfpa.org/free-access/publications/<doc>/<edition>` opens the named edition after a free sign-in; without one it shows "Loading session". The link is still the shortest path to the text and the sentence beside it says a free account is needed.

## Rules

- Link text is the citation's own words. The target is built from the code, the section's leading digits, and the chapter-slug table; a section whose chapter is not in the table is not linked.
- The printing in the URL is the one the project read for that code (IRC2024V2.1, IBC2027V1.0, IPC2027V1.0, IMC2027V1.0, IFGC2027V1.0, IECC2024V1.2), held in `docs/icc-printings.json` beside the slugs. When a tile's citation names an older edition in brackets ("R318.7.5 [R311.7.5 in IRC 2021]"), the bracketed one is not linked.
- NFPA links need a document number and a four-digit edition in the same phrase. "NFPA 70" alone is not linked (which edition?); "NEC" alone is not linked.
- Every other rule of spec-v1966 and spec-v1969 is unchanged.

## How it is built

| Piece | Role |
|---|---|
| `docs/icc-chapter-slugs.json` | `{ code, printing, chapters: { "3": "chapter-3-building-planning", ... } }` per code, with a `checked_on` per chapter. |
| `citation-block.js` `citationSegments` | Two new matchers: `(IRC|IBC|IPC|IMC|IFGC|IECC)\s+(Table\s+)?[A-Z]?\d{3,4}(\.\d+)*` and `(NFPA \d+|NEC)[ -](19|20)\d\d`. |
| `scripts/check-citation-links.mjs` | Lint: every slug in the table is well-formed, every chapter a citation needs is present, `checked_on` is within a year. |
| Static shells | Pick the links up through the shared matcher, as spec-v1966 arranged. |

## Proof

- `citation-links.test.js` rebuilds every ICC and NFPA link from its own text with `iccHref` and `nfpaHref` and fails on a mismatch, on fewer than 400 ICC links (a broken matcher), and on a chapter outside 1 to 60.
- Every chapter URL in the slug table opened once in a browser on the day it was added, recorded in `checked_on`; the lint fails when a year passes. A spot-check of 10 URLs is part of the landing checklist.
- The eCFR links of spec-v1969 are unchanged (their tests keep passing).

## Not done

- Section-level landing on ICC pages, until ICC's reader resolves hash anchors on load.
- OSHA, ASHRAE and AWC documents: ASHRAE's read-only reader and AWC's free PDFs have no stable per-section URL this project has verified.
