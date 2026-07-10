# roughlogic.com Specification v589 -- Deterministic Natural-Language Search Ranking (search-discovery.js, app.js, mcp/catalog.mjs, 0 New Tiles)

> **Status: LANDED (2026-07-10, package 0.176.0). Platform spec, first of the four-part "ask it a question" search series (v589-v592).**
> As-landed deltas from the proposal: the corpus-token prefix stemming is one-directional (query token -> corpus token;
> the reverse direction would let short corpus tokens swallow typos and defeat the edit-distance fallback -- plural-strip
> candidates cover the longer-query-token case); the typo gate is length >= 3, not 4 (the spec's own "voltage drp"
> acceptance case requires it); a digit/word equivalence table ("3 phase" meets "three-phase") and a +2 covered-name
> bonus (every signal-bearing name token matched) were needed to pin the §3 acceptance table; the gzip cap landed at
> 7000 B, not 6000 B (5925 B as landed left under 2% headroom against the ~20% rule).
> No new tile, module, group, or dependency; no runtime model or inference of any kind -- the "No AI" constraint table row
> in the README is untouched. Inherits spec.md through spec-v588.md.
>
> **The gap, and the evidence for it.** The hero combobox (`searchTools`, app.js ~1642) requires the query to appear as a
> **contiguous substring** of a tile name, description, or alias term. A tradesperson who types a question -- *"how many
> yards of concrete do i need for a slab"* -- gets the no-match row, even though the catalog answers it and the alias shard
> carries `"concrete"` vocabulary, because the stopwords and the token order break the substring. Typos fail the same way
> (*"condiut fill"*, gloves on a phone). The MCP `search()` (mcp/catalog.mjs ~104) has the sibling flaw: AND-of-substrings
> over `id + name + desc`, no aliases at all, so agents have strictly worse recall than the browser. The fix is four boring,
> fully deterministic text-processing steps -- stopword stripping, per-token field scoring, bounded edit-distance fallback,
> and light stemming -- not a model.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v10 §6 discipline for this layer applies: all matching logic lives in **`search-discovery.js`** as pure, DOM-free,
allocation-light functions unit-tested under `node:test`; `app.js` only wires DOM events to them. Everything below is a
deterministic function of the query string and the bundled catalog data -- same input, same ranked order, on every device,
offline. No network call, no CSP change, no new dependency (`package.json` stays empty both ways).

## 2. The pure layer (search-discovery.js)

New exports beside the existing `resolveQuery` / `matchAliasPrefix` (which remain, unchanged, for hash-era callers):

```
normalizeQuery(query)              -> { tokens: [..], raw: q }
rankTools(tokens, tools, aliases,
          { limit = 12 })          -> [{ tool, score, viaTypo }] (sorted, capped)
editDistance1(a, b)                -> boolean (Damerau-Levenshtein <= 1, transposition included)
STOPWORDS                          -> Set (~150 question-frame words)
TOKEN_SYNONYMS                     -> Map (unit / vocabulary spellings -> canonical token)
```

**normalizeQuery.** Lowercase; strip punctuation to spaces (keep `a-z0-9`, hyphen, `/`, `.`); split on whitespace; map
each token through `TOKEN_SYNONYMS` (e.g. `sqft` / `sq` + `ft` -> `square` + `feet`, `amps` -> `amp`, `kwh` -> `kwh`);
drop `STOPWORDS` members (`how`, `do`, `i`, `what`, `size`, `many`, `need`, `for`, `my`, `figure`, `out`, `much`, ...).
Plural-strip trailing `s` / `es` on tokens of length >= 4 **only when the unstripped token matches nothing** during
ranking (stripping is a ranking-time fallback, not a lossy normalize). If stripping stopwords empties the token list, the
caller falls back to the current substring behavior on the raw query, so a bare "how" behaves exactly as today.

**rankTools.** Each tool's match corpus is tokenized once (lazily, cached): name, desc, trades, and its attached alias
terms. A query token **matches** a corpus token when it is equal, or is a prefix of it with length >= 3 (`volt` ->
`voltage`, `amp` -> `ampacity` -- cheap stemming both directions). Field weights per matched token: name 3, alias 2,
trade 2, desc 1; +2 bonus when the whole normalized query is a prefix of the name. Candidates matching **all** query
tokens (each in some field) rank first; if none match all, degrade to best token coverage. Ties break by score desc, then
`name.localeCompare` -- a total, deterministic order. Results capped at `limit`.

**Typo fallback.** Only for a query token that matched nothing exactly and has length >= 4: retry against the corpus-token
vocabulary with `editDistance1`; matches score at half weight and set `viaTypo` (v592 surfaces "showing matches for ...").
Bounded and deterministic; the vocabulary is built once per session from TOOLS + aliases.

## 3. Wiring

**app.js.** `searchTools` (app.js ~1642) delegates to `normalizeQuery` + `rankTools` via a lazy
`import("./search-discovery.js")` resolved alongside `ensureTools()` / `ensureAliases()` on first focus / keystroke --
the home first paint stays exactly as it is (`check-home-payload` unchanged; search-discovery.js is already in the sw.js
precache list and the build.mjs copy list). The combobox contract is untouched: empty query lists the catalog A-Z,
12-result cap, arrow / Enter / Escape handling, mousedown-before-blur routing.

**mcp/catalog.mjs.** `search()` imports the same `normalizeQuery` / `rankTools` from `../search-discovery.js` and lazily
reads `data/search/aliases.json` in `load()`. The trade filter and the no-argument trade-overview behavior are preserved;
the result shape (`{ total, returned, results }`) is unchanged. Browser and agent recall can no longer drift.

**Caps.** `scripts/check-module-sizes.mjs` bumps `search-discovery.js` 2,500 -> 6,000 B gzipped (current 1,082 B; the
stopword set, synonym table, ranker, and edit-distance fit comfortably; the ~20% headroom rule applies at landing).

**Tests.** `test/unit/search-discovery.test.js` grows: normalization cases (stopword stripping, synonym mapping,
stopword-only fallback), ranking determinism (same input -> identical order across two calls), typo cases (`condiut
fill`, `voltage drp`), and an **acceptance table** of question-shaped queries pinned to their expected top tile, e.g.
*"how many yards of concrete do i need for a slab"* -> `concrete`, *"what size wire for 50 amps"* -> a wire-sizing tile,
*"voltage drop 3 phase"* -> `voltage-drop`. An MCP-side test asserts `search({ query: "conduit fil" })` returns
`conduit-fill`.

## 4. As-landed verification (gate plan)

Standard green bar for a platform change: `npm run lint` (all 28 gates; `check-module-sizes` with the documented cap
bump; `check-home-payload` byte-identical on the home view); `npm test` (the expanded search-discovery suite + MCP
parity test); `npm run build`; `npm run data:verify`; a manual smoke of the deployed combobox at 320 px (dropdown
unchanged visually -- this spec changes ranking only, no markup).

## 5. Roadmap position

First of the v589-v592 series. v590 grows the question-phrase alias corpus this ranker consumes; v591 adds quantity slot
parsing and prefilled deep links on top of `normalizeQuery`; v592 adds the live answer preview and the search UX polish
(did-you-mean, no-match group fallback). Each lands independently; this one is the foundation and carries no visible UI
change beyond better ordering.
