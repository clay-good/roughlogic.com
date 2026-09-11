# roughlogic.com Specification v1846 -- Salt Brine Batch Salinity and Blend (`calc-winterops.js`, Group G Cross-Trade Utilities, snow and ice management, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-winterops.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Salt brine for anti-icing is mixed to a single concentration and that concentration is not a preference. At 23.3 percent sodium chloride the freezing point is at its lowest; above it salt drops out and plugs the nozzles, below it the brine freezes at a temperature the road will reach.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive batch volume or density, or a concentration outside 0 to the saturation concentration returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the sodium chloride eutectic concentration and the salometer scale with the material supplier's data and a verified batch measurement named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`salt brine concentration`, `23.3 percent sodium chloride brine`, `brine salometer reading`, `anti icing brine batch`, `brine freeze point concentration`.

## 2. The tile

### 2.1 `brine-batch-salinity` -- Salt Brine Batch Salinity and Blend

```
the target       23.3% sodium chloride by weight -- the eutectic, where the
                 freezing point is at its minimum of about -6 degF
above it         salt precipitates out of solution and plugs nozzles, screens, and
                 lines; a supersaturated brine is a maintenance problem
below it         the freezing point RISES; a 20% brine freezes near +2 degF
brine density    about 9.8 lb per gallon at 23.3%, against 8.345 for water
salt required    batch gallons x density x concentration
water required   the balance, by weight, converted back to gallons
salometer        a hydrometer scaled in percent of saturation; 23.3% by weight is
                 about 88 to 89 salometer at 60 degF, and it is TEMPERATURE
                 DEPENDENT
what brine is    ANTI-ICING -- applied BEFORE a storm to prevent a bond; it is not
for              a deicer and will not melt accumulated snow
```

The eutectic is a property of the salt and water system, not a recipe anyone chose. At 23.3 percent by weight
the mixture freezes at its lowest possible temperature, and moving away from that concentration in either
direction raises the freezing point. That makes it the only sensible target for a brine that has to sit in a
tank in winter and spray through a nozzle in a cold wind, and it is why every brine operation in the country
mixes to the same number.

The two failure directions look nothing alike. Over-concentrated brine carries salt it cannot hold, which
crystallises in tanks, lines, screens, and nozzles and produces an intermittent spray pattern and a
maintenance backlog. Under-concentrated brine sprays perfectly and freezes on the road, which is worse,
because it looks like a successful application right up until the pavement ices.

Brine is an anti-icing material and that distinction decides when it is useful. Applied to dry pavement before
a storm it prevents snow from bonding, which is why the plow can then scrape to bare pavement with far less
salt afterwards. Applied to snow that has already fallen it adds water to the problem. The whole economic case
for brine is the material it saves later, and that case is only available to an operation that can apply it in
advance.

**Inputs:** the batch volume, the target concentration, the brine density, the saturation concentration for the salometer conversion, and an alternative concentration for comparison

**Outputs:** the batch weight, the salt and water required, the water in gallons, the salt per 1,000 gallons, the salometer reading the target corresponds to, the freezing point at the target and at the alternative concentration, and the salt an under-mixed batch would use

## 3. Worked example

A 3,000 gallon batch at the 23.3% eutectic:

```
batch weight = 3,000 x 9.80 lb/gal = 29,400 lb
salt         = 29,400 x 0.233 = 6,850 lb = 3.43 tons
water        = 22,550 lb = 2,702 gal
per 1,000 gal of brine = 2,283 lb of salt
```

**2,283 lb per thousand gallons** is the figure a brine maker works to, and it matches the published rule
closely enough to be the check on any batch.

**Verify it with a salometer, not by counting bags:**

```
23.3% by weight / 26.4% saturation x 100 = 88 salometer at 60 degF
```

**88 salometer is the target reading**, and the reading is temperature dependent -- a hydrometer dropped into
cold brine reads high, which is exactly when a crew is most likely to check it.

**Mix it short and the road finds out:**

```
at 20%: salt = 5,880 lb -- 970 lb less
      freezing point rises from -6 degF to about +2 degF
```

**970 lb of salt saved and 8 degrees of freezing point given away.** The brine sprays perfectly, the
pattern looks right, and **it freezes on the pavement at a temperature the road will reach on any clear
night** -- which is the more dangerous of the two failures, because nothing about the application looked
wrong.

**The other direction plugs the truck.** Above 23.3% the solution cannot hold the salt, and it crystallises in
tanks, lines, screens, and nozzles -- **an intermittent spray pattern and a maintenance backlog rather than a
road hazard**, but it takes the truck out of service in the middle of an event.

**And brine is anti-icing, not deicing.** Applied to dry pavement before the storm it prevents the bond, which
is what lets the plow scrape to bare pavement afterwards with far less salt. **Applied to snow already on the
ground it is adding water to the problem.**

## 4. Scope and non-goals

A batch calculation. Brine density varies with concentration and temperature and the figure entered here is nominal; a measured density or a salometer reading on the actual batch is what verifies a mix, and the salometer scale is referenced to a stated temperature that a cold tank does not meet. Freezing points quoted for chloride solutions are for the pure system, and a working brine picks up dissolved and suspended material from the salt, the water, and the tank that shifts its behaviour. It does not address brine made from other chlorides or blended with organic additives, corrosion inhibitors, or agricultural by-products, all of which change the concentration target, the freezing point, and the handling entirely -- a blend is formulated by its supplier, not by this arithmetic. It does not address the making equipment, salt quality and insolubles, storage and settling, agitation, or the application rate and timing, which are what decide whether an anti-icing programme works. It takes no position on chloride corrosion of vehicles and structures or on the environmental consequences of chloride application. The material supplier's data, a salometer or density verification of each batch, and the applicable agency policy govern.
