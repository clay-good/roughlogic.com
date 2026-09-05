# roughlogic.com Specification v1654 -- Hydraulic Elevator Jack Pressure and Pump Flow (`calc-elevator.js`, Group E Carpentry and Construction, elevator, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elevator.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; elevator and escalator), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A hydraulic elevator's working pressure is the load over the jack area, and the pump flow is the area times the speed. Both are one line, and together they say whether a jack, a pump, and a relief setting belong to each other after somebody changed one of them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive jack diameter, load, or car speed, or a relief setting at or below the working pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the jack pressure and flow relations with ASME A17.1 named as governing relief settings and testing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hydraulic elevator jack pressure`, `jack area working pressure`, `elevator pump flow gpm`, `relief valve setting hydraulic elevator`, `jack replacement bore`.

## 2. The tile

### 2.1 `hydraulic-jack-pressure` -- Hydraulic Elevator Jack Pressure and Pump Flow

```
working pressure  P = total load / jack area
jack area         A = pi d^2 / 4 for a single-stage jack
pump flow         Q = area x car speed, converted to gpm
                  gpm = A(sq in) x v(fpm) / 231 x 12
relief valve      set above working pressure by a defined margin, and below the
                  system's rated maximum
static test       the code requires a test at a multiple of working pressure
telescopic        stages have different areas; pressure changes as stages extend
```

The two relations are simple and they interact. A larger jack lowers the working pressure -- easier on the
cylinder, the packing, and the power unit -- and raises the flow needed for the same car speed, so it wants a
bigger pump. A smaller jack does the reverse. That trade is why a jack replacement is not a like-for-like swap
unless the diameter matches: a different bore changes both the pressure the system runs at and the speed it
achieves with the existing pump.

The relief valve setting is where the two meet a safety requirement. It must be high enough that the elevator
works at full load without lifting the relief, and low enough that it protects the system -- and it is set as a
defined margin above the actual working pressure, which means it has to be reset if the working pressure changes.
A relief left at its old setting after a jack change is either lifting during normal service or no longer
protecting anything.

Telescopic jacks add a wrinkle worth knowing: the effective area changes as stages extend, so the working
pressure is not constant through the travel and the highest pressure occurs on the smallest stage.

**Inputs:** jack bore diameter and number of stages, car and counterweight-free load including rated capacity, car speed, the pump rated flow and pressure, and the relief valve setting

**Outputs:** the jack area, the working pressure at the entered load, the pump flow required for the car speed, the car speed the installed pump produces, the relief setting against the working pressure, and the working pressure and flow for an alternative jack bore

## 3. Worked example

A single-stage jack with a 12 in bore carrying a 14,000 lb total load:

```
area              = pi x 12^2 / 4 = 113.1 sq in
working pressure  = 14,000 / 113.1 = 124 psi
```

124 psi. For a 125 fpm car:

```
flow = 113.1 x 125 x 12 / 231 = 734.4 gpm
```

About 734 gpm.

**Now the jack replacement trap.** Fit a 10 in bore instead:

```
area             = pi x 10^2 / 4 = 78.5 sq in
working pressure = 14,000 / 78.5 = 178 psi
```

Pressure rises 44%, which may exceed the power unit's rating and will certainly
change the packing and seal duty. And the same pump now moves the car faster:

```
speed = 734.4 gpm x 231 / (78.5 x 12) = 180 fpm
```

180 fpm instead of 125 -- above the contract speed, which is a code
compliance problem and a governor and buffer problem behind it.

And the relief valve, still set for the old 124 psi working pressure, now sits below the new working pressure
and lifts during normal service. Three consequences from one dimension change.

## 4. Scope and non-goals

Basic hydraulic relations. It does not size a jack, which must be checked for column buckling over its unsupported
length -- the governing design case for a long hydraulic jack and one this pressure calculation does not touch --
or for the cylinder wall, head, and packing. It does not size the power unit, evaluate oil viscosity and
temperature effects on speed and pressure, or address the pressure switch, low-pressure protection, and the
anti-creep and leveling requirements. It does not address the relief valve setting margins, the static and
running pressure tests, or the safety bulkhead and plunger-follower guide requirements, all of which ASME A17.1
sets. It does not address buried jacks, cathodic protection, or the environmental requirements for jack
replacement. Elevator equipment is life-safety: ASME A17.1 and A17.2, the equipment manufacturer, the elevator
authority having jurisdiction, and a licensed elevator mechanic govern.
