# roughlogic.com Specification v1549 -- Railcar Clearance Plate and Dynamic Envelope (`calc-rail.js`, Group J Trucking and Logistics, rail logistics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group J, Trucking and Logistics -- the existing category, hub `/groups/trucking/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A car that fits on tangent track does not fit in a curve, because a long car swings out at its middle and in at its ends. That mid-ordinate swing is what a clearance check has to add to the car's own width, and forgetting it is how a load clears the plate on paper and hits the bridge.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive curve radius, car length, or width, or a degree of curve at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the mid-ordinate swing relation with the AAR clearance plates and carrier clearance authority named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`railcar clearance curve`, `mid ordinate car swing`, `dynamic envelope railcar`, `aar plate clearance`, `dimensional load routing rail`.

## 2. The tile

### 2.1 `clearance-plate-envelope` -- Railcar Clearance Plate and Dynamic Envelope

```
mid-ordinate swing  M = L^2 / (8 R)        (car centre swings TOWARD the inside of the curve)
end overhang        E = swing of the corners toward the OUTSIDE
curve radius        R = 5,729.58 / D
effective width     car width + 2 x the applicable swing at the height checked
plate               AAR Plate B, C, E, F etc define the tangent-track envelope
```

A long rigid car on a curve is a chord across an arc. Its centre sits inside the arc by the mid-ordinate of its
truck-centre span, and its corners swing outside it. Both matter and they matter in opposite directions: the
middle of the car is the problem on the inside of a curve, near a platform or a signal, and the ends are the
problem on the outside, near a structure or an adjacent track.

The swing grows with the SQUARE of the length between truck centres, so an 89 ft car swings nearly four times as
far as a 45 ft one on the same curve. That is why long cars, multi-level autoracks, and long flat loads have
routing restrictions that ordinary boxcars do not, and why a dimensional load moves on an approved route rather
than any route.

The tile's job in the field is a fast go or no-go: given the car, the curve, and the measured distance to the
obstruction, does it fit -- and if not, by how much. That last number is what decides whether the answer is a
different route, a different car, or a shift of the load on the deck.

**Inputs:** distance between truck centres, total car length, car or load width, degree of curve or radius, the measured clearance to the obstruction, and the applicable AAR plate

**Outputs:** the mid-ordinate swing at the car centre, the end overhang, the effective width on the curve, the remaining clearance to the obstruction, a fits or does not fit verdict, and the sharpest curve the load can negotiate at a stated clearance

## 3. Worked example

An 89 ft car (truck centres 73 ft) on a 4 degree curve (R = 1,146 ft):

```
R              = 5,729.58 / 4          = 1,146 ft
mid-ordinate   = 73^2 / (8 x 1,146)    = 0.581 ft = 7.0 in
```

The centre of the car swings about 7.0 in toward the inside of the curve. A load that measures
10 ft 6 in wide effectively occupies 10 ft 6 in plus 7.0 in on that side, so a structure
measured at 11 ft 0 in from track centre on tangent leaves
`132 - 63 - 7.0` = 62.0 in of clearance in the curve -- less than five
inches.

Length is the lever. A 45 ft car with 30 ft truck centres on the same curve swings
`30^2 / (8 x 1,146)` = 1.18 in -- about a fifth as much. The long car is restricted and the short one
is not, on identical track.

## 4. Scope and non-goals

A geometric swing calculation for a rigid car body on a circular curve. It does not evaluate the AAR clearance
plates themselves, which define the tangent-track envelope and which must be checked separately, and it does not
account for superelevation, which tilts the car and moves its upper corners outward on the low side by an amount
that grows with height above rail. It does not model suspension roll, lateral play in the trucks, or wheel and
track wear tolerances, all of which add to the swept envelope and which a formal clearance study includes. It
does not address vertical clearance, which is a separate check, or clearance on spirals and reverse curves where
the geometry is transient. Dimensional and high-wide loads move under a carrier-issued clearance authority and an
approved route: the AAR clearance plates and loading rules, the serving carriers' clearance departments, and the
track owner govern.
