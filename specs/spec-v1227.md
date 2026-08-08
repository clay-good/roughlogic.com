# roughlogic.com Specification v1227 -- Cipolletti (Trapezoidal) Weir Flow (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M), no new module, group, or dependency. Inherits spec.md through spec-v1226.md.
>
> **The gap.** Family-completion: the sharp-crested-weir family has the 90-degree V-notch and the rectangular (Francis)
> weir (`weir-flow`, `weir-head-from-flow`); the Cipolletti trapezoidal weir -- the third canonical sharp-crested weir --
> was missing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuardPool`), or a non-positive crest length or head returns `{ error }`. Citation
discipline (v19/v22): the Cipolletti weir discharge per the USBR Water Measurement Manual / King's Handbook of
Hydraulics, by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the 3.367 coefficient is a fixed
published constant (and is user-overridable).

## 2. The tile

### 2.1 `cipolletti-weir` -- Cipolletti (Trapezoidal) Weir Flow

```
Q_cfs = 3.367 x L x H^(3/2)        (crest length L and head H in ft; coefficient editable)
Q_gpm = Q_cfs x 448.831
Q_mgd = Q_gpm x 1440 / 1e6
```

**Inputs:** crest length L (ft), head over crest H (ft), weir coefficient (0 = default 3.367).

**Outputs:** flow in cfs, GPM, and MGD; a low-accuracy flag for head outside ~0.2 ft to L.

## 3. Worked example

`crest_length_ft = 3, head_ft = 0.5`:

```
Q = 3.367 x 3 x 0.5^1.5 = 3.367 x 3 x 0.353553 = 3.571 cfs = 1,603 GPM = 2.31 MGD
```

The rating is linear in the crest length -- a 6 ft crest at the same head passes 7.14 cfs -- because the 1H:4V side
slopes compensate the end-contraction, so the full length is used with no deduction.

## 4. Limitations

Requires a fully-contracted, ventilated, sharp-crested weir with free (non-submerged) flow, the head measured about 4H
upstream, and the approach-velocity correction is ignored. A head below about 0.2 ft or greater than the crest length is
low-accuracy and flagged. An operations aid; the USBR Water Measurement Manual, the weir's calibration, and the operator
of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1227` pins Q = 3.367 L H^1.5, the cfs/GPM/MGD conversions, the linearity in crest length,
  the H^1.5 head scaling, the coefficient override, the low-accuracy flag, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 3 ft example and the doubled-crest linearity
  cross-check).
- Formula checked against the USBR Water Measurement Manual / King's Handbook of Hydraulics.
