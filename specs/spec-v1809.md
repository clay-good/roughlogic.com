# roughlogic.com Specification v1809 -- Pallet Rack Beam Load and Deflection (`calc-warehouse.js`, Group E Carpentry and Construction, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A rack beam carries two pallets and is almost always sized by how far it sags rather than by how hard it is stressed. The deflection limit is the acceptance criterion, and a beam that passes its stress check by a comfortable margin can still fail it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive span, pallet weight, moment of inertia, section modulus, or yield strength, or a non-positive deflection limit ratio returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the two-point-load beam relations and the rack industry L/180 deflection criterion with ANSI MH16.1 and the rack manufacturer's published capacities named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pallet rack beam capacity`, `rack beam deflection limit`, `storage rack beam span load`, `rmi mh16.1 beam design`, `rack level capacity two pallets`.

## 2. The tile

### 2.1 `pallet-rack-beam-capacity` -- Pallet Rack Beam Load and Deflection

```
the loading      a beam pair carries the pallets on one level; each beam takes
                 half of each pallet, as two point loads near the quarter points
moment           M = P x L / 4 for two equal loads at the quarter points, where P
                 is the load on ONE beam from ONE pallet
stress           f = M / S, checked against the allowable Fy / 1.67 for the
                 beam's steel under allowable stress design
deflection       d = P a (3 L^2 - 4 a^2) / (24 E I), with a = L/4
the limit        L/180 is the rack industry's deflection criterion for beams under
                 design load; it is an ACCEPTANCE limit, not a comfort preference
what governs     on ordinary spans the deflection limit binds first, because
                 deflection grows as the CUBE of span and moment only linearly
capacity rating  a manufacturer's published beam capacity already embeds both
                 checks at the published span
```

Rack beams are deflection-governed and understanding why makes the whole rating system legible. Moment grows
linearly with span while deflection grows with its cube, so lengthening a beam raises the stress modestly and
the sag dramatically. A beam selected on strength alone will be visibly bowed under load long before it is
anywhere near yielding, and the industry's L over 180 limit is what keeps a rack looking and behaving like a
structure.

The limit is not cosmetic even though it looks like it. A sagging beam changes how the pallet sits, tends to
roll the load toward the middle, makes the pallet harder to engage and disengage cleanly with forks, and
loosens the connector at each end where the beam meets the upright. Rack connections are not welded moment
connections; they are hooks in slots, and excessive rotation at the end is what unseats them.

Beam capacity is published per pair, per span, and that is the only form in which it means anything. The same
beam section rated at one span is rated lower at a longer one, and a rack reconfigured to a wider bay -- moved,
respaced, or rebuilt after damage -- has a different capacity even though nothing was replaced. Load plaques
are span-specific for exactly this reason.

**Inputs:** the beam span, the pallet weight and the number of pallets per level, the beam moment of inertia and section modulus, the steel yield strength, and the deflection limit ratio

**Outputs:** the load on each beam, the maximum moment, the bending stress and the allowable stress with the stress ratio, the deflection and the deflection limit, which check governs, and the moment of inertia required to satisfy the deflection limit

## 3. Worked example

A 108 in span carrying two 2,500 lb pallets, on a beam of I = 2.5 in^4 and S = 1.111 in^3:

```
load per beam per pallet = 2,500 / 2 = 1,250 lb
M = 1,250 x 108 / 4 = 33,750 in-lb
f = 33,750 / 1.111 = 30,375 psi
allowable = 55,000 / 1.67 = 32,934 psi
stress ratio = 0.92
```

**The strength check passes at 92% of allowable.** Now the deflection:

```
a = 108/4 = 27 in
d = 1,250 x 27 x (3 x 108^2 - 4 x 27^2) / (24 x 29,000,000 x 2.5)
  = 0.6222 in
limit = L/180 = 108/180 = 0.6000 in
```

**0.622 in against a 0.600 in limit -- the beam FAILS deflection by 4 percent while passing stress with
8 percent to spare.** That is the ordinary result on a rack beam, and it is why beam selection is made
from the manufacturer's capacity tables rather than from a strength calculation.

**Closing it takes a stiffer section, not a stronger one:**

```
I required = 2.5 x 0.6222 / 0.6000 = 2.59 in^4
```

**4 percent more moment of inertia**, which on a rack beam means a deeper section rather than a heavier
one -- depth is what buys stiffness.

**And the span is the variable to watch.** Deflection goes as the CUBE of span while moment goes linearly, so
widening this bay by 12 in to fit a different pallet pattern raises the stress by about
11 percent and the deflection by about 37 percent. **A rack respaced in the field has a
capacity nobody recalculated**, and the load plaque on the end frame is now wrong.

## 4. Scope and non-goals

A screening calculation. Storage racks are engineered structures designed to ANSI MH16.1 and the applicable building code, and a rack installation is designed, sealed, and permitted rather than checked with a beam formula: the standard governs the section properties of cold-formed perforated members, the connection tests that establish beam end connector capacity and stiffness, the load combinations, and the stability of the frame as a whole. The two-point-load idealisation is a simplification -- real pallets deliver load over the stringer bearing area at positions that vary with how the operator places them, and a pallet placed off-centre or on a damaged deck loads the beam differently. It does not evaluate the beam end connector, which is frequently what actually limits a beam and whose capacity comes from testing rather than calculation, the uprights (`rack-upright-capacity-derate`), the anchorage (`rack-base-plate-anchorage`), or the frame's overall stability and bracing. It does not address impact loading from lift trucks, seismic design, or the load plaque and its requirements. ANSI MH16.1 and the applicable building code, the rack manufacturer's published capacities at the installed span, and the rack design engineer govern.
