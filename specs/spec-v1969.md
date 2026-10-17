# spec-v1969.md -- CFR references link to the section on eCFR

> **Status: LANDED (2026-10-17). Platform spec, no tile added. Extends roadmap pillar 2 of [spec-v106](spec-v106.md) section 7, "official free-source deep links at the point of answer", past the bare domains [spec-v1966](spec-v1966.md) linked.** Catalog stays at **2,267**.

## What it does for you

A citation that names a federal regulation ("29 CFR 1926.502", "49 CFR 213") now links straight to that section or part on eCFR, the government's free, current text. Before, the reader got a link to `ecfr.gov` at best and had to find the section themselves.

| Citation text | Links to |
|---|---|
| `29 CFR 1926.502` | `https://www.ecfr.gov/current/title-29/section-1926.502` |
| `29 CFR § 1926.502(d)(16)` | the same section; `(d)(16)` stays text |
| `49 CFR 213`, `29 CFR Part 1926` | `https://www.ecfr.gov/current/title-49/part-213`, `.../title-29/part-1926` |

It lands on 138 citation lines across 93 calculators, live block and static page alike, because both use the one `citationSegments` matcher in `citation-block.js`.

## Rules

- The link text is the citation's own words. Only the target is built, from the title, part and section numbers in those words.
- Titles 1 to 50 only (the CFR has 50 titles). A paragraph or subpart after the number is not linked.
- Every other rule of spec-v1966 is unchanged: domains link to themselves, version numbers are never links.

## Proof

- **Every target exists.** All 74 distinct targets were checked on 2026-10-17 against the eCFR versioner API (`/api/versioner/v1/ancestry/2026-10-15/title-N.json?section=...` or `?part=...`): 74 of 74 returned 200, where a made-up section (`1926.9999`) returns 404. The section and part URL forms were opened in a browser and render the named section (`29 CFR 1926.502 -- Fall protection systems criteria and practices`) and part (`49 CFR Part 213 -- Track Safety Standards`). eCFR blocks scripted page requests, which is why the check goes through its API.
- **The links are the words they name.** `citation-links.test.js` rebuilds every CFR link from its own text with `cfrHref` and fails on any mismatch, on fewer than 100 CFR links (a broken matcher), and on titles outside 1 to 50.

## Not done

A citation that names a regulation only by agency and topic ("OSHA's fall-protection rule") is not linked; that needs per-tile research. The CFR targets were checked once, not on every build: the site fetches nothing at build time, so a renumbered section would show up as a broken link rather than a red gate.
