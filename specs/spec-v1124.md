# roughlogic.com Specification v1124 -- Seismic Overturning Stability Ratio (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1123.md.
>
> **The gap, self-declared.** `seismic-overturning-moment` ends: *"The resisting dead load, the
> foundation stability ratio, and the shear-wall hold-downs are separate checks."* This is the first two.
> Found by re-running the self-declared-gap grep over `tools-data.js` rather than from a candidate list.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
moment, dead load, or required ratio, neither a footprint width nor a lever arm, or SDS outside 0-3
return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `seismic-overturning-stability` -- Seismic Overturning Stability Ratio at the Foundation

```
inputs:  overturning_moment_kipft (strength level), dead_load_kip, footprint_width_ft,
         arm_override_ft, sds, design_method (lrfd|asd), apply_soil_reduction, required_ratio
compute: dead coefficient = 0.9 - 0.2 SDS        LRFD combination 7, Ev acting UP
                          = 0.6 - 0.7 x 0.2 SDS  the ASD 0.6D + 0.7E pair
         W_eff  = coefficient x D;   arm = footprint/2 unless entered
         resist = W_eff x arm
         demand = M0 x (0.7 if ASD) x (0.75 if the 12.13.4 reduction is taken)
         ratio  = resist / demand;  eccentricity = demand / W_eff vs B/6 and B/2
outputs: seismic_factor, gravity_coeff, ev_coeff, dead_coeff, w_eff_kip, arm_ft,
         m_resist_kipft, m_demand_kipft, ratio, passes, eccentricity_ft, kern_ft,
         in_kern, uplift, note
```

**The dead load that resists is not D.** The same vertical acceleration that pushes the building sideways
also lifts it, and ASCE 7 carries that as `Ev = 0.2 SDS D` acting **upward** in the uplift combination.
At SDS = 1.0 the usable gravity is 0.70 D, not 0.90 -- a 22% cut. Leaving Ev out is the classic way an
overturning check passes on paper and should not, so the tile prints the subtraction rather than just the
result.

**A passing ratio can still hide uplift.** The worked example clears global stability at **1.55**, and yet
the resultant sits 6.45 ft off the center of a 20-ft base against a B/6 kern of 3.33 ft -- part of the
footing has already lifted and the toe pressure is higher than any uniform check would show. The ratio
alone does not reveal that, which is why the eccentricity sits beside it.

**Verification, and one honest composition.** The LRFD `(0.9 - 0.2 SDS)` form was confirmed against two
independent sources. The ASD form was **not** found stated as a single coefficient, so it is *composed*
here from two separately confirmed pieces -- the `0.6D + 0.7E` combination and the 0.7 factor ASD applies
to seismic, which also scales Ev. The note prints that arithmetic (`0.7 x 0.2 x SDS`) so a user can audit
it against their own edition instead of trusting a memorized 0.14. The second fixture pins that ASD and
LRFD give genuinely *different* answers (1.454 vs 1.549), because reporting one as the other is the error
worth catching.

**A second unreachable guard removed.** As in spec-v1123, the first draft errored when the effective dead
coefficient went non-positive. The SDS <= 3 bound caps Ev at 0.6 (LRFD) and 0.42 (ASD), below the 0.9 and
0.6 gravity coefficients, so it cannot happen. The guard is gone, the reasoning is a comment, and the
fuzzer checks positivity at the bound itself.

## 3. Scope

Global stability and resultant location only. Sliding, soil bearing under the concentrated toe pressure,
the hold-down forces themselves, and pile or tiedown capacity are separate checks with their own tiles.
The 12.13.4 reduction applies at the **soil-structure interface only** -- carrying it up into the shear
wall, its chords, or its hold-downs is a real and common error, and both the note and the citation say so.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `seismic-overturning-moment` (which now
links forward), `shearwall-overturning`, `soil-bearing-capacity`, and `footing-eccentric-pressure`. Fuzzer
pins both fixtures, the Ev subtraction across six SDS values in both methods, the bare 0.9/0.6 at SDS = 0,
that ASD and LRFD differ, that the 12.13.4 reduction scales the demand by exactly 0.75 and nothing else,
the `ratio = arm / eccentricity` identity, monotonicity in dead load and in demand, the kern and off-base
seams, arm-override equivalence, a **chained** check that feeding `computeSeismicOverturningMoment`'s base
moment reproduces that tile's own reduced moment exactly, and every error seam.
