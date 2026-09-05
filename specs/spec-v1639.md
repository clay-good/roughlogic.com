# roughlogic.com Specification v1639 -- Kitchen Exhaust and Makeup Air Balance Deficit (`calc-kitchen.js`, Group O Kitchen and Food Service, commercial kitchen, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, Kitchen and Food Service -- the existing category, hub `/groups/kitchen/`; commercial kitchen), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A kitchen that exhausts more than it makes up pulls the difference through the rest of the building, and the consequences are a door that will not open, a pilot that will not stay lit, and a dining room full of kitchen air. The deficit is a subtraction, and its effects are large at small numbers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive exhaust or makeup airflow, or a makeup airflow exceeding the total exhaust by more than the entered tolerance returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the exhaust and makeup air balance with NFPA 96 and the adopted mechanical code named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`kitchen makeup air deficit`, `hood exhaust versus makeup`, `kitchen negative pressure`, `hood not capturing makeup air`, `restaurant door hard to open`.

## 2. The tile

### 2.1 `kitchen-makeup-air-deficit` -- Kitchen Exhaust and Makeup Air Balance Deficit

```
deficit          D = total exhaust - total makeup air
transfer         some deficit is intentional, drawing air from the dining room to keep
                 odours in the kitchen; typically a small percentage
consequences     door opening force, combustion appliance backdrafting, hood capture failure,
                 and reverse flow through other exhaust systems
pressure         a modest deficit in a tight building produces a large negative pressure
capture          a hood starved of makeup air cannot capture; the exhaust rating is not
                 achieved and grease-laden vapour escapes into the space
```

The kitchen is supposed to be slightly negative to the dining room so odours do not migrate, and that
intentional deficit is a few percent. What causes problems is a large deficit, and it does not take much: a tight
building at a few hundred cfm of net deficit can go negative enough to make an exterior door hard to open and to
backdraft an atmospherically vented water heater.

The capture failure is the one that costs money and safety together. A hood's rated exhaust assumes air is
available to replace what it removes; starve it and the actual flow falls below the rating, the capture velocity
at the hood edge drops, and grease-laden vapour rolls out into the kitchen instead of up the duct. So a makeup air
deficit is simultaneously a fire risk, an air quality problem, and a reason the hood does not perform to its
listing.

Combustion safety is the acute hazard. A kitchen with atmospherically vented equipment and a deficit can pull
flue gases back into the space, and that is a carbon monoxide exposure in a room where people work all day. The
same worst-case testing that applies to a house (`caz-depressurization-limit`) applies here, with all exhaust
running.

**Inputs:** each exhaust system and its airflow including hoods, dishwasher, restrooms and general exhaust; each makeup air source and its airflow; the intended transfer air from adjacent spaces; and the building tightness

**Outputs:** the total exhaust and total makeup, the net deficit, the deficit as a percentage of exhaust, the intended transfer against the actual deficit, the makeup airflow required to reach a target deficit, and a combustion safety flag where atmospherically vented equipment is present

## 3. Worked example

A kitchen exhausting 6,000 cfm total with 4,800 cfm of dedicated makeup air:

```
deficit = 6,000 - 4,800 = 1,200 cfm
as a percentage of exhaust = 20%
```

1,200 cfm has to come from somewhere. If the intended transfer from the dining room is 400 cfm, then
800 cfm is coming through the building envelope, under doors, and down any flue that will pass it.

**The consequences at that number:**

```
door opening force   -- an exterior door in a tight building can exceed the 30 lbf egress limit
combustion appliances -- a water heater in the kitchen may backdraft; test at worst case
hood capture         -- the hoods will not achieve their rated exhaust, so capture degrades
other exhaust        -- restroom exhaust fans may reverse and blow into the restrooms
```

The fix is makeup air, and the amount is the deficit less the intended transfer:
`1,200 - 400` = 800 cfm of additional dedicated makeup.

Note the direction of the trap: adding a second hood or upsizing an exhaust fan to fix a capture complaint makes
this worse, not better. A hood that is not capturing in a kitchen with a deficit needs air supplied, not more air
removed.

## 4. Scope and non-goals

An airflow balance from measured or design values the user supplies. It does not compute the building pressure
that results, which depends on envelope tightness and cannot be predicted from a deficit alone -- the same deficit
produces a very different pressure in a leaky building and a tight one, and measurement is what establishes it.
It does not size hoods or determine required exhaust rates, which are set by the mechanical code and by the
appliance and hood listings. It does not address makeup air tempering, which in a cold climate is a substantial
heating load and is often why makeup air was omitted in the first place, or the distribution of makeup air, which
if introduced badly can disrupt hood capture as effectively as no makeup at all. It does not perform combustion
safety testing, which is required where atmospherically vented equipment is present and which is a carbon
monoxide hazard. The adopted mechanical and fuel gas codes, NFPA 96, the hood listing, and the AHJ govern.
