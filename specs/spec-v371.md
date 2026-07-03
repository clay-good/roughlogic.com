# roughlogic.com Specification v371 -- Velocity Head and Dynamic Pressure (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.130.0). Batch spec-v371..v373 (the fluid-mechanics fundamentals trio -- the
> energy terms the friction and pump tiles use implicitly: the velocity head and dynamic pressure (this spec), the
> continuity velocity at a size change (v372), and the Bernoulli total head (v373).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pipe-velocity` gives the flow velocity, but the
> velocity head -- the kinetic energy of the flow expressed as a height of fluid, `V^2/2g` -- is the term behind minor
> losses, pitot readings, and the conversion between velocity and pressure, and no tile computes it. Adds one tile to the
> existing **`calc-plumbing.js`** module (Group B); no new group, trade, or dependency. Inherits spec.md through
> spec-v370.md.
>
> **The gap, and the evidence for it.** The velocity head is `h_v = V^2/(2 g)` (ft of fluid, `g = 32.2 ft/s^2`), and the
> corresponding dynamic pressure is `q = (1/2) rho V^2` (or `h_v x gamma`). For water flowing at 10 ft/s,
> `h_v = 100/64.4 = 1.55 ft` of head, equal to a dynamic pressure of `0.5 x 1.94 x 100 = 97 lb/ft^2 = 0.67 psi` -- the head
> a fitting's minor-loss coefficient multiplies, the pressure a pitot tube reads as the difference between total and static,
> and the energy that converts to pressure when the flow slows at an expansion. Because it goes as `V^2`, doubling the
> velocity quadruples the velocity head, the nonlinearity behind erosion and water hammer. `pipe-velocity` gives `V`; this
> tile gives the head and pressure that velocity carries.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The velocity `V` is a speed
(ft/s); the velocity head `h_v` is a length (ft of fluid); the dynamic pressure `q` is a pressure (lb/ft^2 and psi); the
fluid density `rho` (slug/ft^3) and specific weight `gamma` (lb/ft^3) select the fluid (default water). The v18/v21
contract: any non-finite input, or a velocity or density at or below zero, returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the velocity-head definition by name; `editionNote` names **the velocity head
`h_v = V^2/(2 g)` (`g = 32.2 ft/s^2`), the dynamic pressure `q = (1/2) rho V^2 = h_v x gamma`, and water's `rho = 1.94
slug/ft^3`, `gamma = 62.4 lb/ft^3`, from the standard fluid-mechanics references**, and states that **this returns the
velocity head and dynamic pressure of a flow -- it is the kinetic term of the energy equation (the minor-loss head is
`K x h_v`, a follow-on), uses the entered fluid properties, and does not add the static or elevation head (`bernoulli-head`);
and this is an engineering aid** -- the fluid properties and flow condition govern.

## 2. The tile

### 2.1 `velocity-head` -- Velocity Head and Dynamic Pressure

```
inputs:
  V_fps     ft/s        flow velocity
  gamma     lb/ft^3     fluid specific weight (default 62.4 water)
  rho       slug/ft^3   fluid density (default 1.94 water)

h_v = V_fps^2 / (2 * 32.2)                         ; velocity head, ft of fluid
q_psf = 0.5 * rho * V_fps^2                          ; dynamic pressure, lb/ft^2
q_psi = q_psf / 144
```

**Pinned worked example (water at 10 ft/s).** `h_v = 100/64.4 = 1.55 ft`; `q = 0.5 x 1.94 x 100 = 97 lb/ft^2 = 0.67 psi`.
**Cross-check (double the velocity to 20 ft/s).** `h_v = 400/64.4 = 6.21 ft`; `q = 0.5 x 1.94 x 400 = 388 lb/ft^2 = 2.69 psi`
-- four times the head and pressure for twice the velocity (the `V^2` law), the reason a small velocity increase drives
large minor losses and erosion. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","hvac","fire"]`, matching `pipe-velocity`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the velocity-head definition, `editionNote` naming `h_v = V^2/(2g)`,
`q = (1/2) rho V^2`, the water properties, and the kinetic-term-only, enter-fluid caveats);
`test/fixtures/worked-examples.json` (the 10 ft/s example + the 20 ft/s cross-check); `test/fixtures/compute-map.js`
(`velocity-head` -> `computeVelocityHead` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `pipe-velocity` /
`flow-continuity` / `bernoulli-head` / `orifice-flow`); `data/search/aliases.json` ("velocity head", "dynamic pressure",
"V squared over 2g", "kinetic head", "pitot pressure", "velocity pressure fluid", "flow energy head", "half rho v
squared", "velocity head water"); the id appended to the existing plumbing renderers block in `app.js`; the `// dims:`
annotation (`V` speed, `h_v` length, `q` pressure, `gamma`/`rho` fluid property); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `V^2` scaling, the head-to-pressure conversion, and the
non-positive / non-finite error seams. No new module; re-pin `calc-plumbing.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `V^2` assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `h_v` / `q` stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (10 ft/s -> 1.55 ft, 0.67 psi).

## 5. Roadmap position

Opens the fluid-mechanics fundamentals trio (v371..v373) in `calc-plumbing.js`, exposing the velocity head the loss tiles
use. The continuity velocity (v372) and Bernoulli total head (v373) follow. A minor-loss `K x h_v` chain, a pitot-to-
velocity inverse, and a compressible dynamic-pressure variant are the deliberate next follow-ons once the trio lands.
