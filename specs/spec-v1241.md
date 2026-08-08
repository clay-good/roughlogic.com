# roughlogic.com Specification v1241 -- Broad-Crested Weir Discharge (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v1240.md.
>
> **The gap.** Family-completion: the sharp-crested weirs (V-notch, rectangular in `weir-flow`; trapezoidal in
> `cipolletti-weir`) are covered, but the broad-crested (critical-flow) weir was missing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
non-finite inputs, a non-positive crest length or head, or a discharge coefficient outside (0, 1] return `{ error }`.
Citation discipline (v19/v22): first-principles critical-flow hydraulics and the USBR Water Measurement Manual,
`GOVERNANCE.general`. **No table is reproduced** -- the critical-flow coefficient is a constant and Cd is editable.

## 2. The tile

### 2.1 `broad-crested-weir` -- Broad-Crested (Critical-Flow) Weir Discharge

```
K  = (2/3)^1.5 sqrt(g) = 3.0888   (ft units, g = 32.2 ft/s^2)  -- the theoretical critical-flow coefficient
Q  = Cd K L H^1.5                   Cd ~ 0.85-0.95, effective coefficient Cd K ~ 2.6-2.9
1 cfs = 448.831 GPM;  MGD = GPM x 1440 / 1e6
```

**Inputs:** crest length L across the channel (ft), head over the crest H (ft), discharge coefficient Cd (0 = default 0.90).

**Outputs:** the effective coefficient (Cd x 3.089) and the flow in cfs / GPM / MGD.

## 3. Worked example

`L = 10 ft, H = 1 ft, Cd = 0.90`:

```
K = (2/3)^1.5 sqrt(32.2) = 3.0888
Q = 0.90 x 3.0888 x 10 x 1^1.5 = 27.8 cfs   (12,477 GPM)
effective coefficient = 0.90 x 3.0888 = 2.78   (below the 3.33 sharp-crested value)
```

Cross-check: the flow scales as H^1.5, so 2 ft of head passes 0.90 x 3.0888 x 10 x 2^1.5 = 78.6 cfs (2^1.5 = 2.83x).

## 4. Scope and non-goals

This is the free-flow (modular) rating with critical depth on the crest; heavy downstream submergence reduces it and
the approach-velocity head is neglected. The broad-crested coefficient is intentionally below the 3.33 of a sharp-crested
Francis weir. An operations aid; the USBR Water Measurement Manual, the weir's calibration, and the engineer of record
govern.
