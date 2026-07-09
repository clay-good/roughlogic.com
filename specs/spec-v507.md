# roughlogic.com Specification v507 -- Crouch Planing-Speed Estimate (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v506.md.
>
> **The gap, and the evidence for it.** `hull-speed` (spec-v502) gives the displacement ceiling; the opposite regime --
> a boat up on plane -- is estimated by Crouch's formula, and the bench has nothing for it. Crouch's relation,
> `speed = C / sqrt(weight / hp)`, is the naval-architect's back-of-envelope for planing top speed, and it carries two
> traps. First, the answer is in **miles per hour**, not knots, for the conventional hull constant `C`, so a boater
> comparing it to a displacement hull-speed in knots mixes units. Second, the result scales with the **square root** of
> the weight-to-power ratio, so halving the weight or doubling the horsepower raises the speed only about 41% -- the
> diminishing return that surprises people chasing top end -- while the hull constant `C` (150 for a heavy cruiser, 190
> for a runabout, 210 for a race hull) dominates the whole answer. The tile takes the displacement, the shaft
> horsepower, and the hull class, and returns the planing speed with its regime context beside the displacement wall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The displacement is a
force (a weight, `M L T^-2`, in pounds); the shaft power is a power (`M L^2 T^-3`, in hp); the speed is a speed
(`L T^-1`, worked in mph); the weight-to-power ratio and the hull constant `C` are carried as `dimensionless` (`C` is
unit-bearing across the lb/hp/mph convention, per the established practice for the empirical marine relations). The
v18/v21 contract: any non-finite input, a non-positive displacement or horsepower, or a non-positive hull constant
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over Crouch's relation by name; `editionNote`
names **Crouch's planing-speed formula**, prints `speed_mph = C / sqrt(weight_lb / hp)`, lists the hull constants
(**~150 heavy cruiser, ~190 runabout, ~210 race**), and states that **the result is miles per hour not knots, speed
rises only with the square root of the power-to-weight ratio so doubling horsepower buys about 41% more speed, the hull
constant C is chosen by hull type and dominates the estimate, the formula assumes the boat is already on plane (below
the planing threshold it does not apply -- use the displacement hull speed), and the actual hull, propeller, and
conditions govern** -- a planning estimate, not a performance prediction.

## 2. The tile

### 2.1 `crouch-planing-speed` -- The Planing Top-Speed Estimate, and Its Diminishing Return

```
inputs:
  displacement_lb   lb    total boat weight (loaded displacement)
  shaft_hp          hp    shaft / propeller horsepower
  hull_constant     -     Crouch C (150 heavy cruiser / 190 runabout / 210 race)

speed_mph = hull_constant / sqrt(displacement_lb / shaft_hp)      [mph]
```

**Pinned worked example (a 6,000 lb runabout with 200 hp, C = 190).**
`speed = 190 / sqrt(6000 / 200) = 190 / sqrt(30) = 190 / 5.477 = ` **34.7 mph**. **Cross-check (doubling the power buys
only about 41%).** Keep the boat but fit `400 hp`: `speed = 190 / sqrt(6000/400) = 190 / sqrt(15) = 190 / 3.873 = `
**49.1 mph** -- twice the horsepower gains only `sqrt(2)` = 41% more speed, not double, the square-root return that makes
the last few mph so expensive. The tile returns the planing speed and echoes the hull constant that drove it.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 200 hp example + the 400 hp
diminishing-return cross-check); `test/fixtures/compute-map.js` (`crouch-planing-speed` -> `computeCrouchPlaningSpeed`
in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `hull-speed` / `prop-pitch-selection` / `prop-slip`);
`data/search/aliases.json` ("crouch formula", "planing speed", "boat top speed", "power to weight boat", "hull
constant", "planing hull speed", "speed from horsepower", "runabout speed"); the id appended to the mechanic renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the sqrt-of-ratio scaling (the 41% gain on doubled power), the C-dominates behavior, and the
error seams (non-finite, non-positive displacement / hp / C). Hand-writes its renderer (mirroring the calc-mechanic.js
`prop-pitch-selection` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the ratio / speed stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the 200 hp example -> 34.7 mph).

## 5. Roadmap position

Completes the two-regime speed picture with `hull-speed` (displacement wall) and this (planing top end). A
weight-reduction-vs-power tradeoff helper (the speed gain from shedding pounds versus adding horsepower) and a
planing-threshold check (does the boat make plane at cruise) are deliberate future follow-ons. Further Group K growth
stays evidence-driven.
