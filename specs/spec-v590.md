# roughlogic.com Specification v590 -- Question-Phrase Alias Corpus Expansion (data/search/aliases.json, 0 New Tiles)

> **Status: PROPOSED (2026-07-10). Platform spec, second of the "ask it a question" search series (v589-v592). Data-only.**
> No new tile, module, code path, or dependency. Runtime stays 100% deterministic: this spec grows a static JSON shard.
> AI assistance is permitted **at authoring time only** (the same way it drafts tiles and specs), with every generated row
> human-reviewed before commit -- the README's "No AI" runtime constraint is untouched. Inherits spec.md through
> spec-v589.md.
>
> **The gap, and the evidence for it.** The alias shard carries 4,371 terms across 942 tiles -- about 4.6 per tile -- and
> they are overwhelmingly **vocabulary** aliases (`"napier formula"`, `"t-test"`), not **question phrasings**. The edu
> cluster proves the pattern works: `"what do i need on the final"` -> `final-grade-needed` resolves a plain question
> today. Almost no trade tile has that row. The v589 ranker strips question frames deterministically, but recall still
> depends on the content words overlapping the tile's name / desc / aliases; a phrase corpus is the highest
> recall-per-byte move available, and it compresses ~10:1 under gzip like the existing shard (487,080 B raw -> ~49.5 KB).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What changes

`data/search/aliases.json` grows question-phrasing rows with a new `kind: "question"` (joining `industry` / `redirect` /
`adjacent`; consumers default unknown kinds to `redirect`, and `resolveQuery` / the combobox treat all kinds uniformly, so
the new kind is an editorial tag, not a behavior fork). Target coverage, phased:

- **Phase 1:** 10-30 question phrasings each for the ~100 highest-traffic tiles -- the leader-key shortcut set (app.js
  `SHORTCUTS`), each group's head tiles, and every tile that already carries 6+ aliases (demonstrated demand).
- **Phase 2 (follow-on batches):** the rest of the catalog, in group-sized commits so review stays tractable.

**Phrasing style guide** (enforced by review, spot-checked by the acceptance tests): lowercase; no punctuation; natural
word order as a tradesperson would type it (*"what size wire for 50 amps"*, *"how long to dry a wet wall"*, *"how many
squares on a roof"*); each phrase contains at least one content token that survives v589 `normalizeQuery` (a phrase made
entirely of stopwords is unreachable and must not ship); US spelling; no verbatim licensed code text (the ngram gate's
25-word window is far above these short phrases, but the rule stands on principle).

## 2. Authoring pipeline

Generation is offline, in the dev loop: a model drafts candidate phrasings per tile from the tile's name, desc, and
existing aliases; the maintainer reviews, prunes, and commits. Nothing generated ships unreviewed. The existing
invariants in `scripts/check-discoverability.mjs` gate every row mechanically: `target` must be a live tile id in
tools-data.js, no term may collide with a tile id, and no duplicate term (the dedup is global and case-insensitive --
the first tile to claim a phrase keeps it, so generic phrases go to the most general tile). `aliases.json` is strict
JSON: no comments, no trailing commas.

## 3. Wiring

`data/search/aliases.json` (the rows); `data/search/manifest.json` (`gzip_size_bytes` for the shard updated per batch;
the `version` / `asOf` stamps bump with each phase -- **do not** run the full `data:refresh` for this, per the standing
rule that a refresh re-dates unrelated shards); acceptance rows added to `test/unit/search-discovery.test.js` pinning a
handful of committed phrases end-to-end through `normalizeQuery` + `rankTools`. No app.js, sw.js (the shard is already
precached at sw.js ~123), tools-data.js, or cap changes: the shard is lazy-loaded on first search interaction and is not
part of the home-view payload, so `check-home-payload` is unaffected by any growth.

**Budget note.** Full build-out projects to roughly 20,000-30,000 rows, ~1.5 MB raw / ~150 KB gzipped. That is an
install-cache and first-focus-fetch cost, not a first-paint cost; it is acceptable for an offline-first PWA, and each
phase logs the measured gzip size in the manifest so the growth is visible in review. If a future phase pushes past
~250 KB gzipped, splitting the shard per group (lazy per-need) is the designated remediation -- deferred until evidence.

## 4. As-landed verification (gate plan)

Per batch: `npm run lint` (all 28 gates; `check-discoverability` is the load-bearing one -- real targets, no id
collisions, no dupes); `npm test` (the pinned acceptance queries); `npm run build`; `npm run data:verify`; a manual
spot-check that five committed phrases, typed verbatim into the deployed combobox, surface their target tile first.

## 5. Roadmap position

Second of the v589-v592 series; data fuel for the v589 ranker. Independent of v591/v592 (they consume the same
normalization but not this corpus). The corpus also directly improves MCP agent recall, since v589 gives `search()` the
alias table. Follow-on batches ride the same spec; no successor spec is needed for Phase 2 volume.
