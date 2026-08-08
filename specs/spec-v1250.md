# roughlogic.com Specification v1250 -- Fresnel Zone Clearance (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v1249.md.
>
> **The gap.** The RF cluster started by `wireless-fspl` (spec-v1249) needs its line-of-sight companion: whether the
> path is clear enough. No Fresnel-zone calculation existed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive frequency or distance, or a zone number below 1 returns `{ error }`. Citation discipline
(v19/v22): ITU-R P.526 / first-principles Fresnel diffraction, `GOVERNANCE.electrical`. **No table is reproduced.** The
metric `km` label is allowlisted (RF is metric-native), matching spec-v1249.

## 2. The tile

### 2.1 `fresnel-zone-clearance` -- Fresnel Zone Radius and 60% Clearance

```
D  = d1 + d2                                        (km)
r_n(m) = 17.32 sqrt(n d1 d2 / (f_GHz D))            17.32 = sqrt(300)
recommended clearance = 0.6 x r1                    (60% of the FIRST zone)
```

**Inputs:** frequency (GHz), distance from each end to the obstruction d1, d2 (km), zone number (default 1).

**Outputs:** the zone-n radius, the first-zone radius, the 60% clearance, and the total path distance.

## 3. Worked example

`f = 2.4 GHz, d1 = d2 = 2.5 km (obstruction at midspan)`:

```
D  = 5 km
r1 = 17.32 sqrt(2.5 x 2.5 / (2.4 x 5)) = 17.32 x 0.7217 = 12.5 m
60% clearance = 0.6 x 12.5 = 7.5 m
```

Cross-checks: the second zone is sqrt(2) x r1 = 17.68 m; an off-center obstruction (d1 = 1, d2 = 4) has a smaller radius,
and a higher frequency (5.8 GHz) shrinks the zone.

## 4. Scope and non-goals

The 60%-of-first-zone rule governs; higher zones are informational. Earth curvature (bulge = D^2/8k, k ~ 4/3) and
antenna height are added to the clearance budget separately. A planning geometry; the path survey and a link test govern.
