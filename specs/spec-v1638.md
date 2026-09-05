# roughlogic.com Specification v1638 -- Walk-In Door Infiltration Load and Air Curtain (`calc-kitchen.js`, Group O Kitchen and Food Service, commercial kitchen, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, Kitchen and Food Service -- the existing category, hub `/groups/kitchen/`; commercial kitchen), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Every time a walk-in door opens, warm humid air pours in at the top and cold air pours out at the bottom, and the load that creates is a large fraction of the box's total. It is the load a refrigeration technician can actually reduce, and it is the one nobody measures.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive door area, exchange rate, or enthalpy difference, or a door open or protection factor outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASHRAE infiltration load relation and doorway protection factors by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`walk in door infiltration`, `strip curtain load saving`, `cooler door air exchange`, `freezer frost load door`, `air curtain walk in`.

## 2. The tile

### 2.1 `walk-in-door-infiltration` -- Walk-In Door Infiltration Load and Air Curtain

```
infiltration load  Q = door area x exchange rate x enthalpy difference x door open factor
                   x doorway protection factor x density factor
door open factor   from the number of openings and the time each stays open
protection factor  strip curtains 0.3 to 0.5, air curtain 0.2 to 0.4, none 1.0
latent share       most of the infiltration load on a freezer is LATENT -- moisture that
                   becomes frost on the coil and drives defrost
consequence        frost load, defrost frequency, and the heat each defrost adds back
```

The stack effect through an open door is powerful because the density difference is large: a freezer at minus 10
degF next to a 75 degF kitchen has warm air rushing in across the top of the doorway and cold air spilling out
across the floor, and the exchange continues for as long as the door is open. On a busy box the number of
openings per hour, not the box's insulation, is the dominant load.

The moisture is what does the damage. Most of the infiltration load into a freezer is latent, and that moisture
condenses and freezes on the evaporator -- so infiltration directly drives frost accumulation, defrost frequency,
and the heat each defrost puts back into the box. A freezer that frosts up between defrosts is usually reporting
a door problem, not a coil problem.

The protection factors are why strip curtains and air curtains exist and they are worth a great deal: cutting the
infiltration load by half to two thirds is ordinary, for very little money. Missing, torn, or pushed-aside strip
curtains are one of the highest-return findings in a refrigeration service call, and a technician who computes
the load with and without them has the argument in hand.

**Inputs:** door width and height, the number of openings per hour and average open time, the inside and outside conditions, the doorway protection type, and the box refrigeration capacity

**Outputs:** the door open factor, the infiltration airflow, the sensible and latent infiltration load, the load as a percentage of the box capacity, the load with a stated doorway protection applied, and the moisture entering per day as frost

## 3. Worked example

A 4 ft by 7 ft freezer door at minus 10 degF opening into a 75 degF, 50% RH kitchen, opened 60 times an hour
for 20 seconds each, with no doorway protection:

```
door area      = 4 x 7 = 28 sq ft
door open time = 60 x 20 / 3600 = 0.333, so the door is open a third of the time
```

The infiltration load at that door open factor is a large number -- on a box of this size it commonly rivals or
exceeds the product and transmission loads combined, and it is overwhelmingly latent.

**With strip curtains in reasonable condition** at a 0.4 protection factor, the same door passes 40 percent of
that load:

```
reduction = 60 percent of the infiltration load, for the cost of a curtain
```

The frost consequence: the moisture entering with that air has to be removed by the evaporator and shows up as
frost. Cutting infiltration by 60 percent cuts the frost accumulation by roughly the same, which lengthens the
interval between defrosts and removes the heat each defrost added -- so the saving is collected twice.

The service finding this supports: a freezer that ices up between defrosts, with a coil that is clean and a
defrost that terminates correctly, is telling you about its door. Torn or missing strip curtains, a door that does
not self-close, or a propped door during stocking are the causes, and none of them is a refrigeration repair.

## 4. Scope and non-goals

A load estimate using factors the user supplies. Infiltration load calculation methods vary and the ASHRAE
Refrigeration handbook gives the relations and factors; door open factors depend on actual usage that should be
observed rather than assumed, and they are the largest uncertainty. Doorway protection effectiveness depends
entirely on condition -- torn, short, or pushed-aside strip curtains perform far below their rating, and an air
curtain out of adjustment can be worse than nothing. It does not compute the full box load, which also includes
transmission, product, internal, and defrost loads (`walk-in-cooler-load`), or size the refrigeration equipment.
It does not evaluate defrost strategy, termination, or the drain line heat trace that prevents refreeze. It does
not address the door hardware, gasketing, heaters, or the pressure relief port that a freezer door requires.
ASHRAE Refrigeration handbook methods and the equipment manufacturer govern.
