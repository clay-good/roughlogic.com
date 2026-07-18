# roughlogic.com Specification v976 -- Dry Well / Infiltration Trench Sizing (calc-drainage.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v975.md. Stormwater sweep, beside the accepted
> `stormwater-detention-volume` and `stormwater-rational` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes a surface detention pond, but nothing sizes a subsurface
> stone-filled dry well / infiltration trench (void-ratio storage + soil draindown). Grep confirmed no dry well /
> soakaway / infiltration-trench tile. Every drainage / landscaping installer sizes one. The number this settles:
> storing 200 ft^3 of runoff in 0.35-void stone needs a **571 ft^3** pit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing ft^3, a void fraction, ft, and in/hr),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive runoff / depth / infiltration rate, or a void ratio outside (0,1] returns `{ error }`. Citation discipline
(v19/v22): the void-ratio storage + infiltration draindown method by name, `GOVERNANCE.general`; the note stresses that
the runoff comes from a design-storm calc, the void ratio from the actual aggregate, and -- critically -- the
infiltration rate from a field PERCOLATION test (not a default), that an overflow/bypass is required, and that the perc
test, the stormwater code, and the AHJ/geotech govern.

## 2. The tile

### 2.1 `drywell-infiltration` -- Dry Well / Infiltration Trench Sizing

```
inputs:
  runoff_volume_ft3       runoff (storage) volume (ft^3), default 200
  void_ratio              aggregate void ratio (~0.35 open stone), default 0.35
  trench_depth_ft         trench/pit depth (ft), default 4
  infiltration_rate_in_hr soil infiltration rate (in/hr, from a perc test), default 0.5

excavation_volume_ft3 = runoff_volume_ft3 / void_ratio
footprint_sf          = excavation_volume_ft3 / trench_depth_ft
draindown_time_hr     = 12 x trench_depth_ft x void_ratio / infiltration_rate_in_hr
```

**Pinned worked example.** 200 ft^3 runoff, 0.35 void, 4 ft deep, 0.5 in/hr: excavation = `200/0.35 = ` **571 ft^3**,
footprint = `571/4 = ` **143 sf**, draindown = `12 x 4 x 0.35/0.5 = ` **33.6 hr** (empties between storms). Cross-check:
a slow **0.1 in/hr** clay soil drains in `12 x 4 x 0.35/0.1 = ` **168 hr** (7 days) -- it fails the ~72 hr target, so
clay is unsuitable for infiltration.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "civil"]`, before `stormwater-detention-volume`); a `tile-
meta.js` `_TILES` entry (`B`); a `citations.js` entry (void-ratio storage + infiltration, `GOVERNANCE.general`); `test/
fixtures/worked-examples.json` (the base example plus the clay-soil cross-check, pinning the excavation, footprint, and
draindown); `test/fixtures/compute-map.js` (`drywell-infiltration` -> `computeDrywellInfiltration`, module `../../calc-
drainage.js`); `scripts/related-tiles.mjs` (-> `stormwater-detention-volume` / `stormwater-rational` / `septic-
drainfield`); `data/search/aliases.json` (5 collision-checked aliases: "dry well", "drywell", "infiltration trench",
"soakaway", "stormwater infiltration"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`DRAINAGE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-drainage declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the excavation/footprint/draindown, the slow-soil and higher-void and
linear-in-runoff directions, and the error seams. The calc-drainage.js gzip cap and the Group B group shell are watched
at build. Home tile count 1,424 -> 1,425.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(200 ft^3 / 0.35 / 4 ft / 0.5 in/hr -> 571 ft^3, 143 sf, 33.6 hr).

## 5. Roadmap position

Stormwater beside `stormwater-detention-volume`, serving the drainage / landscaping / site installer (plumbing / civil).
Deliberately the void-ratio sizing screen; the field percolation test, the design-storm runoff volume, the required
overflow path, the local stormwater ordinance, and the AHJ / geotechnical engineer govern the design. Stays evidence-
driven. Continues the stormwater sweep at 1 new spec (v976).
