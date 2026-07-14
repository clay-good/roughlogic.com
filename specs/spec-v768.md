# roughlogic.com Specification v768 -- Pool Water Volume by Shape (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v767.md. Explore sweep #17 (entry 4).
>
> **The gap, and the evidence for it.** Every pool-service tile -- `pool-alkalinity-adjust`, `pool-cya-dose`,
> `pool-salt-dose`, `pool-chlorine-dose`, `pool-heater-btu`, `pool-heater-size`, `pool-turnover` -- takes the pool
> **gallonage** as an input, and there is no tile that *produces* it. The volume is the first number a tech figures on
> every job. `gallons = surface area x average depth x 7.48052`, `average depth = (shallow + deep)/2`; rectangle area
> `L x W`, round `pi(D/2)^2`, oval `(pi/4)L x W`. The number this settles: a **32 x 16 ft** rectangle **3 to 8 ft** deep is
> **512 ft^2 x 5.5 ft = 2,816 ft^3 = 21,065 gal**. Grep confirmed no `pool volume` / `average depth` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the pool-service
siblings: the lengths carry `L`, the surface area `L^2`, the volume `L^3`, and the gallonage the module's dimensionless
treatment (matching every pool tile that takes `gallons`). The v18/v21 contract: a non-finite input (via
`_finiteGuardPool`), a non-positive shallow or deep depth, a non-positive length/width (rectangle, oval) or diameter
(round), or an unknown shape returns `{ error }`. Citation discipline (v19/v22): the area formulas and the 7.48052
gal/ft^3 conversion, the NSPF CPO pool-volume method by name, `GOVERNANCE.general`; the note states the average depth
assumes a linearly sloping floor, so a deep-end hopper, spa, steps, or bowl holds a bit less, making this a field estimate
against which every chemical dose is figured.

## 2. The tile

### 2.1 `pool-volume` -- Pool Water Volume by Shape

```
inputs:
  shape        "rectangle" | "round" | "oval"
  length_ft    length L (ft; rectangle / oval)
  width_ft     width W (ft; rectangle / oval)
  diameter_ft  diameter D (ft; round)
  shallow_ft   shallow-end depth (ft, > 0)
  deep_ft      deep-end depth (ft, > 0)

avg_depth_ft = (shallow_ft + deep_ft) / 2
area_ft2     = rectangle: L x W ; round: pi (D/2)^2 ; oval: (pi/4) L x W
volume_ft3   = area_ft2 x avg_depth_ft
gallons      = volume_ft3 x 7.48052
```

**Pinned worked example.** rectangle, L = 32, W = 16, shallow = 3, deep = 8:
`avg = (3+8)/2 = 5.5`, `area = 512 ft^2`, `volume = 2,816 ft^3`, `gallons = 2816 x 7.48052 = ` **21,065**. A round pool
uses `pi(D/2)^2`; an oval is `pi/4` of the enclosing rectangle for the same L, W and depth. Doubling both depths doubles
the volume -- the linear-in-average-depth property the fuzzer pins.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service", "water-operations"]`) placed with the pool-service cluster
**past the exact-count-audited `// Group M: Water` .. `// Group N` block** (beside `pool-alkalinity-adjust`), so the
Group M audit count stays 34; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the geometry + conversion,
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`pool-volume` -> `computePoolVolume`); `scripts/related-tiles.mjs` (-> `pool-turnover` / `pool-chlorine-dose` /
`pool-heater-btu`); `data/search/aliases.json` (5 collision-checked aliases: "pool volume in gallons", "how many gallons
is my pool", ...); the calc-treatment `TREATMENT_RENDERERS` map entry via a hand-written renderer (a shape select with
field-sync plus length/width/diameter and shallow/deep depth fields) and the id added to the calc-treatment declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the per-shape area ratios, the linear-in-depth
scaling, and the error seams. The calc-treatment.js gzip cap (raised to 27500 B in this spec) covers the addition. Verify
at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,216 -> 1,217.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 21,065 gal for a 32 x 16 ft
rectangle 3 to 8 ft deep).

## 5. Roadmap position

Supplies the input the entire pool-service cluster depends on -- the volume the dose and heater tiles consume -- closing
an obvious hole in the pool bench. Continues the post-inverse forward-coverage vein (Explore sweep #17). Further
pool-service tiles (heat-loss / evaporation, acid demand) stay evidence-driven.
