# roughlogic.com Specification v305 -- Pipe Flow Reynolds Number and Regime (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v305..v307 (the pump-and-fluid fundamentals trio -- the pieces
> the friction and pump tiles use internally but never expose: the Reynolds number and laminar/turbulent regime (this spec),
> the hydronic system flow from load and delta-T (v306), and the pump specific speed and impeller type (v307).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog computes friction loss (`friction-loss`,
> `duct-friction-static`) but the friction factor and every flow-regime decision behind it hinge on the Reynolds number,
> which no tile computes on its own -- the dimensionless ratio a tech reaches for to know whether a line is laminar or
> turbulent, whether the oil returns, whether the heat transfer is developed. Adds one tile to the existing
> **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v304.md.
>
> **The gap, and the evidence for it.** The Reynolds number `Re = V D / nu` (velocity times diameter over kinematic
> viscosity) sorts pipe flow into laminar (`Re < 2,300`), transitional (`2,300 <= Re <= 4,000`), and turbulent (`Re > 4,000`).
> For 60 degF water (`nu = 1.21e-5 ft^2/s`) at 6 ft/s in a 2 in line, `Re = 6 x (2/12) / 1.21e-5 = 82,600` -- firmly
> turbulent, as nearly all trade piping is, which is why the Hazen-Williams and Colebrook forms the friction tiles use apply.
> Slow the same water to 0.02 ft/s and `Re = 275`, laminar, where the friction factor becomes simply `64/Re` and the loss
> drops off a different curve. The friction tiles assume the regime; this tile tells you which one you are in.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The velocity `V` is a speed
(ft/s); the inside diameter `D` is a length (entered in inches, converted to ft); the kinematic viscosity `nu` is an area
per time (ft^2/s); the Reynolds number `Re` is dimensionless; the regime is a categorical label. The v18/v21 contract: any
non-finite input, or a velocity, diameter, or viscosity at or below zero, returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the Reynolds-number definition by name; `editionNote` names **the Reynolds number
`Re = V D / nu` (= `rho V D / mu`), the pipe-flow transition bands (laminar below ~2,300, turbulent above ~4,000, transitional
between), and a 60 degF water kinematic viscosity of about `1.21e-5 ft^2/s` (1.13 centistokes)**, and states that **this
returns the Reynolds number and regime for full pipe flow -- it uses the entered kinematic viscosity (temperature- and
fluid-dependent; provide the value for the fluid and temperature at hand), assumes a circular full pipe, and does not itself
compute the friction factor or head loss (`friction-loss`, `duct-friction-static`); and this is an engineering aid** -- the
fluid property data at the operating condition govern.

## 2. The tile

### 2.1 `reynolds-number-pipe` -- Pipe Flow Reynolds Number and Regime

```
inputs:
  V_fps    ft/s     mean flow velocity
  D_in     in       inside diameter
  nu       ft^2/s   kinematic viscosity (default 1.21e-5, 60 degF water)

Re = V_fps * (D_in/12) / nu
regime = Re < 2300 ? "laminar" : Re <= 4000 ? "transitional" : "turbulent"
```

**Pinned worked example (60 degF water, 6 ft/s, 2 in line).** `V = 6`, `D = 2`, `nu = 1.21e-5`:
`Re = 6 x (2/12) / 1.21e-5 = 1.0 / 1.21e-5 = 82,600` -> **turbulent**, the regime nearly all trade piping runs in.
**Cross-check (nearly still water in the same line).** `V = 0.02 ft/s`: `Re = 0.02 x 0.1667 / 1.21e-5 = 275` -> **laminar**,
where `f = 64/Re` and the loss is linear in velocity, not squared -- the reason a barely-moving line behaves nothing like a
flowing one. The non-finite and non-positive error paths bracket the result, and the regime crosses at 2,300 and 4,000.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","plumbing"]`, matching the fluid tiles); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`GOVERNANCE.general`, the Reynolds-number definition, `editionNote` naming `Re = V D / nu`, the
transition bands, the water viscosity value, and the entered-viscosity, full-pipe, not-friction-factor caveats);
`test/fixtures/worked-examples.json` (the turbulent example + the laminar cross-check); `test/fixtures/compute-map.js`
(`reynolds-number-pipe` -> `computeReynoldsNumberPipe` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (->
`friction-loss` / `pipe-velocity` / `refrigerant-velocity` / `duct-friction-static`); `data/search/aliases.json`
("Reynolds number", "laminar turbulent", "flow regime pipe", "Re pipe", "kinematic viscosity", "transition Reynolds",
"is my flow turbulent", "VD over nu", "pipe flow regime"); the id appended to the existing hvac renderers block in
`app.js`; the `// dims:` annotation (`V` speed, `D` length, `nu` area/time, `Re` dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the 2,300/4,000 regime boundaries, and the non-positive /
non-finite error seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the regime-boundary assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Re` / regime pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (6 fps, 2 in -> Re 82,600 turbulent).

## 5. Roadmap position

Opens the pump-and-fluid fundamentals batch (v305..v307) in `calc-hvac.js`, exposing the Reynolds number the friction tiles
use implicitly. The hydronic flow from load and delta-T (v306) and pump specific speed (v307) follow. A built-in friction
factor from Colebrook/Swamee-Jain at the computed `Re`, a viscosity library by fluid and temperature, and the entrance-length
(developed-flow) check are the deliberate next follow-ons once the trio lands.
