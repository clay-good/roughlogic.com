# roughlogic.com Specification v716 -- Max Tributary Drainage Area for an Allowable Flow (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v715.md. Sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `stormwater-rational` tile runs the Rational method forward: from
> a catchment area it returns the peak runoff. The layout question is the inverse -- **the largest tributary area an
> inlet, pipe, or outlet rated for an allowable flow can accept**. From `Q = C x i x A_acres`, `A_acres = Q / (C x i)`,
> then `A_ft2 = A_acres x 43,560`. The number this settles: a **2-cfs** outlet on asphalt (C 0.95) at 2 in/hr accepts up
> to **~45,850 ft^2** (1.05 acres).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`stormwater-rational` sibling: the allowable flow is `L^3 T^-1` (cfs), the rainfall intensity is `L T^-1` (in/hr), the
surface is a categorical select into the bundled `RUNOFF_COEFFICIENTS`, and the returned area is `L^2` (ft^2 / acres). The
v18/v21 contract: any non-finite input, a non-positive allowable flow or rainfall intensity, or an unknown surface type
returns `{ error }`. Citation discipline (v19/v22): the Rational method solved for the area, `GOVERNANCE.plumbing`
matching the sibling; the note states that **a rougher (lower C) surface or a lower rainfall intensity lets a larger area
drain to the same outlet, the Rational method suits small (< about 200-acre) uniform catchments, the runoff coefficient
and the design storm (intensity at the time of concentration) are set by the local drainage code, and the AHJ and the
civil engineer of record govern**.

## 2. The tile

### 2.1 `stormwater-max-drainage-area` -- Max Tributary Drainage Area for an Allowable Flow

```
inputs:
  allowable_flow_cfs    L^3 T^-1      allowable inlet/pipe/outlet capacity (> 0)
  surface               dimensionless surface type (into RUNOFF_COEFFICIENTS)
  rainfall_in_per_hr    L T^-1        design rainfall intensity (> 0)

C = RUNOFF_COEFFICIENTS[surface]
max_area_acres = allowable_flow_cfs / (C x rainfall_in_per_hr)
max_area_ft2 = max_area_acres x 43560
```

**Pinned worked example.** Q = 2 cfs, asphalt (C 0.95), i = 2 in/hr: `A_acres = 2 / (0.95 x 2) = 1.053 acres`,
`A_ft2 = 1.053 x 43,560 = ` **45,853 ft^2**; feeding 45,853 ft^2 back through `stormwater-rational` returns a 2-cfs peak
flow, the input. A rougher lawn (C 0.25) accepts a much larger 174,240 ft^2 for the same outlet.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`) placed beside `stormwater-rational` (Group B is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (Rational method solved for the area, `GOVERNANCE.plumbing` matching
the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`stormwater-max-drainage-area` -> `computeStormwaterMaxDrainageArea`); `scripts/related-tiles.mjs` (-> `stormwater-rational`
/ `time-of-concentration` / `stormwater-detention-volume` / `roof-drain-sizing`); `data/search/aliases.json` (5
collision-checked question aliases: "max drainage area for an outlet", "tributary area for allowable flow", ...); the
calc-plumbing `RENDERERS` map entry via a hand-written NON-exported renderer (the shared surface select plus two number
fields; kept un-exported so it is not a corpus function needing fuzzer-sentinel coverage) and the id added to the
calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeStormwaterRational` across a flow/surface/intensity sweep, the rougher-surface-larger-area monotonicity, and the
error seams. The calc-plumbing.js gzip cap (raised to 70000 B in spec-v715) is expected to hold. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,164 -> 1,165.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 45,853 ft^2 for a 2-cfs
asphalt outlet at 2 in/hr).

## 5. Roadmap position

Pairs the forward Rational method tile (`stormwater-rational`, flow from an area) with its inverse (area from an allowable
flow), the two halves of the tributary-area question. Closes the sweep-10 plumbing pair. Further Group B plumbing growth
stays evidence-driven.
