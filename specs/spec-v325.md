# roughlogic.com Specification v325 -- Horsepower from Quarter-Mile Trap Speed (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.114.0; proposed 2026-07-02). Batch spec-v323..v325 (the engine-build performance trio -- injector
> size (v323), mean piston speed (v324), trap-speed horsepower (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog computes horsepower from torque and rpm
> on a dyno, but a racer's real-world power check is the drag strip -- the horsepower a car makes inferred from its
> vehicle weight and quarter-mile trap speed, the field measurement that needs no dyno. Adds one tile to the existing
> **`calc-mechanic.js`** module (Group K); no new group, trade, or dependency. Inherits spec.md through spec-v324.md.
>
> **The gap, and the evidence for it.** The trap speed at the end of a quarter mile is set by the power-to-weight ratio, and
> Hale's widely-used empirical relation inverts it to horsepower: `HP = weight x (mph/234)^3`, where `weight` is the vehicle
> weight (with driver) in pounds and `mph` is the trap speed. For a 3,200 lb car trapping 108 mph, `HP = 3,200 x (108/234)^3 = 315 hp`
> at the wheels -- the power estimate a racer compares to a dyno sheet, and one that captures how strongly trap speed
> depends on power (the cube law: a 7 mph gain to 115 mph implies 380 hp, a 20% jump). A companion elapsed-time estimate
> `ET = (weight/HP)^(1/3) x 5.825` cross-checks it. The dyno tile measures power on rollers; this tile infers it from the
> timeslip.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The vehicle weight is a force
(lb); the trap speed is a speed (mph); the estimated horsepower is a power (hp); the elapsed time is a time (s). The v18/v21
contract: any non-finite input, or a weight or trap speed at or below zero, returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the trap-speed horsepower relation by name; `editionNote` names **Hale's empirical
quarter-mile relations `HP = weight x (mph/234)^3` and `ET = 5.825 x (weight/HP)^(1/3)`, with `weight` the race weight
including driver (lb) and `mph` the trap speed, as compiled in the drag-racing references**, and states that **this returns
an empirical horsepower estimate from the timeslip -- it is a statistical fit to typical cars (the `234` constant and the
cube law average out aerodynamics, driveline loss, and traction; a very slippery or very draggy car deviates), reflects the
power actually reaching the wheels at the traps, and is not a substitute for a dyno; and this is a hobbyist estimate** --
the actual dyno measurement governs.

## 2. The tile

### 2.1 `trap-speed-horsepower` -- Horsepower from Quarter-Mile Trap Speed

```
inputs:
  weight_lb   lb    vehicle weight including driver
  trap_mph    mph   quarter-mile trap speed
  (optional) HP for the ET-only mode

HP  = weight_lb * (trap_mph / 234)^3                 ; estimated horsepower
ET  = 5.825 * (weight_lb / HP)^(1/3)                 ; estimated 1/4-mile elapsed time, s
```

**Pinned worked example (a 3,200 lb car trapping 108 mph).** `weight = 3,200`, `trap = 108`:
`HP = 3,200 x (108/234)^3 = 3,200 x 0.0984 = 315 hp`; the companion `ET = 5.825 x (3,200/315)^(1/3) = 5.825 x 2.159 = 12.6 s`.
**Cross-check (a 7 mph faster trap, 115 mph).** `HP = 3,200 x (115/234)^3 = 3,200 x 0.1188 = 380 hp` -- a 6.5% faster trap
implies 20% more power, the cube-law sensitivity that makes trap speed (not ET, which traction and launch corrupt) the
cleaner power indicator. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, matching `hp-from-torque`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the Hale trap-speed relations, `editionNote` naming `HP = weight (mph/234)^3`
and `ET = 5.825 (weight/HP)^(1/3)`, and the empirical-fit, wheel-power, not-a-dyno caveats);
`test/fixtures/worked-examples.json` (the 108 mph example + the 115 mph cross-check); `test/fixtures/compute-map.js`
(`trap-speed-horsepower` -> `computeTrapSpeedHorsepower` in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (->
`hp-from-torque` / `injector-size` / `mean-piston-speed` / `braking-distance`); `data/search/aliases.json` ("trap speed
horsepower", "quarter mile hp", "horsepower from mph", "drag strip hp", "Hale formula", "1/4 mile power", "trap speed
calculator", "ET horsepower", "timeslip horsepower"); the id appended to the existing mechanic renderers block in `app.js`;
the `// dims:` annotation (`weight` force, `trap` speed, `HP` power, `ET` time); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the cube-law sensitivity, the ET companion, and the non-positive /
non-finite error seams. No new module; re-pin `calc-mechanic.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the cube-law assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `HP` / `ET` pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (3,200 lb, 108 mph -> 315 hp).

## 5. Roadmap position

Closes the engine-build performance batch (v323..v325) in `calc-mechanic.js`: injector size, mean piston speed, and trap-
speed horsepower round out the build-and-track tiles beside displacement, compression, VE, and dyno horsepower. The
ET-to-horsepower inversion as its own mode, a density-altitude trap-speed correction, and a power-to-weight-ratio tile are
the deliberate next follow-ons once the trio lands.
