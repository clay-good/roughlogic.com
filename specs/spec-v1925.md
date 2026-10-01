# roughlogic.com Specification v1925 -- Water Pipe Freeze Time (`calc-outage.js`, Group B Plumbing and Gas, building performance in an outage, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-outage.js`**
> (Group B Plumbing and Gas, hub `/groups/plumbing/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Frozen and burst pipes are the most common damage in a winter outage, and pipe insulation is widely believed to prevent them. It delays them: still water in an insulated pipe in an unheated space reaches freezing in hours. `heat-trace-sizing` sizes cable to keep a pipe warm; no tile says how long an unheated pipe has.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pipe size, insulation conductivity, or surface coefficient returns `{ error }`; an ambient at or above 32 degF returns the note that the pipe does not freeze, not `Infinity`; a starting water temperature at or below 32 degF returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): steady radial conduction through the insulation and an outside surface film, a lumped cool-down of the water and pipe wall, and the latent heat of fusion of water (143.5 Btu/lb) named as the method, with the ASHRAE Handbook -- Fundamentals chapter on insulation for mechanical systems cited by name for the freeze-time approach, the plumber and the insulation manufacturer's conductivity data named as governing, GOVERNANCE.plumbing.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`how long before pipes freeze`, `pipe freeze time insulated`, `frozen pipes power outage`, `will my pipes freeze`, `pipe insulation freeze protection time`.

## 2. The tile

### 2.1 `pipe-freeze-time` -- Water Pipe Freeze Time

```
per foot of pipe
heat capacity  C = water lb/ft x 1.0 + pipe lb/ft x c_pipe (Btu/degF-ft)
loss           UA' = 1 / (R_insulation + R_surface)   (Btu/h-degF per ft)
               R_insulation = ln(r_out / r_pipe) / (2 pi k)
               R_surface    = 1 / (h x 2 pi r_out), h ~ 1.5 still air
stage 1        to 32 degF: t1 = (C / UA') x ln((T_start - T_amb) / (32 - T_amb))
stage 2        freezing solid: t2 = water lb/ft x 143.5 / (UA' x (32 - T_amb))
report         the onset (t1) and full freeze (t1 + t2) as bounds; a pipe can
               block or split anywhere in between
```

A water pipe in an unheated wall or crawl space is a small mass of water losing heat through its insulation, and the
arithmetic has two stages. First the water cools to 32 degF, exponentially, at a rate set by its heat capacity against
the heat loss through the insulation and the air film outside it. Then it freezes at 32 degF while losing heat at a
steady rate, and freezing takes longer than cooling because water gives up 143.5 Btu per pound to turn to ice -- more
than a hundred times the heat it gave up per degree on the way down.

Insulation slows both stages and prevents neither. Half an inch of foam on a 3/4 inch copper line cuts the heat loss
per foot by about three-fifths, which roughly doubles or triples the time, but the water still reaches freezing within
hours at a hard-freeze temperature. That is the practical content of the tile: insulation buys time for the power to come
back or for someone to drain the line, and dripping a faucet -- keeping the water moving -- is what actually prevents a
freeze, which is why emergency guidance recommends it.

The tile reports the onset of freezing and the time to freeze solid as bounds, because the point at which a pipe
blocks or splits depends on where the ice forms and how pressure builds behind it, and no single fraction describes it.

**Inputs:** the pipe size and material, the insulation thickness and conductivity, the outside surface coefficient, the starting water temperature, and the ambient temperature

**Outputs:** the water and pipe heat capacity per foot, the heat loss per foot per degree, the time to 32 degF, the time to freeze solid, and the same for the bare pipe for comparison

## 3. Worked example

A 3/4 in type L copper line (7/8 in OD, 0.785 in ID; 0.21 lb of water and 0.455 lb of copper per foot) with 1/2 in of foam
insulation (k 0.25 Btu-in/h-sq ft-degF), water at 55 degF, in a crawl space at 0 degF:

```
C        0.2097 x 1.0 + 0.455 x 0.092 = 0.252 Btu/degF-ft
UA'      insulated 0.139 Btu/h-degF-ft     bare 0.344
tau      insulated 1.81 h                  bare 0.73 h
to 32    insulated 1.81 x ln(55 / 32) = 0.98 h      bare 0.40 h
solid    insulated 0.2097 x 143.5 / (0.139 x 32) = 6.75 h  -> 7.7 h total
         bare 2.74 h -> 3.1 h total
```

**The insulated line starts to freeze in about an hour and is solid in under eight** -- against 24 minutes and three hours
bare. The insulation more than doubles the time; it does not make the pipe safe overnight.

**At 20 degF instead of 0,** the insulated line reaches 32 degF in 1.9 h and takes about 18 h to freeze solid -- **a mild
freeze is survivable overnight, a hard freeze is not.**

## 4. Scope and non-goals

A freeze-time estimate for still water in a single pipe run. It does not model moving water, heat from the surrounding structure or soil, wind, pipes in exterior walls where the cavity temperature is between indoor and outdoor, supercooling, or where along a run ice forms first. Conductivities and surface coefficients are typical values; the insulation manufacturer's data governs. It does not size heat trace (`heat-trace-sizing`) or predict the building's temperature (`building-outage-cooldown`). The plumber, the insulation manufacturer's data, and local emergency guidance govern.
