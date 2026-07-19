# roughlogic.com Specification v992 -- Flow-Weighted Two-Source Water Blend (calc-water.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v991.md. Water-treatment sweep, beside the dosing
> and index tiles (`fluoride-feed-dose`, `langelier-index`, `pounds-formula`).
>
> **The gap, and the evidence for it.** The catalog has dosing and dilution math, but nothing for BLENDING two sources
> to hold a contaminant under its limit -- a daily operator move for nitrate, fluoride, hardness, or TDS. Grep confirmed
> no water-blending tile (`npk-blend` is fertilizer, `lab-dilution` is serial dilution). The number this settles: 500
> gpm at 4 mg/L blended with 300 gpm at 12 mg/L is **7.0 mg/L**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mg/L and a percent from flows and concentrations),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive flow, or a negative concentration or target returns `{ error }`; a target outside the two source
concentrations returns a null split with a flag, and equal source concentrations are flagged. Citation discipline
(v19/v22): the flow-weighted source-water blending mass balance by name (AWWA / WEF operator math), `GOVERNANCE.general`;
the note stresses that source concentrations drift, that the SDWA MCL may be a running average or a single-sample limit,
and that the state primacy agency and the operator's monitoring govern compliance.

## 2. The tile

### 2.1 `two-source-blend` -- Flow-Weighted Two-Source Water Blend

```
inputs:
  flow1_gpm    source 1 flow (gpm), default 500
  conc1        source 1 concentration (mg/L), default 4
  flow2_gpm    source 2 flow (gpm), default 300
  conc2        source 2 concentration (mg/L), default 12
  target_conc  target concentration (mg/L), default 8

blended_conc            = (flow1_gpm x conc1 + flow2_gpm x conc2) / (flow1_gpm + flow2_gpm)
required_low_source_pct = 100 x (Chigh - target_conc) / (Chigh - Clow)   [when Clow <= target <= Chigh]
```

**Pinned worked example.** 500 gpm at 4 mg/L + 300 gpm at 12 mg/L: `blend = (2,000 + 3,600) / 800 = ` **7.0 mg/L**
(under a 10 MCL). To hit 8 mg/L: `(12 - 8) / (12 - 4) = ` **50%** of the total flow from the clean source. Cross-check:
equal 400 gpm of each = `(1,600 + 4,800) / 800 = ` **8.0 mg/L**, confirming the 50/50 split. A target below 4 or above
12 is flagged as unreachable by blending.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `fluoride-feed-dose`); a `tile-meta.js` `_TILES` entry
(`M`); a `citations.js` entry (AWWA / WEF blending mass balance, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base blend plus the equal-flow cross-check, pinning the blend and the split);
`test/fixtures/compute-map.js` (`two-source-blend` -> `computeTwoSourceBlend`, module `../../calc-water.js`);
`scripts/related-tiles.mjs` (-> `langelier-index` / `pounds-formula` / `lab-dilution`); `data/search/aliases.json` (5
collision-checked aliases: "two source blend", "water blend", "blend wells", "blending calculation", "source
blending"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `WATER_RENDERERS` map
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-water declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the between-sources bound, the out-of-range and equal-source
flags, and the error seams. The calc-water.js gzip cap and the Group M group shell are watched at build (cap raised for
this tile). Home tile count 1,440 -> 1,441.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(500 gpm/4 + 300 gpm/12 -> 7.0 mg/L, 50%).

## 5. Roadmap position

Water-treatment blending beside `fluoride-feed-dose`, serving the water-treatment operator (water). Deliberately the
blending screen; the real source concentrations drift, the SDWA MCL (running or single-sample) applies, and the state
primacy agency and the operator's monitoring govern compliance. Stays evidence-driven. Continues the water-treatment
sweep at 1 new spec (v992).
