# roughlogic.com Specification v1493 -- Refrigeration Pressure-Relief Discharge Capacity (ASHRAE 15) (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Every pressure vessel in a refrigeration system needs relief sized to the fire condition, and the required capacity comes from the vessel's external surface area -- not from its volume, not from the compressor. Undersized relief is the failure nobody discovers until there is a fire.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive vessel diameter or length, a non-positive refrigerant constant, or a required capacity exceeding the entered valve rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASHRAE 15 and IIAR 2 fire-case relief capacity relation with ASME Section VIII named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`refrigeration relief valve sizing`, `ashrae 15 relief capacity`, `pressure vessel relief refrigerant`, `iiar relief sizing`, `relief discharge piping`.

## 2. The tile

### 2.1 `refrigeration-relief-capacity` -- Refrigeration Pressure-Relief Discharge Capacity (ASHRAE 15)

```
required capacity  C = f x D x L      (ASHRAE 15 / IIAR form, lb/min of air)
                   D vessel diameter in feet, L length in feet, f a refrigerant constant
discharge piping   sized so back pressure does not reduce relieved capacity below required
multiple vessels   a common discharge header must carry the largest single relief, or the
                   simultaneous set, per the applicable code
```

The `D x L` term is the vessel's external surface area in disguise, because the fire case is heat absorbed
through the shell boiling the contents. That is why a long thin vessel and a short fat one of the same volume
need different relief, and why relief sizing never asks how much refrigerant is inside. The refrigerant constant
`f` carries the latent heat and vapor properties, so ammonia, R-22, and CO2 give different answers for identical
vessels.

The second half is the discharge piping and it fails more often than the valve. A relief valve's rated capacity
is achievable only if the downstream piping does not build enough back pressure to choke it, and on a plant
where several reliefs share a header the equivalent length arithmetic decides whether the valve can actually
pass what it is stamped for. A correctly sized valve on undersized discharge piping is an undersized relief
system.

**Inputs:** vessel diameter and length, refrigerant and its capacity constant, the relief valve set pressure and rated capacity, and the discharge piping size, length, and fittings

**Outputs:** the required relieving capacity in lb/min of air, the margin against the entered valve rating, a pass or fail, the equivalent length of the discharge piping, and the maximum discharge length the valve supports

## 3. Worked example

A horizontal ammonia receiver 4 ft in diameter and 16 ft long, with the ammonia constant f = 0.5:

```
C = 0.5 x 4 x 16 = 32.0 lb/min of air required
```

A relief valve rated 45 lb/min of air at its set pressure passes with a margin of 45/32 = 1.41.

Now the piping. If the discharge run and fittings come to an equivalent length beyond what the valve's rated
capacity tolerates at that back pressure, the installed capacity falls below 32 lb/min and the vessel is not
protected -- with a valve that is stamped correctly and inspected annually and still will not do its job. That
check is part of the sizing, not an afterthought, and it is the part most often skipped on a plant that has grown
by accretion.

## 4. Scope and non-goals

A screening calculation of required relieving capacity for the fire condition, using the code's D x L form and
a refrigerant constant the user supplies from the applicable table. It is not a relief system design. It does not
select a valve, evaluate set pressure against the vessel's MAWP, size the discharge header for multiple
simultaneous reliefs, evaluate a three-way valve arrangement and the dual-relief requirement that applies to
vessels which cannot be taken out of service, address hydrostatic overpressure relief on liquid sections isolated
between closed valves, or determine the discharge termination location and height. Relief sizing for causes other
than fire -- blocked outlet, control failure, internal fire -- may govern and is not evaluated. This is a
life-safety system: ASHRAE 15, IIAR 2, ASME Section VIII, the valve manufacturer's rated capacities, and a
qualified engineer govern.
