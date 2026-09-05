# roughlogic.com Specification v1589 -- Well Casing Storage and Purge Volume (`calc-water.js`, Group M Water and Wastewater Operations, water well, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; water well and pump service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Sampling a well or disinfecting one requires knowing how much water is standing in the casing, and that is a diameter-squared relation with a constant every driller carries. Purging too little gives a sample of stagnant casing water rather than aquifer water.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive casing diameter, total depth, or static water level, or a static level at or below the well bottom returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the casing volume constant and purge convention with the state well code and sampling protocol named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`well casing volume`, `purge volume before sampling`, `gallons per foot casing`, `well disinfection volume`, `standing water column well`.

## 2. The tile

### 2.1 `casing-purge-volume` -- Well Casing Storage and Purge Volume

```
casing volume    gal/ft = 0.0408 x d^2       (d in inches)
standing column  depth to bottom - static water level
casing volume    V = gal/ft x column length
purge            commonly 3 to 5 casing volumes before sampling, or purge to stable
                 field parameters (pH, conductivity, temperature, turbidity)
disinfection     chlorine dose applied to the casing volume plus the gravel pack
```

The 0.0408 constant is just the area of a circle converted to gallons per foot, and it makes casing volume a
mental calculation once it is in hand: a 6 inch casing holds about a gallon and a half per foot, an 8 inch about
two and two thirds. That single fact answers most of the questions a driller or operator has at a wellhead.

The purge rule matters because water standing in a casing is not aquifer water. It has been in contact with the
casing and the atmosphere, it has lost or gained dissolved gases, and its chemistry has drifted -- so a sample
taken without purging measures the casing, not the aquifer. Three to five casing volumes is the traditional rule;
purging to stabilized field parameters is better practice because it adapts to the actual well.

For disinfection the same volume sizes the chlorine dose, and the important addition is that the gravel pack and
the near-well formation hold water too -- so a dose computed on casing volume alone under-treats the part of the
well that most needs it.

**Inputs:** casing inside diameter, total well depth, static water level, the number of casing volumes to purge, the purge pump rate, and the target chlorine concentration for disinfection

**Outputs:** the gallons per foot, the standing water column, the casing volume, the purge volume for the entered number of casing volumes, the purge time at the entered pump rate, and the chlorine quantity for a target concentration

## 3. Worked example

A 6 in casing, 280 ft deep, static water level 90 ft:

```
gal/ft         = 0.0408 x 6^2      = 1.47 gal/ft
standing column= 280 - 90         = 190 ft
casing volume  = 1.47 x 190      = 279 gallons
```

279 gallons standing. Purging three casing volumes before sampling is 837 gallons, which at a 15 gpm
purge pump is 56 minutes -- and that is the number that decides whether a sampling visit is a
twenty-minute job or a two-hour one.

Disinfection to 100 mg/L using 12.5% sodium hypochlorite:

```
chlorine needed = 279 gal x 100 mg/L
volume of 12.5% solution ~ 0.02 gal -- roughly 0.22 gal
```

And that dose treats the CASING. The gravel pack and the near-well formation hold water too, so the practical
dose is increased and the chlorine is agitated and allowed to reach the formation, or the disinfection treats
only the part of the well that was already cleanest.

## 4. Scope and non-goals

A geometric volume calculation. It assumes a single casing diameter over the standing column; wells with
telescoped casing, open borehole below the casing, or a screened interval of different diameter hold different
volumes and the tile does not model them. It does not account for water held in the gravel pack and the
surrounding formation, which is significant for disinfection and for purging a poorly developed well. Purge
volume rules vary between programs and regulators, and purging to stabilized field parameters or low-flow
sampling methods are preferred for many analytes -- the applicable sampling protocol governs, not a volume rule.
It does not address disinfection chemistry, contact time, neutralization before discharge, or the discharge
permitting that purge and disinfection water may require. The state well code, the applicable sampling protocol,
the drinking water primacy agency, and a licensed well driller govern.
