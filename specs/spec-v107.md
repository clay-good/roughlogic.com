# roughlogic.com Specification v107 -- Retire Four Non-Trade Groups (CUT): Complete Removal of Legal (S), Veterinary (U), EMS / Pre-hospital (V), and Pilots / Aviation (W), plus one stray flight-ops tile (catalog 669 -> 581; 25 -> 21 groups; 53 -> 49 modules)

> **Status: LANDED 2026-06-21 (package 0.72.0).** Executed against the live catalog, which had
> grown to 688 tiles since this spec was drafted, so the as-landed anchored counts differ from the
> 669-tile baseline in the title and body below: the cut took the catalog **688 -> 600** (not
> 669 -> 581), **25 -> 21 groups**, **53 -> 49 modules**, and **715 -> 623 sitemap URLs**. The
> removal set is identical to what this spec specifies (the 87 group S/U/V/W tiles plus the stray
> `weight-balance`); only the surviving-catalog totals are larger because v109-v120 added tiles to
> surviving groups in the interim. Unit-test green bar re-pinned at 4,895 (from 5,563). All gates
> green; see the README v107 changelog entry. Original spec text preserved below.
>
> **Status: SPECIFIED 2026-06-20, awaiting an execution pass.** v107 is the **CUT** pass of the
> three dispositions (spec-v106 §5.1): it removes the four liability-bearing non-trade groups
> recorded in **spec-v106.md §6**, plus one stray flight-ops tile filed under Mechanic. It is a
> *subtractive* landing: it adds nothing and removes four entire groups, their four modules, one
> additional tile, and every registry row, gate count, fixture, and prerendered URL that
> supports them. It changes no surviving tile's output. It inherits everything from spec.md
> through spec-v106.md and revises only the catalog membership. The **FREEZE / SALVAGE** pass for
> the off-brand-but-not-liable groups (O, P, T, X, Y) is a separate design, **spec-v108.md**.
>
> **This is a breaking change to public URLs.** 88 tile deep-links and 4 group-hub URLs that
> currently resolve will be retired. Section 5 specifies how they are handled so a bookmarked
> link degrades gracefully instead of dead-ending.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and rationale

The scope charter (spec-v106) establishes the inclusion test and records these four groups as
NOT DOING: each fails inclusion gate 1 (not a trade) and gate 4 (failure mode is patient /
animal harm, safety-of-life, or unauthorized practice of law, not a failed inspection). v107
removes them, plus one stray flight-ops tile (section 2.1) that fails the same two gates. No new
tile, no new module, no new dependency. The v14 dimensional-analysis lint, the bounds-fuzzer,
the worked-example registry, and the reviewer-signoff continue to apply to the surviving 581
tiles unchanged.

## 2. Exact scope

| Group | Name | Module | Tiles removed |
|---|---|---|---|
| S | Legal Plain-English and Statutory Math | `calc-legal.js` | 12 |
| U | Veterinary | `calc-vet.js` | 25 |
| V | EMS and Pre-hospital | `calc-ems.js` | 27 |
| W | Pilots and General Aviation | `calc-aviation.js` | 23 |
| | | | **87 total** |

Trade tags removed entirely: `legal`, `veterinary`, `ems`, `aviation`. The `small-business`
trade tag is **retained** (it is shared with group R Accounting; only the 10 group-S tiles
that also carried `legal` are removed, not the tag). Aircraft *maintenance* content stays under
group K (Mechanic); only the pilot / flight-operations group W, plus the one stray flight-ops
tile below, is removed.

### 2.1 One stray flight-ops tile in group K

The `weight-balance` tile (name "Aircraft Weight and Balance", `group: "K"`, `trades:
["mechanic"]`, compute in `calc-mechanic.js` at tools-data.js:337) is filed under Mechanic but
is pilot flight-ops content: it computes aircraft CG and pass/fail against AFM CG and gross
limits, a safety-of-life calculation governed by the pilot in command and the FAA. It fails
inclusion gates 1 and 4 exactly as group W does, and is **CUT** with the aviation retirement.
Because its module (`calc-mechanic.js`) holds many surviving Mechanic tiles, this is a
*tile-level* removal, not a module deletion: remove the `tools-data.js` row, the
`computeWeightBalance` (or equivalently named) export and its example in `calc-mechanic.js`, the
`tile-meta.js` row, the `citations.js` entry, the `data/search/aliases.json` block, the
`scripts/related-tiles.mjs` entries (and any surviving tile that links to it), the
`test/fixtures` rows, and the `app.js` renderer declaration for this id only. Confirm at
execution that no surviving Mechanic tile shares its compute.

Resulting anchored counts: **581 tiles, 21 groups, 49 modules, 604 sitemap URLs** (669 - 87
group tiles - 1 stray tile; 25 - 4 groups; 53 - 4 modules, since `calc-mechanic.js` survives;
696 - 88 tile URLs - 4 group-hub URLs).

## 3. The removal, registry by registry

Every touchpoint below must be cleared for the 87 group ids, the four group letters, and the one
stray tile (section 2.1). The lint and contract gates will fail loudly on any orphan, so this
list is the checklist, not a suggestion.

1. **`tools-data.js`** -- delete every row with `group: "S" | "U" | "V" | "W"` (all 87).
2. **Delete modules** -- `calc-legal.js`, `calc-vet.js`, `calc-ems.js`, `calc-aviation.js`.
3. **`app.js`** --
   - `GROUPS` array: remove `"S"`, `"U"`, `"V"`, `"W"` (remaining 21 letters keep their
     positions; gaps are expected and allowed per spec-v106 §5).
   - `GROUP_NAMES`: remove the four entries (S, U, V, W).
   - Remove the four `declare("./calc-legal.js", "LEGAL_RENDERERS", [...])`,
     `"VET_RENDERERS"`, `"EMS_RENDERERS"`, `"AVIATION_RENDERERS"` blocks (currently near
     app.js:581, 602, 616, 633) and any lazy-load / ensure wiring that references them.
4. **`tile-meta.js`** -- remove the `_TILES` rows for all 87 ids and every `SIMPLIFIED` /
   `FIELD_METER` entry for them (the spec-v12 EMS `medical-director-governs` set and the vet
   set, ~24 simplified entries, all become dead).
5. **`limitation-banner.js`** -- remove the canonical banner copy for the removed simplified
   tiles (the `medical-director-governs` and veterinary banners). The lint enforces a 1:1
   match between `SIMPLIFIED` and the banner copy, so these must be removed together.
6. **`citations.js`** -- remove all 87 citation entries. The registry-size cap may be lowered to
   match (optional) or left with extra headroom; do not raise it.
7. **`data/search/aliases.json`** -- remove the alias blocks for all 87 ids.
8. **`scripts/related-tiles.mjs`** -- remove the 87 removed-id entries **and** repoint or drop
   any *surviving* tile whose related list points *into* a removed id (audit required; a known
   handful of cross-references exist).
9. **`test/fixtures/worked-examples.json`** and **`test/fixtures/compute-map.js`** -- remove the
   fixtures and compute-map rows for all 87 ids.
10. **`test/unit/bounds-fuzzer.test.js`** and any per-group unit tests -- remove the fuzzer
    blocks and the dedicated unit tests for the four modules. The green-bar test count drops by
    the removed tiles' fixtures and fuzzer cases; it is re-pinned at the new total (section 6).
11. **`sw.js`** -- remove `./calc-legal.js`, `./calc-vet.js`, `./calc-ems.js`,
    `./calc-aviation.js` from the precache list (currently sw.js:92-95) and bump the cache
    version so old clients drop the retired modules.
12. **Build artifacts** -- the build regenerates `dist/tools/*`, `dist/groups/*`, and
    `sitemap.xml`; the prerendered pages and group hubs for S / U / V / W must be gone after
    `npm run build`. Delete any stale `dist/tools/<removed-id>/` and `dist/groups/<removed>/`
    directories that the builder does not prune on its own.
13. **`README.md`** and any count-anchored figures -- update to 581 / 21 / 49 / 604 so
    `check-readme-counts` passes. Resync the non-anchored figures (corpus, dimensions, source,
    test counts) by hand per the standing drift note.
14. **`CHANGELOG.md`** -- a `v107` entry recording the retirement and the new counts.
15. **`package.json`** -- version bump. Because public URLs are removed this is a breaking
    change; bump the minor (0.68.0 -> 0.69.0) and call out the breakage in the changelog. A
    1.0.0 major is defensible if preferred, but the repo's pre-1.0 minor-stamp convention is
    kept here.
16. **Regenerate the v14 corpus and tile-index** so the dimensional and contract gates see the
    581-tile catalog.

## 4. Cross-reference audit

Before deletion, confirm no *surviving* module imports from or computes via the four removed
modules (a sweep at spec time found no surviving `calc-*.js` carrying the four removed trade
tags and no surviving compute path into them). The only inbound edges are in
`scripts/related-tiles.mjs` (step 8) and the search aliases (step 7). After deletion, a
full-catalog grep for each removed id and for `calc-legal|calc-vet|calc-ems|calc-aviation` must
return zero hits outside the changelog and the spec files.

## 5. URL retirement (graceful breakage)

88 tile URLs and 4 group-hub URLs stop resolving. Handling:

- They drop out of `sitemap.xml` and `robots.txt` coverage automatically on rebuild, so search
  engines de-index them over time.
- The SPA router (`hash-state.js` / `app.js`) already routes an unknown tile hash back to the
  home view; confirm a retired `#<removed-id>` lands on home rather than a blank view, and
  consider a one-line "that tool was retired" notice for a deep-linked unknown id.
- No server-side redirect is required for a static host, but if `_headers` / host config
  supports it, a `410 Gone` for the retired `/tools/<id>/` paths is cleaner than a `404` and
  signals intentional removal to crawlers. Optional, not blocking.

## 6. As-landed verification (gate plan)

The standard green bar, re-pinned to the smaller catalog:

- `npm run lint` -- every gate, including module-size, wiring, sw-precache, dimensions, corpus,
  tile-contract, em-dash ban, and `check-readme-counts` agreeing at **581 tiles / 21 groups /
  49 modules / 604 sitemap URLs**; zero orphaned `SIMPLIFIED`, citation, alias, related-tile,
  or compute-map entries.
- `npm test` -- the suite passes with the four modules' tests removed; the new total is recorded
  in the changelog (it drops by the removed fuzzer and worked-example cases).
- `npm run build` -- 581 tile shells + 21 group shells, regenerated 604-URL sitemap, no
  `dist/tools/` or `dist/groups/` artifact for any retired id or group.
- `npm run data:verify` and the worked-examples runner -- green on the surviving catalog.
- The 320 px shell audit and the full-catalog render-no-nan Chromium sweep plus the a11y gate
  run over 581 tiles; a retired `#<removed-id>` deep-link resolves to home (or the retired
  notice), not an error.

## 7. Roadmap position

v107 is the first application of the spec-v106 charter: it subtracts the out-of-scope groups so
the catalog is once again entirely trades. With S / U / V / W retired, every remaining group
passes the inclusion test, and effort concentrates on the Tier 1 trades and the source-of-truth
pillars (spec-v106 §7), beginning with jurisdiction / edition awareness. The watch-list groups
(R, X, Y) are reviewed under the inclusion test in a later spec, not here.
