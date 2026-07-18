# roughlogic.com Specification v926 -- RO Recovery, Concentrate Flow, and Concentration Factor (calc-water.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v925.md. Water-operations membrane sweep, beside the
> accepted `filter-loading` and `detention-time` tiles.
>
> **The gap, and the evidence for it.** The catalog has filtration, detention, and disinfection but nothing for
> **membrane (RO) recovery**. Grep confirmed no RO tile. Every membrane plant is run to a recovery target set against a
> scaling limit. The number this settles: a 10 gpm feed at 7.5 gpm permeate is **75% recovery**, a 2.5 gpm reject, and a
> **concentration factor of 4**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling water
tiles: the feed, permeate, and concentrate flows carry `L^3 T^-1`, the feed and concentrate TDS carry `M L^-3`, and the
recovery and concentration factor are dimensionless. The v18/v21 contract: a non-finite or non-positive feed or permeate
flow, a negative feed TDS, or a permeate flow at or above the feed (recovery >= 100%) returns `{ error }`. Citation
discipline (v19/v22): the RO mass balance by name (recovery = permeate/feed; concentrate = feed - permeate; CF = 1/(1 -
recovery); reject TDS ~ CF x feed TDS), `GOVERNANCE.water`; the note states that raising recovery shrinks the reject flow
but raises CF sharply, that past the scaling saturation of the least-soluble salt the membrane scales (antiscalant and
the LSI govern that ceiling), and that the membrane manufacturer's projection software and the state primacy agency (for
a public system) govern the design.

## 2. The tile

### 2.1 `ro-recovery-concentration` -- RO Recovery, Concentrate Flow, and Concentration Factor

```
inputs:
  feed_gpm       feed flow (gpm)
  permeate_gpm   permeate (product) flow (gpm, < feed)
  feed_tds_mgl   feed total dissolved solids (mg/L, default 500)

recovery            = permeate_gpm / feed_gpm
concentrate_gpm     = feed_gpm - permeate_gpm
concentration_factor = 1 / (1 - recovery)
concentrate_tds_mgl = concentration_factor x feed_tds_mgl
```

**Pinned worked example.** 10 gpm feed, 7.5 gpm permeate, 500 mg/L feed:
`recovery = 7.5/10 = ` **75%**; `reject = 2.5 gpm`; `CF = 1/(1 - 0.75) = ` **4**; reject TDS `4 x 500 = ` **2,000 mg/L**.
Cross-check: a 100 gpm feed at 50 gpm permeate is `50/100 = ` **50% recovery** and `1/(1 - 0.50) = ` **CF 2** -- halving
the recovery from 75% to 50% halves the concentration factor, which is why a scaling-limited water is run at lower
recovery.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `filter-loading`); a `tile-meta.js` `_TILES` entry (`M`); a
`citations.js` entry (RO mass balance, AMTA / AWWA, `GOVERNANCE.water`); `test/fixtures/worked-examples.json` (the 75%
example plus the 50% cross-check, pinning recovery, CF, and reject TDS); `test/fixtures/compute-map.js`
(`ro-recovery-concentration` -> `computeRoRecoveryConcentration`, module `../../calc-water.js`);
`scripts/related-tiles.mjs` (-> `filter-loading` / `detention-time` / `pounds-formula`); `data/search/aliases.json` (5
collision-checked aliases: "ro recovery", "reverse osmosis recovery", "concentration factor", "ro concentrate flow",
"membrane recovery rate"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `WATER_RENDERERS`
map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-water declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning recovery, CF, and reject TDS across two recoveries and the error seams
(non-positive feed / permeate, negative TDS, recovery >= 100%, non-finite). The calc-water.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,374 -> 1,375.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(7.5/10 -> 75% recovery, CF 4, 2,000 mg/L reject).

## 5. Roadmap position

Water-operations membrane tile beside `filter-loading`, serving the water-treatment operator (water). Deliberately the
operating mass balance; the membrane manufacturer's projection software and the state primacy agency govern the design
and permit. Stays evidence-driven. Continues the water-operations membrane sweep at 1 new spec (v926).
