# roughlogic.com Specification v1203 -- TR-55 Graphical Peak Discharge (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-07). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v1202.md.
>
> **The gap, and the evidence for it.** The new `curve-number-runoff` (spec-v1201) gives the runoff DEPTH and
> `tr55-time-of-concentration` (spec-v1200) the timing, but neither gives the PEAK flow rate a culvert or storm sewer is
> sized on. The only peak-flow tile, `stormwater-rational` (Q = C i A), is a different empirical method the TR-55 CN
> family does not feed. The NRCS TR-55 Chapter 4 Graphical Peak Discharge method is the standard that ties Tc and the CN
> runoff into a peak, and it had no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the hydrology
tiles already in this module. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive Tc, a curve
number at or below 40 (the method's own floor) or above 100, a non-positive rainfall or area, or a negative pond
percentage returns `{ error }`. Citation discipline (v19/v22): NRCS TR-55 (1986) Chapter 4 and Appendix F by name,
`GOVERNANCE.general`. **No copyrighted table is reproduced** -- TR-55 is a public-domain USDA/NRCS document; the
Appendix F Table F-1 regression coefficients and the Table 4-2 pond/swamp factors are published in it, and the curve
number, rainfall, area, and rainfall distribution are the user's own inputs.

## 2. The tile

### 2.1 `tr55-graphical-peak-discharge` -- TR-55 Graphical Peak Discharge

```
S   = 1000 / CN - 10                                   potential maximum retention (in)
Ia  = 0.2 S                                            initial abstraction (in)
Q   = (P - Ia)^2 / (P - Ia + S)   for P > Ia           runoff depth (in);  else Q = 0
Ia/P                                                   clamped to the exhibit range 0.1 - 0.5
qu  = 10^(C0 + C1 log10(Tc) + C2 (log10 Tc)^2)         unit peak discharge (csm/in), Tc clamped 0.1 - 10 hr
                                                       C0/C1/C2 from Table F-1 by rainfall type and Ia/P (interpolated)
Fp  from Table 4-2 by percent pond/swamp area          1.00 at 0%, 0.87 at 1%, 0.75 at 3%, 0.72 at 5%
qp  = qu Am Q Fp                                        peak discharge (cfs)
```

**Inputs:** time of concentration `tc_hr` (hr), curve number `curve_number`, 24-hour design rainfall `rainfall_in`
(in), drainage area `area_mi2` (mi^2), rainfall distribution `rainfall_type` (I / IA / II / III), and pond/swamp area
`pond_pct` (percent of the watershed, default 0).

**Outputs:** peak discharge `qp_cfs`, unit peak discharge `qu_csm_in`, runoff depth `runoff_in`, `ia_over_p` (with the
clamped value and a flag when out of range), and the pond factor `fp`.

**Method.** The unit peak discharge is read from the TR-55 Appendix F regression rather than the exhibit graphs. For a
computed `Ia/P` between two tabulated values, `qu` is evaluated at each bracketing `Ia/P` row and interpolated linearly,
matching TR-55 software practice. `Fp` is linearly interpolated across the Table 4-2 breakpoints and held at 0.72 above
5%.

## 3. Worked example (TR-55 example 4-1, Heavenly Acres, Dyer County TN)

`tc_hr = 1.53, curve_number = 75, rainfall_in = 6.0, area_mi2 = 0.39, rainfall_type = II, pond_pct = 0`:

```
S    = 1000/75 - 10 = 3.333 in
Ia   = 0.667 in                        Ia/P = 0.667 / 6 = 0.111
Q    = (6 - 0.667)^2 / (6 - 0.667 + 3.333) = 3.282 in
qu   = interpolate type-II Ia/P 0.10 (271.7) and 0.30 (222.0) at 0.111 -> 268.9 csm/in   (exhibit 4-II reads 270)
Fp   = 1.00
qp   = 268.9 x 0.39 x 3.282 x 1.0 = 344 cfs                                               (TR-55 worksheet 4: 345 cfs)
```

## 4. Limitations (TR-55 Chapter 4)

Peak discharge only -- no hydrograph (use the tabular hydrograph method or TR-20); one hydrologically homogeneous
watershed with a single CN and one main channel (or branches of nearly equal Tc); no valley or reservoir routing; `Fp`
applies only to ponds/swamps not in the Tc flow path; CN must exceed 40; accuracy falls off outside the tabulated Ia/P
range, so the limiting values are used. A design aid; the local drainage manual and the engineer of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1203` pins the example, the qp = qu Am Q Fp identity, the Table 4-2 pond factor, the
  Ia/P and Tc clamps, the CN>40 floor, the sub-Ia zero-runoff branch, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (example 4-1 and the 3% pond cross-check).
- Coefficients transcribed from and checked against the public-domain TR-55 (1986) Appendix F Table F-1 and Table 4-2.
