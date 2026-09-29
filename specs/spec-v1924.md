# roughlogic.com Specification v1924 -- Walk-In Cooler Outage Holdover and Dry Ice (`calc-outage.js`, Group C HVAC, building performance in an outage, 1 New Tile)

> **Status: PROPOSED 2026-09-25. Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-outage.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** When a storm takes out power to a restaurant, a grocery, a clinic's vaccine refrigerator, or a food bank's walk-in, the refrigeration tech is asked two questions: how long until the product is out of temperature, and how much dry ice would hold it. `walk-in-cooler-load` sizes the box's heat gain for the evaporator; no tile turns that gain and the stored product into hours of holdover or pounds of dry ice.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive box heat gain, product mass, or specific heat returns `{ error }`; an allowable temperature at or below the starting temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): an energy balance named as the method, the FDA Food Code cold-holding limit (41 degF, Section 3-501.16) and the USDA FSIS power-outage guidance (a refrigerator about 4 hours unopened; a full freezer about 48 hours, half full about 24; 50 lb of dry ice holds a full 18 cu ft freezer about 2 days) cited as the limit and the sanity check, dry ice's heat of sublimation (about 246 Btu/lb) as physical data, the local health department and the product's own handling requirements named as governing, GOVERNANCE.mechanical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`walk in cooler power outage how long`, `dry ice for walk in cooler`, `refrigerator outage holdover time`, `how much dry ice power outage`, `cooler temperature rise without power`.

## 2. The tile

### 2.1 `refrigeration-outage-holdover` -- Walk-In Cooler Outage Holdover and Dry Ice

```
heat gain      Q = box transmission (U x A x (T_ambient - T_box)) plus closed-
               door infiltration allowance (default 10%) -- from
               walk-in-cooler-load or entered; NO product, lighting, or
               people load while the box is shut and dark
storage        E = product mass x specific heat x (T_allowable - T_start)
               (Btu; the air in the box is negligible)
holdover       t = E / Q (h)
dry ice        lb per hour = Q / 246 (heat of sublimation); for an outage of
               T hours beyond the holdover: (Q x T - E) / 246
check          USDA: 50 lb of dry ice for 2 days in a full 18 cu ft freezer
               implies 50 x 246 / 48 = 256 Btu/h of heat leak
```

A cooler without power is a box warming at the rate heat leaks in, and the product inside is what slows it. The leak is
the transmission load through the walls, floor, and ceiling plus a little air exchange around a closed door -- the same
calculation `walk-in-cooler-load` makes, minus the product, people, and lights, which stop when the box is shut and dark.
The product's heat capacity between its storage temperature and the allowable limit is the reserve, and dividing it by
the leak gives the holdover.

The allowable rise is small, and that is why holdover is shorter than people expect. A cooler held at 35 degF has only six
degrees before it reaches the Food Code's 41 degF cold-holding limit, so a box full of product does not buy as much time
as its weight suggests. Keeping the door shut is worth more than any other single action, because every opening dumps
the cold air and adds the infiltration the tile's closed-door allowance leaves out.

Dry ice extends the holdover by absorbing heat as it sublimates, at about 246 Btu per pound. The tile gives the pounds per
hour to cancel the leak and the pounds needed for a stated outage net of the product's reserve. The USDA's household
figure -- fifty pounds holds a full eighteen cubic foot freezer for two days -- implies a leak of about 256 Btu an hour,
which the tile reports as a check on the method. Dry ice needs ventilation and handling precautions, and the tile names
them.

**Inputs:** the box heat gain (or the box dimensions, panel U-factor, and ambient and box temperatures), the closed-door infiltration allowance, the product mass and specific heat, the starting and allowable temperatures, and the outage duration

**Outputs:** the heat gain, the stored cooling reserve, the holdover hours, the dry ice rate, the dry ice for the outage, and the USDA check figure

## 3. Worked example

An 8 x 10 x 8 ft walk-in with 4 in panels (U 0.04) in a 90 degF kitchen, held at 38 degF; 3,000 lb of produce (cp 0.9)
starting at 35 degF, allowable 41 degF:

```
area       2 x (8x10 + 8x8 + 10x8) = 448 sq ft
gain       448 x 0.04 x (90 - 38) = 932 Btu/h, + 10% = 1,025 Btu/h
reserve    3,000 x 0.9 x (41 - 35) = 16,200 Btu
holdover   16,200 / 1,025 = 15.8 h
dry ice    1,025 / 246 = 4.2 lb/h = 100 lb per day
```

**About 16 hours with the door shut** -- the product goes out of temperature the next morning after an evening outage.

**For a 72-hour outage:**

```
(1,025 x 72 - 16,200) / 246 = 234 lb of dry ice
```

**About 230 pounds of dry ice holds the box for three days** -- a number worth knowing before the storm, when dry ice
is still available.

## 4. Scope and non-goals

A holdover and dry ice estimate by an energy balance. It does not model temperature stratification in the box, product that starts warmer than the box, door openings, frozen product and its latent heat (`product-pull-down-load` covers freezing loads), or pharmaceutical storage requirements, which have their own limits and monitoring rules. The time a product has spent out of temperature and whether it is safe are decisions for the food safety or pharmacy authority, not this tile. Dry ice produces carbon dioxide and must not be used in an unventilated occupied space. The FDA Food Code as adopted, the USDA guidance, the local health department, and the product's handling requirements govern.
