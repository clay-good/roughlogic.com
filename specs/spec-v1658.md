# roughlogic.com Specification v1658 -- Elevator Guide Rail Bracket Spacing and Load (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Guide rails take the horizontal loads from an unbalanced car, from safety application, and from seismic events, and they span between brackets like any beam. The bracket spacing is what makes the rail stiff enough, and it is set by the loads rather than by the building's floor spacing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rail section modulus, span, or load, or a deflection limit at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the beam relations for guide rails with ASME A17.1 named as governing load cases and allowables, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`elevator guide rail bracket spacing`, `rail deflection limit`, `guide rail span beam`, `safety application rail load`, `seismic guide rail elevator`.

## 2. The tile

### 2.1 `guide-rail-bracket-span` -- Elevator Guide Rail Bracket Spacing and Load

```
rail as a beam    the rail spans between brackets; moment and deflection from the
                  horizontal load at the guide shoes
loads             eccentric loading of the car, safety application (the largest), wind or
                  stack pressure on the car, and seismic
deflection limit  the code limits rail deflection under load; commonly a small fraction
                  of an inch
bracket spacing   reducing the span reduces moment as the square and deflection as the
                  fourth power
building tie      brackets attach to the structure, so the spacing available is constrained
                  by where structure exists
seismic           in higher seismic zones the required rail section and bracket spacing
                  increase substantially
```

Rail bracket spacing behaves like any beam problem and the fourth power on deflection is what makes it
tractable. Halving the span cuts the moment to a quarter and the deflection to a sixteenth, so a rail that is
marginal on deflection is usually fixed by adding a bracket rather than by upsizing the rail -- which matters
because rails are a long-lead item and brackets are not.

The governing load is safety application, not normal operation. When the car safeties set, they clamp the rails
and transmit a large force, and the rail and its brackets have to take it without permanent deformation. Normal
eccentric loading -- a heavy load in one corner of the car -- is a much smaller number that governs the deflection
limit rather than the strength.

Seismic is the case that changes everything in higher-hazard regions. The code's seismic provisions require
larger rail sections, closer brackets, retainer plates, and additional devices, and a rail arrangement designed
for a low-seismic building is not adequate when the same design is used elsewhere. That is a common source of
trouble on repeat-design buildings.

**Inputs:** rail section modulus and moment of inertia, the bracket spacing, the horizontal load at the guide shoes for each load case, the allowable stress and deflection, and the seismic design category

**Outputs:** the bending moment and stress in the rail at the entered span, the deflection under each load case, both against their limits, the maximum bracket spacing that satisfies the deflection limit, and the spacing required under the safety-application case

## 3. Worked example

A rail spanning 14 ft between brackets, carrying a 900 lb horizontal load at midspan from eccentric car
loading:

```
moment     = P L / 4 = 900 x 14 x 12 / 4 = 37,800 in-lb
```

The stress follows from the rail's section modulus and the deflection from its moment of inertia. If the
deflection comes out at 0.32 in against a 0.25 in limit, the rail fails on stiffness.

**The fix is a bracket, not a bigger rail.** Adding one bracket to halve the span to 7 ft:

```
moment     falls to 1/4  -> 9,450 in-lb
deflection falls to 1/16 -> 0.020 in
```

Deflection goes from 0.32 in to 0.020 in from one bracket, because deflection scales with the fourth power of
span. Upsizing the rail to achieve the same improvement would require sixteen times the moment of inertia, which
is several sizes and a very different rail.

The load case that actually governs: safety application transmits a far larger horizontal force than eccentric
loading, and the rail and bracket must take it without permanent deformation. A rail arrangement checked only for
normal operating loads is checked for the wrong case.

And in a higher seismic design category, the required section and spacing both tighten, along with retainer
plates and additional bracing -- so a rail layout carried over from a low-seismic project is not transferable.

## 4. Scope and non-goals

A beam calculation for a single span. Guide rail design is governed by ASME A17.1, which specifies the load
cases, the allowable stresses and deflections, the rail sections and their properties, and the bracket and
fastening requirements -- and its provisions, not a general beam calculation, determine acceptability. It does not
determine the horizontal loads, which depend on the car and counterweight geometry, the loading condition, the
safety type and its application force, and the seismic design category. It does not evaluate the bracket itself,
its fastening to the building structure, or the structure's capacity to accept the load, all of which are
separate checks and are frequently the weak element. It does not address rail joints, alignment tolerances, or
the rail's function as part of the safety system. Elevator equipment is life-safety: ASME A17.1 and A17.2, the
equipment manufacturer, the elevator authority having jurisdiction, and a licensed elevator mechanic govern.
