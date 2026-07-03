# roughlogic.com Specification v310 -- Surcharge Lateral Pressure on a Wall from a Line Load (Boussinesq, NAVFAC DM-7) (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v308..v310 (the geotechnical depth-2 trio -- consolidation
> (v308), eccentric footing pressure (v309), the surcharge lateral pressure (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `lateral-earth-pressure` adds a uniform surcharge as
> a constant `Ka q` over the wall, but a concentrated surface load -- a footing, a wheel line, a crane outrigger set back
> from a wall -- produces a non-uniform lateral pressure that peaks at a depth set by the load's setback, and the catalog
> has no such tile. Adds one tile to the existing **`calc-geotech.js`** module (Group E); no new group, trade, or
> dependency. Inherits spec.md through spec-v309.md.
>
> **The gap, and the evidence for it.** For a line load `qL` (force per unit length, parallel to the wall) at a horizontal
> setback `x` from a rigid wall of height `H`, the NAVFAC DM-7.2 modified-Boussinesq lateral pressure at depth `z`
> (with `m = x/H`, `n = z/H`) is `sigma_h = (0.203 qL/H) n/(0.16 + n^2)^2` for `m <= 0.4`, and
> `sigma_h = (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2` for `m > 0.4` -- the doubled-Boussinesq form for an unyielding wall. For a
> 1,000 lb/ft line load set 4 ft back from a 10 ft wall (`m = 0.4`), the pressure at `z = 3 ft` (`n = 0.3`) is about
> `97 psf`, and it peaks at a shallow depth then tails off -- a bulge of pressure the uniform `Ka q` surcharge in
> `lateral-earth-pressure` never captures, and the load case that decides the wall's moment near mid-height. The uniform
> tile spreads the surcharge; this tile concentrates it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The line load `qL` is a force
per length (lb/ft); the wall height `H`, setback `x`, and depth `z` are lengths (ft); the ratios `m = x/H`, `n = z/H` are
dimensionless; the lateral pressure `sigma_h` is a pressure (psf). The v18/v21 contract: any non-finite input, or a load,
height, or setback at or below zero, returns `{ error }`; the depth `z` runs `0 <= z <= H`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the Boussinesq/NAVFAC surcharge equations by name; `editionNote` names **the NAVFAC DM-7.2
modified-Boussinesq line-load lateral pressure `sigma_h = (0.203 qL/H) n/(0.16 + n^2)^2` for `m <= 0.4` and
`sigma_h = (1.28 qL/H)(m^2 n)/(m^2 + n^2)^2` for `m > 0.4`, the doubling of the elastic Boussinesq solution for an
unyielding (non-deflecting) rigid wall, and `m = x/H`, `n = z/H`**, and states that **this returns the lateral pressure at
a single depth from a line load parallel to the wall -- it uses the rigid-wall (doubled) form (a flexible wall that can
deflect sees roughly the un-doubled Boussinesq value), covers a line load (a point or strip load uses the companion NAVFAC
forms), and does not integrate the resultant thrust and its point of application over the wall height (a follow-on) or add
the at-rest/active earth pressure beneath it (`lateral-earth-pressure`); and this is a design aid, not a substitute for a
geotechnical engineer's report** -- the geotechnical engineer of record's report governs.

## 2. The tile

### 2.1 `boussinesq-surcharge-wall` -- Surcharge Lateral Pressure on a Wall from a Line Load

```
inputs:
  qL_plf   lb/ft   line load intensity (parallel to the wall)
  H_ft     ft      wall height
  x_ft     ft      horizontal setback of the load from the wall
  z_ft     ft      depth at which to evaluate the pressure

m = x_ft / H_ft ; n = z_ft / H_ft
sigma_h = (m <= 0.4)
        ? (0.203 * qL_plf / H_ft) * n / (0.16 + n^2)^2
        : (1.28  * qL_plf / H_ft) * (m^2 * n) / (m^2 + n^2)^2     ; psf
```

**Pinned worked example (a 1,000 lb/ft line load, 4 ft back from a 10 ft wall, at 3 ft depth).** `qL = 1,000`, `H = 10`,
`x = 4` (`m = 0.4`), `z = 3` (`n = 0.3`): the `m <= 0.4` branch,
`sigma_h = (0.203 x 1,000/10) x 0.3/(0.16 + 0.09)^2 = 20.3 x 0.3/0.0625 = 97.4 psf`. **Cross-check (continuity across the
branch, and moving the load back).** Just past `m = 0.4` the `m > 0.4` branch gives `98.3 psf` -- the two forms agree at the
boundary, confirming the constants. Set the load farther back at `x = 6 ft` (`m = 0.6`):
`sigma_h = (1.28 x 1,000/10)(0.36 x 0.3)/(0.36 + 0.09)^2 = 128 x 0.108/0.2025 = 68.3 psf` -- a load set farther from the
wall pushes less, and the peak sinks deeper. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching `lateral-earth-pressure`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NAVFAC/Boussinesq surcharge equations,
`editionNote` naming both `m`-branch forms, the rigid-wall doubling, `m = x/H`, `n = z/H`, and the line-load, single-depth,
no-resultant caveats); `test/fixtures/worked-examples.json` (the `m = 0.4` example + the `m = 0.6` cross-check);
`test/fixtures/compute-map.js` (`boussinesq-surcharge-wall` -> `computeBoussinesqSurchargeWall` in
`../../calc-geotech.js`); `scripts/related-tiles.mjs` (-> `lateral-earth-pressure` / `retaining-wall-stability` /
`footing-eccentric-pressure` / `soil-bearing-capacity`); `data/search/aliases.json` ("surcharge lateral pressure",
"Boussinesq wall", "line load on wall", "NAVFAC DM-7 surcharge", "wall pressure from footing", "point load lateral
pressure", "crane outrigger wall", "rigid wall surcharge", "lateral pressure setback"); the id appended to the existing
geotech renderers block in `app.js`; the `// dims:` annotation (`qL` force/length, lengths length, `m`/`n` dimensionless,
`sigma_h` pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
branch continuity at `m = 0.4`, the load-setback behavior, and the non-positive / non-finite error seams. No new module;
re-pin `calc-geotech.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the branch-continuity assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `m` / `n` / `sigma_h` stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (1,000 plf at m 0.4, z 3 -> 97.4 psf).

## 5. Roadmap position

Closes the geotechnical depth-2 batch (v308..v310) in `calc-geotech.js`: consolidation, eccentric footing pressure, and the
concentrated surcharge now stand beside the elastic settlement, bearing, and uniform earth-pressure tiles. The point-load
and strip-load NAVFAC forms, the integrated surcharge thrust and its point of application, and a flexible-wall (un-doubled)
toggle are the deliberate next follow-ons once the trio lands. With this batch the geotechnical cluster spans bearing,
settlement (elastic and consolidation), deep foundations, slopes, walls, footing pressure, and surcharge.
