# roughlogic.com Specification v1024 -- Pipe Insulation for Condensation Control (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`**
> (Group C), no new module, group, or dependency. Inherits spec.md through spec-v1023.md.
>
> **The gap, and the evidence for it.** `insulation-thickness` solves the HOT-pipe case to a USER-ENTERED
> surface limit -- it never computes what the limit should be. `wall-condensation-gradient` and
> `surface-condensation-risk` compare a surface to the dew point but for flat walls in restoration work.
> Nothing sizes the wall of a COLD line so it does not sweat, which is the single most common insulation
> question on chilled-water and refrigerant suction lines. Discovery: "a thickness-so-the-pipe-clears-the-
> ambient-dew-point tile is a real seam."

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-finite inputs,
RH outside (0, 100), ambient at or below the pipe, or a physically infeasible near-saturation case returns
`{ error }`. NO new physics constants: the dew point comes from the catalog's pinned psychrometric functions
(`saturationVaporPressure_hPa`, `dewPointFromVaporPressure_C` in pure-math.js) and the film coefficient
default (1.65 BTU/hr-ft^2-F, still air) is the SAME public reference value the landed `insulation-thickness`
sibling has used since its landing. Renderer: hand-written non-exported (this module's convention).

## 2. The tile

### 2.1 `pipe-insulation-for-condensation` -- Pipe Insulation for Condensation Control (Cold Lines)

```
inputs:  pipe_od_in, pipe_temp_F (default 40), ambient_F (default 75), ambient_rh_pct (default 50,
         exclusive (0,100)), k_btu_in_per_hr_ft2_F (default 0.27, from the material data sheet),
         outside_film_coeff_btu_hr_ft2_F (default 1.65, still air)
compute: Tdp = dew point of the ambient air (repo psychrometrics)
         pipe at/above Tdp -> thickness 0, no_risk flag (a bare pipe cannot reach saturation)
         else solve the outer-surface energy balance at the minimum wall, where the jacket sits
         EXACTLY at the dew point:
           h (2 pi r2/12)(Tamb - Tdp) = 2 pi k (Tdp - Tpipe)/ln(r2/r1)
         LHS grows with r2, RHS shrinks -> unique root, bisection; near-saturation cases where even
         a 60-in wall cannot balance return { error } instead of a silly number
outputs: dew_point_F, thickness_in, r2_in, no_risk, note
```

**Worked example (pinned).** 1-in OD chilled line at 40 F in 75 F / 50% RH air: dew point 55.1 F,
minimum thickness 0.92 in -- matching the ~1-in walls manufacturer condensation tables give for these
conditions, and the note says what the table footnotes say: round UP to the next stock wall, and use the
design-day RH, because a jacket at the dew point is on the edge of sweating all day.

## 3. Scope limits

Minimum-thickness sizing only -- energy optimization is `insulation-thickness` (hot) and the heat-loss
tiles. Still air; an intact vapor retarder is assumed (a torn jacket condenses INSIDE the insulation
instead, which no thickness fixes). Horizontal-pipe film coefficient; severe cases (RH near saturation)
error out rather than extrapolate. Manufacturer condensation tables and the mechanical code govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5 (hand renderer, non-exported -> no corpus row for the
renderer; the exported compute gets dims + corpus + fuzzer rows). Fuzzer pins the worked example, the
energy-balance back-substitution at the root, thickness monotonicity in RH and in pipe coldness, the
no-risk seam (pipe above dew point), the dew-point cross-check against the pure-math functions called
directly, and the near-saturation error seam.
