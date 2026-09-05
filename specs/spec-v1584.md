# roughlogic.com Specification v1584 -- Kiln Charge Water Weight and Vent Load (`calc-sawmill.js`, Group L Agriculture and Forestry, sawmill, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-sawmill.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; sawmill and forest products), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A kiln charge is mostly water on the way in, and the tonnage of it decides the vent load, the energy, and how long the schedule takes. Green hardwood at 85% moisture content carries most of its own weight again in water, and that number surprises people every time.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive green weight, a final moisture content at or above the initial, or a negative moisture content returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the oven-dry basis moisture relation and the Forest Products Laboratory drying schedules named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`kiln charge water weight`, `lumber drying water removed`, `kiln vent load`, `oven dry basis moisture`, `drying energy per charge`.

## 2. The tile

### 2.1 `kiln-charge-water` -- Kiln Charge Water Weight and Vent Load

```
water to remove   W = oven-dry weight x (MC_initial - MC_final) / 100
oven-dry weight   green weight / (1 + MC_initial/100)
energy            latent heat plus heating the wood and the kiln; roughly 1,500 to 2,500
                  BTU per pound of water for a conventional kiln
vent load         the moisture leaving must be vented; venting carries heat out with it
MC basis          wood moisture content is on an OVEN-DRY basis and can exceed 100%
```

The oven-dry basis is the trap. Wood moisture content is water weight divided by OVEN-DRY wood weight, not by
total weight, so 100% moisture content means the water weighs as much as the wood -- and green hardwood above
100% is entirely ordinary. Computing water from green weight times the moisture percentage is wrong and gives a
number substantially too low.

Once the water tonnage is known everything else follows. The energy is that mass times a heat requirement well
above the latent heat of water, because a conventional kiln also heats the wood, heats the kiln, and loses heat
out the vents along with the moisture. The vent load is what sizes the venting and, in a dehumidification kiln,
what sizes the compressor.

The other reason to have the number is schedule sanity. A charge with twice the water takes far longer than twice
as long at the same drying rate, because the safe rate falls as the wood dries and the schedule's later steps are
the slow ones. A mill that knows the water tonnage knows whether a schedule is plausible before starting it.

**Inputs:** charge green weight or board footage and species density, initial and final moisture content, the kiln energy per pound of water, and the schedule duration

**Outputs:** the oven-dry weight, the water to remove in pounds and gallons, the energy required, the average drying rate over the schedule, the vent load, and the water remaining at any intermediate moisture content

## 3. Worked example

A charge of green red oak, 40,000 lb green, going from 85% to 8% moisture content:

```
oven-dry weight = 40,000 / (1 + 85/100) = 40,000 / 1.85 = 21,622 lb
water to remove = 21,622 x (85 - 8) / 100 = 16,649 lb
                = 1,996 gallons
```

**16,649 pounds of water** -- over four tons -- out of a 20 ton charge.

The wrong way, and the reason this tile exists: `40,000 x (85 - 8) / 100` = 30,800 lb, which is
14,151 lb too high because it applied an oven-dry-basis
percentage to a green weight.

Energy at 2,000 BTU per pound of water:

```
16,649 x 2,000 = 33.3 MMBTU per charge
```

Over a 28 day oak schedule that is an average drying rate of
2.8 moisture-content points per day, which is in the right range for 4/4 red oak -- a useful check
that the schedule is plausible before the charge goes in.

## 4. Scope and non-goals

A mass and energy calculation. It does not produce or validate a drying schedule: kiln schedules are
species, thickness, and grade specific, they are published by the Forest Products Laboratory and by kiln
manufacturers, and running wood faster than its schedule allows causes checking, honeycomb, collapse, and
casehardening that no energy calculation predicts. The BTU-per-pound figure is a broad range that depends on kiln
type, insulation, venting practice, and whether heat recovery is fitted; a dehumidification kiln's energy is
electrical and follows entirely different arithmetic. It does not address air drying before the kiln, sticker
spacing and airflow, equalizing and conditioning steps, or stress relief, and it does not address the moisture
content measurement itself, which is done with kiln samples and a moisture meter rather than by calculation. The
applicable drying schedule, the kiln manufacturer, and the mill's own kiln samples govern.
