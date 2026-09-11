# roughlogic.com Specification v1849 -- Ice Melt Product Working Temperature and Capacity (`calc-winterops.js`, Group G Cross-Trade Utilities, snow and ice management, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-winterops.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Every deicer has a temperature below which it stops doing useful work, and it is well above the eutectic temperature printed on the bag. Rock salt's melting capacity collapses by an order of magnitude between thirty and ten degrees, which is why cold events need a different product rather than more of the same one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive area, ice thickness, or melting capacity, or an ice density at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): published deicer melting capacity and eutectic data with the product supplier's data and the applicable environmental restrictions named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ice melt working temperature`, `rock salt melting capacity`, `eutectic versus practical temperature`, `calcium chloride magnesium chloride deicer`, `pounds of ice melted per pound of salt`.

## 2. The tile

### 2.1 `ice-melt-working-temperature` -- Ice Melt Product Working Temperature and Capacity

```
eutectic         the lowest temperature at which a salt and water mixture stays
                 liquid at all: about -6 degF for sodium chloride, -28 for
                 magnesium chloride, -60 for calcium chloride
practical        FAR warmer than the eutectic, because near it the melting is too
working limit    slow to be useful: roughly 15 to 20 degF for rock salt, 0 for
                 magnesium chloride, -20 or below for calcium chloride
melting capacity pounds of ice one pound of product will melt in a stated time,
                 and it falls steeply with temperature
rock salt        about 46 lb of ice per lb at 30 degF, 8.6 at 20, and under 5 at 10
exothermic       calcium chloride releases heat as it dissolves, which is why it
                 keeps working where the others stop; sodium chloride does not
product for the  a colder event calls for a different chemistry, not a heavier
event            application of the same one
the label        a bag stating a very low temperature is usually quoting the
                 eutectic, not a working limit
```

The eutectic is a thermodynamic boundary and the working limit is an operational one, and confusing them is the
most common error in deicer selection. A solution can remain liquid at its eutectic and still take hours to
penetrate and undercut a sheet of ice, which is no use to anyone clearing a walk before opening. The
practical limit is where the melting happens fast enough to matter, and for rock salt that is roughly twenty
degrees above the number on the bag.

The capacity collapse is why cold events are expensive rather than merely difficult. The same pound of salt
does a fraction of the work at ten degrees that it did at thirty, so holding the same result needs many times
the material -- and past a point no quantity produces the result, because the brine that forms refreezes as
fast as it melts. A crew responding to a cold event by spreading heavier is spending material to no effect.

Calcium chloride's advantage is thermodynamic rather than marketing. It releases heat as it dissolves, so it
warms the brine it is making and keeps the reaction going where an endothermic or neutral product stalls. That
is what buys the low working temperature, and it is also why it is more expensive, more hygroscopic, and more
aggressive to concrete and metal -- the properties come together.

**Inputs:** the area and ice thickness, the pavement temperature, the product's melting capacity at that temperature, the product's eutectic and practical working temperature, and an alternative temperature

**Outputs:** the ice mass to be melted, the product required at the entered temperature, the product required at a warmer and a colder temperature, the ratio between them, and whether the temperature is within the product's practical working limit

## 3. Worked example

Melting 1 in of ice off 1,000 sq ft with rock salt:

```
volume = 1,000 x 1/12 = 83.3 cu ft
mass   = 83.3 x 57.2 lb/cu ft = 4,767 lb of ice
```

**At 30 degF, where salt melts about 46.3 lb of ice per pound:**

```
salt = 4,767 / 46.3 = 103 lb
```

**At 20 degF, capacity 8.6:**

```
salt = 554 lb -- 5.4 times as much
```

**At 10 degF, capacity 4.9:**

```
salt = 973 lb -- 9.4 times the 30 degF quantity
```

**9.4 times the material for the same job, from a 20 degree drop.** And the 10 degF figure is arithmetic
rather than practice: **rock salt's practical working limit is around 15 to 20 degF**, so at 10 degF the brine
that forms refreezes about as fast as it is made and no quantity produces the result.

**Which is the point.** A cold event calls for a **different chemistry**, not a heavier application of the same
one. Calcium chloride releases heat as it dissolves and keeps working to -20 degF and below; magnesium
chloride works to about 0. **Spreading rock salt heavier at 10 degF is spending material to no effect**, and
it is the most common winter operations mistake there is.

**And read the bag carefully.** A product advertising a very low temperature is usually quoting its
**eutectic** -- the point at which the solution merely stays liquid -- **not a working limit.** Sodium
chloride's eutectic is -6 degF and nobody would treat a walk with it at that temperature.

## 4. Scope and non-goals

A comparison from published melting capacity data. Melting capacities are laboratory figures measured over a stated time at a stated temperature on a stated ice thickness, and they are not field yields: penetration and undercutting depend on the ice's condition, whether it is bonded, the pavement's temperature and material, traffic working the product in, and dilution by continuing precipitation. A field application is substantially less effective than a laboratory capacity, in a direction and magnitude this cannot quantify. Practical working limits are practice ranges rather than defined quantities and suppliers differ on them. It does not select a product: cost, corrosivity to vehicles and reinforcement, effect on concrete -- particularly young concrete and magnesium chloride's interaction with cement paste -- tracking indoors, effect on vegetation and on aquatic receiving waters, and the increasing regulatory restrictions on chloride application all bear on the choice, and none of them are in this arithmetic. It does not address blends, pre-wetting, or organic and acetate products, whose behaviour differs from the chlorides. The product supplier's data, the applicable environmental and agency restrictions, and the winter operations manager govern.
