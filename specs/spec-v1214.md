# roughlogic.com Specification v1214 -- Approximate Fundamental Period Ta (ASCE 7 §12.8.2.1) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1213.md.
>
> **The gap, and the evidence for it.** `computeSeismicBaseShear`, `computeSeismicVerticalDistribution`, and
> `computeSeismicOverturningMoment` all destructure `period_s` as a required input, and the base-shear tile labels the
> field "Fundamental period Ta (s)". No tile computed it -- `period_s` is never a return key. Needed-input gap.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a system not in the set, a non-positive height, or a negative SD1 returns
`{ error }`. Citation discipline (v19/v22): ASCE 7 §12.8.2.1 with Tables 12.8-2 and 12.8-1, by name,
`GOVERNANCE.general`. **No copyrighted table is reproduced** -- the Ct/x set (4 pairs) and the Cu factor are small
published constants, and the height and SD1 are the user's own inputs.

## 2. The tile

### 2.1 `seismic-approximate-period` -- Approximate Fundamental Period Ta (ASCE 7 §12.8.2.1)

```
Ta = Ct hn^x                          (Eq. 12.8-7; hn = structural height base to roof, ft)
Cu Ta = Cu x Ta                       (upper limit on a computed period, when SD1 is given)
```

Table 12.8-2 (Ct/x): steel MRF 0.028/0.8; concrete MRF 0.016/0.9; steel EBF/BRBF 0.03/0.75; other 0.02/0.75.
Table 12.8-1 (Cu, piecewise linear): SD1 <= 0.1 -> 1.7; 0.15 -> 1.6; 0.2 -> 1.5; 0.3 -> 1.4; >= 0.4 -> 1.4.

**Inputs:** structural system (select), structural height `hn_ft`, and SD1 (optional, for the Cu Ta cap).

**Outputs:** `ta_s`, the Ct/x used, and (when SD1 > 0) Cu and `cu_ta_s`.

## 3. Worked example

`system = steel_mrf, hn_ft = 120, sd1 = 0.6`:

```
Ta = 0.028 x 120^0.8 = 0.028 x 46.06 = 1.29 s
SD1 0.6 >= 0.4 -> Cu = 1.4;  Cu Ta = 1.81 s
```

A 48 ft all-other-system building gives Ta = 0.02 x 48^0.75 = 0.36 s. Feed Ta into the seismic-base-shear tile as the
period.

## 4. Limitations

Ta is conservative (a shorter period lands higher on the design spectrum, so a larger Cs). A period from a rational
(modal or Rayleigh) analysis may be used but not more than Cu Ta. The moment-frame Ct/x apply only where the frame
resists 100% of the seismic force and is not enclosed by more rigid components. A design aid, not a substitute for a
licensed engineer's design.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1214` pins Ta = Ct hn^x, each system's coefficients, the Cu interpolation, the Cu Ta cap,
  the height trend, the feed into the base-shear tile, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the steel-MRF example with the cap and the
  all-other-system cross-check).
- Formula checked against ASCE 7 §12.8.2.1 and Tables 12.8-1/12.8-2.
