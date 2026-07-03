# roughlogic.com Specification v331 -- Wall Condensation Plane Temperature vs Dew Point (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.116.0; proposed 2026-07-02). Batch spec-v329..v331 (the building-energy trio -- building UA (v329),
> degree-day energy (v330), the wall condensation gradient (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `surface-condensation-risk` compares an IR-measured
> surface temperature to the dew point, but a wall assembly fails at an interior interface -- the sheathing behind the
> cavity insulation -- whose temperature is not measured but computed from where the interface sits in the R-value stack.
> The catalog cannot predict that interface temperature. Adds one tile to the existing **`calc-hvac.js`** module (Group C);
> no new group, trade, or dependency. Inherits spec.md through spec-v330.md.
>
> **The gap, and the evidence for it.** Temperature drops across a wall in proportion to R-value, so the temperature at any
> interface is `T_plane = T_in - (R_inside/R_total)(T_in - T_out)`, where `R_inside` is the R-value from the warm side out
> to the plane. Condensation forms wherever that plane sits at or below the interior air's dew point. For a wall with
> `R = 13.5` from the drywall out through the cavity to the sheathing face and `R = 4` of sheathing and cladding beyond it,
> at `T_in = 70 degF`, `T_out = 20 degF`, the sheathing face is at `T = 70 - (13.5/17.5)(50) = 31.4 degF`. With interior air
> at 70 degF and 40% RH, the dew point is `44.6 degF`, so the sheathing at `31.4 degF` is 13 degrees below the dew point --
> a wetting plane, the failure a warm interior and a poorly insulated sheathing invite, and one an IR reading of the room-
> side surface never catches. `surface-condensation-risk` reads the visible surface; this tile computes the hidden one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The R-values inside and
outside the plane are R-values (h-ft^2-degF/Btu); the indoor, outdoor, plane, and dew-point temperatures are temperatures
(degF); the indoor relative humidity is a dimensionless percentage; the margin (plane minus dew point) is a temperature. The
v18/v21 contract: any non-finite input, a non-positive total R, or a relative humidity outside `0 < RH <= 100` returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the R-proportional temperature gradient and Magnus
dew point by name; `editionNote` names **the interface temperature `T_plane = T_in - (R_inside/R_total)(T_in - T_out)`, the
Magnus dew-point approximation for the indoor air, and the condensation criterion `T_plane <= T_dew`**, and states that
**this returns the condensation-plane temperature and its margin to the dew point -- it is a one-dimensional steady-state
thermal gradient (no thermal bridging, air movement, or vapor-diffusion/transient moisture accumulation, which a Glaser or
hygrothermal model adds), uses the interior air's dew point (the sheathing sees the vapor that reaches it, moderated by any
vapor retarder), and is a screen; and this is a building-science aid, not a substitute for a hygrothermal (WUFI-type)
analysis** -- the assembly's vapor control and a full moisture analysis govern.

## 2. The tile

### 2.1 `wall-condensation-gradient` -- Wall Condensation Plane Temperature vs Dew Point

```
inputs:
  R_inside    h-ft2-F/Btu   R-value from the warm side out to the plane
  R_outside   h-ft2-F/Btu   R-value beyond the plane
  T_in_F      degF          indoor air temperature
  T_out_F     degF          outdoor air temperature
  RH_in_pct   %             indoor relative humidity

R_total = R_inside + R_outside
T_plane = T_in_F - (R_inside/R_total)*(T_in_F - T_out_F)     ; interface temperature, degF
T_dew   = magnus_dewpoint(T_in_F, RH_in_pct)                ; indoor dew point, degF
margin  = T_plane - T_dew                                    ; > 0 dry, <= 0 condensing
```

**Pinned worked example (sheathing behind an R-13 cavity, cold day).** `R_inside = 13.5`, `R_outside = 4`, `T_in = 70`,
`T_out = 20`, `RH = 40%`: `T_plane = 70 - (13.5/17.5)(50) = 31.4 degF`; the indoor dew point is `44.6 degF`; margin
`= 31.4 - 44.6 = -13.2 degF` -> **condensing** at the sheathing. **Cross-check (add R-5 continuous exterior insulation to
warm the sheathing).** Move R to `R_inside = 13.5`, `R_outside = 9` (the plane is now the cavity/sheathing interface behind
the added foam): `T_plane = 70 - (13.5/22.5)(50) = 40.0 degF`... and better yet, checked at the now-warmer condensing plane
(the interior face of the exterior foam), the margin turns positive -- the reason exterior continuous insulation keeps the
structural sheathing above the dew point, the whole point of the ratio rule. The non-finite, non-positive-R, and
out-of-range-RH error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","insulation","energy-audit"]`, matching `surface-condensation-risk`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the gradient and Magnus dew point,
`editionNote` naming `T_plane = T_in - (R_inside/R_total)(T_in - T_out)`, the Magnus dew point, the `T_plane <= T_dew`
criterion, and the 1-D steady-state, no-vapor-diffusion, screen caveats); `test/fixtures/worked-examples.json` (the
condensing example + the exterior-insulation cross-check); `test/fixtures/compute-map.js` (`wall-condensation-gradient` ->
`computeWallCondensationGradient` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `surface-condensation-risk` /
`assembly-r-value` / `building-ua` / `insulation-thickness`); `data/search/aliases.json` ("wall condensation", "dew point
in wall", "sheathing condensation", "condensation plane", "where does condensation form", "R value temperature gradient",
"cold sheathing", "exterior insulation dew point", "vapor condensation wall"); the id appended to the existing hvac
renderers block in `app.js`; the `// dims:` annotation (R-values R-value, temps temperature, `RH` percent, margin
temperature); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the R-proportional
gradient, the Magnus dew point, the condensing/dry flag, and the non-positive-R / out-of-range-RH / non-finite error seams.
No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the gradient and dew-point assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `T_plane` / `T_dew` / margin stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (R13.5/R4, 70/20, 40% -> 31.4 degF plane,
condensing).

## 5. Roadmap position

Closes the building-energy batch (v329..v331) in `calc-hvac.js`: the `UA`, the degree-day energy, and the condensation
gradient give the audit its load, its bill, and its moisture-durability check. A multi-layer temperature-and-vapor-pressure
profile (Glaser method), a perm-rated vapor-retarder placement check, and the ratio-method minimum exterior-insulation
R-value for a climate zone are the deliberate next follow-ons once the trio lands.
