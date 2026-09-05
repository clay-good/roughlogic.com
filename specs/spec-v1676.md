# roughlogic.com Specification v1676 -- Pipe Insulation Jacketing and Fitting Cover Quantity (`calc-hvacsystems.js`, Group C HVAC, mechanical insulation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; mechanical insulation), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Straight pipe jacketing is a length times a circumference, and fittings are counted by piece -- and on a real system the fittings are most of the labour and a large share of the material. An estimate built on linear feet alone is short by whatever the fittings cost.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pipe diameter, insulation thickness, or run length, or a negative fitting count returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the jacket area and fitting count method with the project specification and MICA standards named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pipe jacketing quantity`, `insulation fitting cover count`, `metal jacket square feet`, `removable valve cover insulation`, `insulation takeoff fittings`.

## 2. The tile

### 2.1 `jacketing-fitting-quantity` -- Pipe Insulation Jacketing and Fitting Cover Quantity

```
straight jacket   area = pi x (pipe OD + 2 x insulation thickness) x length
                  add overlap for the longitudinal and circumferential seams
fitting covers    counted by piece and size: 90s, 45s, tees, reducers, valves, flanges
elbow equivalent  a fitting cover costs several feet of straight jacket in material
                  and considerably more in labour
valves and flanges  removable covers, which cost more again and are frequently omitted
                  from estimates and then required by the specification
labour ratio      fittings routinely take several times the labour per unit area
                  that straight runs do
```

The material arithmetic is easy and the estimate still comes out low, because a piping system's fittings are
dense in exactly the places that matter -- at equipment, in mechanical rooms, at every branch -- and each one is a
separate piece of work with its own layout, cutting, and banding. A run with a fitting every ten feet is a very
different job from a straight run of the same length, and a per-foot price that averages the two is wrong for
both.

Valve and flange covers are the line most often missed. Specifications commonly require removable, reusable
covers at valves and flanges so the joint can be broken for maintenance without destroying insulation, and those
covers are fabricated items costing far more than the equivalent area of straight jacket. An estimate that treats
a valve as a few feet of pipe understates it by a multiple.

The oversizing detail that catches people: jacketing wraps the OUTSIDE of the insulation, so its circumference is
the pipe OD plus twice the insulation thickness -- and on small pipe with thick insulation that is a much larger
circumference than the pipe's. A 2 in line with 2 in of insulation needs jacket for a 6 in circumference, three
times the pipe's own.

**Inputs:** pipe size and insulation thickness, straight run length, the count of each fitting type and size, the seam overlap allowance, the jacket material and gauge, and the labour rates for straight and fitting work

**Outputs:** the jacket area for the straight runs including overlap, the fitting cover count by type and size, the equivalent area the fittings represent, the total material, and the labour split between straight and fitting work

## 3. Worked example

A 4 in line (4.5 in OD) with 2 in insulation, 240 ft of straight run, plus 14 ninety-degree elbows, 4 tees, and
6 valves:

```
jacket OD        = 4.5 + 2 x 2 = 8.5 in
circumference    = pi x 8.5 / 12 = 2.23 ft
straight area    = 2.23 x 240 = 534 sq ft
with 10% overlap = 588 sq ft
```

**The jacket circumference is 2.23 ft on a 4.5 in pipe** -- nearly twice the pipe's own, because it wraps the
outside of the insulation. Estimating on pipe OD would give 1.18 ft and half the material.

The fittings:

```
14 elbows + 4 tees = 18 fitting covers, counted by piece
6 valves           = 6 removable covers, fabricated items
```

Those 24 pieces are not in the 588 sq ft. In material they add roughly the equivalent of another 100 to 150 sq
ft; **in labour they can equal or exceed the entire straight run**, because each one is laid out, cut, formed,
and banded individually.

The valve covers are the line most often left out entirely. If the specification requires removable reusable
covers -- and on any line that will be maintained it does -- those six are fabricated items at a cost per piece
well above anything in the straight-run estimate, and discovering that after the bid is a loss.

## 4. Scope and non-goals

A takeoff calculation. It does not price the work, and the material-to-labour relationship for fittings varies
widely with jacket material, gauge, fitting type, and access. It does not address the insulation itself, which is
a separate takeoff with its own fitting allowances, or the vapour barrier and sealing required on cold service --
where a jacket seam that leaks vapour destroys the insulation from the inside and is the dominant failure mode.
It does not address expansion and contraction provisions, which on hot service require expansion joints in the
jacket, or the weatherproofing details at terminations, penetrations, and supports. It does not address insulated
pipe supports, which are separate specified items. The project specification, the insulation and jacket
manufacturers' installation instructions, and MICA or SMACNA standards for the details govern.
