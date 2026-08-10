# roughlogic.com Specification v1303 -- Flange Coupling Torque Capacity (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, machinist/mechanic), no new module or dependency. Inherits spec.md through spec-v1302.md.
>
> **The gap.** The catalog has `flange-bolt-torque` (the wrench torque to tighten a bolt) and single-bolt shear, but
> nothing for the **torque a rigid flange coupling can transmit** through its bolt circle -- the millwright's check
> when coupling two shafts. The bolts share the torque in shear at the bolt-circle radius; this tile gives the
> capacity and the per-bolt shear load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a bolt count below 2, a non-positive bolt diameter / allowable shear / bolt-circle diameter returns `{ error }`; no
numeric field is ever `Infinity`. Citation discipline (v19/v22): the rigid flange-coupling torque capacity, bolts in
shear at the bolt-circle radius (Machinery's Handbook; Shigley, *Mechanical Engineering Design*), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `flange-coupling-torque` -- Rigid Flange Coupling Torque Capacity

```
Ab = pi/4 d^2                          one-bolt shear area
per-bolt shear = Ab tau_allow          allowable shear force per bolt
R = BCD / 2                            bolt-circle radius
T = n (Ab tau_allow) R                 torque capacity (all bolts share equally)
```

`n` is the number of coupling bolts, `d` the bolt shank (or fitted-bolt body) diameter, `tau_allow` the allowable
bolt shear stress, and `BCD` the bolt-circle diameter. The bolts act in single shear at the bolt-circle radius, so
the capacity scales with the number of bolts, the bolt area, and the radius. Fitted (body-bound) bolts carry the
torque directly in shear; friction-only (clearance) bolts rely on clamp force and are less certain -- this tile is
the shear basis.

**Inputs:** number of bolts n, bolt diameter d (in), allowable bolt shear stress (psi), bolt-circle diameter BCD (in).

**Outputs:** torque capacity (in-lbf and ft-lbf), the shear force per bolt (lbf), and the per-bolt shear area (in^2).

## 3. Worked example

Six 1/2 in fitted bolts on a 5 in bolt circle, allowable shear 10,000 psi:

```
Ab = pi/4 x 0.5^2 = 0.1963 in^2,  per-bolt shear = 0.1963 x 10,000 = 1,963 lbf
R = 5/2 = 2.5 in
T = 6 x 1,963 x 2.5 = 29,450 in-lbf = 2,454 ft-lbf
```

The coupling carries 2,454 ft-lbf before the bolts reach their allowable shear -- add bolts, grow the bolt circle, or
use bigger bolts to raise it. Each bolt sees 1,963 lbf; check that against the flange bearing and the key/shaft as
well, since the weakest link governs.

## 4. Scope and non-goals

The bolt-shear torque capacity of a rigid flange coupling with the bolts sharing the load equally; the flange bearing
stress, the shaft key, hub burst, friction-drive (clamp) capacity, and misalignment (a flexible coupling) are
separate. Use the allowable shear appropriate to the bolt grade and a safety factor. A design aid; Machinery's
Handbook / Shigley and the coupling maker govern.
