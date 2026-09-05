# roughlogic.com Specification v1539 -- Railroad Curve Superelevation and Unbalance (`calc-rail.js`, Group E Carpentry and Construction, railroad track, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Every curve on a railroad is banked, and how much is a balance between the freight that crawls through it and the passenger train that does not. Equilibrium elevation, actual elevation, and the unbalance between them are three numbers that decide the speed limit, and they come off one formula.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive degree of curve or speed, a negative elevation, or an elevation or unbalance beyond the entered regulatory cap returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the equilibrium elevation relation with 49 CFR 213 named for the elevation and unbalance limits, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`track superelevation`, `curve elevation railroad`, `cant deficiency track`, `maximum speed curve rail`, `equilibrium elevation formula`.

## 2. The tile

### 2.1 `track-superelevation` -- Railroad Curve Superelevation and Unbalance

```
equilibrium elevation   E_eq = 0.0007 x D x V^2        (inches, degrees of curve, mph)
unbalance               E_u = E_eq - E_actual
max speed               V_max = sqrt( (E_a + E_u,allow) / (0.0007 D) )
FRA limits              actual elevation commonly capped at 6 in; unbalance at 3 in
                        (higher unbalance only with specific approval and equipment)
```

Equilibrium elevation is the bank at which the resultant force sits square in the track and nothing is pushing
sideways on either rail. Below it the train leans out and loads the high rail; above it, at low speed, it leans
in and loads the low rail. Freight railroads deliberately underelevate for exactly that reason -- a curve elevated
for 60 mph is punishing for a coal drag moving at 20, and the low-rail wear and the risk of a slow train
stringlining are real.

That is why the operating rule is written on UNBALANCE rather than on elevation. Actual elevation is set for the
mixed traffic that uses the curve, and the maximum speed is whatever that elevation plus the allowed unbalance
supports. Raising the elevation to permit a faster passenger train makes the slow freight worse, and the limits
on both are what keep that trade inside safe bounds.

The field version of this is the two-question form: what is the maximum speed for this curve as elevated, and
what elevation would this curve need for a target speed.

**Inputs:** degree of curve (or radius), speed, actual superelevation, the allowable unbalance, and the maximum permitted actual elevation

**Outputs:** the equilibrium elevation for the entered speed, the unbalance at the actual elevation, the maximum speed for the actual elevation and allowable unbalance, the elevation required for a target speed, and a flag when either regulatory cap is exceeded

## 3. Worked example

A 4 degree curve with 4 in of actual elevation, 3 in of allowable unbalance:

```
V_max = sqrt( (4 + 3) / (0.0007 x 4) ) = sqrt( 7 / 0.0028 ) = 50.0 mph
```

50 mph. At that speed the equilibrium elevation would be
`0.0007 x 4 x 50.0^2` = 7.0 in, and the track has 4, so the train runs 3 in
underbalanced -- exactly at the limit.

Now the slow freight through the same curve at 25 mph:

```
E_eq at 25 mph = 0.0007 x 4 x 625 = 1.75 in
```

The curve needs 1.75 in and has 4, so the freight is running 2.25 in OVER-elevated and
leaning onto the low rail. That is the compromise: raise the elevation to 6 in and the passenger limit goes to
57 mph while the freight's over-elevation grows to 4.25 in.

## 4. Scope and non-goals

The classic elevation relation for a circular curve at steady speed. It does not design a curve: spiral
transition length, which is what allows elevation to be run in and out and which usually governs whether a given
elevation is achievable at all, is a separate calculation (`spiral-curve`), and elevation cannot be applied
without adequate spirals. It does not evaluate rail wear, gauge widening, lubrication, or the curving performance
of specific equipment, and the allowable unbalance for high-speed or tilting passenger equipment differs from
freight and requires specific approval. It does not address the vertical curve, the combination of curvature with
grade, or the special rules for curves in yards and on turnouts. The FRA Track Safety Standards at 49 CFR 213,
the railroad's own engineering instructions and timetable special instructions, and the track owner govern.
