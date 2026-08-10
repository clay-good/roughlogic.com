# roughlogic.com Specification v1302 -- Impact Load Factor (Energy Method) (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/rigging), no new module or dependency. Inherits spec.md through spec-v1301.md.
>
> **The gap.** The catalog has fall-arrest clearance and an arborist rope-shock tile, but no general **impact
> factor** for a dropped or suddenly applied load -- the energy-method number that says a load released onto a member
> hits far harder than its dead weight (a snatched crane load, a dropped skid, a shock-loaded sling). Even a load
> applied with zero drop lands with twice its static force. This adds the factor, force, and deflection.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive weight, a negative drop height, or a non-positive static deflection returns `{ error }`; no numeric
field is ever `Infinity`. Citation discipline (v19/v22): the energy-method impact factor
`n = 1 + sqrt(1 + 2h/delta_st)` (Roark's Formulas for Stress and Strain; standard mechanics of materials), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `impact-load-factor` -- Impact Load Factor (Falling / Suddenly Applied Load)

```
n = 1 + sqrt(1 + 2 h / delta_st)       impact (amplification) factor
impact force = n W
impact deflection = n delta_st
```

`W` is the falling weight, `h` the free-fall drop height before it engages the member, and `delta_st` the static
deflection the member would show under `W` applied slowly (`W/k` for stiffness `k`). The factor is the price of
suddenness: at `h = 0` (a load let go while just touching) it is 2, and it climbs with the square root of the drop
divided by how much the catch gives. A stiff catch (tiny `delta_st`) makes even a small drop brutal, which is why a
little rope stretch or a shock absorber tames a snatch load.

**Inputs:** falling weight W (lb), drop height h (in), static deflection under the load delta_st (in).

**Outputs:** impact factor (x static), peak impact force (lbf), and peak impact deflection (in).

## 3. Worked example

A 1,000 lb load dropped 2 in onto a member that would deflect 0.10 in under the load applied gently:

```
n = 1 + sqrt(1 + 2 x 2 / 0.10) = 1 + sqrt(41) = 7.40
impact force = 7.40 x 1000 = 7,400 lbf
impact deflection = 7.40 x 0.10 = 0.74 in
```

A 1,000 lb load hits with 7,400 lbf after only a 2 in drop onto a fairly stiff catch. Let the same load down with no
drop and the factor is still 2 -- 2,000 lbf -- the reason a load must never be dropped onto a slack sling or a rigid
stop, and why a shock-absorbing lanyard or a bit of rope stretch (a larger delta_st) sharply cuts the peak.

## 4. Scope and non-goals

The elastic energy-method impact factor for a load dropped onto a linear (spring-like) member with no energy loss;
plastic deformation, damping, the member's own mass, repeated (fatigue) impact, and rope/sling dynamics
(`tree-rigging-shock`) are separate. Assumes all the drop energy goes into elastic strain. A design aid; Roark and
the engineer of record govern.
