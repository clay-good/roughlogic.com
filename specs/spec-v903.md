# roughlogic.com Specification v903 -- Hydronic System Water and Glycol Volume (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v902.md. Hydronics install-ops sweep, beside
> `radiant-loop-sizing`, `glycol-mix`, and `expansion-tank`.
>
> **The gap, and the evidence for it.** `glycol-mix` gives the freeze ratio and `expansion-tank` sizes the tank, but both
> need the **system volume** and nothing computes it. Grep confirmed no system-volume tile. The number this settles: 500 ft
> of 3/4 in pipe plus the terminals and boiler is **24.5 gallons**, so a 30% glycol charge is **7.4 gallons** of glycol in
> **17.1 gallons** of water -- the fill both the expansion tank and the glycol order depend on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group B
hydronics siblings (`radiant-loop-sizing`, `glycol-mix`, `expansion-tank`): the pipe length carries `L`, the gallons per
foot is `L^2`, the terminal and boiler volumes and all gallon totals are `L^3`, and the glycol fraction is dimensionless.
The v18/v21 contract: a non-finite or non-positive pipe length or gallons per foot returns `{ error }`; a negative
terminal volume, boiler volume, or glycol fraction, or a glycol fraction above 1, returns `{ error }`. Citation discipline
(v19/v22): the volume identity by name (system = pipe length x gallons per foot + terminals + boiler; glycol = system x
fraction; water = system - glycol), `GOVERNANCE.general`; the note states that the gallons per foot comes from the pipe
size (3/4 in is about 0.023 gal/ft), that the terminal and boiler or buffer volumes come from the equipment, that the
glycol fraction comes from the freeze-protection target (`glycol-mix` gives the ratio), and that this fill volume sizes
the expansion tank (`expansion-tank`) and the glycol order -- distinct from the loop-length `radiant-loop-sizing`.

## 2. The tile

### 2.1 `hydronic-system-volume` -- Hydronic System Water and Glycol Volume

```
inputs:
  pipe_length_ft   total pipe length (ft)
  gal_per_ft       gallons per foot for the pipe size (gal/ft, default 0.023)
  terminal_gal     terminal / emitter volume (gal, default 0)
  boiler_tank_gal  boiler + buffer tank volume (gal, default 0)
  glycol_fraction  glycol fraction (0-1, default 0.30)

pipe_gal   = pipe_length_ft * gal_per_ft
system_gal = pipe_gal + terminal_gal + boiler_tank_gal
glycol_gal = system_gal * glycol_fraction
water_gal  = system_gal - glycol_gal
```

**Pinned worked example.** Pipe 500 ft at 0.023 gal/ft, terminals 8 gal, boiler 5 gal, 30% glycol:
`pipe = 500*0.023 = 11.5 gal`; `system = 11.5 + 8 + 5 = ` **24.5 gal**; `glycol = 24.5*0.30 = ` **7.35 gal**;
`water = ` **17.15 gal**. Cross-check: a harsher climate needing 50% glycol takes `24.5*0.50 = ` **12.25 gal** of glycol --
the fraction, set by the freeze target, splits the same fill.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "hvac"]`, inside the `// Group B` plumbing block near `glycol-mix`)
-- the Group B citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`B`); a `citations.js` entry
(system = pipe x gal/ft + terminals + boiler; glycol = system x fraction, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the 50%-glycol cross-check); `test/fixtures/compute-map.js`
(`hydronic-system-volume` -> `computeHydronicSystemVolume`, module `../../calc-plumbing.js`); `scripts/related-tiles.mjs`
(-> `glycol-mix` / `expansion-tank` / `radiant-loop-sizing`); `data/search/aliases.json` (5 collision-checked aliases:
"hydronic system volume", "system water volume", "glycol charge volume", "hydronic fill volume", "boiler loop volume"); a
hand-written renderer in the `PLUMBING_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the pipe,
system, glycol, and water gallons and the error seams (non-positive pipe or gal/ft; negative terminals, boiler, fraction;
fraction over 1). The calc-plumbing.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,351 -> 1,352.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group B audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(500*0.023 + 8 + 5 -> 24.5 gal, 7.35 glycol).

## 5. Roadmap position

Hydronics install-ops tile that feeds `glycol-mix` (ratio) and `expansion-tank` (acceptance volume), serving the
hydronics installer (plumbing / hvac). Distinct from the loop-length `radiant-loop-sizing`. Stays evidence-driven; the
equipment sets the terminal and boiler volumes.
