# roughlogic.com Specification v643 -- Steam Main Capacity from Size and Velocity (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-pipefit.js`**
> (Group B, pipefitting), no new module, group, or dependency. Inherits spec.md through spec-v642.md.
>
> **The gap, and the evidence for it.** The `steam-pipe-velocity` tile (spec-v158) sizes a main the forward way:
> given a mass flow and an allowable velocity, it returns the required diameter and picks the smallest Sch 40
> nominal that clears it. The reverse question -- "the main is already 2 inch; how much steam can it carry within
> the velocity band?" -- is the exact inverse of the same continuity relation, and it is what a fitter working on
> an existing plant actually asks. Solving `capacity = velocity x 60 x area / specific_volume` with the area taken
> from the Sch 40 ID is pure algebra with no new constant (the ID table `_SCH40_ID_IN` is already in the module).
> The pinned example: a 2 inch Sch 40 main (ID 2.067) at a 6,000 ft/min ceiling and 13.7 ft^3/lb specific volume
> carries **612 lb/hr**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specific volume is
`L^3 M^-1`, the velocity ceiling is `L T^-1`, the internal area is `L^2`, the ID is `L`, and the capacity is
`M T^-1`; the nominal size is a `dimensionless` schedule label. The Sch 40 IDs (ASME B36.10M) and the recommended
velocity band (supply mains ~6,000-12,000 ft/min, ASHRAE) are the same ones the `steam-pipe-velocity` sibling uses.
The v18/v21 contract: any non-finite numeric input, an unknown nominal size, or a non-positive specific volume or
velocity returns `{ error }`. Citation discipline (v19/v22): the continuity capacity relation, the inverse of the
steam-main sizer, by name; the note states that **the area comes from the ASME B36.10M Sch 40 ID, the specific
volume is read from the saturated-steam table at the line pressure, and the velocity band is a recommendation, not a
code limit** -- a design aid, not a substitute for the engineer of record.

## 2. The tile

### 2.1 `steam-pipe-capacity` -- The Steam Flow an Existing Sch 40 Main Carries

```
inputs:
  nps               -       existing Sch 40 nominal size (select; ID from _SCH40_ID_IN)
  spec_vol_ft3lb    ft3/lb  saturated-steam specific volume at the line pressure (> 0)
  vel_ceiling_fpm   ft/min  allowable velocity (> 0; supply mains ~6,000-12,000)

area_ft2       = (pi/4)(ID_in/12)^2
capacity_lbhr  = vel_ceiling_fpm x 60 x area_ft2 / spec_vol_ft3lb
```

**Pinned worked example.** 2 in Sch 40 (ID 2.067, area 3.36 in^2 = 0.0233 ft^2), vel 6,000 ft/min, spec vol
13.7 ft^3/lb: `capacity = 6000 x 60 x 0.0233 / 13.7 = ` **612 lb/hr**.
**Cross-check (exact inverse of the sizer).** Feed 612 lb/hr back through `steam-pipe-velocity` at the same velocity
and specific volume: it re-picks the **2 in** main at ~6,000 ft/min -- the two tiles are exact inverses.
**Cross-check (a bigger main).** A 4 in main (ID 4.026) at the same 6,000 ft/min carries **2,323 lb/hr**, so the
sizer's "2,000 lb/hr needs 4 in" result fits with margin.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["pipefitting"]`, beside `steam-pipe-velocity`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (continuity capacity, ASHRAE band, ASME B36.10M IDs, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the bigger-main cross-check); `test/fixtures/compute-
map.js` (`steam-pipe-capacity` -> `computeSteamPipeCapacity`); `scripts/related-tiles.mjs` (<-> `steam-pipe-
velocity`, `flash-steam-pct`, `steam-trap-sizing`, `boiler-pipe-sizing`); `data/search/aliases.json` ("steam pipe
capacity", "steam main capacity", "how much steam can a pipe carry", plus question rows, all collision-checked);
`PIPEFIT_RENDERERS["steam-pipe-capacity"]` via a hand-written renderer (the module's `makeSelect` (nominal size) /
`makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring
`steam-pipe-velocity`) and the id added to the calc-pipefit declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, the exact inverse round-trip through `computeSteamPipeVelocity`, the velocity/specific-volume scaling, and
the error seams. The two `index.html` home-count spots go 1,091 -> 1,092 (check-readme-counts gates them). The
calc-pipefit.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 612 lb/hr, 3.36 in^2).

## 5. Roadmap position

Completes the steam-main pair: `steam-pipe-velocity` (flow -> size) and now `steam-pipe-capacity` (size -> flow),
exact inverses through the same continuity relation. Further Group B / pipefitting growth stays evidence-driven.
