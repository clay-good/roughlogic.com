# roughlogic.com Specification v1497 -- ASHRAE 62.1 Ventilation Rate Procedure (Multiple-Zone) (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The catalog has single-zone ASHRAE 62.1 outdoor air and 62.2 whole-house ventilation. Neither answers the question a commercial designer actually faces: on a multiple-zone recirculating system, the outdoor air the unit must bring in is MORE than the sum of the zones, because the critical zone starves before the others are satisfied.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive zone primary airflow or distribution effectiveness, a zone fraction above one, a diversity factor outside zero to one, or a computed ventilation efficiency at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASHRAE 62.1 Ventilation Rate Procedure by name including the simplified Ev relation, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ashrae 62.1 vrp`, `ventilation rate procedure multiple zone`, `critical zone ventilation`, `system ventilation efficiency ev`, `outdoor air intake vot`.

## 2. The tile

### 2.1 `ventilation-rate-procedure` -- ASHRAE 62.1 Ventilation Rate Procedure (Multiple-Zone)

```
breathing zone   Vbz = Rp x Pz + Ra x Az
zone outdoor air Voz = Vbz / Ez                (Ez the zone air distribution effectiveness)
primary fraction Zp  = Voz / Vpz
uncorrected      Vou = D x sum(Rp Pz) + sum(Ra Az)
system fraction  Xs  = Vou / Vps
efficiency       Ev  = 1 + Xs - Zp,max         (the simplified 62.1 form)
system intake    Vot = Vou / Ev
```

The problem the VRP solves is that a single air handler delivers ONE outdoor air fraction to every zone, so a
zone with many people and little supply air gets the same percentage of outdoor air as a zone with few people and
lots of supply. The zone with the highest ratio of required outdoor air to primary air -- the critical zone --
therefore sets the fraction the whole system must run at, and every other zone is over-ventilated as a
consequence. `Ev` is the penalty that captures this, and it is always at or below 1.0.

Two levers follow directly. Raising the critical zone's supply air lowers its `Zp` and raises `Ev`, which can
reduce total system outdoor air by more than the extra supply air costs. And the diversity factor `D` recognizes
that peak occupancies in different zones do not coincide, which on a building with conference rooms is a large
and legitimate reduction -- but only for the population term, never for the floor-area term.

**Inputs:** per zone the occupancy, floor area, primary airflow, and air distribution effectiveness; the per-person and per-area rates for the occupancy category; and the system population diversity

**Outputs:** per zone the breathing-zone and zone outdoor airflow and primary outdoor air fraction, the critical zone, the uncorrected outdoor air, system ventilation efficiency, the required intake airflow, and the supply increase at the critical zone that would raise efficiency to a target

## 3. Worked example

A three-zone office at 5 cfm/person and 0.06 cfm/sq ft, ceiling supply of cool air (Ez = 0.8):

```
zone   people  sq ft   Vpz    Vbz     Voz     Zp
  1       25   2500   1200   275.0   343.8  0.286
  2       12   1800    900   168.0   210.0  0.233
  3       40   3000   1500   380.0   475.0  0.317

Vou = 385 (people) + 438 (area)      = 823 cfm
Vps = 3,600 cfm         Xs = 823 / 3,600 = 0.2286
Zp,max = 0.317  (zone 3, the critical zone)
Ev  = 1 + 0.2286 - 0.317      = 0.9119
Vot = 823 / 0.9119            = 902 cfm
```

The zones need 1029 cfm of outdoor air between them, but the system must draw **902 cfm** -- 79 cfm
more than the uncorrected total -- because zone 3 is critical at Zp = 0.317 and drags the whole system's
efficiency to 0.912.

The lever: raise zone 3's primary air from 1,500 to 1,900 cfm and its Zp falls to 0.250, Ev rises to
0.956, and Vot drops to 861 cfm -- 41 cfm less outdoor air to condition, bought with 400 cfm
of extra fan.

## 4. Scope and non-goals

The simplified single-supply Ventilation Rate Procedure for one air handler serving multiple zones at design
conditions. It does not handle secondary recirculation systems, series fan-powered boxes, dual-fan or dual-duct
systems, or systems with multiple air handlers serving the same zones, all of which have their own and more
involved forms in the standard's appendix. It does not perform the dynamic-reset calculation that allows outdoor
air to be reduced at part load, which is where most of the operating saving actually is. The per-person and
per-area rates and the air distribution effectiveness values must come from the standard's own tables for the
occupancy category and supply configuration; entering the wrong Ez is the most common error and it propagates
through everything. It does not size equipment, evaluate the IAQ Procedure alternative, or address filtration.
The adopted edition of ASHRAE 62.1, the mechanical code, and the design engineer govern.
