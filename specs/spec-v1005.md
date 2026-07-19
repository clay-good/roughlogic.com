# roughlogic.com Specification v1005 -- Condensing Appliance Flue Condensate Rate (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v1004.md. The drain-side companion of
> `flue-gas-dew-point`; beside `condensate-drain` (which sizes AC coil condensate, a different source).
>
> **The gap, and the evidence for it.** `condensate-drain` handles AC evaporator-coil condensate (dehumidified room
> air), but nothing computes the condensate a condensing COMBUSTION appliance makes from the water of combustion. Grep +
> the alias index confirmed no flue-condensate tile. The number this settles: a 100,000 BTU/hr condensing appliance
> drains about **0.96 gph**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, lb/hr and gph from BTU/hr and fractions),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive fuel input or water-per-therm, or a condensing fraction outside (0, 1] returns `{ error }`. The 8.34 lb/gal
factor is shared with the pounds-formula tiles. Citation discipline (v19/v22): the condensate rate from the water of
combustion by name (methane stoichiometry), `GOVERNANCE.general`; the note stresses that the condensate is acidic (pH
~3-5, a neutralizer may be required) and that the rated condensate output, the plumbing code, and the manufacturer
govern.

## 2. The tile

### 2.1 `condensing-flue-condensate` -- Condensing Appliance Flue Condensate Rate

```
inputs:
  input_btu_hr        fuel input (BTU/hr), default 100000
  water_lb_per_therm  water produced per therm (lb, ~9.4 nat gas), default 9.4
  condensing_fraction fraction of the water vapor condensed (0-1, ~0.85), default 0.85

therms_per_hr          = input_btu_hr / 100000
water_produced_lb_hr   = therms_per_hr x water_lb_per_therm
condensate_gph         = water_produced_lb_hr x condensing_fraction / 8.34
```

**Pinned worked example.** 100,000 BTU/hr, 9.4 lb/therm, 0.85 condensing: `water = 1 x 9.4 = 9.4 lb/hr`; `condensate =
9.4 x 0.85 / 8.34 = ` **0.96 gph**. Cross-check: a 150,000 BTU/hr boiler at 0.90: `water = 14.1 lb/hr`; `condensate = `
**1.52 gph**.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `flue-gas-dew-point`); a `tile-meta.js` `_TILES` entry
(`C`); a `citations.js` entry (water of combustion, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
100k base plus the 150k cross-check, pinning the water produced and condensate gph); `test/fixtures/compute-map.js`
(`condensing-flue-condensate` -> `computeCondensingFlueCondensate`, module `../../calc-hvacservice.js`);
`scripts/related-tiles.mjs` (-> `flue-gas-dew-point` / `condensate-drain` / `gas-appliance-demand`);
`data/search/aliases.json` (5 collision-checked aliases: "condensate rate", "flue condensate", "condensing furnace
condensate", "condensate pump sizing", "neutralizer sizing"), then `node scripts/build-alias-shards.mjs`; the tile is
rendered by the `_simpleRenderer` factory in the `HVACSERVICE_RENDERERS` map, and the id added to the calc-hvacservice
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the input / condensing-fraction directions,
and the error seams. The calc-hvacservice.js gzip cap and the Group C group shell are watched at build (cap raised for
the combustion pair). Home tile count 1,453 -> 1,454.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100,000 BTU/hr x 9.4 x 0.85 -> 0.96 gph).

## 5. Roadmap position

Condensing-appliance service beside `flue-gas-dew-point`, serving the HVAC / plumbing tech (hvac). Deliberately the
sizing aid; the appliance's rated condensate output, the local plumbing code (drain, trap, neutralizer), and the
manufacturer's instructions govern. Stays evidence-driven. Continues the combustion-service sweep at 1 new spec
(v1005).
