# roughlogic.com Specification v1788 -- Dry Hop Absorption and Beer Loss (`calc-brewing.js`, Group O Kitchen and Food Service, commercial brewing and distilling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-brewing.js`**
> (Group O Kitchen and Food Service, hub `/groups/kitchen/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Dry hops soak up beer and leave with it, and at modern hopping rates the loss is measured in kegs rather than gallons. It is the largest single volume loss in a hazy IPA and it is almost never in the yield calculation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume, hopping rate, absorption, or package size, or an absorbed volume at or above the batch volume returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the hop absorption mass balance and published pellet absorption ranges with the brewery's own measured absorption and stability records named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`dry hop beer loss`, `hop absorption gallons per pound`, `dry hopping rate pounds per barrel`, `hop creep refermentation`, `ipa yield loss hops`.

## 2. The tile

### 2.1 `dry-hop-beer-loss` -- Dry Hop Absorption and Beer Loss

```
hopping rate     pounds per barrel; 1 to 2 is ordinary, 3 to 6 is a modern hazy
                 or double IPA
absorption       pellets retain roughly 0.5 to 1.5 gal of beer per pound; whole cone
                 hops retain several times that and are rarely used at rate
loss             gallons = pounds x absorption per pound
as a fraction    loss / batch volume, which climbs directly with the hopping rate
in packages      loss / package size -- the number that means something commercially
hop creep        dry hops carry amylolytic enzymes that break dextrins the yeast
                 could not, restarting fermentation in tank or in package
the consequence  hop creep raises attenuation, alcohol, and package carbonation
                 after the beer was thought finished
```

Absorption is a straightforward mass balance and it has become a major loss only because hopping rates have
risen so far. At a pound or two per barrel the beer left in the hop bed is a nuisance; at five or six pounds
it is a substantial fraction of the batch, and a brewery that prices a heavily dry-hopped beer on the same
yield as its pale ale is selling it at a margin it has not calculated.

The loss is also the most expensive beer in the building, because it happens last. Every gallon absorbed into
a hop bed has already carried the full grain bill, the full brew day, the fermentation, the tank time, and the
hops themselves, and it leaves with the spent hops. Recovering it -- with a centrifuge, a hop gun that can be
pressed, or a longer settling -- is capital spent against a loss that is easy to quantify and easy to ignore.

Hop creep is a separate hazard from the same addition and it is a safety matter rather than a yield one.
Enzymes carried in on the hops degrade dextrins the yeast could not touch, so a beer that reached a stable
final gravity ferments further after dry hopping. In tank that shows up as unexpected attenuation and
diacetyl; in package it shows up as rising carbonation, gushing, and in the extreme case a container beyond
its pressure rating. It is the reason a dry-hopped beer is held and confirmed stable before it is packaged.

**Inputs:** the batch volume, the dry hopping rate in pounds per barrel or the hop weight, the absorption per pound, the package size, and the revenue per package

**Outputs:** the hop charge, the beer absorbed, the loss as a fraction of the batch, the volume and packages remaining, the loss expressed in packages and in revenue, and the same figures at a second hopping rate

## 3. Worked example

A 310 gal (10 bbl) batch dry hopped at 2 lb per barrel, pellets absorbing 1.0 gal per pound:

```
hops     = 2 x 10 = 20 lb
absorbed = 20 x 1.0 = 20 gal
loss     = 20 / 310 = 6.5% of the batch
```

**20 gallons, or 1.29 half barrels.** At an ordinary hopping rate that is a real but tolerable loss.

**Now take the same batch to a modern hazy rate of 4 lb per barrel:**

```
hops     = 4 x 10 = 40 lb
absorbed = 40 x 1.0 = 40 gal = 12.9% of the batch
in kegs  = 40 / 15.5 = 2.58 half barrels
```

**2.6 kegs of finished beer leave with the spent hops**, worth $452 at $175 a keg -- **and that is
before the cost of the 40 lb of hops that absorbed it.** Doubling the hopping rate doubled the loss exactly,
because absorption is linear in hop weight and nothing else in the batch changed.

**It is the most expensive beer in the brewery.** Those 40 gallons carried the whole grain bill, the whole brew
day, the fermentation, and the tank time, and they were lost in the last operation before packaging. **A
brewery quoting one yield figure across its portfolio is understating the cost of its flagship IPA by
6.5 percentage points** relative to its pale ale.

**And the same addition brings an enzyme problem.** Hop creep restarts fermentation on dextrins the yeast could
not reach, so a beer at a stable final gravity keeps attenuating after dry hopping -- **rising alcohol, rising
carbonation, and in package a container that can exceed its rating.** The remedy is time and temperature in
tank with gravity confirmed stable before packaging, not a calculation.

## 4. Scope and non-goals

A volume loss estimate. Absorption per pound is entered and varies widely with the hop form, the variety, the contact time, the temperature, whether the vessel is pressed or centrifuged, and how the hop bed is dumped -- a brewery establishes its own figure by measuring the volume before and after, and a borrowed figure can be wrong by a factor of two or more. It does not predict aroma, flavour, or hop utilisation, which is what the dry hop is for and which depends on variety, timing, temperature, contact time, and oxygen exclusion. It does not quantify hop creep: the enzyme load, the dextrin available, the yeast still present, and the temperature all decide how far a beer referments, and the only safe practice is to confirm a stable gravity in tank before packaging rather than to calculate one. It does not address oxygen pickup during dry hopping, which is the other major quality risk of the operation, or the biotransformation and polyphenol effects that a dry hop has on the beer. The brewery's own measured absorption and stability records and the brewer govern.
