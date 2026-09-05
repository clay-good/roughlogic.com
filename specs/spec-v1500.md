# roughlogic.com Specification v1500 -- Stack Effect Pressure and Neutral Pressure Plane (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Stack effect is why the top floor of a building is overheated and the lobby doors are hard to open in January. The pressure it develops is a function of height and temperature difference only, and the neutral plane -- where it changes sign -- decides which openings are inlets and which are outlets.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive height, or an absolute temperature at or below zero, or equal inside and outside temperatures returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the stack-effect pressure relation from ASHRAE Fundamentals by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`stack effect pressure`, `neutral pressure plane`, `chimney effect building`, `winter stack draft`, `tall building infiltration pressure`.

## 2. The tile

### 2.1 `stack-effect-npp` -- Stack Effect Pressure and Neutral Pressure Plane

```
pressure difference  dP = 0.0188 x H x (1/T_out - 1/T_in)     (in wc, H ft, T degR)
                     magnitude grows linearly with height and with temperature difference
neutral pressure plane   the height where inside and outside pressure are equal
                     sits at mid-height for symmetric leakage; moves toward the larger opening
below the NPP        infiltration in winter; above it, exfiltration
```

The driving force is nothing but the density difference between a warm column of air inside and a cold column
outside, integrated over height -- so a tall building in a cold climate develops a large pressure with no wind and
no fans involved at all. Because it is linear in height, a 20-storey building sees roughly ten times what a
two-storey one does, which is why stack effect is a curiosity in a house and a design problem in a tower.

The neutral plane is the useful half. Below it the building is negative to outside and air comes IN; above it the
building is positive and air goes OUT. That explains the whole familiar pattern: cold draughts at the lobby,
moisture driven into the top-floor wall assemblies, elevator shafts acting as chimneys, and odours travelling
upward from parking to residential floors. Moving the neutral plane is a design act -- a large low opening drags
it down and puts more of the building under exfiltration, and vestibules and shaft compartmentation exist largely
to manage it.

**Inputs:** building height, indoor and outdoor temperature, the neutral plane height (or leakage distribution to estimate it), and the height of the opening being evaluated

**Outputs:** the total stack pressure across the building, the pressure at any stated height relative to the neutral plane, the neutral plane height, whether a given opening infiltrates or exfiltrates, and the equivalent wind speed producing the same pressure

## 3. Worked example

A three-storey building, 24 ft from the lowest opening to the highest, at 70 degF inside and 10 degF
outside:

```
dP_total = 0.0188 x 24 x (1/469.67 - 1/529.67)
         = 0.0188 x 24 x (0.002129 - 0.001888)
         = 0.0001 in wc  = 0.0 Pa across the full height
```

About 0 Pa, with the neutral plane near mid-height for symmetric leakage. The bottom 12 ft therefore
sits at roughly 0 Pa negative and pulls cold air in; the top 12 ft sits 0 Pa positive and pushes
warm moist air out through the ceiling and upper walls.

Scale it up. The same temperatures in a 240 ft building give `0` Pa --
ten times the pressure, which is more than most exhaust fans produce and is why tall buildings need
compartmentation rather than sealing alone. Note also the 0 Pa at the bottom of this small building is
already past the 2 Pa limit for a natural draft appliance in `caz-depressurization-limit`.

## 4. Scope and non-goals

Steady-state stack pressure for a single connected air column, with the neutral plane either entered or
assumed at mid-height. Real buildings have floor separations, shafts, and stairwells that make the effective
column height different from the building height, and a building with tight floor separations behaves as several
short stacks rather than one tall one. Wind acts simultaneously and can reinforce or oppose stack effect on any
given facade; combined wind and stack loading is not modeled. Mechanical pressurization interacts with both.
Summer reverse stack is smaller because the temperature difference is smaller. The tile does not compute
infiltration rates, size vestibules or shaft venting, or address smoke control, which is a life-safety design
with its own standards. ASHRAE Fundamentals, the mechanical code, and the design engineer govern.
