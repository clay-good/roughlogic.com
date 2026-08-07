# roughlogic.com Specification v1204 -- TR-55 Detention Storage Volume (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-07). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v1203.md.
>
> **The gap, and the evidence for it.** The new `tr55-graphical-peak-discharge` (spec-v1203) gives the peak inflow, but
> the number a detention basin is actually sized on is the STORAGE volume that throttles that peak down to the allowable
> release. The NRCS TR-55 Chapter 6 method is the standard preliminary sizing for that and had no tile. The existing
> `stormwater-detention-volume` uses the Modified Rational rectangular-hydrograph assumption -- a different method that
> does not consume the TR-55 CN/peak family this tile completes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive inflow/outflow/runoff/area, an unknown rainfall type, or an
outflow at or above the inflow returns `{ error }`. Citation discipline (v19/v22): NRCS TR-55 (1986) Chapter 6 and
Appendix F by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the figure 6-1 regression
coefficients (Table F-2) and the runoff-volume conversion are published in the public-domain TR-55.

## 2. The tile

### 2.1 `tr55-detention-storage` -- TR-55 Detention Storage Volume

```
r     = qo / qi                                            peak outflow / peak inflow
Vs/Vr = C0 + C1 r + C2 r^2 + C3 r^3                        storage ratio (Table F-2, by rainfall type)
Vr    = 53.33 Q Am                                         runoff volume (acre-ft); Q in inches, Am in mi^2
Vs    = (Vs/Vr) Vr                                         required storage (acre-ft)
```

Table F-2 coefficients: types I and IA share `[0.660, -1.76, 1.96, -0.730]`; types II and III share
`[0.682, -1.43, 1.64, -0.804]`.

**Inputs:** peak inflow `qi_cfs` (cfs, from the graphical-peak-discharge tile), allowable peak outflow `qo_cfs` (cfs),
runoff depth `runoff_in` (in, from the curve-number tile), drainage area `area_mi2` (mi^2), and rainfall distribution
`rainfall_type` (I / IA / II / III).

**Outputs:** required storage `vs_acreft` (and `vs_ft3`), the `vs_vr` and `qo_qi` ratios, and the runoff volume
`vr_acreft`. `qo/qi` outside the chart range (about 0.1 to 0.8) is flagged.

## 3. Worked example (TR-55 example 6-1)

`qi_cfs = 360, qo_cfs = 180, runoff_in = 3.4, area_mi2 = 0.117, rainfall_type = II`:

```
r     = 180 / 360 = 0.5
Vs/Vr = 0.682 - 1.43(0.5) + 1.64(0.5)^2 - 0.804(0.5)^3 = 0.2765
Vr    = 53.33 x 3.4 x 0.117 = 21.21 acre-ft
Vs    = 0.2765 x 21.21 = 5.87 acre-ft                            (TR-55 worksheet 6a: 5.9 acre-ft)
```

## 4. Limitations (TR-55 Chapter 6)

Approximate preliminary sizing for a single-stage outflow structure; the final basin comes from a stage-storage routing
(TR-20 or a reservoir routing). The chart is drawn for `qo/qi` roughly 0.1 to 0.8. The stage that produces `qo` must
match the stage that produces `Vs`, so an outlet re-proportioning may be needed. A design aid; the local drainage manual
and the engineer of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1204` pins the example, the Vs = (Vs/Vr) Vr and Vr = 53.33 Q Am identities, the shared
  type coefficient sets (I=IA, II=III), the qo<qi rule, the out-of-range flag, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (example 6-1 and the type-I cross-check).
- Coefficients transcribed from and checked against the public-domain TR-55 (1986) Appendix F Table F-2.
