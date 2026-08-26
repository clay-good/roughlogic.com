# roughlogic.com Specification v1434 -- Escalator Handling Capacity and Step Loading (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** An escalator's capacity is fixed by three things -- step width, step depth, and speed -- and the theoretical number it produces is roughly double what any real installation achieves. The gap between the two is the loading factor, and a designer who uses the theoretical figure specifies half the escalators the building needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive speed, step depth, or step width, or a loading factor outside 0-1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the escalator theoretical-capacity relation (steps per hour times persons per step) and the practical loading factors published for escalator traffic design, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `escalator-capacity` -- Escalator Handling Capacity and Step Loading

```
steps per hour   = 3600 x speed (ft/s) / step depth (ft)
theoretical      = steps per hour x persons per step
persons per step = 1 for a 24 in step, 1.5 to 2 for a 40 in step
practical        = theoretical x loading factor    (commonly 0.5 to 0.7)
step load        = persons per step x weight per person
```

An escalator's throughput is a conveyor calculation: how many steps pass a point per hour, times how many people
stand on each one. Speed and step depth set the first term, and step width sets the second -- a 40 inch step takes
two people side by side and a 24 inch step takes one, so width nearly doubles capacity while costing nothing in
speed.

The loading factor is what makes the tile honest. Nobody stands on every step. In ordinary conditions riders leave
a step or two between groups, they hesitate at the comb plate, and a 40 inch step often carries one person rather
than two. Real observed throughput is commonly half to two thirds of the theoretical figure, and the theoretical
figure is nonetheless what gets quoted in a specification. A transit station sized on the theoretical number backs
up onto the platform.

**Inputs:** rated speed (fpm), step depth (in), step width, persons per step, loading factor, weight per person,
and the design peak flow to be served.

**Outputs:** steps per hour, theoretical and practical capacity in persons per hour, the number of units needed for
the design flow, and the live load per step.

## 3. Worked example

A 40 in step escalator at 100 fpm, 16 in step depth, 2 persons per step theoretical, 0.6 loading factor:

```
steps per hour = 3600 x 1.667 / 1.333  = 4,500 steps/hr
theoretical    = 4,500 x 2             = 9,000 persons/hr
practical      = 9,000 x 0.60          = 5,400 persons/hr
step load      = 2 x 150 lb            = 300 lb per step
```

A design peak of 8,000 persons per hour looks like it fits on one unit and does not: at the practical rate it
needs two. Now compare the two levers. Speeding the unit to 120 fpm raises practical capacity to 6,480/hr -- 20%,
and it is the lever most people reach for. Going from a 24 in step to a 40 in step at the *original* speed takes
practical capacity from 2,700 to 5,400 -- it doubles it, for no change in speed and no change in the ride. Step
width is the design decision; speed is a refinement.

## 4. Scope and non-goals

Throughput arithmetic, not an escalator design or a traffic study. Loading factor is an observational figure that
depends on the population -- commuters with luggage, shoppers with carts, and a mixed-mobility crowd all load
differently, and a transit peak loads very differently from a mall on a weekday. The tile does not address rise,
incline angle, machine sizing, power, the queuing and run-off space at the landings that usually governs before
the escalator does, or the balustrade, handrail, comb plate, and emergency stop requirements that make an
escalator a code-regulated machine. Escalators are permitted, inspected equipment. ASME A17.1, the manufacturer,
the traffic consultant, and the AHJ govern.
