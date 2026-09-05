# roughlogic.com Specification v1705 -- Injection Mold Clamp Tonnage and Projected Area (`calc-process.js`, Group G Cross-Trade Utilities, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An injection mould has to be held closed against the pressure of the plastic inside it, and the force is the projected area times the cavity pressure. Under-clamp and the mould flashes; over-clamp and the machine is oversized and the mould is crushed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive projected area or cavity pressure, or a clamp force below the calculated requirement returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the projected area clamp force relation with the mould designer and material supplier processing data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`injection clamp tonnage`, `projected area mould clamp`, `tons per square inch injection`, `clamp force calculation`, `mould flashing clamp`.

## 2. The tile

### 2.1 `injection-clamp-tonnage` -- Injection Mold Clamp Tonnage and Projected Area

```
clamp force      F = projected area x cavity pressure
projected area   the area of the part seen along the direction of mould opening,
                 including runners and any part of the shot that generates pressure
cavity pressure  material and geometry dependent; 2 to 5 tons per square inch is typical,
                 rising with thin walls, long flow lengths, and viscous materials
safety factor    commonly 10 to 20% above the calculated requirement
consequence      insufficient clamp opens the parting line and flashes the part
over-clamp       damages the mould and wastes machine capacity
```

Projected area is the term people get wrong, in two ways. It is the area seen along the direction the mould
opens, so a deep part with a small footprint has a small projected area regardless of its volume -- and a flat
part with a large footprint has a large one even if it is thin. And it includes the runner system, which on a
multi-cavity mould with a large runner can be a significant addition that a part-only calculation misses.

Cavity pressure is where the estimate lives or dies. It is not a material constant: it rises with thin walls,
with long flow lengths relative to wall thickness, with viscous materials, and with fast fill rates, so a part
that is thin and long needs far more pressure to fill than a thick short one of the same footprint. The range of
2 to 5 tons per square inch spans most work and choosing within it requires knowing the part, which is why mould
flow analysis exists.

The failure is flash and it is progressive. A mould run slightly under-clamped opens a few thousandths at the
parting line, flash forms, the flash prevents the mould closing fully on the next shot, and the parting line
damages -- so a marginal clamp condition destroys a mould over time rather than failing cleanly.

**Inputs:** the part projected area and the number of cavities, the runner projected area, the cavity pressure for the material and geometry, the safety factor, and the machine clamp rating

**Outputs:** the total projected area including runners, the clamp force required at the entered cavity pressure, the force with the safety factor, the machine rating against it, the margin, and the maximum cavity pressure the machine supports for the entered area

## 3. Worked example

A four-cavity mould, each part with 12 sq in of projected area, plus 6 sq in of runner, at
2.5 tons per square inch:

```
part projected area   = 4 x 12 = 48 sq in
runner                = 6 sq in
total                 = 54 sq in
clamp required        = 54 x 2.5 = 135 tons
with 15% safety       = 155 tons
```

**155 tons** -- so a 150 ton machine, not a 120.

**The runner is not a rounding error.** Six square inches of it added 15 tons, which on a marginal machine
selection is the difference between running and flashing. A part-only calculation would have called for
138 tons and specified a machine that flashes.

**Cavity pressure is the variable that matters most.** The same 54 sq in at 4 tons per square inch --
a thin-walled part in a viscous material with a long flow length -- needs

```
54 x 4 x 1.15 = 248 tons
```

93 tons more, from the part's geometry rather than its size. Which is why the
pressure is estimated from the flow length to wall thickness ratio and the material, and why a mould flow
analysis rather than a rule of thumb is what a serious tool is sized on.

## 4. Scope and non-goals

A clamp force estimate using a cavity pressure the user supplies. Cavity pressure is the dominant uncertainty:
it depends on material viscosity, wall thickness, flow length, gate design, melt and mould temperature, and fill
rate, and the typical range spans more than a factor of two. Mould flow simulation, or measurement on a similar
part, gives a defensible value where a rule of thumb does not. It does not design a mould, size gates and
runners, evaluate venting, or address the mould's own structural capacity -- a mould can be crushed by a machine
whose clamp exceeds what the tool was built for, and the tool's rating is a separate limit. It does not address
shot size and residence time (`shot-size-residence-time`), cooling (`injection-cooling-time`), or shrinkage
(`mold-shrinkage-dimension`). The material supplier's processing data, the mould designer, and the machine
manufacturer's ratings govern.
