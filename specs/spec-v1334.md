# roughlogic.com Specification v1334 -- Toggle Mechanism Clamping Force (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, machine elements / mechanisms), no new module or dependency. Inherits spec.md through spec-v1333.md.
>
> **The gap.** The mechanical-advantage bench has the pulley (`pulley-ma-gen`), the rope (`rope-ma`), and the chain
> hoist (`chain-lever-hoist`) but not the TOGGLE -- the linkage in a hold-down clamp, a knee (toggle) press, a rivet
> squeezer, or an injection-mold clamp, and the one MA mechanism whose advantage diverges at lockup.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive input force, or a toggle angle outside the open interval 0-90 degrees, returns `{ error }`; no numeric
field is ever `Infinity`. Citation discipline (v19/v22): the symmetric toggle-linkage advantage
`F_out = F_in/(2 tan theta)` (standard statics of the toggle joint; Machinery's Handbook), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `toggle-mechanism-force` -- Toggle Mechanism Clamping Force

```
F_out = F_in / (2 tan theta)
MA = 1 / (2 tan theta)
output travel per unit input travel = 2 tan theta = 1 / MA
```

Two equal links meet at a knee driven perpendicular to the output line; `theta` is the angle each link makes with the
straight (lockup) line. As `theta -> 0` the advantage diverges -- a light hand force becomes a large clamp force,
which is why a toggle clamp snaps hard and holds at over-center. The trade-off is the reciprocal: the output moves
only `2 tan theta` per unit of input travel (large force, tiny stroke), and pushing PAST lockup (theta going negative)
releases the clamp. A warning fires below about 2 degrees, where friction, link stiffness, and clearance cap the real
force well short of the runaway ideal.

**Inputs:** input force at the knee F_in (lb), toggle angle from lockup theta (deg).

**Outputs:** output (clamping) force (lb), mechanical advantage, and the output-per-input travel ratio.

## 3. Worked example

`F_in = 50 lb`, `theta = 10 deg`:

```
MA = 1 / (2 tan 10) = 1 / (2 x 0.17633) = 2.836
F_out = 50 x 2.836 = 141.8 lb
output travel per unit input = 2 tan 10 = 0.353
```

Advantage climbs toward lockup: at `theta = 5 deg`, `MA = 5.72` and `F_out = 286 lb`; at `theta = 45 deg`, `MA = 0.5`
exactly (the output is half the input). The advantage and the travel ratio are always reciprocals.

## 4. Scope and non-goals

An ideal frictionless symmetric toggle linkage. Joint friction, link buckling, pin shear, and the detailed
over-center holding geometry are separate; the pulley, rope, and chain-hoist advantages are their own tiles. A design
aid; Machinery's Handbook and the clamp maker govern.
