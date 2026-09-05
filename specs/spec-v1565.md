# roughlogic.com Specification v1565 -- Tumble Dryer Evaporation Load and Makeup Air (`calc-steamplant.js`, Group G Cross-Trade Utilities, commercial laundry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A tumble dryer is an evaporator, and its load is the pounds of water it has to boil off. That number sets the gas input, the exhaust airflow, and -- the part that gets missed -- the makeup air the room has to admit, which is why laundry rooms end up in negative pressure fighting every other appliance in the building.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive dry weight, a retained moisture fraction outside zero to one, or a non-positive efficiency or temperature rise returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the evaporation load and airflow relations with the mechanical code and NFPA named for exhaust duct requirements, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`dryer evaporation load`, `laundry makeup air`, `tumble dryer gas input`, `retained moisture extraction`, `laundry exhaust cfm`.

## 2. The tile

### 2.1 `laundry-dryer-evaporation` -- Tumble Dryer Evaporation Load and Makeup Air

```
water to remove   W = dry weight x retained moisture fraction
heat required     Q = W x ~1,200 BTU/lb / dryer efficiency
exhaust airflow   CFM = Q / (1.08 x delta-T across the dryer)
makeup air        the room must admit the full exhaust, or it goes negative
retained moisture 45 to 55% after a low-G washer; 30 to 40% after high-G extraction
```

Evaporating water is expensive and mechanical extraction is cheap, and the ratio between them is roughly ten to
one -- which makes retained moisture after extraction the single most consequential number in a laundry's energy
bill. Ten points of retained moisture on four thousand pounds of linen is four hundred pounds of water a day that
either leaves in the extractor for pennies or leaves in the dryer for dollars.

The airflow consequence is the one that causes building problems. All that exhaust has to be replaced, and a
laundry room without a dedicated makeup air path pulls it through the building: down water heater flues, under
doors, past every combustion appliance in the mechanical room. That is a combustion safety problem
(`caz-depressurization-limit`) as well as a performance one, because a dryer that cannot get air dries slowly and
runs long, which costs more gas to remove the same water.

Lint is the third consequence and it is a fire problem rather than an arithmetic one: exhaust ducting sized and
routed for the calculated airflow still fails if it is not cleanable.

**Inputs:** dry weight processed, retained moisture fraction after extraction, dryer efficiency, the temperature rise across the dryer, the operating hours, and the fuel cost

**Outputs:** the pounds of water to evaporate, the heat required, the gas input and cost, the exhaust airflow, the makeup air required, and the saving from a stated reduction in retained moisture

## 3. Worked example

4,000 lb of linen a day at 45% retained moisture, 70% dryer efficiency:

```
water          = 4,000 x 0.45          = 1,800 lb of water
heat           = 1,800 x 1,200 / 0.70 = 3,085,714 BTU
exhaust at 100 degF rise = 3,085,714 / (1.08 x 100) = 28,571 cfm-hours
```

Over an eight hour shift that is roughly 3,571 cfm of continuous exhaust -- and the same
3,571 cfm of makeup air the room has to admit. At a 500 fpm louver face velocity that is
7.1 sq ft of free area, which after a 50% louver free-area fraction is about
14 sq ft of gross louver. A laundry room with a 4 sq ft transfer grille is going to run negative.

Now the extraction lever. Drop retained moisture to 35%:

```
water = 4,000 x 0.35 = 1,400 lb
heat  = 2,400,000 BTU  -- a saving of 685,714 BTU a day
```

At $9 per MMBTU and 300 days that is **$1,851 a year**, from the washer's
extract speed rather than from anything the dryer does.

## 4. Scope and non-goals

An evaporation load and airflow estimate. The 1,200 BTU per pound figure covers latent heat plus the sensible
heat of the water and typical exhaust losses and is a working approximation; a specific dryer's fuel consumption
per pound of water from its manufacturer is better. It does not size the dryer, select the exhaust duct or
evaluate its static pressure, or address lint accumulation and the cleaning access that fire safety requires --
dryer exhaust fires are a recognized hazard and duct design is governed by the mechanical code and NFPA rather
than by an airflow number. It does not evaluate makeup air tempering, which in a cold climate is a substantial
heating load of its own, or the combustion safety consequences of running the room negative, which must be
checked separately. The dryer manufacturer's data, the adopted mechanical code, and NFPA govern.
