# roughlogic.com Specification v388 -- Thrust Block Bearing Area at a Pipe Bend (AWWA M41) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the water-system hydraulics trio (v387 friction factor -> v388 thrust
> block -> v389 hydrant available flow). A buried pressurized pipe pushes outward at every bend; this tile computes that
> unbalanced thrust and the concrete bearing area a thrust block needs to hold it against the soil.**
> In-scope catalog expansion under the spec-v106 trades-only charter. At a bend in a pressurized main, the internal pressure
> no longer balances end to end and produces an unbalanced thrust `T = 2 * P * A * sin(theta/2)`, where `A` is the pipe
> cross-sectional area (on the outside diameter) and `theta` the bend angle. A concrete thrust block spreads that thrust
> into undisturbed soil over a bearing area `Ab = T / Sb`, with `Sb` the allowable soil bearing. Nothing in the catalog
> computes pipe thrust or block area. This adds the thrust-block tile to the existing **`calc-plumbing.js`** module
> (Group B); no new group, trade, or dependency. Inherits spec.md through spec-v387.md.
>
> **The gap, and the evidence for it.** An `8 in` main (OD `8.625 in`, area `58.4 in^2`) at `100 psi` on a `90 deg` bend
> develops `T = 2 * 100 * 58.4 * sin(45 deg) = 8,263 lb`; on `2,000 psf` allowable soil that needs
> `Ab = 8263 / 2000 = 4.13 ft^2` of block bearing face. Change the bend to `45 deg` and the thrust drops to
> `2 * 100 * 58.4 * sin(22.5 deg) = 4,472 lb` -- the same pressure, roughly half the thrust, because the pipe turns less. No
> tile does this; a fitter sizing a block had no way to check it against the soil.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The internal pressure `P` and
the allowable soil bearing `Sb` are pressures (`P` in psi, `Sb` in psf); the pipe outside diameter is a length (in); the
bend angle is an angle (deg, handled dimensionlessly per the v14 no-`angle`-base rule); the thrust is a force (lb); the
bearing area is an area (ft^2). The v18/v21 contract: any non-finite input, or a non-positive pressure, diameter, angle, or
soil bearing, returns `{ error }`; the pipe area uses the outside diameter (the conservative AWWA convention), and the tile
reports both the thrust and the required bearing area. Citation discipline (v19/v22): `GOVERNANCE.general` over pipe thrust
restraint by name; `editionNote` names **AWWA M41 / DIPRA thrust restraint, the bend thrust `T = 2*P*A*sin(theta/2)` with
`A` on the outside diameter, the block bearing area `Ab = T / Sb`, and `Sb` the allowable soil bearing value**, and states
that **this returns the unbalanced thrust and the concrete-block bearing face for a horizontal bend, that dead-ends and tees
use `T = P*A` (a separate case), that soil bearing must come from a geotechnical value with a safety factor, and that it is
a design aid, not a substitute for the engineer of record or a restrained-joint design**.

## 2. The tile

### 2.1 `thrust-block-sizing` -- Thrust Block Bearing Area at a Pipe Bend (AWWA M41)

```
inputs:
  pressure_psi   psi   internal pressure (test or surge governs)
  od_in          in    pipe outside diameter
  bend_deg       deg   bend angle
  soil_bearing_psf  psf  allowable soil bearing

area_in2 = (pi/4) * od_in^2
thrust_lb = 2 * pressure_psi * area_in2 * sin(bend_deg/2)
bearing_area_ft2 = thrust_lb / soil_bearing_psf
```

**Pinned worked example (8 in main, 100 psi, 90 deg bend, 2000 psf soil).** `A = 58.4 in^2`;
`T = 2*100*58.4*sin(45 deg) = 8,263 lb`; `Ab = 8263/2000 = 4.13 ft^2`. **Cross-check (a gentler bend).** A `45 deg` bend at
the same pressure gives `T = 2*100*58.4*sin(22.5 deg) = 4,472 lb`, roughly half -- the `sin(theta/2)` term. A non-positive
pressure, diameter, angle, or soil bearing takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "pipefitting"]`, beside the buried-pipe tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, AWWA M41 thrust restraint, `editionNote` naming
`T = 2*P*A*sin(theta/2)`, the OD-area convention, `Ab = T/Sb`, and the dead-end/tee note); `test/fixtures/worked-examples.json`
(the 90-degree example + the 45-degree cross-check); `test/fixtures/compute-map.js` (`thrust-block-sizing` ->
`computeThrustBlockSizing` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `pipe-expansion-loop` /
`water-hammer-surge` / `colebrook-friction-factor` / `hydrant-available-flow`); `data/search/aliases.json` ("thrust block",
"pipe thrust", "thrust restraint", "thrust block sizing", "AWWA thrust", "bearing area bend", "buried pipe thrust", "bend
reaction force", "concrete thrust block"); the id appended to the existing plumbing renderers block in `app.js`; the
`// dims:` annotation (pressures pressure, OD length, thrust force, area area); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `sin(theta/2)` relation, and the non-positive / non-finite error
seams. No new module; re-pin `calc-plumbing.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the thrust / bearing-area pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (8 in, 100 psi, 90 deg -> 8263 lb, 4.13 ft^2).

## 5. Roadmap position

The middle of the water-system hydraulics trio: `colebrook-friction-factor` (v387) sizes the head loss that sets the
pressure, and `hydrant-available-flow` (v389) reads what the main delivers. A dead-end/tee thrust case (`T = P*A`) and a
restrained-joint length alternative to a concrete block are the deliberate next follow-ons.
