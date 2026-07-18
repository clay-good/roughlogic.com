# roughlogic.com Specification v954 -- Steam Boiler Surface Blowdown (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-pipefit.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v953.md. Steam-systems sweep, beside the accepted
> `steam-trap-sizing`, `boiler-horsepower`, and `flash-steam-pct` tiles.
>
> **The gap, and the evidence for it.** The steam suite covers traps, flash, condensate return, and boiler ratings, but
> nothing sizes the BLOWDOWN that controls boiler-water TDS. Grep confirmed the only "blowdown" tile is the cooling-tower
> `cooling-water-makeup` (evaporation and drift -- a different system). Every boiler operator computes this. The number
> this settles: a 10,000 lb/hr boiler on 100 ppm feedwater held to 3,500 ppm blows down about **294 lb/hr**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing ppm and lb/hr), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive steam rate or feedwater
TDS, or a boiler-water limit at or below the feedwater TDS (no valid concentration) returns `{ error }`. Citation
discipline (v19/v22): the TDS mass-balance blowdown method by name (cycles of concentration), `GOVERNANCE.general`; the
note states that the steam is assumed TDS-free, that this is the steady-state SURFACE blowdown only (bottom/mud blowdown
is separate), and that the ASME / manufacturer boiler-water limits (TDS, alkalinity, silica), the treatment program, and
a licensed boiler operator govern the actual schedule; it is distinct from the cooling-tower `cooling-water-makeup`.

## 2. The tile

### 2.1 `steam-boiler-blowdown` -- Steam Boiler Surface Blowdown (Cycles of Concentration)

```
inputs:
  steam_rate_lb_hr    steam production (lb/hr), default 10000
  feedwater_tds_ppm   feedwater (makeup + condensate) TDS (ppm), default 100
  max_boiler_tds_ppm  max allowed boiler-water TDS (ppm), default 3500

cycles_of_concentration   = max_boiler_tds_ppm / feedwater_tds_ppm
blowdown_rate_lb_hr       = steam_rate_lb_hr x feedwater_tds_ppm / (max_boiler_tds_ppm - feedwater_tds_ppm)
blowdown_pct_of_feedwater = 100 x feedwater_tds_ppm / max_boiler_tds_ppm   (= 100 / CoC)
```

**Pinned worked example.** 10,000 lb/hr, 100 ppm feedwater, 3,500 ppm limit: `CoC = 3500/100 = ` **35 cycles**; blowdown
= `10000 x 100/(3500-100) = ` **294 lb/hr** (2.86% of feedwater). Cross-check: cleaner 50 ppm feedwater doubles the
cycles to **70** and halves the blowdown to `10000 x 50/3450 = ` **145 lb/hr** -- better makeup water directly cuts the
blowdown and its heat loss.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["pipefitting"]`, beside `steam-trap-sizing`); a `tile-meta.js` `_TILES` entry
(`B`); a `citations.js` entry (TDS mass balance / cycles of concentration, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the base example plus the cleaner-feedwater cross-check, pinning the cycles, rate, and percent);
`test/fixtures/compute-map.js` (`steam-boiler-blowdown` -> `computeSteamBoilerBlowdown`, module `../../calc-pipefit.js`);
`scripts/related-tiles.mjs` (-> `boiler-horsepower` / `cooling-water-makeup` / `steam-trap-sizing`); `data/search/
aliases.json` (5 collision-checked aliases: "boiler blowdown", "cycles of concentration boiler", "boiler tds blowdown",
"surface blowdown", "steam boiler blowdown"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`PIPEFIT_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-pipefit declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the cycles, rate, and percent, the cleaner-feedwater direction, the steam-rate
linearity, the mass-balance self-consistency, and the error seams. The calc-pipefit.js gzip cap and the Group B group
shell are watched at build. Home tile count 1,402 -> 1,403.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(10,000 / 100 / 3,500 -> 35 cycles, 294 lb/hr).

## 5. Roadmap position

Steam systems beside `steam-trap-sizing`, serving the boiler operator / pipefitter (pipefitting). Deliberately the
steady-state surface-blowdown TDS balance; bottom/mud blowdown, the boiler-water treatment program (alkalinity, silica,
conductivity), the ASME / manufacturer limits, and a licensed operator govern the actual schedule. Distinct from the
cooling-tower blowdown of cooling-water-makeup. Stays evidence-driven. Continues the steam-systems sweep at 1 new spec
(v954).
