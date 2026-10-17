# spec-v1966.md -- Free-source links on the static pages

> **Status: LANDED (2026-10-17). Platform spec, no tile added. Completes roadmap pillar 2 of [spec-v106](spec-v106.md) section 7, "official free-source deep links at the point of answer", for the static pages.** Catalog stays at **2,267**.

## What it does for you

The citation on 564 calculators names the official free source by address: `nfpa.org/freeaccess`, `ecfr.gov`, `codes.iccsafe.org`, and so on. The live calculator has turned those addresses into links since spec-v6. The static page for the same calculator printed them as plain text. Now it links them too, so a reader who lands from a search result can tap straight through to the code text.

## What it changes, and what it does not

| Surface | Before | Now |
|---|---|---|
| Live calculator reference block | linked (spec-v6 linkifier) | unchanged |
| Static page, "Details, formula, and sources" | plain text | linked, with the same matcher |
| Static page, print-only copy | plain text | unchanged (printed links read as text anyway, and a second copy would only duplicate anchors) |

The matcher was private to `citation-block.js`. It is now also exported as a pure `citationSegments(text)`, and both surfaces use it, so the live block and the static page cannot disagree about what is a link. Its rules are the existing ones:
- only an allowlisted public TLD (`gov`, `org`, `com`, `edu`, `net`, `mil`, `int`), so "802.3" and "29 CFR 1910.146" never match;
- the link text is the citation's own words, and the target is `https://` plus those words;
- `rel="noopener noreferrer"`.

These are links to the source each citation already names. This spec does not add new per-section deep links (an eCFR section URL for every OSHA tile, say); those need per-tile research and would be their own spec.

## Proof

`test/unit/citation-links.test.js` runs the matcher over every tile's formula, edition, free-access and governance lines. For each line:
- the pieces rebuild the original text exactly;
- every link is `https://` to an allowlisted public host, and its text equals its target;
- no version-like number is linked;
- the static page's HTML carries no unescaped markup.

Downgrading the scheme to `http://` flags 1,906 links. The 78 existing citation tests pass unchanged, so the live block behaves as before.
