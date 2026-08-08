# roughlogic.com Specification v1240 -- Sluice-Gate (Underflow) Free-Flow Discharge (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v1239.md.
>
> **The gap.** Family-completion: the open-channel-control set has the overflow weir (`weir-flow`, `cipolletti-weir`)
> and the submerged orifice (`orifice-flow`) but not the underflow gate -- the third canonical canal-control structure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite inputs, a non-positive opening/width/depth, a gate opening at or above the upstream depth, or a contraction
coefficient outside (0, 1] return `{ error }`. Citation discipline (v19/v22): first-principles open-channel hydraulics
(Henderson, Open Channel Flow) and the USBR Water Measurement Manual, `GOVERNANCE.general`. **No table is reproduced**
-- the contraction coefficient (~0.61) is a published constant the user may override with a site calibration.

## 2. The tile

### 2.1 `sluice-gate-flow` -- Sluice-Gate (Underflow) Free-Flow Discharge

```
Cd = Cc / sqrt(1 + Cc a / y1)        Cc ~ 0.61 (sharp-edged vertical gate)
Q  = Cd b a sqrt(2 g y1)             g = 32.2 ft/s^2
1 cfs = 448.831 GPM;  MGD = GPM x 1440 / 1e6
```

**Inputs:** gate opening a (ft), gate width b (ft), upstream depth above the floor y1 (ft), contraction coefficient Cc
(0 = default 0.61).

**Outputs:** the discharge coefficient Cd and the flow in cfs / GPM / MGD.

## 3. Worked example

`a = 1 ft, b = 5 ft, y1 = 6 ft, Cc = 0.61`:

```
Cd = 0.61 / sqrt(1 + 0.61 x 1/6) = 0.5812
Q  = 0.5812 x 5 x 1 x sqrt(2 x 32.2 x 6) = 57.1 cfs   (25,638 GPM, 36.9 MGD)
```

Cross-check: at a 0.2 ft opening under the same 6 ft head, Cd = 0.6039 -- closer to the 0.61 contraction coefficient
because the a/y1 term shrinks.

## 4. Scope and non-goals

This is the FREE-flow rating: the downstream tailwater must be low enough that the contracted jet is not drowned
(submerged flow reduces the discharge and needs a separate energy balance). y1 is the upstream depth above the channel
floor, not the head on the opening. An operations aid; the USBR Water Measurement Manual, the gate's calibration, and the
operator of record govern.
