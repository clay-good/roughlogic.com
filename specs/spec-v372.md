# roughlogic.com Specification v372 -- Flow Continuity Velocity at a Size Change (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.130.0). Batch spec-v371..v373 (the fluid-mechanics fundamentals trio -- velocity
> head (v371), the continuity velocity at a size change (this spec), the Bernoulli total head (v373)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pipe-velocity` gives the velocity in one pipe size,
> but when a line changes diameter -- through a reducer, a nozzle, an orifice, a pump suction taper -- the velocity changes
> by continuity, `A1 V1 = A2 V2`. That velocity jump is what makes a reducer a high-velocity (and high-loss, erosion, and
> cavitation) point, and no tile computes it. Adds one tile to the existing **`calc-plumbing.js`** module (Group B); no new
> group, trade, or dependency. Inherits spec.md through spec-v371.md.
>
> **The gap, and the evidence for it.** Conservation of mass for an incompressible flow gives `A1 V1 = A2 V2`, so the
> velocity at a new diameter is `V2 = V1 (D1/D2)^2` -- it scales with the square of the diameter ratio. For water at 6 ft/s
> in a 4 in line reduced to 2 in, `V2 = 6 x (4/2)^2 = 24 ft/s` -- four times the velocity, well past the erosion limit and a
> classic cavitation/noise source at a reducer. Reduce only to 3 in and `V2 = 6 x (4/3)^2 = 10.7 ft/s`, a more modest jump.
> The same flow, wildly different velocities depending on where the pipe pinches -- the reason a reducer's downstream size
> is a velocity decision, not just a fitting choice. `pipe-velocity` sizes one section; this tile follows the velocity
> through the size change.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The velocities are speeds
(ft/s); the diameters (or areas) are lengths (in) / areas; the volumetric flow (optional) is a volumetric flow (gpm or
cfs). The v18/v21 contract: any non-finite input, or a velocity or diameter at or below zero, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the continuity equation by name; `editionNote` names **the continuity
`A1 V1 = A2 V2`, the round-pipe form `V2 = V1 (D1/D2)^2`, the constant volumetric flow `Q = A V` across the change, and the
incompressible-flow assumption, from the standard fluid-mechanics references**, and states that **this returns the velocity
at a changed diameter -- it assumes incompressible, steady flow (a gas at high velocity/pressure ratio compresses, changing
the relation), uses the round-pipe diameter ratio, and does not compute the pressure change at the reducer (`bernoulli-head`)
or the reducer's minor loss; and this is an engineering aid** -- the flow condition governs.

## 2. The tile

### 2.1 `flow-continuity` -- Flow Continuity Velocity at a Size Change

```
inputs:
  V1_fps    ft/s   upstream velocity
  D1_in     in     upstream diameter
  D2_in     in     downstream diameter

V2 = V1_fps * (D1_in / D2_in)^2                    ; downstream velocity, ft/s
(Q constant: Q = (pi/4) D1^2 V1 = (pi/4) D2^2 V2)
```

**Pinned worked example (water at 6 ft/s, 4 in reduced to 2 in).** `V2 = 6 x (4/2)^2 = 6 x 4 = 24 ft/s` -- a four-fold jump
past the erosion limit. **Cross-check (reduce only to 3 in).** `V2 = 6 x (4/3)^2 = 6 x 1.78 = 10.7 ft/s` -- a far gentler
increase, the reason the downstream size is chosen to hold velocity in an acceptable band. Expanding instead (2 in to 4 in
at 24 ft/s) drops the velocity back to 6 ft/s, converting the velocity head to pressure. The non-finite and non-positive
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","hvac","fire"]`, matching `pipe-velocity`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the continuity equation, `editionNote` naming `A1 V1 = A2 V2`,
`V2 = V1 (D1/D2)^2`, the constant `Q`, and the incompressible, round-pipe, not-pressure caveats);
`test/fixtures/worked-examples.json` (the 4-to-2 example + the 4-to-3 cross-check); `test/fixtures/compute-map.js`
(`flow-continuity` -> `computeFlowContinuity` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (->
`pipe-velocity` / `velocity-head` / `bernoulli-head` / `reducer-offset`); `data/search/aliases.json` ("continuity
equation", "A1V1 A2V2", "velocity at reducer", "flow continuity", "pipe size velocity change", "conservation of mass flow",
"velocity diameter ratio", "reducer velocity", "nozzle velocity"); the id appended to the existing plumbing renderers block
in `app.js`; the `// dims:` annotation (velocities speed, diameters length); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `(D1/D2)^2` scaling, the constant-`Q` identity, and the
non-positive / non-finite error seams. No new module; re-pin `calc-plumbing.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the diameter-ratio assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `V2` output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (6 ft/s, 4->2 in -> 24 ft/s).

## 5. Roadmap position

Middle of the fluid-mechanics fundamentals trio (v371..v373) in `calc-plumbing.js`, following the velocity through a size
change. The Bernoulli total head (v373) follows. A reducer minor-loss chain from the velocity jump, a compressible-flow
variant, and a `Q`-to-both-velocities mode are the deliberate next follow-ons once the trio lands.
