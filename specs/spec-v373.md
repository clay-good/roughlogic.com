# roughlogic.com Specification v373 -- Bernoulli Total Head (Pressure + Velocity + Elevation) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.130.0). Batch spec-v371..v373 (the fluid-mechanics fundamentals trio -- velocity
> head (v371), continuity velocity (v372), the Bernoulli total head (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pump-tdh` sums the heads of a pumping system, but the
> underlying Bernoulli energy equation -- total head as the sum of pressure, velocity, and elevation head, and how it
> converts between forms along a streamline -- has no tile. It is the principle behind why pressure rises where a pipe
> widens and falls where it narrows, the intuition every plumber and fitter uses without the numbers. Adds one tile to the
> existing **`calc-plumbing.js`** module (Group B); no new group, trade, or dependency. Inherits spec.md through
> spec-v372.md.
>
> **The gap, and the evidence for it.** Along a streamline of an ideal incompressible flow, the total head is conserved:
> `H = P/gamma + V^2/(2 g) + z` -- pressure head plus velocity head plus elevation head. For water at 30 psi, 6 ft/s, 10 ft
> of elevation, `H = (30 x 144)/62.4 + 36/64.4 + 10 = 69.23 + 0.56 + 10 = 79.79 ft`. Because `H` is conserved (ideal), when
> the pipe widens and the velocity drops, the velocity head converts to pressure head -- the reason a pressure gauge reads
> higher on the large side of a diffuser. Adding a head-loss term makes it the real energy equation `pump-tdh` builds on.
> The pump tile sums a system's heads; this tile shows the energy balance behind them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pressure `P` is a pressure
(psi, converted to lb/ft^2); the specific weight `gamma` is a force per volume (lb/ft^3); the velocity `V` is a speed
(ft/s); the elevation `z` and all head terms are lengths (ft). The v18/v21 contract: any non-finite input, or a specific
weight at or below zero, returns `{ error }`; a two-point mode solves for an unknown at point 2 given the total head and the
other two terms (plus an optional head loss). Citation discipline (v19/v22): `GOVERNANCE.general` over the Bernoulli
equation by name; `editionNote` names **the Bernoulli total head `H = P/gamma + V^2/(2 g) + z` (each term a length), the
conservation of `H` along a streamline for ideal incompressible flow, the energy-equation extension `H1 = H2 + h_loss` (and
`+ h_pump`), and water's `gamma = 62.4 lb/ft^3`, from the standard fluid-mechanics references**, and states that **this
returns the total head and its components (and solves point 2 from point 1) -- it is the ideal (frictionless) form unless a
head loss is entered, applies along a single streamline of an incompressible flow, and does not itself compute the friction
loss (`friction-loss`) or the pump head (`pump-tdh`); and this is an engineering aid** -- the flow condition governs.

## 2. The tile

### 2.1 `bernoulli-head` -- Bernoulli Total Head

```
inputs:
  P_psi     psi        gauge pressure at the point
  V_fps     ft/s       velocity
  z_ft      ft         elevation
  gamma     lb/ft^3    fluid specific weight (default 62.4 water)
  (point-2 mode) known point-1 total head + point-2 two terms + optional h_loss

h_press = P_psi*144 / gamma                        ; pressure head, ft
h_vel   = V_fps^2 / (2*32.2)                        ; velocity head, ft
H = h_press + h_vel + z_ft                          ; total head, ft
(two-point: H1 = H2 + h_loss)
```

**Pinned worked example (water at 30 psi, 6 ft/s, 10 ft elevation).** `h_press = 30 x 144/62.4 = 69.23 ft`;
`h_vel = 36/64.4 = 0.56 ft`; `H = 69.23 + 0.56 + 10 = 79.79 ft`. **Cross-check (the same energy where the pipe widens and
the velocity drops to 2 ft/s at the same elevation).** With `H` conserved (ideal) at 79.79 ft and `z = 10`, the new velocity
head is `4/64.4 = 0.06 ft`, so the pressure head rises to `79.79 - 0.06 - 10 = 69.73 ft = 30.2 psi` -- the velocity head
that was lost converted to pressure, the Venturi/diffuser effect the equation predicts. The non-finite and non-positive
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","hvac","fire"]`, matching `pump-tdh`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the Bernoulli equation, `editionNote` naming
`H = P/gamma + V^2/(2g) + z`, the conservation and energy-equation extension, the water specific weight, and the ideal-flow,
single-streamline, not-friction caveats); `test/fixtures/worked-examples.json` (the total-head example + the Venturi
cross-check); `test/fixtures/compute-map.js` (`bernoulli-head` -> `computeBernoulliHead` in `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (-> `pump-tdh` / `velocity-head` / `flow-continuity` / `npsh-a`);
`data/search/aliases.json` ("Bernoulli equation", "total head", "pressure velocity elevation head", "energy equation
fluid", "Bernoulli head", "P over gamma plus V squared over 2g", "Venturi pressure", "streamline energy", "head
conservation"); the id appended to the existing plumbing renderers block in `app.js`; the `// dims:` annotation (`P`
pressure, `V` speed, `z`/heads length, `gamma` fluid property); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the three head components, the two-point conservation with head loss,
and the non-positive / non-finite error seams. No new module; re-pin `calc-plumbing.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the conservation assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `h_press` / `h_vel` / `z` / `H`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (30 psi, 6 ft/s, 10 ft -> 79.79 ft).

## 5. Roadmap position

Closes the fluid-mechanics fundamentals trio (v371..v373) in `calc-plumbing.js`: velocity head, continuity, and the
Bernoulli total head now stand beside the Reynolds, orifice, Froude, and pump tiles from the earlier fluid batches. A
full two-point energy equation with friction and pump head, a Venturi/pitot flow-measurement mode, and a compressible-flow
variant are the deliberate next follow-ons once the trio lands. With this trio the plumbing fluid-mechanics cluster spans
regime, energy, continuity, discharge, and channel flow.
