# roughlogic.com Specification v602 -- Center-Pivot Outer-Span Application Rate vs Soil Intake (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L, the agriculture bench); no new module, group, or dependency. Inherits spec.md through spec-v601.md.
>
> **The gap, and the evidence for it.** Spec-v568 (`center-pivot-runtime`) names this tile as a deliberate follow-on:
> "an application-rate-vs-soil-intake check (the outer-span instantaneous rate against a soil intake family)," and its
> own note warns that "the instantaneous application rate under an outer span can exceed the soil intake rate and run
> off even when the daily depth is right." The runtime tile sizes the depth and hours; it says nothing about whether
> the water can actually soak in. On a center pivot the outer end sweeps the largest circle at the highest ground
> speed, so it dumps its whole pass depth in the few minutes its wetted band is over any point -- an **instantaneous
> application rate that routinely runs several inches per hour**, far above what most soils can absorb. The rate is
> pure kinematics: the outer tower's ground speed is the circumference over the revolution time, the wetted band of
> width W passes a point in `W / speed`, and the pass depth D delivered in that window is
> `rate = D x 2 x pi x L / (T x W)` inches per hour. A one-inch pass on a quarter-mile pivot turning once a day through
> a 100-foot wetted band applies **3.5 in/hr at the end tower** -- roughly seven times a silt loam's half-inch intake
> rate. The water does not run off in practice only because the wetting time is short and the surface stores a little,
> but on a slope or a crusted soil it will, and this tile makes the mismatch visible so a designer slows the pivot,
> narrows the band, or picks a lower-rate package before the field gullies.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pass depth is `L`
(in), the pivot length and wetted band `L` (ft), the revolution time `T` (hr), the outer-tower ground speed `L T^-1`
(ft/min), the wetting time `T` (min), and the application and soil intake rates `L T^-1` (in/hr), carried dimensionless
to the parse-only lint alongside the `center-pivot-runtime` sibling. The v18/v21 contract: any non-finite input, or a
non-positive pass depth, pivot length, revolution time, wetted band, or soil intake rate returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the center-pivot application-rate relation by name (USDA-NRCS
center-pivot design / university extension, matching the `center-pivot-runtime` sibling); `editionNote` prints
`speed_ft_min = 2 x pi x pivot_length / (revolution_hr x 60)`, `wetting_min = wetted_band / speed_ft_min`, and
`app_rate_in_hr = pass_depth x 2 x pi x pivot_length / (revolution_hr x wetted_band)`, and states that **this is the
average rate over the wetted band at the outer span (the true peak of a bell-shaped pattern runs a little higher, about
6% for an elliptical package), the outer end always governs because it moves fastest, runoff is avoided in practice
only by the short wetting time and surface storage so a slope or a crusted or tight soil will run off when the rate
exceeds the intake, and the pivot design, the sprinkler package, and the measured soil intake govern** -- a design
screen, not a runoff model.

## 2. The tile

### 2.1 `pivot-application-rate` -- Outer-Span Instantaneous Rate Against Soil Intake

```
inputs:
  pass_depth_in       in      gross depth applied per pass
  pivot_length_ft     ft      radius to the outer (end) tower / last sprinkler
  revolution_hr       hr      time for one full revolution
  wetted_band_ft      ft      wetted width of the sprinkler pattern at the outer span
  soil_intake_in_hr   in/hr   soil basic intake rate (sand ~1.0, loam ~0.5, clay ~0.15)

speed_ft_min    = 2 x pi x pivot_length_ft / (revolution_hr x 60)          [ft/min]
wetting_min     = wetted_band_ft / speed_ft_min                            [min]
app_rate_in_hr  = pass_depth_in x 2 x pi x pivot_length_ft / (revolution_hr x wetted_band_ft)   [in/hr]
exceeds_intake  = app_rate_in_hr > soil_intake_in_hr
ratio           = app_rate_in_hr / soil_intake_in_hr
```

**Pinned worked example (a 1-inch pass, quarter-mile pivot, one revolution a day, 100-ft band, silt-loam intake).**
`speed = 2 x pi x 1,320 / (24 x 60) = ` **5.76 ft/min**, `wetting = 100 / 5.76 = ` **17.4 min**, and
`app_rate = 1.0 x 2 x pi x 1,320 / (24 x 100) = ` **3.46 in/hr** at the end tower -- against a silt loam's 0.5 in/hr
basic intake that is **6.9 times** the soil can take, so on any slope the outer span runs off even though the daily
inch is correct. **Cross-check (a shorter pivot, tighter soil).** 0.75-inch pass, 800-ft length, 20-hr revolution,
80-ft band, 0.3 in/hr clay-loam intake: `app_rate = 0.75 x 2 x pi x 800 / (20 x 80) = ` **2.36 in/hr**, which is
**7.9 times** the intake -- the shorter pivot still overwhelms the tighter soil, confirming the mismatch is intrinsic
to the outer span, not just the biggest machines.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["irrigation", "agriculture"]`, placed inside the `// Group L: Agriculture`
comment block beside `center-pivot-runtime` -- the `citations.test.js` **Group L audit count bumps 27 -> 28**); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`pivot-application-rate` ->
`computePivotApplicationRate` in `../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `center-pivot-runtime`
/ `sprinkler-precip-rate` / `irrigation-requirement`); `data/search/aliases.json` ("pivot application rate", "outer
span runoff", "instantaneous application rate", "sprinkler intake runoff", "pivot runoff", plus question rows); the id
appended to the calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the length-and-band
sensitivity, the exceeds-intake flag, and the error seams (non-finite, non-positive depth / length / revolution / band
/ intake). Renderer hand-written mirroring `center-pivot-runtime` (`makeNumber` / `makeOutputLine`). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group L audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the quarter-mile
example -> 3.46 in/hr, 6.9x intake).

## 5. Roadmap position

Gives `center-pivot-runtime` the runoff check its own note promised, beside `sprinkler-precip-rate` and
`irrigation-requirement`. The v568-named percent-timer-to-depth converter remains a deliberate future follow-on.
Further Group L growth stays evidence-driven.
