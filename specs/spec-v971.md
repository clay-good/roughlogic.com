# roughlogic.com Specification v971 -- Dechlorination Chemical Dose (calc-water.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M), no
> new module, group, or dependency. Inherits spec.md through spec-v970.md. Water/wastewater-operations sweep, beside the
> accepted `chlorine-demand`, `pounds-formula`, and `breakpoint-chlorination` tiles.
>
> **The gap, and the evidence for it.** The catalog doses chlorine every way, but nothing DECHLORINATES -- the sulfur
> reagent an operator feeds to neutralize a residual before an NPDES discharge. Grep confirmed no dechlor / bisulfite /
> sulfite / thiosulfate tile (the generic pounds-formula lacks the reagent stoichiometry). The number this settles:
> removing 2.0 mg/L from 5 MGD with sodium bisulfite is **121.8 lb/day**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing mg/L, MGD, and a ratio), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive residual /
flow / ratio, or a purity outside (0,100] returns `{ error }`. Citation discipline (v19/v22): the dechlorination
stoichiometry with the pounds formula by name, `GOVERNANCE.general`; the note gives the reagent-specific ratios (~0.9-1.0
SO2, 1.34 metabisulfite, 1.46 bisulfite, 1.77 sulfite, ~0.56 thiosulfate, all editable), warns that an over-dose
consumes dissolved oxygen and lowers pH (its own permit consequence), and states that the discharge permit, the reagent
assay, and the state primacy agency govern.

## 2. The tile

### 2.1 `dechlorination-dose` -- Dechlorination Chemical Dose

```
inputs:
  chlorine_residual_mg_l chlorine residual to remove (mg/L), default 2
  flow_mgd               flow (MGD), default 5
  stoich_ratio           mg reagent per mg Cl2 (SO2 ~0.9-1.0, metabisulfite 1.34, bisulfite 1.46, sulfite 1.77, thiosulfate ~0.56), default 1.46
  purity_pct             reagent purity (percent), default 100

reagent_dose_mg_l = stoich_ratio x chlorine_residual_mg_l
feed_lb_day       = reagent_dose_mg_l x flow_mgd x 8.34 / (purity_pct / 100)
```

**Pinned worked example.** 2.0 mg/L residual, 5 MGD, sodium bisulfite (ratio 1.46), 100%: dose = `1.46 x 2.0 = ` **2.92
mg/L**, feed = `2.92 x 5 x 8.34 = ` **121.8 lb/day**. Cross-check: a **65%** product needs proportionally more feed,
`121.8/0.65 = ` **187.3 lb/day**.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water", "wastewater"]`, beside `chlorine-demand`); a `tile-meta.js` `_TILES`
entry (`M`); a `citations.js` entry (dechlorination stoichiometry + pounds formula, `GOVERNANCE.general`); `test/
fixtures/worked-examples.json` (the bisulfite example plus the lower-purity cross-check, pinning the dose and feed);
`test/fixtures/compute-map.js` (`dechlorination-dose` -> `computeDechlorinationDose`, module `../../calc-water.js`);
`scripts/related-tiles.mjs` (-> `chlorine-demand` / `pounds-formula` / `breakpoint-chlorination`); `data/search/
aliases.json` (5 collision-checked aliases: "dechlorination dose", "dechlorination chemical", "sodium bisulfite dose",
"chlorine neutralization", "sulfite dechlorination"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer
in the `WATER_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-water declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the dose and feed, the lower-purity and reagent-ratio directions, the
residual/flow linearity, and the error seams. The calc-water.js gzip cap and the Group M group shell are watched at
build. Home tile count 1,419 -> 1,420.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2 mg/L / 5 MGD / 1.46 / 100% -> 2.92 mg/L, 121.8 lb/day).

## 5. Roadmap position

Water/wastewater operations beside `chlorine-demand`, serving the water/wastewater operator (water / wastewater).
Deliberately the dosing estimate; the discharge permit limits, the reagent's certified assay, the do-not-over-dose (DO
and pH) caution, and the state primacy agency govern. Stays evidence-driven. Continues the water-operations sweep at 1
new spec (v971).
