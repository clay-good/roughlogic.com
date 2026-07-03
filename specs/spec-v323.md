# roughlogic.com Specification v323 -- Fuel Injector Size from Horsepower, BSFC, and Duty Cycle (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.114.0; proposed 2026-07-02). Batch spec-v323..v325 (the engine-build performance trio -- the sizing
> and durability numbers the displacement and horsepower tiles never give: the fuel injector flow a power target needs
> (this spec), the mean piston speed and its rpm-limit reading (v324), and the horsepower a car makes from its trap speed
> (v325).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog computes engine displacement, compression
> ratio, volumetric efficiency, and horsepower, but has no fuel-system tile -- the injector flow rate a target horsepower
> demands, the first spec of any engine build or forced-induction upgrade. Adds one tile to the existing
> **`calc-mechanic.js`** module (Group K); no new group, trade, or dependency. Inherits spec.md through spec-v322.md.
>
> **The gap, and the evidence for it.** The fuel flow each injector must supply is the engine's total fuel demand divided
> across the injectors at a safe maximum duty cycle: `injector_lb/h = HP x BSFC / (n_cyl x duty)`, where `BSFC` is the
> brake-specific fuel consumption (about 0.50 for a naturally-aspirated gas engine, 0.55 to 0.65 boosted), `n_cyl` the
> injector count, and `duty` the maximum duty cycle held at (typically 0.80). For a 400 hp V8 at `BSFC = 0.50` and an 80%
> duty cap, each injector must flow `400 x 0.50 / (8 x 0.80) = 31.3 lb/h` (about 328 cc/min) -- the injector a tuner
> selects, and one that must grow with boost because forced induction raises the BSFC. The horsepower and displacement
> tiles never touch the fuel side; this tile sizes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target power `HP` is a
power (hp); the brake-specific fuel consumption `BSFC` is a mass per power-time (lb/hp-h); the injector count `n_cyl` is a
dimensionless count; the duty cycle `duty` is a dimensionless fraction (0 to 1); the required injector flow is a mass per
time (reported in lb/h and cc/min). The v18/v21 contract: any non-finite input, a power/BSFC at or below zero, an injector
count below one, or a duty cycle outside `0 < duty <= 1` returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the injector-sizing relation by name; `editionNote` names **the injector flow
`lb/h = HP x BSFC / (n_cyl x duty)`, the `BSFC` ranges (~0.45 to 0.50 NA gas, ~0.55 to 0.65 boosted), the customary 80%
maximum duty cycle, and the `lb/h x 10.5 = cc/min` conversion for gasoline (specific gravity ~0.72)**, and states that
**this returns the per-injector flow at the stated duty -- it uses the entered `BSFC` (which rises with boost and richer
tuning), assumes evenly-distributed port injection with one injector per cylinder, and does not cover a return-versus-
returnless fuel system, the rail pressure that sets the injector's static flow, or direct injection; and this is a tuning
aid** -- the engine's measured fueling and the tuner's judgment govern.

## 2. The tile

### 2.1 `injector-size` -- Fuel Injector Size from Horsepower, BSFC, and Duty Cycle

```
inputs:
  HP        hp         target crank (or wheel) horsepower
  BSFC      lb/hp-h    brake-specific fuel consumption (0.50 NA, 0.55-0.65 boosted)
  n_cyl     -          number of injectors
  duty      -          maximum duty cycle (default 0.80)

total_lbh = HP * BSFC                                  ; total fuel demand, lb/h
inj_lbh   = total_lbh / (n_cyl * duty)                 ; per-injector flow, lb/h
inj_ccmin = inj_lbh * 10.5                             ; ~cc/min (gasoline)
```

**Pinned worked example (a 400 hp V8, NA gas, 80% duty).** `HP = 400`, `BSFC = 0.50`, `n_cyl = 8`, `duty = 0.80`:
`total = 400 x 0.50 = 200 lb/h`; `inj = 200/(8 x 0.80) = 31.3 lb/h = 328 cc/min` per injector. **Cross-check (add boost,
BSFC 0.60).** Hold the rest: `total = 400 x 0.60 = 240 lb/h`; `inj = 240/6.4 = 37.5 lb/h = 394 cc/min` -- a 20% richer BSFC
demands a 20% bigger injector for the same horsepower, the reason a boosted build steps up injector size even before adding
power. The non-finite, non-positive, `n_cyl < 1`, and out-of-range-duty error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, matching `displacement-cr`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the injector-sizing relation, `editionNote` naming
`lb/h = HP BSFC/(n_cyl duty)`, the BSFC ranges, the 80% duty, the cc/min conversion, and the port-injection, enter-BSFC,
not-rail-pressure caveats); `test/fixtures/worked-examples.json` (the NA example + the boosted cross-check);
`test/fixtures/compute-map.js` (`injector-size` -> `computeInjectorSize` in `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `volumetric-efficiency` / `displacement-cr` / `hp-from-torque` / `mean-piston-speed`);
`data/search/aliases.json` ("injector size", "injector flow rate", "cc/min injector", "lb/hr injector", "fuel injector
sizing", "BSFC injector", "duty cycle injector", "how big injectors", "injector calculator"); the id appended to the
existing mechanic renderers block in `app.js`; the `// dims:` annotation (`HP` power, `BSFC` mass/power-time, `n_cyl`/`duty`
dimensionless, flow mass/time); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the lb/h-to-cc/min conversion, the BSFC scaling, and the non-positive / `n_cyl < 1` / out-of-range-duty error seams. No new
module; re-pin `calc-mechanic.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the BSFC-scaling assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the total / per-injector lb/h and cc/min
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (400 hp NA -> 31.3 lb/h, 328 cc/min).

## 5. Roadmap position

Opens the engine-build performance batch (v323..v325) in `calc-mechanic.js`, adding the fuel side to the displacement and
horsepower tiles. Mean piston speed (v324) and trap-speed horsepower (v325) follow. The rail-pressure static-flow scaling,
the returnless-system dead-time, and a required-fuel-pump-flow chain are the deliberate next follow-ons once the trio lands.
