# roughlogic.com Specification v590 -- Question-Phrase Alias Corpus Expansion (data/search/aliases.json, 0 New Tiles)

> **Status: LANDED IN FULL (2026-07-10; Phase 1 at 0.177.0, Phase 2 complete at 0.182.0). Platform spec, second of the "ask it a question" search series (v589-v592). Data-only.**
> **Split remediation LANDED 2026-07-17:** the shard crossed the ~250 KB-gz threshold below (261.9 KB at 17,975 rows),
> so the designated per-group split shipped: scripts/build-alias-shards.mjs generates data/search/aliases-<letter>.json
> (21 group shards, 256.5 KB gz total) from the master; app.js fetches them in parallel on first search interaction
> (progressive fold-in), sw.js precaches the shards instead of the master, and a --check drift gate joined `npm run
> lint`. aliases.json remains the authoring source of truth for gates, tests, and MCP.
> **Follow-on batch 2026-07-17:** question coverage had been complete at the 1,041-tile catalog; of the 177 tiles
> landed since without question rows, the 46 in groups A/B/K got 230 reviewed phrasings (top-3 rank-checked through
> the v589 ranker, batch folded in). Remaining: 131 tiles (97 group E + 34 scattered) ride this same spec.
> **Question corpus COMPLETE 2026-07-17:** four batches (A/B/K, then the 34 scattered, then group E in two parts)
> covered all 316 tiles landed since the original 1,041-tile close, so every one of the 1,357 tiles now carries
> `kind: "question"` rows. 18,830 alias rows total.
> Phase 2 as landed: five group-sized batches same day (A; E; C+B; G/K/D/L; final F/H/J/M/N/O/P/R/T/X/Y/Z) taking the
> shard to 16,159 rows / 241.0 KB gz with question coverage on ALL 1,041 tiles. The Group A batch surfaced a ranker
> hardening recorded in spec-v589 territory: digit-led query tokens are score-only (never coverage) and pure-number
> alias tokens are excluded from the match corpus. At 241 KB gz the shard is one growth step from the ~250 KB
> threshold; the per-group split remediation below is now the designated NEXT step before any further corpus growth.
> Phase 1 as landed: 1,175 `kind: "question"` rows over 100 tiles (10-14 each; the ~100-tile set = leader-key shortcuts +
> two head tiles per group + most-aliased fill). One gate delta: `scripts/check-discoverability.mjs`'s kind allowlist had
> to learn `question` (the spec assumed only consumers default unknown kinds). Mechanical review pipeline additionally
> enforced a top-3 rank check through the v589 ranker; 2 drafted rows were dropped by it. Shard 72.3 KB gz. Phase 2
> (rest of the catalog, group-sized batches) remains open under this spec.
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
