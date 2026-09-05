# roughlogic.com Specification v1541 -- Continuous Welded Rail Neutral Temperature and Thermal Force (`calc-rail.js`, Group E Carpentry and Construction, railroad track, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rail.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; railroad track and equipment), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Continuous welded rail has nowhere to go when it heats up, so it builds enormous internal force instead. Above its neutral temperature it is in compression and can buckle; below it, in tension and can pull apart. The force is one multiplication and it is a number every track supervisor should be able to produce.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rail area, modulus, or coefficient of expansion returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the restrained thermal force relation with the 49 CFR 213 CWR plan requirements named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cwr neutral temperature`, `rail thermal force`, `sun kink buckling temperature`, `rail stress free temperature`, `destress rail temperature`.

## 2. The tile

### 2.1 `cwr-neutral-temperature` -- Continuous Welded Rail Neutral Temperature and Thermal Force

```
thermal force    F = A E alpha (T - T_neutral)        (lb, in^2, psi, /degF)
per degree       for 136 lb rail: about 2,450 lb per degF per rail
buckling risk    rail temperature ABOVE neutral, in compression
pull-apart risk  rail temperature BELOW neutral, in tension
rail temperature typically 20 to 30 degF above air temperature in sun
```

The force does not depend on the length of the rail, only on its area, its modulus, and how far it is from
neutral -- which is why a mile of CWR and a hundred feet of it develop the same force per degree. For 136 lb rail
that force is roughly 2,450 pounds per degree per rail, so a 50 degF excursion above neutral puts over 120,000
pounds of compression in each rail and nearly a quarter million pounds in the track.

That is what a sun kink is. The ballast section and the fastenings resist that force laterally, and when the
resistance is reduced -- freshly surfaced track, disturbed shoulders, insufficient ballast, a curve where the force
has a lateral component -- the track buckles. It is why work that disturbs ballast carries slow orders in hot
weather, and why the neutral temperature is set deliberately when rail is laid or destressed rather than being
whatever the day happened to be.

The field number worth carrying is rail temperature versus air temperature: rail in direct sun runs 20 to 30 degF
hotter than the air, so a 95 degF afternoon is a 120 degF rail, and it is rail temperature that matters.

**Inputs:** rail section area (or rail weight), modulus of elasticity, coefficient of thermal expansion, the rail neutral temperature, and the current rail temperature or air temperature with a sun adder

**Outputs:** the force per degree per rail, the total thermal force at the current temperature in one rail and in the track, whether the rail is in compression or tension, the temperature differential from neutral, and the rail temperature implied by an air temperature and sun adder

## 3. Worked example

136 lb rail (13.0 sq in), E = 3e+07 psi, alpha = 6.5e-06/degF, laid at a neutral temperature of 95 degF:

```
force per degF per rail = 13.0 x 3e+07 x 6.5e-06 = 2,450 lb/degF
```

About 2,450 pounds per degree, per rail. On a day when the air is 95 degF and the rail runs 25 degF hotter:

```
rail temperature   = 95 + 25        = 120 degF
differential       = 120 - 95       = 25 degF above neutral
force per rail     = 2,450 x 25     = 61,262 lb COMPRESSION
force in the track = x 2            = 122,525 lb
```

123 kips of compression in the track on an ordinary summer afternoon, from a 25 degree excursion. That
is the load the ballast section and the fastenings are holding laterally, and it is why disturbing the shoulder
on such a day is a slow-order matter.

The winter case is the mirror: at 10 degF rail the differential is 85 degF below neutral and each rail
carries 208,292 lb of TENSION, which is what pulls a broken weld or a defect apart.

## 4. Scope and non-goals

The thermal force relation for fully restrained rail. It assumes the rail is completely restrained, which is
the design intent for CWR but is not true near rail ends, at joints, at bridge expansion arrangements, or where
fastenings have degraded, and partially restrained rail develops less force and more movement. It does not
predict the buckling temperature, which depends on lateral resistance from the ballast section and fastenings,
the track's alignment imperfections, curvature, and vertical load, and which requires a track buckling analysis
rather than a force calculation. It does not determine the correct neutral temperature for a location, evaluate
whether rail needs destressing, or address rail adjustment procedures. It does not evaluate rail defects, welds,
or the pull-apart risk from a specific defect. This is a derailment-hazard subject: the FRA Track Safety Standards
at 49 CFR 213 including the CWR plan requirements, the railroad's own CWR procedures, and the track owner
govern.
