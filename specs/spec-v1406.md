# roughlogic.com Specification v1406 -- Press-Fit Interference, Pressure, and Assembly Force (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has thermal expansion and bolt preload but nothing for the interference fit, which is how a gear goes on a shaft, a bearing race goes in a housing, and a bushing goes in a bore. The chain from a few thousandths of interference to a contact pressure, to a holding torque, to the press force required is pure Lame theory and none of it is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive shaft diameter, hub outside diameter, interference, elastic modulus, or engagement length, a hub outside diameter at or below the shaft diameter, or a friction coefficient at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the Lame thick-wall interference-fit pressure relation for a solid shaft in a hub of the same material, and the friction-limited holding torque and assembly force that follow, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `press-fit-interference` -- Press-Fit Interference, Pressure, and Assembly Force

```
contact pressure p = (delta / d) x (E / 2) x (D^2 - d^2) / D^2
                     for a solid shaft in a hub of the same material,
                     delta = diametral interference, d = shaft dia, D = hub OD
axial press force  = mu x pi x d x L x p
holding torque     = axial force x d / 2
shrink temperature = delta / (alpha x d) + assembly clearance allowance
```

Interference generates pressure because the hub has to stretch and the shaft has to compress until they agree on a
common diameter. How much pressure depends on how stiff the hub is, which is the `(D^2 - d^2)/D^2` term: a thin
hub gives way easily and generates little pressure no matter how much interference is pressed into it, while a
massive hub approaches the solid-shaft limit. This is why a thin-walled bushing needs proportionally more
interference than a thick one.

Once the pressure is known, everything else is friction. The axial force to press it together is the pressure
acting over the contact area times the coefficient of friction, and the torque the joint will transmit before it
slips is that same friction force acting at the shaft radius. Both scale linearly with engagement length, which is
usually the cheapest design variable available.

**Inputs:** shaft diameter, hub outside diameter, diametral interference, elastic modulus, engagement length,
friction coefficient, and the coefficient of thermal expansion for the shrink-fit temperature.

**Outputs:** contact pressure, hoop stress at the hub bore, axial assembly force, holding torque capacity, and
the temperature difference a shrink or freeze fit would need.

## 3. Worked example

A 2.000 in shaft in a 4.000 in outside diameter steel hub, 0.002 in diametral interference, 2.000 in engagement,
`E = 30,000,000 psi`, `mu = 0.12`:

```
p            = (0.002/2.000) x 15,000,000 x (16 - 4)/16 = 0.001 x 15,000,000 x 0.75 = 11,250 psi
axial force  = 0.12 x pi x 2.000 x 2.000 x 11,250       = 16,965 lb
holding torque = 16,965 x 1.000                          = 16,965 in-lb = 1,414 ft-lb
```

Two thousandths of interference is worth over eight tons of press force and fourteen hundred foot-pounds of
torque -- which is why press fits work and why they are unforgiving. Halve the hub wall by dropping the outside
diameter to 3.000 in and the stiffness term falls from 0.75 to 0.556, so the pressure drops to 8,333 psi and the
capacity falls by a quarter with no change in the interference at all. And the tolerance sensitivity is brutal:
at 0.003 in interference instead of 0.002 the pressure is 16,875 psi and the press force is over twelve tons.
Interference fits are specified to tenths for a reason.

## 4. Scope and non-goals

A solid shaft in a hub of the same material, elastic behavior only, uniform pressure over the contact length.
Different materials require the full two-material Lame form, which this simplification does not use. It does not
check the hub for yielding -- the hoop stress at the bore is roughly twice the contact pressure for a thick hub
and much higher for a thin one, and a hub can be stressed past yield by an interference that looks modest. It
ignores surface finish, which flattens on assembly and reduces effective interference by a real amount, stress
concentration at the hub ends, centrifugal loosening at speed, and the differential thermal growth that can
release the joint in service. Friction coefficients for pressed joints vary by a factor of two. The designer and
the assembly's own test govern.
