# roughlogic.com Specification v502 -- Displacement Hull Speed and Speed/Length Ratio (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v501.md.
>
> **The gap, and the evidence for it.** The marine tiles (`prop-slip`, `prop-pitch-selection`) work from the propeller,
> but none of them gives the hull's own speed ceiling. A displacement hull is trapped by the wave it makes: as it
> approaches a speed-length ratio of about `1.34`, the bow and stern waves merge into a single wave as long as the boat,
> and the hull cannot climb its own bow wave without enormous added power. That ceiling, `1.34 x sqrt(LWL)` in knots, is
> why a 25 ft waterline caps near `6.7 kn` no matter how much horsepower is bolted on -- until a planing hull breaks
> free and rides on top of the water at a much higher regime. A boater who reads a prop-based speed without knowing the
> displacement wall over-predicts a heavy cruiser's top end and over-props the engine. The tile takes the waterline
> length and an optional actual speed, and returns the theoretical hull speed and the speed-length ratio with the
> regime (displacement, semi-displacement, or planing) it implies -- the number that says whether more power buys speed
> or just burns fuel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The waterline length is a
length (`L`, in feet); the hull speed and the actual speed are speeds (`L T^-1`, worked in knots); the speed-length
ratio and the `1.34` coefficient are carried as `dimensionless` (the coefficient is unit-bearing across the ft/knot
convention, per the established practice for the empirical marine relations). The v18/v21 contract: any non-finite
input, a non-positive waterline length, or a negative actual speed returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the speed-length relation by name (displacement-hull / Froude speed-length theory);
`editionNote` names the **displacement hull-speed relation (1.34 x sqrt(LWL))**, prints
`hull_speed_kn = 1.34 x sqrt(LWL_ft)` and `SL_ratio = actual_speed / sqrt(LWL_ft)`, lists the regime bands
(**SL <= 1.34 displacement, 1.34-2.5 semi-displacement, > 2.5 planing**), and states that **the 1.34 ceiling is a
practical wall for a pure displacement hull because the boat cannot outrun the wavelength of its own wave without
climbing onto plane, light and long hulls exceed it more easily, the coefficient is an approximation (some references
use 1.34 to 1.4), and the actual hull form, displacement, and power govern** -- a planning estimate, not a performance
prediction.

## 2. The tile

### 2.1 `hull-speed` -- The Displacement Wall Horsepower Cannot Push Through

```
inputs:
  lwl_ft            ft    load waterline length
  actual_speed_kn   kn    an actual/target speed (0 = hull speed only)

hull_speed_kn = 1.34 x sqrt(lwl_ft)                        [kn]
sl_ratio      = actual_speed_kn > 0 ? actual_speed_kn / sqrt(lwl_ft) : null   [-]
regime        = sl_ratio <= 1.34 ? "displacement"
              : sl_ratio <= 2.5  ? "semi-displacement" : "planing"
```

**Pinned worked example (a 25 ft waterline displacement cruiser).**
`hull_speed = 1.34 x sqrt(25) = 1.34 x 5 = ` **6.70 kn** -- a hard ceiling for that hull, and pushing a heavy full-
displacement boat past it takes far more power for almost no gain. **Cross-check (a fast boat on plane leaves the
wall).** Give the same 25 ft waterline an actual speed of `18 kn`: `SL = 18 / 5 = ` **3.6**, which is above 2.5, so the
regime is **planing** -- the hull is riding on top of the water, no longer bound by the 6.7 kn displacement ceiling. The
tile returns the hull speed, the speed-length ratio, and the regime.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the displacement example + the
planing cross-check); `test/fixtures/compute-map.js` (`hull-speed` -> `computeHullSpeed` in `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `prop-slip` / `crouch-planing-speed` / `prop-pitch-selection`);
`data/search/aliases.json` ("hull speed", "displacement speed", "speed length ratio", "froude number boat", "1.34 sqrt
lwl", "waterline length speed", "planing threshold", "displacement wall"); the id appended to the mechanic renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the sqrt scaling, the regime band boundaries at 1.34 and 2.5, and the error seams (non-finite,
non-positive LWL, negative actual speed). Hand-writes its renderer (mirroring the calc-mechanic.js `prop-slip` pattern).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the hull-speed / ratio / regime stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 25 ft example -> 6.70 kn).

## 5. Roadmap position

Adds the hull's own speed limit beside the propeller tiles and pairs with `crouch-planing-speed` (the other regime,
planing) as the two-sided speed picture. A displacement-length-ratio (heavy vs light hull) companion and a
power-to-exceed-hull-speed estimate are deliberate future follow-ons. Further Group K growth stays evidence-driven.
