# roughlogic.com Specification v927 -- Chlorine Dose to Oxidize Iron and Manganese (calc-water.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v926.md. Water-operations oxidation-chemistry
> sweep, beside the accepted `disinfection-ct` and `pounds-formula` tiles.
>
> **The gap, and the evidence for it.** The catalog has CT, filter loading, and the pounds formula but nothing sets the
> **iron / manganese oxidation dose**. Grep confirmed no Fe/Mn dose tile. Removing iron and manganese is the most common
> small-system treatment goal and it starts with a chlorine dose. The number this settles: Fe 3.0, Mn 0.5, 0.5 demand,
> 0.3 residual is a **3.31 mg/L** dose (1.38 lb/day at 0.05 MGD).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling water
tiles: the iron, manganese, demand, residual, and dose carry `M L^-3` (mg/L), the flow carries `L^3 T^-1` (MGD), and the
pounds-per-day carries `M T^-1`. The v18/v21 contract: a negative iron, manganese, demand, or residual, or a
non-positive flow, returns `{ error }`. Citation discipline (v19/v22): the oxidation stoichiometry by name (0.62 mg Cl2
per mg Fe, 1.30 mg Cl2 per mg Mn; dose x flow x 8.34), `GOVERNANCE.water`; the note states that iron oxidizes in minutes
while manganese is slow below pH ~8 and often needs a catalytic (greensand / pyrolusite) filter or permanganate, and
that jar tests, the pH, the contact time, and the state primacy agency govern the actual feed.

## 2. The tile

### 2.1 `iron-manganese-chlorine-dose` -- Chlorine Dose to Oxidize Iron and Manganese

```
inputs:
  fe_mgl               ferrous iron (mg/L)
  mn_mgl               manganese (mg/L)
  extra_demand_mgl     other chlorine demand (mg/L, default 0.5)
  target_residual_mgl  free-chlorine residual to carry (mg/L, default 0.3)
  flow_mgd             flow (MGD, default 0.05)

dose_mgl    = 0.62 x fe_mgl + 1.30 x mn_mgl + extra_demand_mgl + target_residual_mgl
dose_lb_day = dose_mgl x flow_mgd x 8.34
```

**Pinned worked example.** Fe 3.0, Mn 0.5, 0.5 demand, 0.3 residual, 0.05 MGD:
`dose = 0.62 x 3.0 + 1.30 x 0.5 + 0.5 + 0.3 = ` **3.31 mg/L**; `lb/day = 3.31 x 0.05 x 8.34 = ` **1.38 lb/day**.
Cross-check: Fe 1.0, Mn 0.2, 0.3 demand, 0.5 residual is `0.62 + 0.26 + 0.3 + 0.5 = ` **1.68 mg/L** -- note the manganese
term (1.30 per mg) weighs more than twice the iron term (0.62 per mg), so a manganese-heavy water needs more chlorine
than its concentration alone suggests.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `ro-recovery-concentration`); a `tile-meta.js` `_TILES`
entry (`M`); a `citations.js` entry (Fe/Mn oxidation stoichiometry, AWWA / Ten States, `GOVERNANCE.water`); the Group M
audit count in `test/unit/citations.test.js` bumped by one; `test/fixtures/worked-examples.json` (the pinned example
plus the cross-check, pinning the dose and lb/day); `test/fixtures/compute-map.js` (`iron-manganese-chlorine-dose` ->
`computeIronManganeseChlorineDose`, module `../../calc-water.js`); `scripts/related-tiles.mjs` (-> `pounds-formula` /
`disinfection-ct` / `filter-loading`); `data/search/aliases.json` (5 collision-checked aliases: "iron manganese chlorine
dose", "manganese oxidation dose", "iron oxidation chlorine", "chlorine to oxidize iron", "greensand chlorine dose"),
then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `WATER_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-water declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
dose and lb/day and the error seams (negative Fe / Mn / demand / residual, non-positive flow, non-finite). The
calc-water.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,375 -> 1,376.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group M audit bump); `npm run
build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.62 x 3.0 + 1.30 x 0.5 + 0.5 + 0.3 -> 3.31 mg/L, 1.38 lb/day).

## 5. Roadmap position

Water-operations oxidation-chemistry tile beside `disinfection-ct`, serving the water-treatment operator (water).
Deliberately a dosing estimate; jar tests, the pH, the contact time, and the state primacy agency govern the actual feed
and the compliance sampling. Stays evidence-driven. Continues the water-operations chemistry sweep at 1 new spec (v927).
